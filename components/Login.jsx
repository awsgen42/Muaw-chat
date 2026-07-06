"use client";
import { motion } from "framer-motion";
import { signInWithPopup, signInWithRedirect } from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";

export default function Login() {
  const signIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch {
      // Popup blockers on some Android browsers → fall back to redirect
      await signInWithRedirect(auth, googleProvider);
    }
  };

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-8 relative overflow-hidden">
      <div
        className="absolute inset-0 opacity-40 pointer-events-none"
        style={{
          background:
            "radial-gradient(600px 400px at 50% -10%, rgba(77,159,255,.22), transparent), radial-gradient(500px 400px at 90% 110%, rgba(29,78,216,.16), transparent)",
        }}
      />
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 flex flex-col items-center text-center"
      >
        <div className="w-20 h-20 rounded-3xl bubble-me flex items-center justify-center text-4xl font-display font-bold shadow-[0_8px_40px_rgba(77,159,255,.4)]">
          M
        </div>
        <h1 className="font-display text-4xl font-bold mt-6 tracking-tight">MUAW</h1>
        <p className="text-mist mt-2 max-w-xs">
          End-to-end encrypted messaging. Voice, media, reactions — sirf hum dono ke liye.
        </p>
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={signIn}
          className="mt-10 flex items-center gap-3 glass rounded-2xl px-6 py-4 font-medium active:opacity-80"
        >
          <svg width="20" height="20" viewBox="0 0 48 48">
            <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3l5.7-5.7C34.3 6.1 29.4 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z"/>
            <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3l5.7-5.7C34.3 6.1 29.4 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
            <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.5-5.2l-6.2-5.3C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.6 39.6 16.3 44 24 44z"/>
            <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.1 5.6l6.2 5.3C41.4 35.4 44 30.1 44 24c0-1.3-.1-2.6-.4-3.9z"/>
          </svg>
          Continue with Google
        </motion.button>
      </motion.div>
    </div>
  );
}
