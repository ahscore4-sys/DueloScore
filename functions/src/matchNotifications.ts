import { onDocumentCreated, onDocumentUpdated } from "firebase-functions/v2/firestore";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import type { CallableRequest } from "firebase-functions/v2/https";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getMessaging, type Message } from "firebase-admin/messaging";

const FCM_TOPIC_BARCELONA = "barcelona_match";
const FCM_TOPIC_REALMADRID = "realmadrid_match";

const CHANNEL_MATCH = "match";
const CHANNEL_MATCH_SUMMARY = "match_summary";
const SOUND_START_END_CARDS_PENALTY = "start_end_cards_penalty_notify_sound";
const SOUND_SUMMARIES = "summaries_notify_sound";
const SUMMARY_EVENT_TYPES = new Set(["goal", "opp_goal", "og", "sub", "crossbar"]);

function matchNotificationChannel(eventType: string | undefined): { channelId: string; sound: string } {
  return eventType !== undefined && SUMMARY_EVENT_TYPES.has(eventType)
    ? { channelId: CHANNEL_MATCH_SUMMARY, sound: SOUND_SUMMARIES }
    : { channelId: CHANNEL_MATCH, sound: SOUND_START_END_CARDS_PENALTY };
}

interface TeamLike {
  id?: string;
  name?: string;
}

interface MatchLike {
  id?: string;
  home?: TeamLike;
  away?: TeamLike;
}

interface MatchEventNotif {
  type?: string;
  minute?: string;
  player?: string;
  playerOut?: string;
  team?: string;
  secondYellow?: boolean;
  penaltyMissCause?: string;
}

async function callerIsAdmin(request: CallableRequest): Promise<boolean> {
  const tokenRole = request.auth?.token?.role;
  if (tokenRole === "admin" || tokenRole === "super_admin") return true;

  const callerUid = request.auth?.uid;
  if (!callerUid) return false;

  const snap = await getFirestore().doc(`admins/${callerUid}`).get();
  if (!snap.exists) return false;
  const role = snap.get("role");
  if (role === "super_admin" || snap.get("super_admin") === true) return true;
  return role === "admin";
}

const isBarca = (id: unknown, name: unknown): boolean =>
  id === "barca" || (typeof name === "string" && /برشلونة|barcelona/i.test(name));

const isMadrid = (id: unknown, name: unknown): boolean =>
  id === "madrid" || (typeof name === "string" && /ريال مدريد|real\s*madrid/i.test(name));

function matchFanTopics(match: MatchLike): string[] {
  const topics: string[] = [];
  const home = match.home as TeamLike | undefined;
  const away = match.away as TeamLike | undefined;
  if (isBarca(home?.id, home?.name) || isBarca(away?.id, away?.name)) {
    topics.push(FCM_TOPIC_BARCELONA);
  }
  if (isMadrid(home?.id, home?.name) || isMadrid(away?.id, away?.name)) {
    topics.push(FCM_TOPIC_REALMADRID);
  }
  return topics;
}

function matchTitle(match: MatchLike): string {
  return `${match.home?.name ?? ""} × ${match.away?.name ?? ""}`;
}

function buildMatchEventBody(evt: MatchEventNotif, match: MatchLike): string {
  const minute = evt.minute ? ` — الدقيقة ${evt.minute}` : "";
  const teamName = evt.team === "away" ? (match.away?.name ?? "") : (match.home?.name ?? "");
  const player = evt.player ?? "";
  const playerLabel = player ? ` ${player}` : "";

  switch (evt.type) {
    case "goal": {
      const home = evt.team === "away" ? match.away?.name : match.home?.name;
      return `⚽ هدف!${playerLabel} يسجّل لصالح ${home ?? ""}${minute}`;
    }
    case "opp_goal": {
      const scoring = evt.team === "away" ? (match.home?.name ?? "") : (match.away?.name ?? "");
      return `⚽ هدف!${playerLabel} يسجّل لصالح ${scoring}${minute}`;
    }
    case "og":
      return `⚽ هدف عكسي!${playerLabel} يسجّل في مرمى فريقه — ${teamName}${minute}`;
    case "yellow":
      return `🟨 بطاقة صفراء | ${player || "لاعب"} (${teamName})${minute}`;
    case "red":
      return evt.secondYellow
        ? `🟥 بطاقة حمراء (صفراء ثانية) | ${player || "لاعب"} (${teamName})${minute}`
        : `🟥 بطاقة حمراء | ${player || "لاعب"} (${teamName})${minute}`;
    case "sub":
      return `🔁 تبديل | دخول ${player || "لاعب"} بدلاً من ${evt.playerOut ?? "لاعب"} (${teamName})${minute}`;
    case "crossbar":
      return `🥅 على العارضة!${playerLabel} (${teamName})${minute}`;
    case "pen_scored":
      return `⚽ هدف من ركلة جزاء | ${player || "لاعب"} (${teamName})${minute}`;
    case "pen_missed": {
      if (evt.penaltyMissCause === "saved") {
        return `🧤 تصدّى الحارس لركلة الجزاء! | ${player || "لاعب"} (${teamName})${minute}`;
      }
      if (evt.penaltyMissCause === "off_target") {
        return `❌ ركلة جزاء ضائعة! | ${player || "لاعب"} (${teamName})${minute}`;
      }
      return `❌ ركلة جزاء ضائعة | ${player || "لاعب"} (${teamName})${minute}`;
    }
    default:
      return `تحديث مباشر من مباراة ${match.home?.name ?? ""} × ${match.away?.name ?? ""}${minute}`;
  }
}

