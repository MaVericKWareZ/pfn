"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useGameSocket } from "@/hooks/useGameSocket";

export default function Home() {
  const router = useRouter();
  const { isConnected, createRoom, joinRoom, roomCode, error } =
    useGameSocket();
  const [playerName, setPlayerName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [scoreboardCode, setScoreboardCode] = useState("");
  const [mode, setMode] = useState<"menu" | "create" | "join" | "scoreboard">(
    "menu",
  );

  // Clear any stale room data when returning to home page
  useEffect(() => {
    localStorage.removeItem("pfn_playerId");
    localStorage.removeItem("pfn_roomCode");
  }, []);

  const handleCreate = () => {
    if (playerName.trim()) {
      createRoom(playerName.trim());
    }
  };

  const handleJoin = () => {
    if (playerName.trim() && joinCode.trim()) {
      joinRoom(joinCode.trim().toUpperCase(), playerName.trim());
    }
  };

  const handleViewScoreboard = () => {
    if (scoreboardCode.trim()) {
      router.push(`/game/${scoreboardCode.trim().toUpperCase()}/display`);
    }
  };

  if (roomCode) {
    router.push(`/room/${roomCode}`);
    return null;
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="text-center mb-8">
        <h1 className="text-5xl md:text-7xl font-bold text-caveman-orange mb-2 font-caveman">
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

        {mode === "menu" && (
          <div className="space-y-4">
            <button
              onClick={() => setMode("create")}
              disabled={!isConnected}
              className="w-full stone-button text-white text-xl py-4 px-6 disabled:opacity-50"
            >
              Create Game
            </button>
            <button
              onClick={() => setMode("join")}
              disabled={!isConnected}
              className="w-full stone-button text-white text-xl py-4 px-6 disabled:opacity-50"
            >
              Join Game
            </button>
            <button
              onClick={() => setMode("scoreboard")}
              disabled={!isConnected}
              className="w-full stone-button text-white text-xl py-4 px-6 disabled:opacity-50"
            >
              View Scoreboard
            </button>
          </div>
        )}

        {mode === "create" && (
          <div className="caveman-card p-6 space-y-4">
            <h2 className="text-2xl font-bold text-caveman-brown text-center">
              Create New Game
            </h2>
            <input
              type="text"
              placeholder="Your Name"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              className="w-full p-3 rounded-lg bg-white/90 text-caveman-brown text-lg border-2 border-caveman-brown"
              maxLength={20}
            />
            <div className="flex gap-2">
              <button
                onClick={() => setMode("menu")}
                className="flex-1 stone-button text-white py-3 px-4"
              >
                Back
              </button>
              <button
                onClick={handleCreate}
                disabled={!playerName.trim() || !isConnected}
                className="flex-1 stone-button text-white py-3 px-4 disabled:opacity-50"
              >
                Create
              </button>
            </div>
          </div>
        )}

        {mode === "join" && (
          <div className="caveman-card p-6 space-y-4">
            <h2 className="text-2xl font-bold text-caveman-brown text-center">
              Join Game
            </h2>
            <input
              type="text"
              placeholder="Your Name"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              className="w-full p-3 rounded-lg bg-white/90 text-caveman-brown text-lg border-2 border-caveman-brown"
              maxLength={20}
            />
            <input
              type="text"
              placeholder="Room Code"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              className="w-full p-3 rounded-lg bg-white/90 text-caveman-brown text-lg border-2 border-caveman-brown text-center tracking-widest"
              maxLength={6}
            />
            <div className="flex gap-2">
              <button
                onClick={() => setMode("menu")}
                className="flex-1 stone-button text-white py-3 px-4"
              >
                Back
              </button>
              <button
                onClick={handleJoin}
                disabled={
                  !playerName.trim() || !joinCode.trim() || !isConnected
                }
                className="flex-1 stone-button text-white py-3 px-4 disabled:opacity-50"
              >
                Join
              </button>
            </div>
          </div>
        )}

        {mode === "scoreboard" && (
          <div className="caveman-card p-6 space-y-4">
            <h2 className="text-2xl font-bold text-caveman-brown text-center">
              View Scoreboard
            </h2>
            <input
              type="text"
              placeholder="Room Code"
              value={scoreboardCode}
              onChange={(e) => setScoreboardCode(e.target.value.toUpperCase())}
              className="w-full p-3 rounded-lg bg-white/90 text-caveman-brown text-lg border-2 border-caveman-brown text-center tracking-widest"
              maxLength={6}
            />
            <div className="flex gap-2">
              <button
                onClick={() => setMode("menu")}
                className="flex-1 stone-button text-white py-3 px-4"
              >
                Back
              </button>
              <button
                onClick={handleViewScoreboard}
                disabled={!scoreboardCode.trim() || !isConnected}
                className="flex-1 stone-button text-white py-3 px-4 disabled:opacity-50"
              >
                View
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="mt-8 text-center text-caveman-tan/60 text-sm">
        <p>A word-guessing party game</p>
        <p>4-8 players recommended</p>
      </div>
    </main>
  );
}
