import { onDocumentWritten, onDocumentCreated } from "firebase-functions/v2/firestore";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { setGlobalOptions } from "firebase-functions/v2/options";
import * as admin from "firebase-admin";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getMessaging, type Message } from "firebase-admin/messaging";
import { callerIsAdmin, callerIsSuperAdmin } from './adminGuards';

const apiFootballKey = defineSecret("API_FOOTBALL_KEY");
setGlobalOptions({ secrets: [apiFootballKey] });

export * from "./diwaniya";
export * from "./challenge";
export * from "./notifications";
export * from "./standings";
export * from "./coverageMatches";
export * from "./matchNotifications";
export * from "./adminGuards";
export * from "./newsSummary";
export * from "./countries";
export * from "./seasonStatistics";

admin.initializeApp();

const db = getFirestore();
const messaging = getMessaging();

interface MatchEvent {
  id: string;
  minute: string;
  type: "goal" | "opp_goal" | "og" | "yellow" | "red" | "pen_scored" | "pen_missed" | "sub" | "crossbar";
  player: string;
  playerOut?: string;
  team: "home" | "away";
  videoUrl?: string;
  secondYellow?: boolean;
  varDecision?: "error" | "no_error";
}

function recalcMatch(events: MatchEvent[]): {
  homeScore: number;
  awayScore: number;
  playerStatuses: Record<string, 'booked' | 'off'>;
  substitutions: Array<{ in: string; out: string; minute: string; team: 'home' | 'away' }>;
} {
  let homeScore = 0;
  let awayScore = 0;
  const playerStatuses: Record<string, 'booked' | 'off'> = {};
  const substitutions: Array<{ in: string; out: string; minute: string; team: 'home' | 'away' }> = [];

  const keyFor = (team: 'home' | 'away', player: string) => `${team}:${player}`;

  for (const event of events) {
    if (event.varDecision === "error") continue;
    if (event.type === "goal" && event.team === "home") homeScore++;
    if (event.type === "goal" && event.team === "away") awayScore++;
    if (event.type === "og") {
      if (event.team === "home") awayScore++;
      else homeScore++;
    }
    if (event.type === "opp_goal") {
      if (event.team === "home") awayScore++;
      else homeScore++;
    }

    if (event.type === "red" && event.player) {
      playerStatuses[keyFor(event.team, event.player)] = "off";
    } else if (event.type === "yellow" && event.player) {
      const key = keyFor(event.team, event.player);
      if (playerStatuses[key] !== "off") playerStatuses[key] = "booked";
    }

    if (event.type === "sub" && event.player && event.playerOut) {
      substitutions.push({ in: event.player, out: event.playerOut, minute: event.minute, team: event.team });
      playerStatuses[keyFor(event.team, event.playerOut)] = "off";
    }
  }

  return { homeScore, awayScore, playerStatuses, substitutions };
}

export const onMatchEventWritten = onDocumentWritten(
  "matches/{matchId}/events/{eventId}",
  async (event) => {
    const matchId = event.params.matchId;

    const snap = await db.collection(`matches/${matchId}/events`).get();
    const matchEvents: MatchEvent[] = snap.docs.map((d: FirebaseFirestore.QueryDocumentSnapshot) => ({
      id: d.id,
      ...d.data(),
    })) as MatchEvent[];

    const recalced = recalcMatch(matchEvents);

    await db.doc(`matches/${matchId}`).update({
      "score.home": recalced.homeScore,
      "score.away": recalced.awayScore,
      playerStatuses: recalced.playerStatuses,
      substitutions: recalced.substitutions,
    });
  }
);

interface NewsPostData {
  title?: string;
  content?: string;
  team?: string;
  tag?: string | null;
  imageUrl?: string;
  summary?: string;
}

function topicForTeam(team?: string): string {
  if (team === "barcelona") return "barcelona_news";
  if (team === "realmadrid") return "realmadrid_news";
  return "all_news";
}

function buildNewsMessage(postId: string, post: NewsPostData): Message {
  const summaryText = (post.summary ?? '').trim();
  const contentText = (post.content ?? '').trim();
  const bodyText = summaryText.length > 0 ? summaryText : contentText;
  const body = bodyText.replace(/\s+/g, " ").trim().slice(0, 180) + (bodyText.length > 180 ? "..." : "");

  const imageUrl = post.imageUrl || undefined;

  return {
    topic: topicForTeam(post.team),
    notification: {
      title: post.title ?? "خبر جديد",
      body,
      imageUrl,
    },
    android: {
      notification: {
        channelId: "news",
        imageUrl,
        clickAction: "OPEN_NEWS_POST",
      },
    },
    apns: {
      payload: {
        aps: {
          mutableContent: true,
        },
      },
      fcmOptions: {
        imageUrl,
      },
    },
    data: {
      type: "news",
      postId,
      team: post.team ?? "all",
      tag: post.tag ?? "",
    },
  };
}

export const onNewsCreated = onDocumentCreated("news/{postId}", async (event) => {
  const postId = event.params.postId;
  const data = event.data?.data() as NewsPostData | undefined;
  if (!data) return;

  try {
    await messaging.send(buildNewsMessage(postId, data));
    await db.doc(`news/${postId}`).update({
      notifiedAt: FieldValue.serverTimestamp(),
    });
  } catch (err) {
    console.error(`FCM send failed for news/${postId}`, err);
  }
});

