export const chatIdFor = (a, b) => [a, b].sort().join("_");

export const MAX_BYTES = 700 * 1024; // Firestore doc safety limit

export function fileToBase64(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

// Compress an image to fit inside Firestore
export function compressImage(file, maxDim = 1280, quality = 0.72) {
  return new Promise((res, rej) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      let { width, height } = img;
      const scale = Math.min(1, maxDim / Math.max(width, height));
      width = Math.round(width * scale);
      height = Math.round(height * scale);
      const c = document.createElement("canvas");
      c.width = width; c.height = height;
      c.getContext("2d").drawImage(img, 0, 0, width, height);
      let q = quality;
      let out = c.toDataURL("image/jpeg", q);
      while (out.length > MAX_BYTES && q > 0.3) {
        q -= 0.1;
        out = c.toDataURL("image/jpeg", q);
      }
      URL.revokeObjectURL(url);
      out.length > MAX_BYTES ? rej(new Error("Image too large even after compression")) : res(out);
    };
    img.onerror = rej;
    img.src = url;
  });
}

export function fmtTime(ts) {
  if (!ts) return "";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function fmtLastSeen(ts) {
  if (!ts) return "offline";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  const diff = Date.now() - d.getTime();
  if (diff < 45_000) return "online";
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "last seen just now";
  if (mins < 60) return `last seen ${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `last seen ${hrs}h ago`;
  return `last seen ${d.toLocaleDateString([], { day: "numeric", month: "short" })}`;
}

export const isOnline = (ts) => {
  if (!ts) return false;
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return Date.now() - d.getTime() < 45_000;
};

export function dayLabel(ts) {
  if (!ts) return "";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const that = new Date(d); that.setHours(0, 0, 0, 0);
  const diff = (today - that) / 86_400_000;
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return d.toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" });
}


export const REACTIONS = ["❤️", "😂", "👍", "😮", "😢", "🔥"];
