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
  const [mode, setMode] = useState<
    "menu" | "create" | "join" | "scoreboard" | "rules"
  >("menu");

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
            <button
              onClick={() => setMode("rules")}
              className="w-full stone-button text-white text-xl py-4 px-6"
            >
              How to Play 📜
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

        {mode === "rules" && (
          <div className="caveman-card p-6 space-y-5 max-h-[75vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-caveman-brown text-center">
              How to Play 📜
            </h2>

            {/* The Goal */}
            <div className="bg-white/30 rounded-lg p-4">
              <h3 className="text-lg font-bold text-caveman-brown mb-1">
                🎯 The Goal
              </h3>
              <p className="text-caveman-brown text-sm leading-relaxed">
                Two teams compete to score the most points by guessing words.
                The catch? The clue-giver (the <strong>Poet</strong>) can only
                use <strong>one-syllable words</strong> to describe the answer.
                Talk like a caveman!
              </p>
            </div>

            {/* How a Turn Works */}
            <div className="bg-white/30 rounded-lg p-4">
              <h3 className="text-lg font-bold text-caveman-brown mb-1">
                🗣️ How a Turn Works
              </h3>
              <ol className="text-caveman-brown text-sm leading-relaxed list-decimal list-inside space-y-1">
                <li>
                  The app picks a <strong>Poet</strong> from the active team.
                </li>
                <li>The other team picks a <strong>Judge</strong>.</li>
                <li>
                  The Poet sees a card with an <strong>easy word</strong> (1 pt)
                  and a <strong>hard phrase</strong> (3 pts).
                </li>
                <li>
                  A <strong>60-second timer</strong> starts.
                </li>
                <li>
                  The Poet gives clues <strong>out loud</strong> using only
                  one-syllable words.
                </li>
                <li>
                  Teammates shout their guesses — no typing needed!
                </li>
                <li>
                  Correct guesses score points and a new card appears
                  automatically. Keep going until time runs out!
                </li>
              </ol>
            </div>

            {/* Scoring */}
            <div className="bg-white/30 rounded-lg p-4">
              <h3 className="text-lg font-bold text-caveman-brown mb-1">
                📊 Scoring
              </h3>
              <div className="text-caveman-brown text-sm space-y-1">
                <p>
                  <span className="inline-block bg-green-600 text-white font-bold px-2 py-0.5 rounded text-xs mr-1">
                    +1
                  </span>{" "}
                  Easy word guessed correctly
                </p>
                <p>
                  <span className="inline-block bg-green-700 text-white font-bold px-2 py-0.5 rounded text-xs mr-1">
                    +3
                  </span>{" "}
                  Hard phrase guessed correctly
                </p>
                <p>
                  <span className="inline-block bg-red-600 text-white font-bold px-2 py-0.5 rounded text-xs mr-1">
                    −1
                  </span>{" "}
                  NO! penalty or Skip
                </p>
              </div>
            </div>

            {/* The NO! Rule */}
            <div className="bg-white/30 rounded-lg p-4">
              <h3 className="text-lg font-bold text-caveman-brown mb-1">
                🔨 The NO! Rule
              </h3>
              <p className="text-caveman-brown text-sm leading-relaxed">
                The Judge listens carefully. If the Poet uses a{" "}
                <strong>multi-syllable word</strong>, says part of the answer, or
                breaks any rule — the Judge smashes the{" "}
                <strong className="text-red-700">NO!</strong> button. The team
                loses 1 point, the card is tossed, and a new one appears. The
                turn keeps going!
              </p>
            </div>

            {/* Skip */}
            <div className="bg-white/30 rounded-lg p-4">
              <h3 className="text-lg font-bold text-caveman-brown mb-1">
                ⏭️ Skip
              </h3>
              <p className="text-caveman-brown text-sm leading-relaxed">
                Stuck on a tough card? The Poet can <strong>Skip</strong> it for
                a <strong>−1 point penalty</strong>. A new card is drawn and the
                timer keeps running.
              </p>
            </div>

            {/* Playing with this App */}
            <div className="bg-caveman-orange/20 rounded-lg p-4 border border-caveman-orange/40">
              <h3 className="text-lg font-bold text-caveman-brown mb-1">
                📱 Party Setup Guide
              </h3>
              <ol className="text-caveman-brown text-sm leading-relaxed list-decimal list-inside space-y-1">
                <li>
                  One person taps <strong>Create Game</strong> and gets a room
                  code.
                </li>
                <li>
                  Everyone else opens this site on their phone and taps{" "}
                  <strong>Join Game</strong> with the room code.
                </li>
                <li>Split into two teams in the lobby.</li>
                <li>
                  The host starts the game — all clue-giving and guessing
                  happens <strong>out loud</strong>, not in the app!
                </li>
                <li>
                  <em>Optional:</em> Put a TV or laptop on the{" "}
                  <strong>Scoreboard</strong> view so everyone can see the timer
                  and scores from across the room.
                </li>
              </ol>
            </div>

            {/* Tips */}
            <div className="bg-white/30 rounded-lg p-4">
              <h3 className="text-lg font-bold text-caveman-brown mb-1">
                💡 Tips for the Best Game
              </h3>
              <ul className="text-caveman-brown text-sm leading-relaxed list-disc list-inside space-y-1">
                <li>Sit in a circle so the Poet can face their team.</li>
                <li>Speak loudly — this is a party game, not a library!</li>
                <li>
                  Judges: stay sharp and hit NO! fast. It&apos;s the best part.
                </li>
                <li>
                  Don&apos;t overthink — fast, silly clues work better than clever
                  ones.
                </li>
                <li>
                  Use a shared screen for the scoreboard to keep the energy
                  high.
                </li>
                <li>
                  Play multiple rounds — teams get better (and funnier) over
                  time!
                </li>
              </ul>
            </div>

            <button
              onClick={() => setMode("menu")}
              className="w-full stone-button text-white py-3 px-4 mt-2"
            >
              ← Back to Menu
            </button>
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
