import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import type { CallableRequest } from "firebase-functions/v2/https";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { getMessaging, type MulticastMessage } from "firebase-admin/messaging";

interface PushNotificationDoc {
  title?: string;
  body?: string;
  imageUrl?: string;
  deepLink?: string;
  target?: string;
}

async function deliverNotification(notificationId: string): Promise<{ ok: boolean; sentCount: number; error?: string }> {
  const db = getFirestore();
  const messaging = getMessaging();
  const ref = db.doc(`push_notifications/${notificationId}`);
  const snap = await ref.get();
  if (!snap.exists) {
    return { ok: false, sentCount: 0, error: "notification not found" };
  }

  const data = snap.data() as PushNotificationDoc;
  const title = data.title ?? "DueloScore";
  const body = data.body ?? "";
  const target = data.target ?? "all";

  let userQuery: FirebaseFirestore.Query;
  if (target === "barcelona") {
    userQuery = db.collection("users").where("favoriteTeam", "==", "barcelona");
  } else if (target === "realmadrid") {
    userQuery = db.collection("users").where("favoriteTeam", "==", "realmadrid");
  } else {
    userQuery = db.collection("users");
  }

  const userSnap = await userQuery.get();
  const tokens: string[] = [];
  for (const d of userSnap.docs) {
    const devices = d.get("devices");
    if (Array.isArray(devices)) {
      for (const device of devices) {
        const token = (device as { token?: string })?.token;
        if (typeof token === "string" && token.length > 0) {
          tokens.push(token);
        }
      }
    }
  }

  if (tokens.length === 0) {
    await ref.update({ status: "sent", sentAt: Timestamp.now(), "stats.sentCount": 0 });
    return { ok: true, sentCount: 0 };
  }

  let sentCount = 0;
  try {
    const message: MulticastMessage = {
      tokens,
      notification: { title, body },
      data: data.deepLink ? { deepLink: data.deepLink } : undefined,
    };
    if (data.imageUrl) {
      message.android = { notification: { channelId: "general", imageUrl: data.imageUrl } };
    }
    const response = await messaging.sendEachForMulticast(message);
    sentCount = response.successCount;
  } catch (err) {
    await ref.update({ status: "failed" });
    return { ok: false, sentCount, error: String(err) };
  }

  await ref.update({ status: "sent", sentAt: Timestamp.now(), "stats.sentCount": sentCount });
  return { ok: true, sentCount };
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

export const sendPushNotification = onCall(async (request) => {
  if (!(await callerIsAdmin(request))) {
    throw new HttpsError("permission-denied", "Admin privileges required.");
  }

  const notificationId = request.data?.notificationId as string | undefined;
  if (!notificationId) {
    throw new HttpsError("invalid-argument", "notificationId is required.");
  }

  const result = await deliverNotification(notificationId);
  return result;
});

export const sendScheduledNotifications = onSchedule("every 1 minutes", async () => {
  const db = getFirestore();
  const now = Timestamp.now();
  const snap = await db
    .collection("push_notifications")
    .where("status", "==", "scheduled")
    .where("scheduledAt", "<=", now)
    .get();

  for (const d of snap.docs) {
    const id = d.id;
    const current = await db.doc(`push_notifications/${id}`).get();
    if (!current.exists || current.get("status") !== "scheduled") continue;
    await deliverNotification(id);
  }
});
