import { initializeApp, getApps } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { initializeFirestore, persistentLocalCache } from "firebase/firestore";

const firebaseConfig = {
<<<<<<< HEAD
  apiKey: "AIzaSyAS3V3Zilgip3cJ4mjFz84mE-ej2Qyn2NY",
=======
  apiKey: "AIzaSy...",
>>>>>>> f2728a45e0ae9413d94b684c9d02900f64194fbf
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
