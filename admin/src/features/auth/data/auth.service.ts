import { signInWithEmailAndPassword, signOut as firebaseSignOut, onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '@/core/data/firebase'
import type { AuthUser } from '../domain/auth.types'
import type { UserRole } from '@/core/domain/types'

export function login(email: string, password: string) {
  return signInWithEmailAndPassword(auth, email, password)
}

export function logout() {
  return firebaseSignOut(auth)
}

export function onAuthChange(callback: (user: AuthUser | null) => void) {
  return onAuthStateChanged(auth, (firebaseUser) => {
    if (firebaseUser) {
      callback({
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName,
        photoURL: firebaseUser.photoURL,
      })
    } else {
      callback(null)
    }
  })
}

export async function getAdminRole(uid: string): Promise<{ name: string; role: UserRole; permissions: string[] } | null> {
  const snap = await getDoc(doc(db, 'admins', uid))
  if (!snap.exists()) return null
  const data = snap.data()
  const role: UserRole = (data.role as UserRole) ?? (data.super_admin ? 'super_admin' : 'admin')
  const permissions = Array.isArray(data.permissions) ? (data.permissions as string[]) : []
  return {
    name: data.name as string,
    role,
    permissions,
  }
}