function buildMatchEventMessage(match: MatchLike, matchId: string, eventId: string, evt: MatchEventNotif, updated?: boolean): Message {
  const { channelId, sound } = matchNotificationChannel(evt.type);
  return {
    topic: "",
    notification: {
      title: matchTitle(match),
      body: buildMatchEventBody(evt, match),
    },
    android: {
      notification: {
        channelId,
        sound,
        clickAction: "OPEN_MATCH",
      },
    },
    data: {
      type: "match_event",
      matchId,
      eventId,
      eventType: evt.type ?? "",
      minute: evt.minute ?? "",
      ...(evt.penaltyMissCause ? { penaltyMissCause: evt.penaltyMissCause } : {}),
      ...(updated ? { updated: "1" } : {}),
    },
  };
}

function hasMeaningfulChange(before: MatchEventNotif, after: MatchEventNotif): boolean {
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  for (const key of keys) {
    if (key === "notifiedAt" || key === "varAssigned" || key === "varDecision" || key === "varDecisionCause") continue;
    if (JSON.stringify(before[key as keyof MatchEventNotif]) !== JSON.stringify(after[key as keyof MatchEventNotif])) {
      return true;
    }
  }
  return false;
}

async function fanOutMatchEvent(match: MatchLike, matchId: string, eventId: string, evt: MatchEventNotif, updated?: boolean): Promise<number> {
  const topics = matchFanTopics(match);
  if (topics.length === 0) return 0;
  const base = buildMatchEventMessage(match, matchId, eventId, evt, updated);
  for (const topic of topics) {
    try {
      await getMessaging().send({ ...base, topic });
    } catch (err) {
      console.error(`FCM match-event send failed: topic=${topic} match=${matchId}`, err);
      return 0;
    }
  }
  return topics.length;
}

export const onMatchEventCreated = onDocumentCreated(
  "matches/{matchId}/events/{eventId}",
  async (event) => {
    const { matchId, eventId } = event.params;
    const evt = (event.data?.data() ?? {}) as MatchEventNotif;
    if (!evt || evt.type === "phase" || evt.type === "var") return;

    const db = getFirestore();
    const matchSnap = await db.doc(`matches/${matchId}`).get();
    if (!matchSnap.exists) return;
    const match = matchSnap.data() as MatchLike;
    const sent = await fanOutMatchEvent(match, matchId, eventId, evt);
    if (sent === 0) return;

    await db
      .doc(`matches/${matchId}/events/${eventId}`)
      .update({ notifiedAt: FieldValue.serverTimestamp() })
      .catch(() => undefined);
  }
);

export const onMatchEventUpdated = onDocumentUpdated(
  "matches/{matchId}/events/{eventId}",
  async (event) => {
    const { matchId, eventId } = event.params;
    const before = (event.data?.before.data() ?? {}) as MatchEventNotif;
    const after = (event.data?.after.data() ?? {}) as MatchEventNotif;
    if (!after || after.type === "phase" || after.type === "var" || !before) return;
    if (!hasMeaningfulChange(before, after)) return;

    const db = getFirestore();
    const matchSnap = await db.doc(`matches/${matchId}`).get();
    if (!matchSnap.exists) return;
    const match = matchSnap.data() as MatchLike;
    const sent = await fanOutMatchEvent(match, matchId, eventId, after, true);
    if (sent === 0) return;

    await db
      .doc(`matches/${matchId}/events/${eventId}`)
      .update({ notifiedAt: FieldValue.serverTimestamp() })
      .catch(() => undefined);
  }
);

interface SendMatchFanInput {
  matchId?: string;
  kind?: "var" | "penalty_awarded" | "var_decision";
  eventType?: string;
  team?: "home" | "away";
  minute?: string;
  decision?: "error" | "no_error";
  cause?: string;
}

const VAR_CANCELLATION_CAUSES: Record<string, string> = {
  offside: "تسلل",
  foul: "مخالفة",
  handball: "لمسة يد",
  ball_line: "الكرة لم تتجاوز الخط",
};

function buildVarBody(eventType: string | undefined, minute: string | undefined, cause?: string): string {
  const minuteLabel = minute ? ` — الدقيقة ${minute}` : "";
  const causeLabel = cause ? ` (السبب: ${cause})` : "";
  if (eventType === "goal" || eventType === "og") {
    return `📹 الحكم يراجع تقنية الفيديو (VAR) لهدف المباراة${minuteLabel}${causeLabel}`;
  }
  if (eventType === "red") {
    return `📹 الحكم يراجع تقنية الفيديو (VAR) بخصوص البطاقة الحمراء${minuteLabel}${causeLabel}`;
  }
  if (eventType === "pen_scored" || eventType === "pen_missed") {
    return `📹 الحكم يراجع تقنية الفيديو (VAR) بخصوص ركلة الجزاء${minuteLabel}${causeLabel}`;
  }
  return `📹 الحكم يراجع تقنية الفيديو (VAR)${minuteLabel}${causeLabel}`;
}

