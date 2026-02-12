"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useGameSocket } from "@/hooks/useGameSocket";

export default function JoinPage() {
  const params = useParams();
  const router = useRouter();
  const code = (params.code as string)?.toUpperCase();
  const [playerName, setPlayerName] = useState("");
  const { isConnected, joinRoom, roomCode, error } = useGameSocket();

  useEffect(() => {
    localStorage.removeItem("pfn_playerId");
    localStorage.removeItem("pfn_roomCode");
  }, []);

  useEffect(() => {
    if (roomCode) {
      router.push(`/room/${roomCode}`);
    }
  }, [roomCode, router]);

  const handleJoin = () => {
    if (playerName.trim() && code) {
      joinRoom(code, playerName.trim());
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && playerName.trim()) {
      handleJoin();
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="text-center mb-8">
        <h1 className="text-4xl md:text-7xl font-bold text-caveman-orange mb-2 font-caveman">
          🦴 Cave Talk 🦴
        </h1>
        <p className="text-xl text-caveman-tan">
          Talk like caveman. Use small words!
        </p>
      </div>

      <div className="w-full max-w-md">
        {!isConnected && (
          <div className="text-center text-yellow-500 mb-4">
            Connecting to server...
          </div>
        )}

        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-300 p-3 rounded-lg mb-4 text-center">
            {error}
          </div>
        )}

        <div className="caveman-card p-6 space-y-4">
          <h2 className="text-2xl font-bold text-caveman-brown text-center">
            Join Game
          </h2>
          <div className="text-center">
            <p className="text-caveman-brown/70 text-sm mb-2">Room Code:</p>
            <p className="text-3xl font-mono font-bold text-caveman-brown tracking-widest">
              {code}
            </p>
          </div>
          <input
            type="text"
            placeholder="Your Name"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            onKeyPress={handleKeyPress}
            className="w-full p-3 rounded-lg bg-white/90 text-caveman-brown text-lg border-2 border-caveman-brown"
            maxLength={20}
            autoFocus
          />
          <div className="flex gap-2">
            <button
              onClick={() => router.push("/")}
              className="flex-1 stone-button text-white py-3 px-4"
            >
              Back
            </button>
            <button
              onClick={handleJoin}
              disabled={!playerName.trim() || !isConnected}
              className="flex-1 stone-button text-white py-3 px-4 disabled:opacity-50"
            >
              Join
            </button>
          </div>
        </div>
      </div>

      <div className="mt-8 text-center text-caveman-tan/60 text-sm">
        <p>A word-guessing party game</p>
        <p>4-8 players recommended</p>
      </div>
    </main>
  );
}
