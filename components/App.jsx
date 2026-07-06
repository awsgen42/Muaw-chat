"use client";
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { AnimatePresence } from "framer-motion";
import { auth, db } from "@/lib/firebase";
import usePresence from "@/hooks/usePresence";
import Login from "./Login";
import Sidebar from "./Sidebar";
import Chat from "./Chat";
import Profile from "./Profile";

export default function App() {
  const [user, setUser] = useState(undefined); // undefined = loading
  const [activeChat, setActiveChat] = useState(null); // { id, other: userDoc }
  const [showProfile, setShowProfile] = useState(null); // uid to show
  const [dark, setDark] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem("aurum-theme");
    if (saved === "light") setDark(false);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    document.documentElement.classList.toggle("light", !dark);
    localStorage.setItem("aurum-theme", dark ? "dark" : "light");
  }, [dark]);

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        await setDoc(
          doc(db, "users", u.uid),
          {
            uid: u.uid,
            name: u.displayName || "User",
            nameLower: (u.displayName || "user").toLowerCase(),
            email: u.email,
            photo: u.photoURL || "",
            lastSeen: serverTimestamp(),
          },
          { merge: true }
        );
      }
    });
  }, []);

  usePresence(user?.uid);

  if (user === undefined)
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <div className="w-10 h-10 rounded-2xl bubble-me animate-pulse" />
      </div>
    );

  if (!user) return <Login />;

  return (
    <div className="h-dvh flex overflow-hidden">
      {/* Sidebar: full width on mobile when no chat open; fixed column on md+ */}
      <div
        className={`${activeChat ? "hidden md:flex" : "flex"} w-full md:w-[380px] md:border-r md:border-edge flex-col`}
      >
        <Sidebar
          me={user}
          activeChatId={activeChat?.id}
          onOpenChat={setActiveChat}
          onOpenProfile={setShowProfile}
          dark={dark}
          toggleDark={() => setDark((d) => !d)}
        />
      </div>

      <div className={`${activeChat ? "flex" : "hidden md:flex"} flex-1 flex-col min-w-0`}>
        {activeChat ? (
          <Chat
            key={activeChat.id}
            me={user}
            chat={activeChat}
            onBack={() => setActiveChat(null)}
            onOpenProfile={setShowProfile}
          />
        ) : (
          <div className="flex-1 hidden md:flex items-center justify-center text-mist font-display">
            Select a conversation
          </div>
        )}
      </div>

      <AnimatePresence>
        {showProfile && (
          <Profile
            uid={showProfile}
            me={user}
            onClose={() => setShowProfile(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
