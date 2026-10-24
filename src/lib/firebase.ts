// Firebase is optional. Without VITE_FIREBASE_* the app runs on localStorage only,
// and the SDK is never downloaded (it is dynamically imported into its own chunk).
import type { FirebaseApp } from "firebase/app";
import type { Auth } from "firebase/auth";
import type { Firestore } from "firebase/firestore";

const env = import.meta.env;
const config = {
  apiKey: env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  projectId: env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET as string | undefined,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined,
  appId: env.VITE_FIREBASE_APP_ID as string | undefined,
};

export const firebaseConfigured = Boolean(config.apiKey && config.projectId);

export type Fb = {
  app: FirebaseApp;
  db: Firestore;
  auth: Auth;
  fs: typeof import("firebase/firestore");
  authMod: typeof import("firebase/auth");
};

let fbPromise: Promise<Fb | null> | null = null;

export function getFirebase(): Promise<Fb | null> {
  if (!firebaseConfigured) return Promise.resolve(null);
  fbPromise ??= (async () => {
    try {
      const [appMod, authMod, fs] = await Promise.all([
        import("firebase/app"),
        import("firebase/auth"),
        import("firebase/firestore"),
      ]);
      const app = appMod.initializeApp(config);
      let db: Firestore;
      try {
        db = fs.initializeFirestore(app, {
          localCache: fs.persistentLocalCache({ tabManager: fs.persistentMultipleTabManager() }),
        });
      } catch {
        db = fs.getFirestore(app);
      }
      const auth = authMod.getAuth(app);
      await auth.authStateReady();
      return { app, db, auth, fs, authMod };
    } catch (err) {
      console.warn("Firebase unavailable, using localStorage only", err);
      return null;
    }
  })();
  return fbPromise;
}

/** Participant identity: anonymous auth (keeps an existing researcher sign-in). */
export async function ensureUser(fb: Fb): Promise<string> {
  if (!fb.auth.currentUser) await fb.authMod.signInAnonymously(fb.auth);
  return fb.auth.currentUser!.uid;
}
