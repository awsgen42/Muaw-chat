# MUAW — 100% Android Setup Guide (No PC Needed)

Everything below works in **Chrome on your phone**. Total time: ~25 minutes.

---

## Part 1 — Firebase (Chrome browser)

1. Open **console.firebase.google.com** → sign in with Google → **Add project** → name it `muaw-chat` → disable Analytics → Create.
2. **Authentication** → Get started → **Sign-in method** → enable **Google** → set support email → Save.
3. **Firestore Database** → Create database → **Start in production mode** → choose location (asia-south1 is closest to Pakistan) → Enable.
4. Firestore → **Rules** tab → delete everything → paste the contents of `firestore.rules` from this project → **Publish**.
5. Project overview → click the **</>** (Web) icon → register app named `muaw` → **copy the firebaseConfig object** it shows you. Keep it — you'll paste it in Part 2.

> No Firebase Storage needed. Media is compressed and stored inside Firestore — works on the free plan, no card required.

---

## Part 2 — Put the code on GitHub (two options)

### Option A — Termux (recommended, real dev workflow on Android)

1. Install **Termux** from F-Droid (f-droid.org — the Play Store version is outdated).
2. In Termux:
   ```bash
   pkg update && pkg install -y git nodejs unzip
   ```
3. Download the `muaw.zip` I gave you, then in Termux:
   ```bash
   termux-setup-storage
   cd ~
   cp /sdcard/Download/muaw.zip . && unzip muaw.zip && cd aurum
   ```
4. Edit your Firebase config (nano works fine on phone):
   ```bash
   nano lib/firebase.js
   ```
   Paste your config values from Part 1, then Ctrl+X → Y → Enter.
5. (Optional) Test locally right on your phone:
   ```bash
   npm install
   npm run dev
   ```
   Open Chrome → `http://localhost:3000`. Google login won't work on localhost until you add the domain (Part 4), but UI loads.
6. Push to GitHub — create an empty repo `muaw-chat` at github.com (mobile site works), then:
   ```bash
   git init && git add . && git commit -m "MUAW v1"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/muaw-chat.git
   git push -u origin main
   ```
   When asked for password, use a **GitHub Personal Access Token** (github.com → Settings → Developer settings → Tokens → Generate, tick `repo`).

### Option B — No Termux (GitHub web only)

1. Go to **github.com** in Chrome → New repository `muaw-chat` → create with a README.
2. On the repo page press **`.` isn't available on mobile**, so instead: tap **Add file → Upload files**. Android can't upload folders, so upload in batches and then use **Add file → Create new file** for nested paths — type the path like `components/Chat.jsx` (typing `/` creates folders). Copy-paste each file's content from the zip (open the zip with any Android file manager).
   - It's ~15 small files; tedious but fully doable. Termux (Option A) is faster.

---

## Part 3 — Deploy on Vercel (free)

1. Open **vercel.com** in Chrome → sign up with GitHub.
2. **Add New → Project** → import `muaw-chat` → framework auto-detects Next.js → **Deploy**.
3. In ~2 minutes you get a live URL like `muaw-chat.vercel.app`.
4. Every future `git push` auto-redeploys. You can also edit files directly on github.com (pencil icon) and Vercel redeploys on commit.

---

## Part 4 — Authorize your domain (important!)

Google login will fail until you do this:

1. Firebase console → **Authentication → Settings → Authorized domains** → **Add domain** → add `muaw-chat.vercel.app` (your actual Vercel URL).

---

## Part 5 — Test

1. Open your Vercel URL on your phone → sign in with Google.
2. Ask Mubarra (or use a second Google account) to open the same URL and sign in.
3. Search her name in the sidebar → open chat → send messages, voice notes, stickers.
   - Swipe a bubble sideways → reply.
   - Long-press a bubble → reactions.
   - ✓✓ turns blue when read. "typing…" and online/last seen show live.

---

## Limits to know (free plan)

- Media (images auto-compressed, video/files/voice) capped at ~700KB per message — Firestore document limit. Voice notes up to ~90s.
- Firestore free tier: 50K reads / 20K writes per day — plenty for personal use.

## Editing later, from your phone

- Small edits: github.com → open file → pencil icon → commit → auto-deploys.
- Bigger work: Termux → `git pull`, edit with nano, `git push`.

---

## End-to-end encryption 🔒

- First time you open a chat, MUAW asks for a **chat secret**. You and the other person must type the **exact same secret** on your own phones.
- The secret never leaves the device — it derives an AES-256-GCM key locally (PBKDF2, 150k iterations). Firestore only stores ciphertext for text, media, voice, and reply quotes.
- Forgot/typo? The chat shows "🔒 Can't decrypt" — clear it from Chrome site settings (localStorage) or re-enter by clearing site data, then both re-agree a secret.
- New phone = re-enter the same secret. Old messages decrypt fine since the key is derived from the secret + chat ID.
