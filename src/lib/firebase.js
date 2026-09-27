import { getApp, getApps, initializeApp } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  deleteUser,
  getAuth,
  inMemoryPersistence,
  setPersistence,
  signOut,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const firebaseConfigured = Object.values(firebaseConfig).every(Boolean);

export const firebaseApp = firebaseConfigured
  ? getApps().length
    ? getApp()
    : initializeApp(firebaseConfig)
  : null;

export const firebaseAuth = firebaseApp ? getAuth(firebaseApp) : null;
export const firestore = firebaseApp ? getFirestore(firebaseApp) : null;
export const storage = firebaseApp ? getStorage(firebaseApp) : null;

const STAFF_CREATOR_APP = "tita-mars-staff-creator";

export async function createStaffAuthUser(email, password) {
  if (!firebaseConfigured)
    throw new Error("Firebase is not configured for this build.");

  const existingApp = getApps().find((app) => app.name === STAFF_CREATOR_APP);
  const app = existingApp || initializeApp(firebaseConfig, STAFF_CREATOR_APP);
  const auth = getAuth(app);
  await setPersistence(auth, inMemoryPersistence);
  if (auth.currentUser) await signOut(auth);

  const credential = await createUserWithEmailAndPassword(
    auth,
    email.trim().toLowerCase(),
    password,
  );

  return {
    uid: credential.user.uid,
    email: credential.user.email || email.trim().toLowerCase(),
    finish: () => signOut(auth),
    discard: () => deleteUser(credential.user),
  };
}
