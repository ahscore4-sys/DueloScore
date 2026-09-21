import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";

const KUWAIT_OFFSET_MS = 3 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const FRIDAY = 5;

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function formatKey(d: Date): string {
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

function kuwaitShifted(ms: number): Date {
  return new Date(ms + KUWAIT_OFFSET_MS);
}

function kuwaitDateKey(ms: number): string {
  return formatKey(kuwaitShifted(ms));
}

function kuwaitMidnightMs(ms: number): number {
  const d = kuwaitShifted(ms);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - KUWAIT_OFFSET_MS;
}

function challengeWeekId(ms: number): string {
  const d = kuwaitShifted(ms);
  const back = (d.getUTCDay() - FRIDAY + 7) % 7;
  return formatKey(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - back)));
}

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---------------------------------------------------------------------------
// Auto-Publish Daily Challenge (scheduled every 1 minute)
// Creates a new challenge at 00:00 Kuwait time automatically
// ---------------------------------------------------------------------------

export const autoPublishDailyChallenge = onSchedule("every 1 minutes", async () => {
  const db = getFirestore();
  const nowMs = Date.now();
  const todayKey = kuwaitDateKey(nowMs);
  const todayMidnight = kuwaitMidnightMs(nowMs);
  const tomorrowMidnight = todayMidnight + DAY_MS;

  const existingSnap = await db
    .collection("challenges")
    .where("scheduledDate", "==", todayKey)
    .limit(1)
    .get();

  if (!existingSnap.empty) {
    return;
  }

  const activeQuestionsSnap = await db
    .collection("challenge_questions")
    .where("active", "==", true)
    .get();

  if (activeQuestionsSnap.empty) {
    console.log(`autoPublishDailyChallenge: no active questions for ${todayKey}, skipping.`);
    return;
  }

  const challengeRef = db.collection("challenges").doc();
  await challengeRef.set({
    id: challengeRef.id,
    scheduledDate: todayKey,
    startTime: todayMidnight,
    endTime: tomorrowMidnight - 1,
    status: "active",
    stats: {
      assignedCount: 0,
      respondedCount: 0,
      correctCount: 0,
    },
    topPerformers: [],
    publishedBy: "النظام التلقائي",
    weekId: challengeWeekId(nowMs),
    createdAt: FieldValue.serverTimestamp(),
  });

  console.log(`autoPublishDailyChallenge: created challenge for ${todayKey}`);
});

// ---------------------------------------------------------------------------
// Get Today's Challenge (lazy random assignment from active pool)
// ---------------------------------------------------------------------------

export const getTodaysChallenge = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Login required.");

  const db = getFirestore();

  const nowMs = Date.now();
  const ongoingSnap = await db
    .collection("challenges")
    .where("status", "in", ["scheduled", "active"])
    .orderBy("startTime", "desc")
    .limit(1)
    .get();

  if (ongoingSnap.empty) {
    return { challenge: null };
  }

  const challengeSnap = ongoingSnap.docs[0];
  const challengeData = challengeSnap.data() as Record<string, unknown>;
  const startTime = challengeData.startTime as number;
  const endTime = challengeData.endTime as number;

  if (nowMs < startTime || nowMs > endTime) {
    return { challenge: null };
  }

  const responseId = `${challengeSnap.id}_${uid}`;
  const responseSnap = await db.doc(`challenge_responses/${responseId}`).get();

  let assignedQuestionId: string;

  if (responseSnap.exists) {
    assignedQuestionId = responseSnap.get("assignedQuestionId") as string;
  } else {
    const activeQuestionsSnap = await db
      .collection("challenge_questions")
      .where("active", "==", true)
      .get();

    const questionIds = activeQuestionsSnap.docs.map((d) => d.id);

    if (questionIds.length === 0) {
      return { challenge: null };
    }

    const shuffled = shuffleArray(questionIds);
    assignedQuestionId = shuffled[0];

    await db.doc(`challenge_responses/${responseId}`).set({
      id: responseId,
      challengeId: challengeSnap.id,
      userId: uid,
      assignedQuestionId,
      selectedAnswer: null,
      isCorrect: null,
      pointsAwarded: null,
      respondedAt: null,
      createdAt: FieldValue.serverTimestamp(),
    });

    await challengeSnap.ref.update({
      "stats.assignedCount": FieldValue.increment(1),
    });
  }

  const questionSnap = await db.doc(`challenge_questions/${assignedQuestionId}`).get();
  if (!questionSnap.exists) {
    throw new HttpsError("internal", "السؤال المُسنّد غير موجود.");
  }
  const qData = questionSnap.data() as Record<string, unknown>;

  return {
    challenge: {
      id: challengeSnap.id,
      startTime,
      endTime,
      status: challengeData.status,
      question: {
        id: assignedQuestionId,
        type: qData.type,
        question: qData.question,
        imageUrl: qData.imageUrl ?? "",
        options: qData.options,
      },
    },
  };
});