export const renotifyNewsPost = onCall(async (request) => {
  const isAdmin = await callerIsAdmin(request);
  if (!isAdmin) {
    throw new HttpsError("permission-denied", "Admin privileges required.");
  }

  const postId = request.data?.postId as string | undefined;
  if (!postId) {
    throw new HttpsError("invalid-argument", "postId is required.");
  }

  const snap = await db.doc(`news/${postId}`).get();
  if (!snap.exists) {
    throw new HttpsError("not-found", `News post ${postId} not found.`);
  }

  try {
    await messaging.send(buildNewsMessage(postId, snap.data() as NewsPostData));
    await snap.ref.update({
      notifiedAt: FieldValue.serverTimestamp(),
    });
    return { ok: true };
  } catch (err) {
    console.error(`FCM re-send failed for news/${postId}`, err);
    return { ok: false, error: String(err) };
  }
});

// ---------------------------------------------------------------------------
// M5 – User Management & Tiers
// ---------------------------------------------------------------------------

interface SetAdminRoleInput {
  uid: string;
  name: string;
  email: string;
  permissions: string[];
}

export const setAdminRole = onCall(async (request) => {
  const callerUid = request.auth?.uid;
  const tokenRole = request.auth?.token?.role;
  if (tokenRole !== "super_admin" && !(await callerIsSuperAdmin(callerUid))) {
    throw new HttpsError("permission-denied", "super_admin privileges required.");
  }

  const input = request.data as Partial<SetAdminRoleInput> | undefined;
  if (!input?.uid || !input.name) {
    throw new HttpsError("invalid-argument", "uid and name are required.");
  }
  const permissions = Array.isArray(input.permissions)
    ? input.permissions.filter((p) => typeof p === "string")
    : [];

  await getAuth().setCustomUserClaims(input.uid, { role: "admin", permissions });
  await db.doc(`admins/${input.uid}`).set(
    {
      name: input.name,
      email: input.email ?? "",
      role: "admin",
      permissions,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
  await getAuth().revokeRefreshTokens(input.uid);

  return { ok: true };
});

export const revokeAdmin = onCall(async (request) => {
  const callerUid = request.auth?.uid;
  const tokenRole = request.auth?.token?.role;
  if (tokenRole !== "super_admin" && !(await callerIsSuperAdmin(callerUid))) {
    throw new HttpsError("permission-denied", "super_admin privileges required.");
  }

  const uid = request.data?.uid as string | undefined;
  if (!uid) {
    throw new HttpsError("invalid-argument", "uid is required.");
  }
  if (uid === callerUid) {
    throw new HttpsError("invalid-argument", "Cannot revoke your own admin role.");
  }

  await getAuth().setCustomUserClaims(uid, null);
  await db.doc(`admins/${uid}`).delete();
  await getAuth().revokeRefreshTokens(uid);

  return { ok: true };
});

const ALLOWED_TOPICS = ["all_news", "barcelona_news", "realmadrid_news"];

export const sendTopicNotification = onCall(async (request) => {
  if (!(await callerIsAdmin(request))) {
    throw new HttpsError("permission-denied", "Admin privileges required.");
  }

  const topic = request.data?.topic as string | undefined;
  const title = request.data?.title as string | undefined;
  const body = request.data?.body as string | undefined;
  if (!topic || !title || !body) {
    throw new HttpsError("invalid-argument", "topic, title and body are required.");
  }
  if (!ALLOWED_TOPICS.includes(topic)) {
    throw new HttpsError("invalid-argument", `topic must be one of: ${ALLOWED_TOPICS.join(", ")}`);
  }

  try {
    await messaging.send({
      topic,
      notification: { title, body },
      android: {
        notification: { channelId: "general" },
      },
    });
    return { ok: true };
  } catch (err) {
    console.error(`FCM topic send failed for ${topic}`, err);
    return { ok: false, error: String(err) };
  }
});

const DEFAULT_TIER_THRESHOLDS = [0, 500, 1500, 3500, 7000];

async function loadTierThresholds(): Promise<number[]> {
  const snap = await db.doc("settings/tiers").get();
  if (!snap.exists) return DEFAULT_TIER_THRESHOLDS;
  const raw = snap.get("thresholds");
  if (!Array.isArray(raw) || raw.length < 2) return DEFAULT_TIER_THRESHOLDS;
  return [...raw].sort((a, b) => a - b);
}

function computeTier(
  points: number,
  thresholds: number[],
): { tier: number; tierProgress: number } {
  let index = 0;
  for (let i = 0; i < thresholds.length; i++) {
    if (points >= thresholds[i]) index = i;
  }
  const current = thresholds[index];
  const next = thresholds[index + 1] ?? null;
  if (next === null || next <= current) {
    return { tier: index, tierProgress: 100 };
  }
  const span = next - current;
  const progress = Math.round(((points - current) / span) * 100);
  return { tier: index, tierProgress: Math.min(100, Math.max(0, progress)) };
}

export const recomputeTier = onDocumentCreated("points_log/{logId}", async (event) => {
  const data = event.data?.data() as { userId?: string } | undefined;
  const userId = data?.userId;
  if (!userId) return;

  const userRef = db.doc(`users/${userId}`);
  const userSnap = await userRef.get();
  if (!userSnap.exists) return;

  const points = (userSnap.get("points") as number | undefined) ?? 0;
  const thresholds = await loadTierThresholds();
  await userRef.update(computeTier(points, thresholds));
});