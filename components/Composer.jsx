"use client";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  collection, addDoc, doc, setDoc, serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { compressImage, fileToBase64, MAX_BYTES } from "@/lib/helpers";
import { PACKS, stickerSVG, EMOJIS, loadMyStickers, saveMyStickers, makeSticker } from "@/lib/stickers";
import Icon from "./Icons";

export default function Composer({ me, chatId, otherUid, cryptoKey, replyTo, clearReply }) {
  const [text, setText] = useState("");
  const [stickers, setStickers] = useState(false);
  const [tab, setTab] = useState(0); // 0..3 packs, 4 = emoji, 5 = my stickers
  const [mine, setMine] = useState([]);
  const myFileRef = useRef(null);
  useEffect(() => { setMine(loadMyStickers()); }, []);
  const addMySticker = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setErr(""); setBusy(true);
    try {
      const data = await makeSticker(f);
      const next = [data, ...mine];
      setMine(next); saveMyStickers(next); setTab(5);
    } catch (ex) { setErr(ex.message || "Couldn't make a sticker from that image."); }
    finally { setBusy(false); }
  };
  const delMySticker = (i) => {
    const next = mine.filter((_, j) => j !== i);
    setMine(next); saveMyStickers(next);
  };
  const [recording, setRecording] = useState(false);
  const [recSecs, setRecSecs] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const fileRef = useRef(null);
  const recRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const lastTypingRef = useRef(0);

  const replySnapshot = replyTo
    ? {
        type: replyTo.type,
        text:
          replyTo.type === "text" ? replyTo.text
          : replyTo.type === "sticker" ? (replyTo.text?.startsWith("stk:") ? "Sticker 💙" : replyTo.text)
          : "",
        from: replyTo.from,
      }
    : null;

  const send = async (payload) => {
    // 🔐 Encrypt everything sensitive before it leaves the device
    const p = { ...payload };
    const rs = replySnapshot ? { ...replySnapshot } : null;
    if (cryptoKey) {
      const { encryptStr } = await import("@/lib/crypto");
      if (p.text) p.text = await encryptStr(cryptoKey, p.text);
      if (p.data) p.data = await encryptStr(cryptoKey, p.data);
      if (rs?.text) rs.text = await encryptStr(cryptoKey, rs.text);
      if ((p.data || "").length > 980_000) { setErr("File too large after encryption — try a smaller one."); return; }
    }
    const msg = {
      from: me.uid,
      readBy: [me.uid],
      reactions: {},
      enc: !!cryptoKey,
      createdAt: serverTimestamp(),
      ...(rs ? { replyTo: rs } : {}),
      ...p,
    };
    clearReply();
    // 1) Ensure chat doc exists first (security rules check membership on parent)
    await setDoc(
      doc(db, "chats", chatId),
      { members: [me.uid, otherUid], typing: { [me.uid]: null } },
      { merge: true }
    );
    // 2) Write the (encrypted) message
    await addDoc(collection(db, "chats", chatId, "messages"), msg);
    // 3) Update chat preview — never store plaintext here
    await setDoc(
      doc(db, "chats", chatId),
      {
        updatedAt: serverTimestamp(),
        lastMessage: { type: msg.type, text: "", enc: msg.enc, from: me.uid, readBy: [me.uid] },
      },
      { merge: true }
    );
  };

  const sendText = () => {
    const t = text.trim();
    if (!t) return;
    setText("");
    send({ type: "text", text: t });
  };

  const onType = (v) => {
    setText(v);
    const now = Date.now();
    if (now - lastTypingRef.current > 2500) {
      lastTypingRef.current = now;
      setDoc(doc(db, "chats", chatId), { members: [me.uid, otherUid], typing: { [me.uid]: serverTimestamp() } }, { merge: true }).catch(() => {});
    }
  };

  const onPickFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setErr(""); setBusy(true);
    try {
      if (file.type.startsWith("image/")) {
        const data = await compressImage(file);
        await send({ type: "image", data });
      } else {
        if (file.size > MAX_BYTES)
          throw new Error("Max 700KB for videos/files (Firestore free plan). Try a shorter clip or compress it.");
        const data = await fileToBase64(file);
        await send({
          type: file.type.startsWith("video/") ? "video" : "file",
          data,
          fileName: file.name,
        });
      }
    } catch (ex) {
      setErr(ex.message || "Couldn't attach that file.");
    } finally {
      setBusy(false);
    }
  };

  // ---- Voice ----
  const startRec = async () => {
    setErr("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : "";
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime, audioBitsPerSecond: 32000 } : undefined);
      chunksRef.current = [];
      rec.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" });
        if (blob.size > MAX_BYTES) { setErr("Voice note too long — keep it under ~90 seconds."); return; }
        if (blob.size < 1000) return; // accidental tap
        const data = await fileToBase64(blob);
        await send({ type: "audio", data });
      };
      rec.start();
      recRef.current = rec;
      setRecording(true); setRecSecs(0);
      timerRef.current = setInterval(() => setRecSecs((s) => {
        if (s >= 89) stopRec(true);
        return s + 1;
      }), 1000);
    } catch {
      setErr("Mic permission needed — allow it in browser settings.");
    }
  };

  const stopRec = (sendIt) => {
    clearInterval(timerRef.current);
    setRecording(false);
    const rec = recRef.current;
    if (!rec) return;
    if (!sendIt) rec.onstop = () => rec.stream?.getTracks?.().forEach((t) => t.stop());
    if (rec.state !== "inactive") rec.stop();
    recRef.current = null;
  };

  return (
    <div className="glass px-3 pt-2 pb-3 z-10" style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}>
      {err && (
        <p className="text-xs text-red-400 px-2 pb-1.5" onClick={() => setErr("")}>{err}</p>
      )}

      <AnimatePresence>
        {replyTo && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="flex items-center justify-between bg-white/5 border-l-2 border-gold rounded-lg px-3 py-2 mb-2">
              <span className="text-xs text-mist truncate">
                Replying to: {replyTo.type === "text" || replyTo.type === "sticker" ? replyTo.text : `a ${replyTo.type}`}
              </span>
              <button onClick={clearReply} aria-label="Cancel reply" className="text-mist px-2"><Icon name="x" size={16} /></button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {stickers && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="pb-2">
              <div className="flex gap-1 mb-2">
                {PACKS.map((p, i) => (
                  <button key={p.label} onClick={() => setTab(i)}
                    className={`px-3 py-1.5 rounded-full text-sm ${tab === i ? "bubble-me font-semibold" : "bg-white/5 text-mist"}`}>
                    {p.name} {p.label}
                  </button>
                ))}
                <button onClick={() => setTab(4)}
                  className={`px-3 py-1.5 rounded-full text-sm ${tab === 4 ? "bubble-me font-semibold" : "bg-white/5 text-mist"}`}>
                  🙂
                </button>
                <button onClick={() => setTab(5)}
                  className={`px-3 py-1.5 rounded-full text-sm ${tab === 5 ? "bubble-me font-semibold" : "bg-white/5 text-mist"}`}>
                  ➕ My
                </button>
              </div>
              {tab === 5 ? (
                <div className="grid grid-cols-4 gap-2">
                  <button onClick={() => myFileRef.current?.click()} disabled={busy}
                    className="aspect-square rounded-3xl border-2 border-dashed border-edge flex flex-col items-center justify-center text-mist active:bg-white/5">
                    <span className={busy ? "animate-pulse" : ""}><Icon name="plus" size={22} /></span>
                    <span className="text-[10px] mt-1">Add from gallery</span>
                  </button>
                  <input ref={myFileRef} type="file" accept="image/*" hidden onChange={addMySticker} />
                  {mine.map((d, i) => (
                    <div key={i} className="relative">
                      <button className="active:scale-110 transition-transform"
                        onClick={() => { send({ type: "sticker", data: d }); setStickers(false); }}>
                        <img src={d} alt="My sticker" className="w-full rounded-2xl" />
                      </button>
                      <button onClick={() => delMySticker(i)}
                        aria-label="Delete sticker"
                        className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full glass flex items-center justify-center"><Icon name="x" size={12} /></button>
                    </div>
                  ))}
                  {mine.length === 0 && (
                    <p className="col-span-3 text-xs text-mist self-center">
                      Koi bhi photo pick karo — MUAW usse WhatsApp-style sticker bana degi.
                    </p>
                  )}
                </div>
              ) : tab === 4 ? (
                <div className="grid grid-cols-6 gap-1">
                  {EMOJIS.map((s) => (
                    <button key={s}
                      onClick={() => { send({ type: "sticker", text: s }); setStickers(false); }}
                      className="text-3xl py-2 rounded-xl active:bg-white/10 active:scale-110 transition-transform">
                      {s}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {PACKS[tab].items.map((s) => (
                    <button key={s.id}
                      onClick={() => { send({ type: "sticker", text: "stk:" + s.id }); setStickers(false); }}
                      className="active:scale-110 transition-transform"
                      dangerouslySetInnerHTML={{ __html: stickerSVG(s.id) }} />
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {recording ? (
        <div className="flex items-center gap-3">
          <span className="w-3 h-3 rounded-full bg-red-500 rec-pulse" />
          <span className="font-display text-lg tabular-nums flex-1">
            0:{String(recSecs).padStart(2, "0")}
          </span>
          <button onClick={() => stopRec(false)} className="px-4 py-2.5 rounded-xl text-mist">Cancel</button>
          <motion.button whileTap={{ scale: 0.92 }} onClick={() => stopRec(true)} className="bubble-me rounded-xl px-5 py-2.5 font-semibold">
            Send
          </motion.button>
        </div>
      ) : (
        <div className="flex items-end gap-1.5">
          <button onClick={() => setStickers((s) => !s)} aria-label="Stickers"
            className={`w-11 h-11 shrink-0 rounded-full flex items-center justify-center ${stickers ? "text-gold" : "text-mist"}`}>
            <Icon name="smile" size={22} />
          </button>
          <button onClick={() => fileRef.current?.click()} disabled={busy} aria-label="Attach"
            className={`w-11 h-11 shrink-0 rounded-full flex items-center justify-center text-mist disabled:opacity-40 ${busy ? "animate-pulse" : ""}`}>
            <Icon name="clip" size={21} />
          </button>
          <input ref={fileRef} type="file" hidden onChange={onPickFile}
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt,.zip" />
          <textarea
            rows={1}
            value={text}
            onChange={(e) => onType(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendText(); } }}
            placeholder="Message"
            className="flex-1 bg-white/5 rounded-2xl px-4 py-3 text-[15px] outline-none resize-none max-h-32 placeholder:text-mist"
            style={{ minHeight: 44 }}
          />
          {text.trim() ? (
            <motion.button
              initial={{ scale: 0.6 }} animate={{ scale: 1 }} whileTap={{ scale: 0.9 }}
              onClick={sendText} aria-label="Send"
              className="w-11 h-11 shrink-0 rounded-full bubble-me flex items-center justify-center shadow-[0_2px_10px_rgba(28,81,224,.45)]"
            >
              <Icon name="send" size={19} className="-ml-0.5 mt-0.5" />
            </motion.button>
          ) : (
            <motion.button whileTap={{ scale: 0.9 }} onClick={startRec} aria-label="Record voice"
              className="w-11 h-11 shrink-0 rounded-full bubble-me flex items-center justify-center shadow-[0_2px_10px_rgba(28,81,224,.45)]">
              <Icon name="mic" size={20} />
            </motion.button>
          )}
        </div>
      )}
    </div>
  );
}