// ---------------------------------------------------------------------------
// Submit Challenge Response
// ---------------------------------------------------------------------------

interface SubmitInput {
  challengeId?: string;
  selectedAnswer?: number;
}

export const submitChallengeResponse = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Login required.");

  const input = request.data as SubmitInput | undefined;
  const challengeId = input?.challengeId;
  const selectedAnswer = typeof input?.selectedAnswer === "number" ? input.selectedAnswer : -1;

  if (!challengeId) throw new HttpsError("invalid-argument", "challengeId is required.");
  if (selectedAnswer < 0 || selectedAnswer > 3) throw new HttpsError("invalid-argument", "selectedAnswer must be 0-3.");

  const db = getFirestore();
  const challengeSnap = await db.doc(`challenges/${challengeId}`).get();
  if (!challengeSnap.exists) throw new HttpsError("not-found", "Challenge not found.");

  const data = challengeSnap.data() as Record<string, unknown>;
  const nowMs = Date.now();
  const startTime = data.startTime as number;
  const endTime = data.endTime as number;

  if (nowMs < startTime || nowMs > endTime) {
    throw new HttpsError("failed-precondition", "هذا التحدي غير نشط حالياً.");
  }

  const responseId = `${challengeId}_${uid}`;
  const responseSnap = await db.doc(`challenge_responses/${responseId}`).get();

  if (!responseSnap.exists) {
    throw new HttpsError("failed-precondition", "لم تتم إسنادك لهذا التحدي بعد.");
  }

  const existingAnswer = responseSnap.get("selectedAnswer");
  if (existingAnswer !== null && existingAnswer !== undefined) {
    throw new HttpsError("already-exists", "لقد أجبت على هذا التحدي بالفعل.");
  }

  await db.doc(`challenge_responses/${responseId}`).update({
    selectedAnswer,
    respondedAt: FieldValue.serverTimestamp(),
  });

  await challengeSnap.ref.update({
    "stats.respondedCount": FieldValue.increment(1),
  });

  return { ok: true };
});

// ---------------------------------------------------------------------------
// Finalize Daily Challenges (scheduled every 1 minute)
// ---------------------------------------------------------------------------

