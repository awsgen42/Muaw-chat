"use client";
import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { doc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { fmtTime, REACTIONS } from "@/lib/helpers";
import { isStickerId, stickerFromMsg } from "@/lib/stickers";
import Icon from "./Icons";

function Ticks({ msg, otherUid }) {
  const delivered = !!msg.createdAt;
  const read = (msg.readBy || []).includes(otherUid);
  return (
    <span className={`inline-block ml-1 align-middle ${read ? "text-[#53BDEB]" : "opacity-60"}`}>
      <Icon name={delivered ? "checks" : "check"} size={14} strokeWidth={2.4} />
    </span>
  );
}

function Body({ msg, highlight }) {
  if (msg.type === "sticker") {
    if (msg.data)
      return <img src={msg.data} alt="Sticker" className="block w-[150px] drop-shadow-lg" />;
    if (isStickerId(msg.text)) {
      const svg = stickerFromMsg(msg.text);
      if (svg)
        return <span className="block w-[150px] drop-shadow-lg" dangerouslySetInnerHTML={{ __html: svg }} />;
    }
    return <span className="text-6xl leading-none block py-1">{msg.text}</span>;
  }
  if (msg.type === "image")
    return <img src={msg.data} alt="" className="rounded-xl max-w-full max-h-80 object-cover" />;
  if (msg.type === "video")
    return <video src={msg.data} controls playsInline className="rounded-xl max-w-full max-h-80" />;
  if (msg.type === "audio")
    return <audio src={msg.data} controls className="max-w-[220px] h-10" />;
  if (msg.type === "file")
    return (
      <a href={msg.data} download={msg.fileName} className="flex items-center gap-2 underline underline-offset-2">
        <Icon name="file" size={18} className="shrink-0" />
        <span className="truncate max-w-[200px]">{msg.fileName}</span>
      </a>
    );
  // text with optional search highlight
  if (highlight) {
    const idx = (msg.text || "").toLowerCase().indexOf(highlight.toLowerCase());
    if (idx >= 0) {
      const t = msg.text;
      return (
        <span className="whitespace-pre-wrap break-words">
          {t.slice(0, idx)}
          <mark className="bg-gold/60 rounded px-0.5">{t.slice(idx, idx + highlight.length)}</mark>
          {t.slice(idx + highlight.length)}
        </span>
      );
    }
  }
  return <span className="whitespace-pre-wrap break-words">{msg.text}</span>;
}

export default function Message({ msg, mine, me, otherUid, chatId, onReply, highlight }) {
  const [picker, setPicker] = useState(false);
  const pressTimer = useRef(null);
  const isSticker = msg.type === "sticker";

  const toggleReaction = async (emoji) => {
    const ref = doc(db, "chats", chatId, "messages", msg.id);
    const has = (msg.reactions?.[emoji] || []).includes(me.uid);
    await updateDoc(ref, {
      [`reactions.${emoji}`]: has ? arrayRemove(me.uid) : arrayUnion(me.uid),
    }).catch(() => {});
    setPicker(false);
  };

  const startPress = () => {
    pressTimer.current = setTimeout(() => setPicker(true), 420);
  };
  const cancelPress = () => clearTimeout(pressTimer.current);

  const reactionEntries = Object.entries(msg.reactions || {}).filter(([, v]) => v?.length);

  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"} relative`}>
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={{ left: mine ? 0.4 : 0, right: mine ? 0 : 0.4 }}
        onDragEnd={(_, info) => {
          if ((mine && info.offset.x < -56) || (!mine && info.offset.x > 56)) onReply(msg);
        }}
        onTouchStart={startPress}
        onTouchEnd={cancelPress}
        onTouchMove={cancelPress}
        onContextMenu={(e) => { e.preventDefault(); setPicker(true); }}
        whileTap={{ scale: isSticker ? 1 : 0.99 }}
        className={`relative max-w-[82%] md:max-w-[65%] ${isSticker ? "" : mine ? "bubble-me rounded-lg rounded-tr-sm" : "bubble-them rounded-lg rounded-tl-sm"} px-2.5 py-1.5 ${reactionEntries.length ? "mb-3.5" : ""}`}
        style={{ touchAction: "pan-y" }}
      >
        {msg.replyTo && (
          <div className={`text-xs rounded-lg px-2.5 py-1.5 mb-1.5 border-l-2 ${mine ? "bg-white/15 border-white/60" : "bg-white/5 border-gold"} truncate`}>
            <span className="opacity-80">
              {msg.replyTo.type === "text" || msg.replyTo.type === "sticker"
                ? msg.replyTo.text
                : `📎 ${msg.replyTo.type}`}
            </span>
          </div>
        )}

        <Body msg={msg} highlight={highlight} />

        <span className={`text-[10px] ${isSticker ? "block text-mist" : mine ? "text-white/60" : "text-mist"} float-right mt-1.5 ml-2`}>
          {fmtTime(msg.createdAt)}
          {mine && <Ticks msg={msg} otherUid={otherUid} />}
        </span>

        {/* Reactions row */}
        {reactionEntries.length > 0 && (
          <div className={`absolute -bottom-3.5 ${mine ? "right-2" : "left-2"} flex gap-1`}>
            {reactionEntries.map(([emoji, uids]) => (
              <button
                key={emoji}
                onClick={() => toggleReaction(emoji)}
                className="glass rounded-full px-1.5 py-0.5 text-xs flex items-center gap-0.5"
              >
                {emoji}
                {uids.length > 1 && <span className="text-[10px] text-mist">{uids.length}</span>}
              </button>
            ))}
          </div>
        )}

        {/* Reaction picker */}
        <AnimatePresence>
          {picker && (
            <>
              <div className="fixed inset-0 z-20" onClick={() => setPicker(false)} />
              <motion.div
                initial={{ opacity: 0, scale: 0.85, y: 6 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.85 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                className={`absolute z-30 -top-12 ${mine ? "right-0" : "left-0"} glass rounded-full px-2 py-1.5 flex gap-1 shadow-xl`}
              >
                {REACTIONS.map((e) => (
                  <button key={e} onClick={() => toggleReaction(e)} className="text-xl px-1 active:scale-125 transition-transform">
                    {e}
                  </button>
                ))}
                <button onClick={() => { onReply(msg); setPicker(false); }} aria-label="Reply" className="px-1.5 text-mist flex items-center"><Icon name="reply" size={17} /></button>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
