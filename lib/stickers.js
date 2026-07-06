// MUAW sticker packs — die-cut SVG stickers generated on the fly (no image files).
// A sticker message stores only its tiny id (e.g. "stk:love1"); SVG renders client-side.

export const PACKS = [
  {
    name: "💙",
    label: "Love",
    items: [
      { id: "love1", emoji: "💙", cap: "MUAW", c1: "#63A9FF", c2: "#1D4ED8" },
      { id: "love2", emoji: "🥺", cap: "MISS YOU", c1: "#B478FF", c2: "#6D28D9" },
      { id: "love3", emoji: "🤗", cap: "HUG", c1: "#FF8FB1", c2: "#DB2777" },
      { id: "love4", emoji: "😘", cap: "MWAH", c1: "#FF6B6B", c2: "#C1121F" },
    ],
  },
  {
    name: "😂",
    label: "Fun",
    items: [
      { id: "fun1", emoji: "😂", cap: "LOL", c1: "#FFD166", c2: "#F77F00" },
      { id: "fun2", emoji: "💀", cap: "DEAD", c1: "#94A3B8", c2: "#334155" },
      { id: "fun3", emoji: "🙄", cap: "ACHA?!", c1: "#67E8F9", c2: "#0891B2" },
      { id: "fun4", emoji: "😤", cap: "OYE", c1: "#FCA5A5", c2: "#DC2626" },
    ],
  },
  {
    name: "📈",
    label: "Trading",
    items: [
      { id: "trd1", emoji: "📈", cap: "TP HIT", c1: "#4ADE80", c2: "#15803D" },
      { id: "trd2", emoji: "😭", cap: "SL HIT", c1: "#F87171", c2: "#991B1B" },
      { id: "trd3", emoji: "💰", cap: "GOLD", c1: "#FDE047", c2: "#CA8A04" },
      { id: "trd4", emoji: "🐂", cap: "BULLISH", c1: "#60A5FA", c2: "#1E40AF" },
    ],
  },
  {
    name: "🌙",
    label: "Mood",
    items: [
      { id: "mood1", emoji: "🌙", cap: "GOOD NIGHT", c1: "#818CF8", c2: "#3730A3" },
      { id: "mood2", emoji: "☀️", cap: "GOOD MORNING", c1: "#FDBA74", c2: "#EA580C" },
      { id: "mood3", emoji: "😴", cap: "SLEEPY", c1: "#A5B4FC", c2: "#4F46E5" },
      { id: "mood4", emoji: "❤️‍🔥", cap: "LOVE YOU", c1: "#FB7185", c2: "#BE123C" },
    ],
  },
];

const ALL = Object.fromEntries(PACKS.flatMap((p) => p.items.map((s) => [s.id, s])));

export function stickerSVG(id) {
  const s = ALL[id];
  if (!s) return null;
  const small = s.cap.length > 8;
  return `<svg viewBox="0 0 160 160" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${s.cap}">
<defs>
  <linearGradient id="g_${s.id}" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="${s.c1}"/><stop offset="1" stop-color="${s.c2}"/>
  </linearGradient>
</defs>
<rect x="8" y="8" width="144" height="144" rx="38" fill="url(#g_${s.id})" stroke="#fff" stroke-width="7"/>
<rect x="8" y="8" width="144" height="144" rx="38" fill="none" stroke="rgba(0,0,0,.18)" stroke-width="1.5"/>
<text x="80" y="86" font-size="60" text-anchor="middle">${s.emoji}</text>
<text x="80" y="130" font-size="${small ? 15 : 21}" font-weight="800"
  font-family="'Space Grotesk',Arial,sans-serif" fill="#fff" text-anchor="middle"
  letter-spacing="1" stroke="rgba(0,0,0,.28)" stroke-width="3" paint-order="stroke">${s.cap}</text>
</svg>`;
}

export const isStickerId = (t) => typeof t === "string" && t.startsWith("stk:");
export const stickerFromMsg = (t) => stickerSVG(t.slice(4));

// Legacy emoji tab
export const EMOJIS = ["😂","🥰","😍","😎","🤩","😭","🥺","😤","🤝","👍","🔥","💯","❤️","💙","💔","✨","🌙","🌹","🎉","🎂","🫶","🐐"];

// ---- Custom "My stickers" (WhatsApp-style: any image → sticker) ----
// Stored device-locally; sent inside the encrypted message payload.

const MY_KEY = "muaw-mystickers";

export function loadMyStickers() {
  try { return JSON.parse(localStorage.getItem(MY_KEY) || "[]"); } catch { return []; }
}
export function saveMyStickers(list) {
  localStorage.setItem(MY_KEY, JSON.stringify(list.slice(0, 30)));
}

// Turn any image file into a 320px die-cut sticker (rounded, white border, webp/png)
export function makeSticker(file) {
  return new Promise((res, rej) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const S = 320, R = 64, B = 10;
      const c = document.createElement("canvas");
      c.width = S; c.height = S;
      const x = c.getContext("2d");

      const rr = (inset) => {
        x.beginPath();
        x.roundRect(inset, inset, S - inset * 2, S - inset * 2, R - inset / 2);
      };

      // clip to rounded square, draw image cover
      x.save();
      rr(B / 2);
      x.clip();
      const scale = Math.max(S / img.width, S / img.height);
      const w = img.width * scale, h = img.height * scale;
      x.drawImage(img, (S - w) / 2, (S - h) / 2, w, h);
      x.restore();

      // white die-cut border
      rr(B / 2);
      x.lineWidth = B;
      x.strokeStyle = "#fff";
      x.stroke();

      URL.revokeObjectURL(url);
      let out = c.toDataURL("image/webp", 0.8);
      if (!out.startsWith("data:image/webp")) out = c.toDataURL("image/png");
      out.length > 400_000 ? rej(new Error("Image too complex — try a simpler one")) : res(out);
    };
    img.onerror = rej;
    img.src = url;
  });
}
