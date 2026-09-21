import { onDocumentWritten, onDocumentCreated } from "firebase-functions/v2/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import type { DocumentData } from "firebase-admin/firestore";

const MAX_COMMENT_DEPTH = 5;
const AUTO_HIDE_MARKER = "auto";

interface VoteData {
  pollId?: string;
  optionId?: string;
  team?: string;
  counted?: boolean;
}

function normalizeVotes(raw: unknown): Record<string, Record<string, number>> {
  const obj = (raw ?? {}) as Record<string, Record<string, number>>;
  return {
    barcelona: obj.barcelona ?? {},
    realmadrid: obj.realmadrid ?? {},
  };
}

function bumpBucket(
  votes: Record<string, Record<string, number>>,
  team: string,
  optionId: string,
  delta: number
): void {
  const bucket = votes[team] ?? {};
  const current = typeof bucket[optionId] === "number" ? bucket[optionId] : 0;
  bucket[optionId] = Math.max(0, current + delta);
  votes[team] = bucket;
}

export const onPollVoteWrite = onDocumentWritten("poll_votes/{voteId}", async (event) => {
  const beforeData = (event.data?.before.data() ?? null) as VoteData | null;
  const afterSnap = event.data?.after;
  const afterData = (afterSnap?.data() ?? null) as VoteData | null;

  if (!beforeData && !afterData) return;

  if (
    beforeData &&
    afterData &&
    beforeData.optionId === afterData.optionId &&
    beforeData.team === afterData.team
  ) {
    return; // metadata-only change (e.g. counted flag echo)
  }

  const pollId = afterData?.pollId ?? beforeData?.pollId;
  if (!pollId) return;

  const db = getFirestore();
  const pollRef = db.collection("diwaniya").doc(pollId);

  await db.runTransaction(async (tx) => {
    const pollSnap = await tx.get(pollRef);
    if (!pollSnap.exists) {
      if (afterSnap?.exists && afterSnap.ref) tx.delete(afterSnap.ref);
      return;
    }

    const poll = pollSnap.data() as DocumentData;
    const endsAt = poll["endsAt"] as Timestamp | null | undefined;
    const isOpen =
      poll["pollStatus"] === "open" &&
      (!endsAt || !(endsAt instanceof Timestamp) || endsAt.toMillis() > Date.now());

    const votes = normalizeVotes(poll["votesByTeam"]);
    let totalVotes =
      typeof poll["totalVotes"] === "number" ? (poll["totalVotes"] as number) : 0;

    // remove previous contribution
    if (beforeData?.counted === true && beforeData.team && beforeData.optionId) {
      bumpBucket(votes, beforeData.team, beforeData.optionId, -1);
      totalVotes -= 1;
    }

    if (afterData && afterData.team && afterData.optionId) {
      const alreadyCounted = afterData.counted === true;
      if (!isOpen && !alreadyCounted) {
        // reject fresh votes on closed polls
        if (afterSnap?.exists && afterSnap.ref) tx.delete(afterSnap.ref);
      } else if (!alreadyCounted) {
        bumpBucket(votes, afterData.team, afterData.optionId, 1);
        totalVotes += 1;
        if (afterSnap?.exists && afterSnap.ref) {
          tx.set(afterSnap.ref, { counted: true }, { merge: true });
        }
      }
    }

    totalVotes = Math.max(0, totalVotes);
    tx.update(pollRef, { votesByTeam: votes, totalVotes });
  });
});

export const onCommentCreated = onDocumentCreated("comments/{commentId}", async (event) => {
  const snap = event.data;
  if (!snap) return;

  const comment = snap.data() as DocumentData;
  const parentId = (comment["parentId"] as string | null) ?? null;
  const db = getFirestore();

  if (!parentId) {
    await snap.ref.update({ depth: 1, rootId: null });
    return;
  }

  const parentSnap = await db.collection("comments").doc(parentId).get();
  if (!parentSnap.exists) {
    await snap.ref.update({ parentId: null, rootId: null, depth: 1 });
    return;
  }

  const parent = parentSnap.data() as DocumentData;
  const parentDepth = typeof parent["depth"] === "number" ? (parent["depth"] as number) : 1;
  const effectiveDepth = parentDepth + 1;

  if (effectiveDepth > MAX_COMMENT_DEPTH) {
    await snap.ref.delete();
    return;
  }

  const rootId =
    typeof parent["rootId"] === "string" && parent["rootId"]
      ? (parent["rootId"] as string)
      : parentSnap.id;

  await snap.ref.update({ depth: effectiveDepth, rootId });
  await parentSnap.ref.update({ repliesCount: FieldValue.increment(1) });
});

interface ReportData {
  targetType?: string;
  targetId?: string;
  reporterId?: string;
}

async function moderationThreshold(): Promise<number> {
  const db = getFirestore();
  const snap = await db.collection("settings").doc("moderation").get();
  const value = snap.get("autoHideThreshold");
  return typeof value === "number" && value > 0 ? Math.round(value) : 0;
}

export const onReportCreated = onDocumentCreated("reports/{reportId}", async (event) => {
  const data = event.data?.data() as ReportData | undefined;
  if (!data) return;

  const { targetType, targetId, reporterId } = data;
  if (!targetType || !targetId) return;
  if (targetType !== "post" && targetType !== "comment") return;

  const db = getFirestore();
  const targetRef =
    targetType === "comment"
      ? db.collection("comments").doc(targetId)
      : db.collection("diwaniya").doc(targetId);

  const targetSnap = await targetRef.get();
  if (!targetSnap.exists) return;

  await targetRef.update({
    reportCount: FieldValue.increment(1),
    ...(reporterId ? { reportedBy: FieldValue.arrayUnion(reporterId) } : {}),
  });

  const threshold = await moderationThreshold();
  if (threshold <= 0) return;

  const currentCount =
    typeof targetSnap.get("reportCount") === "number"
      ? (targetSnap.get("reportCount") as number)
      : 0;

  if (currentCount + 1 >= threshold) {
    await targetRef.update({
      hidden: true,
      hiddenAt: FieldValue.serverTimestamp(),
      hiddenBy: AUTO_HIDE_MARKER,
    });
  }
});

function winningOptionId(poll: DocumentData): string | null {
  const options = (poll["options"] as { id: string }[] | undefined) ?? [];
  const votes = normalizeVotes(poll["votesByTeam"]);

  let bestId: string | null = null;
  let bestCount = -1;

  for (const option of options) {
    const count =
      (votes.barcelona[option.id] ?? 0) + (votes.realmadrid[option.id] ?? 0);
    if (count > bestCount) {
      bestCount = count;
      bestId = option.id;
    }
  }

  return bestCount > 0 ? bestId : null;
}

export const onPollExpired = onSchedule("every 1 minutes", async () => {
  const db = getFirestore();
  const now = Timestamp.now();

  const expired = await db
    .collection("diwaniya")
    .where("type", "==", "poll")
    .where("pollStatus", "==", "open")
    .where("endsAt", "<", now)
    .get();

  if (expired.empty) return;

  const batch = db.batch();
  for (const doc of expired.docs) {
    batch.update(doc.ref, {
      pollStatus: "closed",
      winningOptionId: winningOptionId(doc.data()),
    });
  }
  await batch.commit();

  console.log(`onPollExpired: closed ${expired.size} poll(s)`);
});
