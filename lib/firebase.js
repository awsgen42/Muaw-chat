import { initializeApp, getApps } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { initializeFirestore, persistentLocalCache } from "firebase/firestore";

// ⬇️⬇️ PASTE YOUR FIREBASE CONFIG HERE (from Firebase console → Project settings → Your apps → Web app)
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "muaw-81cb2.firebaseapp.com",
  projectId: "muaw-81cb2",
  storageBucket: "muaw-81cb2.firebasestorage.app",
  messagingSenderId: "435387380983",
  appId: "1:435387380983:web:f02d45e87e7f2710ee0ff2"
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = initializeFirestore(app, { localCache: persistentLocalCache() });
