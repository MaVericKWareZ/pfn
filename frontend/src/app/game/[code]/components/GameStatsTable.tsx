"use client";

import { RoundStats } from "@/types";

interface GameStatsTableProps {
  roundStats: RoundStats[];
}

export function GameStatsTable({ roundStats }: GameStatsTableProps) {
  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    return `${seconds}s`;
  };

  return (
    <div className="bg-black/30 rounded-xl p-6 overflow-hidden">
      <h2 className="text-2xl font-bold text-white mb-4">
        Round-by-Round Analysis
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-white">
          <thead>
            <tr className="border-b border-white/20">
              <th className="px-4 py-3 text-left font-semibold">Round</th>
              <th className="px-4 py-3 text-left font-semibold">Team</th>
              <th className="px-4 py-3 text-left font-semibold">Poet</th>
              <th className="px-4 py-3 text-center font-semibold">Attempted</th>
              <th className="px-4 py-3 text-center font-semibold">Completed</th>
              <th className="px-4 py-3 text-center font-semibold">Skipped</th>
              <th className="px-4 py-3 text-center font-semibold">Points</th>
              <th className="px-4 py-3 text-center font-semibold">Duration</th>
            </tr>
          </thead>
          <tbody>
            {roundStats.map((stat, index) => (
              <tr
                key={`${stat.teamId}-${stat.roundNumber}`}
                className={`border-b border-white/10 hover:bg-white/5 transition-colors ${
                  index % 2 === 0 ? "bg-white/5" : ""
                }`}
              >
                <td className="px-4 py-3 font-medium">{stat.roundNumber}</td>
                <td className="px-4 py-3">
                  <span className="font-semibold">{stat.teamName}</span>
                </td>
                <td className="px-4 py-3 text-white/80">{stat.poetName}</td>
                <td className="px-4 py-3 text-center">{stat.cardsAttempted}</td>
                <td className="px-4 py-3 text-center">
                  <span className="text-green-400 font-semibold">
                    {stat.cardsCompleted}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="text-red-400 font-semibold">
                    {stat.cardsSkipped}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="text-yellow-300 font-bold text-lg">
                    {stat.pointsEarned}
                  </span>
                </td>
                <td className="px-4 py-3 text-center text-white/60">
                  {formatDuration(stat.duration)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
