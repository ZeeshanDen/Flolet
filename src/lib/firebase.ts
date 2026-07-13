import { initializeApp } from "firebase/app";
import {
  getAuth,
  connectAuthEmulator,
  GoogleAuthProvider,
} from "firebase/auth";
import {
  initializeFirestore,
  connectFirestoreEmulator,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";

const env = import.meta.env;

// Real config comes from env once the user provides Firebase access.
// Until then these placeholders let the emulator run locally.
const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || "demo-api-key",
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || "flowlet-dev.firebaseapp.com",
  projectId: env.VITE_FIREBASE_PROJECT_ID || "flowlet-dev",
  storageBucket:
    env.VITE_FIREBASE_STORAGE_BUCKET || "flowlet-dev.firebasestorage.app",
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || "0",
  appId: env.VITE_FIREBASE_APP_ID || "demo-app-id",
};

// Use the emulator only when no real project is configured, or when forced.
// With real creds present, dev connects to the real project too.
export const usingEmulator =
  env.VITE_USE_EMULATOR === "true" || !env.VITE_FIREBASE_PROJECT_ID;

export const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Offline persistence ON — instant, offline-capable expense entry.
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
});

if (usingEmulator) {
  // Guard against double-connect during HMR.
  const w = globalThis as unknown as { __emuConnected?: boolean };
  if (!w.__emuConnected) {
    connectAuthEmulator(auth, "http://127.0.0.1:9877", {
      disableWarnings: true,
    });
    connectFirestoreEmulator(db, "127.0.0.1", 8567);
    w.__emuConnected = true;
  }
}
