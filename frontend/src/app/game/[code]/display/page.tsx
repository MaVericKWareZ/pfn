"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { useGameSocket } from "@/hooks/useGameSocket";
import { GameState } from "@/types";
import { formatTime } from "@/lib/utils";
import { WinnerAnnouncement } from "../components/WinnerAnnouncement";
import { CardRevealOverlay } from "../components/CardRevealOverlay";

export default function SharedDisplayPage() {
  const params = useParams();
  const code = params.code as string;

  const {
    isConnected,
    roomState,
    gameState,
    timerRemaining,
    feedback,
    gameEnded,
    cardRevealed,
    reconnect,
  } = useGameSocket();

  useEffect(() => {
    if (isConnected && code) {
      const savedPlayerId = localStorage.getItem("pfn_playerId");
      if (savedPlayerId) {
        reconnect(code, savedPlayerId);
      }
    }
  }, [isConnected, code, reconnect]);

  if (!roomState && !gameState) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-caveman-dark">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-caveman-orange mb-4">
            Cave Talk
          </h1>
          <p className="text-xl text-caveman-tan">
            {isConnected ? "Loading game..." : "Connecting..."}
          </p>
          <p className="text-caveman-tan/60 mt-4">Room: {code}</p>
        </div>
      </main>
    );
  }

  // Show winner announcement when game ends
  if (gameEnded) {
    return <WinnerAnnouncement gameEndedData={gameEnded} />;
  }

  // Show card reveal overlay when a card is completed
  const showCardOverlay =
    cardRevealed && gameState?.state === GameState.TURN_ACTIVE;

  const isLobby = roomState?.gameState === GameState.LOBBY;

  if (isLobby) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-caveman-dark p-8">
        <h1 className="text-6xl font-bold text-caveman-orange mb-4">
          🦴 Cave Talk 🦴
        </h1>
        <p className="text-3xl text-white mb-8">Room: {code}</p>

        <div className="grid grid-cols-2 gap-8 w-full max-w-4xl mb-8">
          {roomState?.teams.map((team) => (
            <div key={team.id} className="bg-white/10 rounded-2xl p-6">
              <h2 className="text-2xl font-bold text-caveman-orange mb-4">
                {team.name}
              </h2>
              <div className="space-y-2">
                {team.playerIds.map((pid) => {
                  const player = roomState.players.find((p) => p.id === pid);
                  return player ? (
                    <div key={pid} className="text-xl text-white">
                      {player.name} {player.isHost && "👑"}
                    </div>
                  ) : null;
                })}
                {team.playerIds.length === 0 && (
                  <p className="text-caveman-tan/60">No players yet</p>
                )}
              </div>
            </div>
          ))}
        </div>

        <p className="text-2xl text-caveman-tan">
          {roomState?.players.length} players connected
        </p>
        <p className="text-xl text-caveman-tan/60 mt-2">
          Waiting for host to start...
        </p>
      </main>
    );
  }

  if (!gameState) {
    return null;
  }

  const activeTeam = gameState.teams.find(
    (t) => t.id === gameState.currentTurn?.teamId,
  );
  const poet = gameState.players.find(
    (p) => p.id === gameState.currentTurn?.poetId,
  );
  const isTurnActive = gameState.state === GameState.TURN_ACTIVE;

  return (
    <main className="min-h-screen bg-caveman-dark p-8 relative overflow-hidden">
      {feedback && (
        <div
          className={`fixed inset-0 flex items-center justify-center z-50 feedback-${feedback.type}`}
        >
          <div className="text-6xl md:text-8xl font-bold text-white text-center animate-pulse">
            {feedback.type === "no" && "❌ NO! ❌"}
            {feedback.type === "correct" && "✅ CORRECT! ✅"}
            {feedback.type === "skip" && "⏭️ SKIPPED ⏭️"}
            {feedback.type === "time_up" && "⏰ TIME'S UP! ⏰"}
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-4xl font-bold text-caveman-orange">
              Cave Talk
            </h1>
            <p className="text-caveman-tan">Turn {gameState.turnNumber}</p>
          </div>

          <div
            className={`text-8xl font-bold font-mono ${
              (timerRemaining ?? 0) <= 10
                ? "timer-critical animate-pulse"
                : "text-white"
            }`}
          >
            {timerRemaining !== null ? formatTime(timerRemaining) : "--:--"}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8 mb-8">
          {gameState.teams.map((team) => (
            <div
              key={team.id}
              className={`p-8 rounded-2xl text-center transition-all ${
                team.id === gameState.currentTurn?.teamId
                  ? "bg-caveman-orange/30 border-4 border-caveman-orange scale-105"
                  : "bg-white/10"
              }`}
            >
              <p className="text-2xl text-caveman-tan mb-2">{team.name}</p>
              <p className="text-8xl font-bold text-white">{team.score}</p>
              {team.id === gameState.currentTurn?.teamId && (
                <p className="text-xl text-caveman-orange mt-4 animate-pulse">
                  NOW PLAYING
                </p>
              )}
            </div>
          ))}
        </div>

        {isTurnActive && activeTeam && poet && (
          <div className="text-center">
            <p className="text-3xl text-white mb-2">
              <span className="text-caveman-orange font-bold">
                {activeTeam.name}
              </span>{" "}
              is guessing
            </p>
            <p className="text-2xl text-caveman-tan">
              Poet: <span className="font-bold text-white">{poet.name}</span>
            </p>
          </div>
        )}

        {!isTurnActive && gameState.state !== GameState.GAME_OVER && (
          <div className="text-center">
            <p className="text-3xl text-caveman-tan animate-bounce-slow">
              Waiting for next turn...
            </p>
          </div>
        )}
      </div>

      {showCardOverlay && <CardRevealOverlay cardRevealed={cardRevealed} />}
    </main>
  );
}
