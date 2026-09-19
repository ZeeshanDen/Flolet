import { initializeApp } from "firebase/app";
// @ts-expect-error — getReactNativePersistence has no TS export in the RN entry
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import { initializeFirestore } from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Same public web config the PWA uses (client config, not a secret).
const firebaseConfig = {
  apiKey: "AIzaSyDQCPJum7C8jb4G0sNqH8JVt0FTE9EfJNM",
  authDomain: "flowlet-dev.firebaseapp.com",
  projectId: "flowlet-dev",
  storageBucket: "flowlet-dev.firebasestorage.app",
  messagingSenderId: "1066663145815",
  appId: "1:1066663145815:web:5d89f04e04fd9390718e12",
};

export const app = initializeApp(firebaseConfig);

// RN: persist auth in AsyncStorage so sign-in survives restarts.
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

// RN networking can choke on Firestore's streaming transport — auto-detect.
export const db = initializeFirestore(app, {
  experimentalAutoDetectLongPolling: true,
});
