"use client";

import { useEffect, useState } from "react";
import { GameEndedData } from "@/types";
import { Trophy, Sparkles } from "lucide-react";
import { GameStatsTable } from "./GameStatsTable";

interface WinnerAnnouncementProps {
  gameEndedData: GameEndedData;
  onClose?: () => void;
  onCreateNewGame?: () => void;
}

export function WinnerAnnouncement({
  gameEndedData,
  onClose,
  onCreateNewGame,
}: WinnerAnnouncementProps) {
  const [showConfetti, setShowConfetti] = useState(false);
  const [showStats, setShowStats] = useState(false);

  useEffect(() => {
    setShowConfetti(true);
    const timer = setTimeout(() => {
      setShowStats(true);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  const winningTeam = gameEndedData.teams.find(
    (t) => t.id === gameEndedData.winningTeamId,
  );

  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      {showConfetti && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-confetti"
              style={{
                left: `${Math.random() * 100}%`,
                top: `-10%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${3 + Math.random() * 2}s`,
              }}
            >
              <Sparkles
                className="text-yellow-400"
                size={16 + Math.random() * 16}
              />
            </div>
          ))}
        </div>
      )}

      <div className="relative max-w-4xl w-full max-h-[90vh] bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />

        <div className="relative overflow-y-auto flex-1">
          <div className="p-4 sm:p-6 md:p-8 text-center">
            <div className="mb-4 sm:mb-6 animate-bounce-slow">
              <Trophy className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 mx-auto text-yellow-400 drop-shadow-2xl" />
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-white mb-3 sm:mb-4 drop-shadow-lg animate-pulse-slow">
              {winningTeam ? `${winningTeam.name} WINS!` : "GAME OVER!"}
            </h1>

            <div className="text-xl sm:text-2xl md:text-3xl font-bold text-yellow-300 mb-6 sm:mb-8">
              Final Score: {winningTeam?.score || 0} Points
            </div>

            {!showStats && (
              <div className="text-white/60 animate-pulse">
                Loading statistics...
              </div>
            )}

            {showStats && (
              <div className="mt-6 sm:mt-8 animate-fade-in">
                <div className="bg-black/30 rounded-xl p-4 sm:p-6 mb-4 sm:mb-6">
                  <h2 className="text-xl sm:text-2xl font-bold text-white mb-3 sm:mb-4">
                    Game Summary
                  </h2>
                  <div className="grid grid-cols-2 gap-3 sm:gap-4 text-white">
                    <div className="bg-white/10 rounded-lg p-3 sm:p-4">
                      <div className="text-xs sm:text-sm text-white/60">
                        Total Rounds
                      </div>
                      <div className="text-xl sm:text-2xl font-bold">
                        {gameEndedData.totalRounds}
                      </div>
                    </div>
                    <div className="bg-white/10 rounded-lg p-3 sm:p-4">
                      <div className="text-xs sm:text-sm text-white/60">
                        Game Duration
                      </div>
                      <div className="text-xl sm:text-2xl font-bold">
                        {formatDuration(gameEndedData.gameDuration)}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-black/30 rounded-xl p-4 sm:p-6 mb-4 sm:mb-6">
                  <h2 className="text-xl sm:text-2xl font-bold text-white mb-3 sm:mb-4">
                    Team Performance
                  </h2>
                  <div className="space-y-2 sm:space-y-3">
                    {gameEndedData.teams.map((team) => (
                      <div
                        key={team.id}
                        className={`bg-white/10 rounded-lg p-3 sm:p-4 ${
                          team.id === gameEndedData.winningTeamId
                            ? "ring-2 ring-yellow-400"
                            : ""
                        }`}
                      >
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-lg sm:text-xl font-bold text-white">
                            {team.name}
                          </span>
                          <span className="text-xl sm:text-2xl font-black text-yellow-300">
                            {team.score}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-xs sm:text-sm text-white/80">
                          <div>
                            <div className="text-white/60">Attempted</div>
                            <div className="font-semibold">
                              {team.totalCardsAttempted}
                            </div>
                          </div>
                          <div>
                            <div className="text-white/60">Completed</div>
                            <div className="font-semibold text-green-400">
                              {team.totalCardsCompleted}
                            </div>
                          </div>
                          <div>
                            <div className="text-white/60">Skipped</div>
                            <div className="font-semibold text-red-400">
                              {team.totalCardsSkipped}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <GameStatsTable roundStats={gameEndedData.roundStats} />

                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center mt-4 sm:mt-6">
                  {onCreateNewGame && (
                    <button
                      onClick={onCreateNewGame}
                      className="w-full sm:w-auto px-6 sm:px-8 py-2 sm:py-3 bg-green-600 text-white rounded-lg font-bold text-base sm:text-lg hover:bg-green-700 transition-colors"
                    >
                      Create New Game
                    </button>
                  )}
                  {onClose && (
                    <button
                      onClick={onClose}
                      className="w-full sm:w-auto px-6 sm:px-8 py-2 sm:py-3 bg-white text-purple-900 rounded-lg font-bold text-base sm:text-lg hover:bg-yellow-300 transition-colors"
                    >
                      Close
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes confetti {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
        @keyframes bounce-slow {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-20px);
          }
        }
        @keyframes pulse-slow {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.8;
          }
        }
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-confetti {
          animation: confetti linear forwards;
        }
        .animate-bounce-slow {
          animation: bounce-slow 2s ease-in-out infinite;
        }
        .animate-pulse-slow {
          animation: pulse-slow 2s ease-in-out infinite;
        }
        .animate-fade-in {
          animation: fade-in 0.5s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