export const finalizeDailyChallenges = onSchedule("every 1 minutes", async () => {
  const db = getFirestore();
  const nowMs = Date.now();

  const pendingSnap = await db
    .collection("challenges")
    .where("status", "in", ["scheduled", "active"])
    .get();

  if (pendingSnap.empty) return;

  let finalized = 0;

  for (const challengeSnap of pendingSnap.docs) {
    const data = challengeSnap.data() as Record<string, unknown>;
    const endTime = data.endTime as number;
    if (nowMs <= endTime) continue;

    const weekId = (data.weekId as string) ?? challengeWeekId(data.startTime as number);
    const pointsPerCorrect = 10;

    const responsesSnap = await db
      .collection("challenge_responses")
      .where("challengeId", "==", challengeSnap.id)
      .get();

    const batch = db.batch();
    let correctCount = 0;
    const topPerformers: { userId: string; userName: string; userTeam: string | null; tierName: string; tierColor: string; respondedAt: number }[] = [];

    const leaderboardEntries: Record<string, {
      userId: string;
      userName: string;
      userTeam: string | null;
      tierName: string;
      tierColor: string;
      daysPlayed: number;
      weekPoints: number;
    }> = {};

    for (const respSnap of responsesSnap.docs) {
      const resp = respSnap.data() as Record<string, unknown>;
      const assignedQuestionId = resp.assignedQuestionId as string;
      const selectedAnswer = resp.selectedAnswer as number | null;

      if (selectedAnswer === null || selectedAnswer === undefined) continue;

      const questionSnap = await db.doc(`challenge_questions/${assignedQuestionId}`).get();
      if (!questionSnap.exists) continue;

      const qData = questionSnap.data() as Record<string, unknown>;
      const correctAnswer = qData.correctAnswer as number;
      const isCorrect = selectedAnswer === correctAnswer;
      const pointsAwarded = isCorrect ? pointsPerCorrect : 0;

      if (isCorrect) correctCount++;

      const userSnap = await db.doc(`users/${resp.userId}`).get();
      const userName = (userSnap.get("name") as string) ?? "مستخدم";
      const userTeam = (userSnap.get("team") as string | null) ?? null;
      const tierName = (userSnap.get("tierName") as string) ?? "";
      const tierColor = (userSnap.get("tierColor") as string) ?? "#9E9E9E";

      batch.update(respSnap.ref, {
        isCorrect,
        pointsAwarded,
      });

      if (isCorrect) {
        const respondTime = resp.respondedAt instanceof Timestamp
          ? resp.respondedAt.toMillis()
          : typeof resp.respondedAt === "number"
            ? resp.respondedAt
            : nowMs;

        const respUserId = resp.userId as string;
        topPerformers.push({
          userId: respUserId,
          userName,
          userTeam,
          tierName,
          tierColor,
          respondedAt: respondTime,
        });
      }

      if (isCorrect) {
        const entryKey = resp.userId as string;
        const existing = leaderboardEntries[entryKey];
        leaderboardEntries[entryKey] = {
          userId: resp.userId as string,
          userName,
          userTeam,
          tierName,
          tierColor,
          daysPlayed: (existing?.daysPlayed ?? 0) + 1,
          weekPoints: (existing?.weekPoints ?? 0) + pointsAwarded,
        };
      }
    }

    topPerformers.sort((a, b) => a.respondedAt - b.respondedAt);
    const topFive = topPerformers.slice(0, 5);

    batch.update(challengeSnap.ref, {
      status: "ended",
      "stats.correctCount": correctCount,
      topPerformers: topFive,
    });

    const leaderboardRef = db.doc(`weekly_leaderboard/${weekId}`);
    const lbSnap = await leaderboardRef.get();
    const existingEntries: Record<string, {
      userId: string;
      userName: string;
      userTeam: string | null;
      tierName: string;
      tierColor: string;
      daysPlayed: number;
      weekPoints: number;
    }> = {};

    if (lbSnap.exists) {
      const raw = lbSnap.get("entries");
      if (Array.isArray(raw)) {
        for (const e of raw) {
          if (e && typeof e === "object" && "userId" in e) {
            existingEntries[(e as { userId: string }).userId] = e as typeof existingEntries[string];
          }
        }
      }
    }

    for (const [userId, entry] of Object.entries(leaderboardEntries)) {
      const prev = existingEntries[userId];
      existingEntries[userId] = {
        ...entry,
        daysPlayed: (prev?.daysPlayed ?? 0) + entry.daysPlayed,
        weekPoints: (prev?.weekPoints ?? 0) + entry.weekPoints,
      };
    }

    const mergedEntries = Object.values(existingEntries);

    batch.set(leaderboardRef, {
      weekId,
      entries: mergedEntries,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });

    for (const entry of mergedEntries) {
      if (entry.daysPlayed >= 7) {
        const userRef = db.doc(`users/${entry.userId}`);
        batch.update(userRef, {
          points: FieldValue.increment(entry.weekPoints),
        });
      }
    }

    await batch.commit();
    finalized++;
  }

  if (finalized > 0) {
    console.log(`finalizeDailyChallenges: finalized ${finalized} challenge(s)`);
  }
});
