"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { fmtLastSeen } from "@/lib/helpers";

export default function Profile({ uid, me, onClose }) {
  const [u, setU] = useState(null);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const mine = uid === me.uid;

  useEffect(() => {
    return onSnapshot(doc(db, "users", uid), (s) => {
      if (s.exists()) {
        const d = s.data();
        setU(d); setName(d.name || ""); setBio(d.bio || "");
      }
    });
  }, [uid]);

  const save = async () => {
    await updateDoc(doc(db, "users", uid), {
      name: name.trim() || "User",
      nameLower: (name.trim() || "user").toLowerCase(),
      bio: bio.trim(),
    });
    setEditing(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/60 flex items-end md:items-center justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}
        transition={{ type: "spring", stiffness: 400, damping: 34 }}
        onClick={(e) => e.stopPropagation()}
        className="glass w-full md:w-[420px] rounded-t-3xl md:rounded-3xl p-6 pb-10"
      >
        <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mb-5 md:hidden" />
        {u ? (
          <div className="flex flex-col items-center text-center">
            {u.photo ? (
              <img src={u.photo} alt="" referrerPolicy="no-referrer" className="w-24 h-24 rounded-full object-cover ring-2 ring-gold/50" />
            ) : (
              <div className="w-24 h-24 rounded-full bubble-me flex items-center justify-center font-display text-4xl font-bold">
                {(u.name || "?")[0]}
              </div>
            )}

            {editing ? (
              <div className="w-full mt-5 space-y-3 text-left">
                <label className="block text-xs text-mist">Display name
                  <input value={name} onChange={(e) => setName(e.target.value)} maxLength={40}
                    className="mt-1 w-full bg-white/5 rounded-xl px-4 py-3 outline-none" />
                </label>
                <label className="block text-xs text-mist">Bio
                  <textarea value={bio} onChange={(e) => setBio(e.target.value)} maxLength={140} rows={3}
                    className="mt-1 w-full bg-white/5 rounded-xl px-4 py-3 outline-none resize-none" />
                </label>
                <div className="flex gap-2 pt-1">
                  <button onClick={() => setEditing(false)} className="flex-1 py-3 rounded-xl bg-white/5">Cancel</button>
                  <button onClick={save} className="flex-1 py-3 rounded-xl bubble-me font-semibold">Save changes</button>
                </div>
              </div>
            ) : (
              <>
                <h2 className="font-display text-2xl font-bold mt-4">{u.name}</h2>
                <p className="text-gold text-sm mt-0.5">{fmtLastSeen(u.lastSeen)}</p>
                <p className="text-mist text-sm mt-3 max-w-xs">{u.bio || (mine ? "Add a bio…" : "")}</p>
                <p className="text-mist/60 text-xs mt-4">{u.email}</p>
                {mine && (
                  <button onClick={() => setEditing(true)} className="mt-6 px-6 py-3 rounded-xl bubble-me font-semibold">
                    Edit profile
                  </button>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="h-40 animate-pulse" />
        )}
      </motion.div>
    </motion.div>
  );
}
