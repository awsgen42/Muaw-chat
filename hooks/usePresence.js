"use client";
import { useEffect } from "react";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

// Heartbeat: writes lastSeen every 25s. Anyone with lastSeen < 45s ago is "online".
export default function usePresence(uid) {
  useEffect(() => {
    if (!uid) return;
    const ref = doc(db, "users", uid);
    const beat = () => updateDoc(ref, { lastSeen: serverTimestamp() }).catch(() => {});
    beat();
    const id = setInterval(beat, 25_000);
    const onVis = () => document.visibilityState === "visible" && beat();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [uid]);
}
