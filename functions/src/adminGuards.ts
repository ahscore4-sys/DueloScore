import { db } from './firebase';
import type { CallableRequest } from 'firebase-functions/v2/https';

export async function callerIsSuperAdmin(uid: string | undefined): Promise<boolean> {
  if (!uid) return false;
  const snap = await db.doc(`admins/${uid}`).get();
  if (!snap.exists) return false;
  const role = snap.get("role");
  return role === "super_admin" || snap.get("super_admin") === true;
}

export async function callerIsAdmin(request: CallableRequest): Promise<boolean> {
  const tokenRole = request.auth?.token?.role;
  if (tokenRole === "admin" || tokenRole === "super_admin") return true;

  const callerUid = request.auth?.uid;
  if (!callerUid) return false;

  const snap = await db.doc(`admins/${callerUid}`).get();
  if (!snap.exists) return false;
  const role = snap.get("role");
  if (role === "super_admin" || snap.get("super_admin") === true) return true;
  return role === "admin";
}