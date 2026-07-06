"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  collection, query, orderBy, onSnapshot, doc, writeBatch, updateDoc, arrayUnion, limitToLast,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { fmtLastSeen, isOnline, dayLabel } from "@/lib/helpers";
import { deriveKey, decryptStr, savePass, loadPass } from "@/lib/crypto";
import Icon from "./Icons";
import Message from "./Message";
import Composer from "./Composer";

function KeyGate({ chatId, otherName, onReady }) {
  const [pass, setPass] = useState("");
  const submit = async () => {
    if (pass.length < 4) return;
    savePass(chatId, pass);
    onReady(await deriveKey(pass, chatId));
  };
  return (
    <div className="flex-1 flex items-center justify-center px-8">
      <motion.div
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        className="glass rounded-3xl p-6 w-full max-w-sm text-center"
      >
        <div className="mb-3 flex justify-center text-gold"><Icon name="lock" size={40} strokeWidth={1.6} /></div>
        <h3 className="font-display font-bold text-lg">End-to-end encryption</h3>
        <p className="text-mist text-sm mt-2">
          Set a chat secret. {otherName} must enter the <b>same secret</b> on their phone.
          It never leaves your device — only ciphertext reaches the server.
        </p>
        <input
          type="password"
          value={pass}
          onChange={(e) => setPass(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Chat secret (min 4 chars)"
          className="mt-4 w-full bg-white/5 rounded-xl px-4 py-3 outline-none text-center"
        />
        <button onClick={submit} disabled={pass.length < 4}
          className="mt-3 w-full py-3 rounded-xl bubble-me font-semibold disabled:opacity-40">
          Unlock chat
        </button>
      </motion.div>
    </div>
  );
}

export default function Chat({ me, chat, onBack, onOpenProfile }) {
  const [raw, setRaw] = useState([]);
  const [messages, setMessages] = useState([]);
  const [other, setOther] = useState(chat.other);
  const [chatDoc, setChatDoc] = useState(null);
  const [replyTo, setReplyTo] = useState(null);
  const [search, setSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [cryptoKey, setCryptoKey] = useState(null);
  const [keyChecked, setKeyChecked] = useState(false);
  const endRef = useRef(null);

  // Load saved chat secret → derive key
  useEffect(() => {
    (async () => {
      const pass = loadPass(chat.id);
      if (pass) setCryptoKey(await deriveKey(pass, chat.id));
      setKeyChecked(true);
    })();
  }, [chat.id]);

  useEffect(() => {
    if (!chat.other?.uid) return;
    return onSnapshot(doc(db, "users", chat.other.uid), (s) => s.exists() && setOther(s.data()));
  }, [chat.other?.uid]);

  useEffect(() => {
    return onSnapshot(doc(db, "chats", chat.id), (s) => setChatDoc(s.exists() ? s.data() : null));
  }, [chat.id]);

  useEffect(() => {
    const qy = query(
      collection(db, "chats", chat.id, "messages"),
      orderBy("createdAt", "asc"),
      limitToLast(200)
    );
    return onSnapshot(qy, (snap) => setRaw(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
  }, [chat.id]);

  // Decrypt incoming ciphertext
  useEffect(() => {
    let alive = true;
    (async () => {
      const out = [];
      for (const m of raw) {
        if (!m.enc) { out.push(m); continue; }
        if (!cryptoKey) { out.push({ ...m, text: "🔒 Encrypted message", data: null, locked: true }); continue; }
        try {
          const d = { ...m };
          if (m.text) d.text = await decryptStr(cryptoKey, m.text);
          if (m.data) d.data = await decryptStr(cryptoKey, m.data);
          if (m.replyTo?.text) d.replyTo = { ...m.replyTo, text: await decryptStr(cryptoKey, m.replyTo.text) };
          out.push(d);
        } catch {
          out.push({ ...m, text: "🔒 Can't decrypt — wrong chat secret", data: null, locked: true });
        }
      }
      if (alive) setMessages(out);
    })();
    return () => { alive = false; };
  }, [raw, cryptoKey]);

  // Read receipts
  useEffect(() => {
    const unread = raw.filter((m) => m.from !== me.uid && !(m.readBy || []).includes(me.uid));
    if (!unread.length) return;
    const batch = writeBatch(db);
    unread.forEach((m) =>
      batch.update(doc(db, "chats", chat.id, "messages", m.id), { readBy: arrayUnion(me.uid) })
    );
    batch.commit().catch(() => {});
    if (chatDoc?.lastMessage)
      updateDoc(doc(db, "chats", chat.id), { "lastMessage.readBy": arrayUnion(me.uid) }).catch(() => {});
  }, [raw, chat.id, me.uid]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.length]);

  const otherTyping = useMemo(() => {
    const ts = chatDoc?.typing?.[other?.uid];
    if (!ts) return false;
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return Date.now() - d.getTime() < 4000;
  }, [chatDoc, other]);

  const visible = useMemo(() => {
    if (!search.trim()) return messages;
    const t = search.toLowerCase();
    return messages.filter((m) => (m.text || m.fileName || "").toLowerCase().includes(t));
  }, [messages, search]);

  return (
    <div className="flex flex-col h-full min-w-0">
      <header className="glass px-3 py-2.5 flex items-center gap-2 z-10">
        <button onClick={onBack} aria-label="Back" className="md:hidden w-10 h-10 flex items-center justify-center text-mist"><Icon name="back" /></button>
        <button onClick={() => onOpenProfile(other?.uid)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
          {other?.photo ? (
            <img src={other.photo} alt="" referrerPolicy="no-referrer" className="w-10 h-10 rounded-full object-cover" />
          ) : (
            <div className="w-10 h-10 rounded-full bubble-me flex items-center justify-center font-display font-bold">
              {(other?.name || "?")[0]}
            </div>
          )}
          <div className="min-w-0">
            <p className="font-display font-semibold truncate leading-tight">
              {other?.name} <Icon name="lock" size={12} className="inline -mt-0.5 text-mist" />
            </p>
            <p className={`text-xs leading-tight ${otherTyping || isOnline(other?.lastSeen) ? "text-gold" : "text-mist"}`}>
              {otherTyping ? "typing…" : fmtLastSeen(other?.lastSeen)}
            </p>
          </div>
        </button>
        <button
          onClick={() => { setSearching((s) => !s); setSearch(""); }}
          aria-label="Search messages"
          className={`w-10 h-10 rounded-full flex items-center justify-center ${searching ? "text-gold" : "text-mist"}`}
        ><Icon name="search" size={19} /></button>
      </header>

      {searching && (
        <div className="px-3 py-2 glass">
          <input autoFocus value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search in this chat…"
            className="w-full bg-transparent outline-none text-sm placeholder:text-mist" />
        </div>
      )}

      {keyChecked && !cryptoKey ? (
        <KeyGate chatId={chat.id} otherName={other?.name || "They"} onReady={setCryptoKey} />
      ) : (
        <>
          <div className="flex-1 overflow-y-auto overflow-x-hidden scroll-thin px-3 py-4 space-y-1 chat-wall">
            <div className="flex justify-center mb-2">
              <span className="glass text-[11px] text-mist px-3 py-1.5 rounded-full inline-flex items-center gap-1.5">
                <Icon name="lock" size={11} /> Messages are end-to-end encrypted (AES-256-GCM)
              </span>
            </div>
            {visible.map((m, i) => {
              const prev = visible[i - 1];
              const showDay = !prev || dayLabel(prev.createdAt) !== dayLabel(m.createdAt);
              return (
                <div key={m.id}>
                  {showDay && (
                    <div className="flex justify-center my-4">
                      <span className="glass text-[11px] text-mist px-3 py-1 rounded-full">{dayLabel(m.createdAt)}</span>
                    </div>
                  )}
                  <Message msg={m} mine={m.from === me.uid} me={me} otherUid={other?.uid}
                    chatId={chat.id} onReply={setReplyTo} highlight={search.trim()} />
                </div>
              );
            })}
            {otherTyping && (
              <div className="flex items-center gap-1.5 bubble-them rounded-lg rounded-tl-sm px-4 py-3 w-fit">
                <span className="tdot w-1.5 h-1.5 rounded-full bg-mist inline-block" />
                <span className="tdot w-1.5 h-1.5 rounded-full bg-mist inline-block" />
                <span className="tdot w-1.5 h-1.5 rounded-full bg-mist inline-block" />
              </div>
            )}
            <div ref={endRef} />
          </div>

          <Composer me={me} chatId={chat.id} otherUid={other?.uid}
            cryptoKey={cryptoKey} replyTo={replyTo} clearReply={() => setReplyTo(null)} />
        </>
      )}
    </div>
  );
}
