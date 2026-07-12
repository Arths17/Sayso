import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type Auth,
  type User,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const authDisabled = process.env.NEXT_PUBLIC_AUTH_DISABLED === "1";

let app: FirebaseApp | null = null;
let auth: Auth | null = null;

if (!authDisabled && firebaseConfig.apiKey) {
  app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  auth = getAuth(app);
}

export function isAuthDisabled(): boolean {
  return authDisabled;
}

export function getFirebaseAuth(): Auth | null {
  return auth;
}

export async function signInWithGoogle(): Promise<User> {
  if (!auth) throw new Error("Firebase auth is not configured");
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(auth, provider);
  return result.user;
}

export async function signOut(): Promise<void> {
  if (!auth) return;
  await firebaseSignOut(auth);
}

export function subscribeToAuth(cb: (user: User | null) => void): () => void {
  if (!auth) {
    cb(null);
    return () => {};
  }
  return onAuthStateChanged(auth, cb);
}

export async function getIdToken(): Promise<string | null> {
  if (authDisabled) return null;
  if (!auth?.currentUser) return null;
  return auth.currentUser.getIdToken();
}
