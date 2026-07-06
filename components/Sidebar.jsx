"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  collection, query, where, onSnapshot, getDocs, limit, doc, getDoc,
} from "firebase/firestore";
import { signOut } from "firebase/auth";
import { db, auth } from "@/lib/firebase";
import Icon from "./Icons";
import { chatIdFor, fmtTime, isOnline } from "@/lib/helpers";

function Avatar({ user, size = 48 }) {
  return (
    <div className="relative shrink-0">
      {user?.photo ? (
        <img
          src={user.photo}
          alt=""
          referrerPolicy="no-referrer"
          className="rounded-full object-cover"
          style={{ width: size, height: size }}
        />
      ) : (
        <div
          className="rounded-full bubble-me flex items-center justify-center font-display font-bold"
          style={{ width: size, height: size }}
        >
          {(user?.name || "?")[0]}
        </div>
      )}
      {isOnline(user?.lastSeen) && (
        <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-400 ring-2 ring-ink" />
      )}
    </div>
  );
}

export default function Sidebar({ me, activeChatId, onOpenChat, onOpenProfile, dark, toggleDark }) {
  const [chats, setChats] = useState([]);
  const [others, setOthers] = useState({}); // uid -> userDoc
  const [q, setQ] = useState("");
  const [results, setResults] = useState(null);

  // Live chat list
  useEffect(() => {
    const qy = query(collection(db, "chats"), where("members", "array-contains", me.uid));
    return onSnapshot(qy, (snap) => {
      const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      rows.sort((a, b) => (b.updatedAt?.toMillis?.() || 0) - (a.updatedAt?.toMillis?.() || 0));
      setChats(rows);
    });
  }, [me.uid]);

  // Live profiles of chat partners
  useEffect(() => {
    const uids = [...new Set(chats.map((c) => c.members.find((m) => m !== me.uid)).filter(Boolean))];
    const unsubs = uids.map((uid) =>
      onSnapshot(doc(db, "users", uid), (s) => {
        if (s.exists()) setOthers((p) => ({ ...p, [uid]: s.data() }));
      })
    );
    return () => unsubs.forEach((u) => u());
  }, [chats, me.uid]);

  // User search (prefix on lowercase name, plus exact email)
  useEffect(() => {
    if (!q.trim()) { setResults(null); return; }
    const t = setTimeout(async () => {
      const term = q.trim().toLowerCase();
      const byName = query(
        collection(db, "users"),
        where("nameLower", ">=", term),
        where("nameLower", "<=", term + "\uf8ff"),
        limit(10)
      );
      const byEmail = query(collection(db, "users"), where("email", "==", term), limit(3));
      const [a, b] = await Promise.all([getDocs(byName), getDocs(byEmail)]);
      const map = {};
      [...a.docs, ...b.docs].forEach((d) => { if (d.id !== me.uid) map[d.id] = d.data(); });
      setResults(Object.values(map));
    }, 350);
    return () => clearTimeout(t);
  }, [q, me.uid]);

  const openWith = async (other) => {
    const id = chatIdFor(me.uid, other.uid);
    const snap = await getDoc(doc(db, "users", other.uid));
    onOpenChat({ id, other: snap.exists() ? snap.data() : other });
    setQ(""); setResults(null);
  };

  const preview = (c) => {
    const lm = c.lastMessage;
    if (!lm) return "Say salaam 👋";
    const mine = lm.from === me.uid ? "You: " : "";
    const map = { image: "📷 Photo", video: "🎬 Video", audio: "🎙️ Voice message", file: "📎 File", sticker: "💙 Sticker" };
    if (map[lm.type]) return mine + map[lm.type];
    return mine + (lm.enc ? "🔒 Message" : lm.text || "🔒 Message");
  };

  return (
    <div className="flex flex-col h-full">
      <header className="glass px-5 pt-5 pb-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl font-bold tracking-tight">
            MUAW<span className="text-gold">.</span>
          </h1>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleDark}
              aria-label="Toggle theme"
              className="w-10 h-10 rounded-full glass flex items-center justify-center text-mist"
            >
              <Icon name={dark ? "sun" : "moon"} size={19} />
            </button>
            <button onClick={() => onOpenProfile(me.uid)} aria-label="My profile">
              <Avatar user={{ name: me.displayName, photo: me.photoURL }} size={40} />
            </button>
          </div>
        </div>
        <div className="mt-4 relative">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search people by name or email…"
            className="w-full glass rounded-2xl px-4 py-3 text-sm outline-none placeholder:text-mist focus:border-gold/40"
          />
          {q && (
            <button
              onClick={() => { setQ(""); setResults(null); }}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-mist"
            ><Icon name="x" size={16} /></button>
          )}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto scroll-thin px-2 pb-6">
        {results !== null ? (
          <>
            <p className="px-3 pt-4 pb-2 text-xs uppercase tracking-widest text-mist">People</p>
            {results.length === 0 && (
              <p className="px-3 text-sm text-mist">No one found. They need to sign in once first.</p>
            )}
            {results.map((u) => (
              <button
                key={u.uid}
                onClick={() => openWith(u)}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-2xl active:bg-white/5 text-left"
              >
                <Avatar user={u} />
                <div className="min-w-0">
                  <p className="font-medium truncate">{u.name}</p>
                  <p className="text-xs text-mist truncate">{u.email}</p>
                </div>
              </button>
            ))}
          </>
        ) : (
          <>
            {chats.length === 0 && (
              <div className="px-5 pt-16 text-center text-mist text-sm">
                No conversations yet.<br />Search a name above to start one.
              </div>
            )}
            {chats.map((c, i) => {
              const otherUid = c.members.find((m) => m !== me.uid);
              const other = others[otherUid] || { name: "…", uid: otherUid };
              const unread = c.lastMessage && c.lastMessage.from !== me.uid && !(c.lastMessage.readBy || []).includes(me.uid);
              return (
                <motion.button
                  key={c.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.03, 0.3) }}
                  onClick={() => onOpenChat({ id: c.id, other })}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-2xl text-left active:bg-white/5 ${activeChatId === c.id ? "bg-white/5" : ""}`}
                >
                  <Avatar user={other} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="font-medium truncate">{other.name}</p>
                      <span className="text-[11px] text-mist shrink-0">{fmtTime(c.updatedAt)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-sm truncate ${unread ? "text-zinc-100 font-medium" : "text-mist"}`}>
                        {preview(c)}
                      </p>
                      {unread && <span className="w-2.5 h-2.5 rounded-full bg-gold shrink-0" />}
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </>
        )}
      </div>

      <footer className="px-5 py-3 border-t border-edge flex items-center justify-between">
        <span className="text-xs text-mist truncate">{me.email}</span>
        <button onClick={() => signOut(auth)} className="text-xs text-gold font-medium">
          Sign out
        </button>
      </footer>
    </div>
  );
}