function varSubject(eventType: string | undefined): string {
  if (eventType === "goal" || eventType === "og") return "الهدف";
  if (eventType === "red") return "البطاقة الحمراء";
  if (eventType === "pen_scored" || eventType === "pen_missed") return "ركلة الجزاء";
  if (eventType === "var") return "الحالة";
  return "الحدث";
}

function buildVarDecisionBody(eventType: string | undefined, minute: string | undefined, decision: "error" | "no_error" | undefined, cause?: string): string {
  const minuteLabel = minute ? ` — الدقيقة ${minute}` : "";
  const subject = varSubject(eventType);
  if (decision === "error") {
    const causeLabel = cause ? (VAR_CANCELLATION_CAUSES[cause] ?? cause) : undefined;
    const causePart = causeLabel ? ` (${causeLabel})` : "";
    const cancelPart = eventType === "var" ? "تم إلغاء الحالة" : "تم إلغاء الحدث";
    return `🚫 قرار الحكم بعد مراجعة VAR: يوجد خطأ في ${subject} — ${cancelPart}${causePart}${minuteLabel}`;
  }
  return `✅ قرار الحكم بعد مراجعة VAR: لا يوجد خطأ في ${subject} — القرار صحيح${minuteLabel}`;
}

function buildPenaltyAwardedBody(match: MatchLike, team: string | undefined, minute: string | undefined): string {
  const teamName = team === "away" ? (match.away?.name ?? "") : (match.home?.name ?? "");
  const minuteLabel = minute ? ` — الدقيقة ${minute}` : "";
  return `🎯 ركلة جزاء لصالح ${teamName}!${minuteLabel}`;
}

export const sendMatchFanNotification = onCall(async (request) => {
  if (!(await callerIsAdmin(request))) {
    throw new HttpsError("permission-denied", "Admin privileges required.");
  }

  const input = (request.data ?? {}) as SendMatchFanInput;
  if (!input.matchId) {
    throw new HttpsError("invalid-argument", "matchId is required.");
  }
  const validKinds: SendMatchFanInput["kind"][] = ["var", "penalty_awarded", "var_decision"];
  if (!input.kind || !validKinds.includes(input.kind)) {
    throw new HttpsError("invalid-argument", "kind must be 'var', 'penalty_awarded' or 'var_decision'.");
  }
  if (input.kind === "var_decision" && input.decision !== "error" && input.decision !== "no_error") {
    throw new HttpsError("invalid-argument", "decision must be 'error' or 'no_error' for var_decision.");
  }
  if (
    input.kind === "var_decision" &&
    input.decision === "error" &&
    input.eventType !== "var" &&
    !(input.cause && input.cause in VAR_CANCELLATION_CAUSES)
  ) {
    throw new HttpsError("invalid-argument", "cause must be one of the VAR cancellation causes for an error decision.");
  }

  const db = getFirestore();
  const matchSnap = await db.doc(`matches/${input.matchId}`).get();
  if (!matchSnap.exists) {
    throw new HttpsError("not-found", "Match not found.");
  }
  const match = matchSnap.data() as MatchLike;

  const topics = matchFanTopics(match);
  if (topics.length === 0) {
    return { ok: true, skipped: true, sentCount: 0, target: [] };
  }

  const title = matchTitle(match);
  const body = input.kind === "penalty_awarded"
    ? buildPenaltyAwardedBody(match, input.team, input.minute)
    : input.kind === "var_decision"
      ? buildVarDecisionBody(input.eventType, input.minute, input.decision, input.cause)
      : buildVarBody(input.eventType, input.minute, input.cause);

  const dataType = input.kind === "penalty_awarded"
    ? "match_penalty"
    : input.kind === "var_decision"
      ? "match_var_decision"
      : "match_var";

  for (const topic of topics) {
    const msg: Message = {
      topic,
      notification: { title, body },
      android: {
        notification: {
          channelId: CHANNEL_MATCH,
          sound: SOUND_START_END_CARDS_PENALTY,
          clickAction: "OPEN_MATCH",
        },
      },
      data: {
        type: dataType,
        matchId: input.matchId,
        eventType: input.eventType ?? "",
        team: input.team ?? "",
        minute: input.minute ?? "",
        ...(input.kind === "var_decision" ? { decision: input.decision ?? "" } : {}),
        ...(input.cause ? { cause: input.cause } : {}),
      },
    };
    try {
      await getMessaging().send(msg);
    } catch (err) {
      console.error(`FCM match-fan send failed: topic=${topic} match=${input.matchId}`, err);
      return { ok: false, sentCount: 0, error: String(err) };
    }
  }

  return { ok: true, sentCount: topics.length, target: topics };
});