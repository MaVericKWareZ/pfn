"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useGameSocket } from "@/hooks/useGameSocket";
import { GameState, PlayerRole } from "@/types";
import { formatTime, generateQRCodeUrl } from "@/lib/utils";
import { WinnerAnnouncement } from "../../game/[code]/components/WinnerAnnouncement";

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const code = params.code as string;
  const [maxTurns, setMaxTurns] = useState<string>("");
  const [showMaxTurnsInput, setShowMaxTurnsInput] = useState(false);

  const {
    isConnected,
    playerId,
    roomCode,
    roomState,
    gameState,
    currentCard,
    timerRemaining,
    feedback,
    lastTurnEnded,
    gameEnded,
    error,
    assignTeam,
    shuffleTeams,
    startGame,
    endGame,
    startTurn,
    markEasyCorrect,
    markHardCorrect,
    skipCard,
    pressNo,
    leaveRoom,
    reconnect,
  } = useGameSocket();

  const currentPlayer = roomState?.players.find((p) => p.id === playerId);
  const isHost = currentPlayer?.isHost ?? false;

  console.log("[LOBBY] Player state:", {
    playerId,
    currentPlayer,
    roomStatePlayers: roomState?.players,
  });

  useEffect(() => {
    console.log("[ROOM_PAGE] State check:", {
      isConnected,
      hasRoomState: !!roomState,
      hasGameState: !!gameState,
      playerId,
      code,
      roomCode,
    });

    // If we don't have roomState, try to reconnect using localStorage credentials
    if (!roomState && !gameState) {
      const savedPlayerId = localStorage.getItem("pfn_playerId");
      const savedRoomCode = localStorage.getItem("pfn_roomCode");

      console.log("[ROOM_PAGE] Checking localStorage:", {
        savedPlayerId,
        savedRoomCode,
        urlCode: code,
      });

      // Only reconnect if the saved room code matches the URL
      if (savedPlayerId && savedRoomCode === code) {
        console.log("[ROOM_PAGE] Reconnecting with saved credentials...");
        reconnect(code, savedPlayerId);
        return;
      }

      // If no valid credentials, redirect to home
      console.log("[ROOM_PAGE] No valid credentials, redirecting to home");
      router.push("/");
    }

    // Restore playerId from localStorage if we have roomState but no playerId
    if (roomState && !playerId) {
      const savedPlayerId = localStorage.getItem("pfn_playerId");
      if (savedPlayerId) {
        console.log(
          "[ROOM_PAGE] Restoring playerId from localStorage:",
          savedPlayerId,
        );
        // We need to manually dispatch this since the hook doesn't do it automatically
        // For now, we'll rely on the reconnect to eventually sync the state
      }
    }
  }, [roomState, gameState, router, playerId, code, roomCode, reconnect]);

  if (!roomState) {
    console.log("[ROOM_PAGE] Rendering loading screen - roomState is null");
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-caveman-tan">Loading...</div>
      </main>
    );
  }

  console.log("[ROOM_PAGE] Rendering room with state:", roomState);

  const isLobby = roomState.gameState === GameState.LOBBY;
  const isPlaying = gameState && gameState.state !== GameState.LOBBY;

  if (gameEnded) {
    return (
      <WinnerAnnouncement
        gameEndedData={gameEnded}
        onClose={() => {
          leaveRoom();
          router.push("/");
        }}
        onCreateNewGame={() => {
          leaveRoom();
          router.push("/");
        }}
      />
    );
  }

  if (isLobby) {
    return <LobbyView />;
  }

  if (isPlaying && gameState) {
    return <GameView />;
  }

  return null;

  function LobbyView() {
    const teamsWithPlayers = roomState!.teams.filter(
      (t) => t.playerIds.length > 0,
    );
    const canStart =
      teamsWithPlayers.length >= 2 &&
      teamsWithPlayers.every((t) => t.playerIds.length > 0);

    return (
      <main className="min-h-screen p-4">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-caveman-orange mb-2">
              Room: {code}
            </h1>
            <div className="flex justify-center gap-4 items-center">
              <img
                src={generateQRCodeUrl(code)}
                alt="QR Code"
                className="w-24 h-24 rounded-lg"
              />
              <div className="text-left">
                <p className="text-caveman-tan text-sm">
                  Scan to join or enter code:
                </p>
                <p className="text-3xl font-mono font-bold text-white tracking-widest">
                  {code}
                </p>
              </div>
            </div>
            <button
              onClick={() => window.open(`/game/${code}/display`, "_blank")}
              className="mt-4 stone-button text-white py-2 px-4 text-sm"
              title="Open Scoreboard in new tab"
            >
              📊 Open Scoreboard
            </button>
          </div>

          {error && (
            <div className="bg-red-500/20 border border-red-500 text-red-300 p-3 rounded-lg mb-4 text-center">
              {error}
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-4 mb-6">
            {roomState!.teams.map((team) => (
              <div key={team.id} className="caveman-card p-4">
                <h3 className="text-xl font-bold text-caveman-brown mb-3">
                  {team.name}
                </h3>
                <div className="space-y-2 min-h-[100px]">
                  {team.playerIds.map((pid) => {
                    const player = roomState!.players.find((p) => p.id === pid);
                    return player ? (
                      <div
                        key={pid}
                        className={`p-2 rounded ${
                          pid === playerId
                            ? "bg-caveman-orange/30"
                            : "bg-white/30"
                        }`}
                      >
                        <span className="text-caveman-brown">
                          {player.name}
                          {player.isHost && " 👑"}
                          {!player.isConnected && " (disconnected)"}
                        </span>
                      </div>
                    ) : null;
                  })}
                </div>
                {currentPlayer && currentPlayer.teamId !== team.id && (
                  <button
                    onClick={() => assignTeam(playerId!, team.id)}
                    className="mt-3 w-full stone-button text-white py-2 text-sm"
                  >
                    Join {team.name}
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="caveman-card p-4 mb-4">
            <h3 className="text-lg font-bold text-caveman-brown mb-2">
              Unassigned Players
            </h3>
            <div className="flex flex-wrap gap-2">
              {roomState!.players
                .filter((p) => !p.teamId)
                .map((player) => (
                  <span
                    key={player.id}
                    className={`px-3 py-1 rounded ${
                      player.id === playerId
                        ? "bg-caveman-orange/50"
                        : "bg-white/30"
                    } text-caveman-brown`}
                  >
                    {player.name}
                    {player.isHost && " 👑"}
                  </span>
                ))}
            </div>
          </div>

          {isHost && (
            <div className="caveman-card p-4 mb-4">
              <h3 className="text-lg font-bold text-caveman-brown mb-3">
                Game Settings
              </h3>
              <div className="flex items-center gap-3 mb-3">
                <input
                  type="checkbox"
                  id="maxTurnsToggle"
                  checked={showMaxTurnsInput}
                  onChange={(e) => {
                    setShowMaxTurnsInput(e.target.checked);
                    if (!e.target.checked) setMaxTurns("");
                  }}
                  className="w-5 h-5 cursor-pointer"
                />
                <label
                  htmlFor="maxTurnsToggle"
                  className="text-caveman-brown cursor-pointer"
                >
                  Set maximum number of turns (game ends automatically)
                </label>
              </div>
              {showMaxTurnsInput && (
                <input
                  type="number"
                  placeholder="Enter max turns (e.g., 10)"
                  value={maxTurns}
                  onChange={(e) => setMaxTurns(e.target.value)}
                  min="1"
                  max="100"
                  className="w-full p-2 rounded-lg bg-white/90 text-caveman-brown border-2 border-caveman-brown"
                />
              )}
            </div>
          )}

          <div className="flex gap-2 flex-wrap justify-center">
            {isHost && (
              <>
                <button
                  onClick={shuffleTeams}
                  className="stone-button text-white py-2 px-4"
                >
                  Shuffle Teams
                </button>
                <button
                  onClick={() => {
                    const maxTurnsNum = maxTurns
                      ? parseInt(maxTurns, 10)
                      : undefined;
                    startGame(maxTurnsNum);
                  }}
                  disabled={!canStart}
                  className="stone-button text-white py-2 px-6 disabled:opacity-50"
                >
                  Start Game
                </button>
              </>
            )}
            <button
              onClick={() => {
                leaveRoom();
                router.push("/");
              }}
              className="stone-button text-white py-2 px-4"
            >
              Leave
            </button>
          </div>

          {!canStart && isHost && (
            <p className="text-center text-yellow-400 mt-4 text-sm">
              Need at least 2 teams with players to start
            </p>
          )}
        </div>
      </main>
    );
  }

  function GameView() {
    const gs = gameState!;
    const myPlayer = gs.players.find((p) => p.id === playerId);
    const myRole = myPlayer?.role ?? PlayerRole.SPECTATOR;
    const activeTeam = gs.teams.find((t) => t.id === gs.currentTurn?.teamId);
    const poet = gs.players.find((p) => p.id === gs.currentTurn?.poetId);
    const judge = gs.players.find((p) => p.id === gs.currentTurn?.judgeId);

    const isTurnActive = gs.state === GameState.TURN_ACTIVE;
    const isTurnEnded = gs.state === GameState.TURN_ENDED;
    const needsNextTurn =
      gs.state === GameState.PLAYING || gs.state === GameState.TURN_ENDED;

    return (
      <main className="min-h-screen p-4 relative">
        {feedback && (
          <div
            className={`fixed inset-0 flex items-center justify-center z-50 feedback-${feedback.type}`}
          >
            <div className="text-4xl md:text-6xl font-bold text-white text-center p-8">
              {feedback.message}
            </div>
          </div>
        )}

        <div className="max-w-lg mx-auto">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <div className="text-caveman-tan">Turn {gs.turnNumber}</div>
              <button
                onClick={() => window.open(`/game/${code}/display`, "_blank")}
                className="text-xs stone-button text-white py-1 px-2"
                title="Open Scoreboard"
              >
                📊 Scoreboard
              </button>
            </div>
            <div
              className={`text-4xl font-bold font-mono ${
                (timerRemaining ?? 0) <= 10 ? "timer-critical" : "text-white"
              }`}
            >
              {timerRemaining !== null ? formatTime(timerRemaining) : "--:--"}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-4">
            {gs.teams.map((team) => (
              <div
                key={team.id}
                className={`p-3 rounded-lg text-center ${
                  team.id === gs.currentTurn?.teamId
                    ? "bg-caveman-orange/40 border-2 border-caveman-orange"
                    : "bg-white/10"
                }`}
              >
                <div className="text-sm text-caveman-tan">{team.name}</div>
                <div className="text-2xl font-bold text-white">
                  {team.score}
                </div>
              </div>
            ))}
          </div>

          {isTurnActive && activeTeam && (
            <div className="text-center mb-4 text-caveman-tan">
              <span className="font-bold text-caveman-orange">
                {activeTeam.name}
              </span>{" "}
              is playing
              {poet && (
                <span>
                  {" "}
                  • Poet: <strong>{poet.name}</strong>
                </span>
              )}
            </div>
          )}

          {myRole === PlayerRole.POET && isTurnActive && currentCard && (
            <PoetView card={currentCard} turn={gs.currentTurn!} />
          )}

          {myRole === PlayerRole.JUDGE && isTurnActive && <JudgeView />}

          {myRole === PlayerRole.GUESSER && isTurnActive && (
            <GuesserView
              teamName={activeTeam?.name ?? ""}
              poetName={poet?.name ?? ""}
            />
          )}

          {myRole === PlayerRole.SPECTATOR && isTurnActive && (
            <SpectatorView teamName={activeTeam?.name ?? ""} />
          )}

          {needsNextTurn && !isTurnActive && (
            <div className="text-center">
              {lastTurnEnded && (
                <div className="caveman-card p-4 mb-4">
                  <p className="text-caveman-brown mb-2">
                    The word was: <strong>{lastTurnEnded.card.easyWord}</strong>
                  </p>
                  <p className="text-caveman-brown">
                    The phrase was:{" "}
                    <strong>{lastTurnEnded.card.hardPhrase}</strong>
                  </p>
                  <p className="text-caveman-brown mt-2">
                    Points earned: {lastTurnEnded.pointsEarned}
                  </p>
                </div>
              )}
              {isHost && (
                <div className="space-y-3">
                  <button
                    onClick={startTurn}
                    className="stone-button text-white py-3 px-8 text-xl w-full"
                  >
                    Start Next Turn
                  </button>
                  <button
                    onClick={endGame}
                    className="stone-button bg-red-600 hover:bg-red-700 text-white py-2 px-6 text-sm w-full"
                  >
                    End Game Now
                  </button>
                  <p className="text-caveman-tan/60 text-xs">
                    (Both teams must have equal turns to end)
                  </p>
                </div>
              )}
              {!isHost && (
                <p className="text-caveman-tan">
                  Waiting for host to start next turn...
                </p>
              )}
            </div>
          )}
        </div>
      </main>
    );
  }

  function PoetView({
    card,
    turn,
  }: {
    card: { easyWord: string; hardPhrase: string };
    turn: { easyWordGuessed: boolean; hardPhraseGuessed: boolean };
  }) {
    return (
      <div className="space-y-4">
        <div className="caveman-card p-6">
          <div className="text-center mb-4">
            <p className="text-sm text-caveman-brown/70 mb-1">1 Point Word</p>
            <p
              className={`text-3xl font-bold ${
                turn.easyWordGuessed
                  ? "text-green-600 line-through"
                  : "text-caveman-brown"
              }`}
            >
              {card.easyWord}
            </p>
          </div>
          <div className="border-t-2 border-caveman-brown/30 pt-4 text-center">
            <p className="text-sm text-caveman-brown/70 mb-1">3 Point Phrase</p>
            <p
              className={`text-2xl font-bold ${
                turn.hardPhraseGuessed
                  ? "text-green-600 line-through"
                  : "text-caveman-brown"
              }`}
            >
              {card.hardPhrase}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={markEasyCorrect}
            disabled={turn.easyWordGuessed}
            className="stone-button text-white py-3 disabled:opacity-50"
          >
            ✓ 1pt Correct
          </button>
          <button
            onClick={markHardCorrect}
            disabled={turn.hardPhraseGuessed}
            className="stone-button text-white py-3 disabled:opacity-50"
          >
            ✓ 3pt Correct
          </button>
        </div>

        <button
          onClick={skipCard}
          className="w-full stone-button text-yellow-300 py-3"
        >
          Skip Card (-1 pt)
        </button>

        <p className="text-center text-caveman-tan text-sm">
          Use only one-syllable words to describe!
        </p>
      </div>
    );
  }

  function JudgeView() {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <p className="text-caveman-tan mb-6 text-center">
          Listen for multi-syllable words!
          <br />
          Press NO! if the Poet breaks the rules.
        </p>
        <button
          onClick={pressNo}
          className="no-button w-48 h-48 text-white text-5xl font-bold"
        >
          NO!
        </button>
        <p className="text-red-400 mt-4 text-sm">
          Pressing NO! skips the current card with -1 penalty
        </p>
      </div>
    );
  }

  function GuesserView({
    teamName,
    poetName,
  }: {
    teamName: string;
    poetName: string;
  }) {
    return (
      <div className="text-center py-8">
        <div className="caveman-card p-6 mb-4">
          <p className="text-2xl text-caveman-brown font-bold mb-2">
            Your Turn to Guess!
          </p>
          <p className="text-caveman-brown">
            Listen to <strong>{poetName}</strong> and shout your guesses!
          </p>
        </div>
        <p className="text-caveman-tan">
          {teamName} is playing. Listen and guess out loud!
        </p>
      </div>
    );
  }

  function SpectatorView({ teamName }: { teamName: string }) {
    return (
      <div className="text-center py-8">
        <div className="caveman-card p-6">
          <p className="text-xl text-caveman-brown">
            <strong>{teamName}</strong> is playing
          </p>
          <p className="text-caveman-brown mt-2">
            Watch and wait for your turn!
          </p>
        </div>
      </div>
    );
  }
}
