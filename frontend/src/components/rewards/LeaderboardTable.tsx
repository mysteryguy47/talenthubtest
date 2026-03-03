/**
 * LeaderboardTable — ranked list of students with branch filter.
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Medal, Crown, ChevronDown, Users } from "lucide-react";
import { fetchLeaderboard } from "../../lib/rewardsApi";
import type { LeaderboardEntry, LeaderboardResponse } from "../../types/rewards";

const PERIOD_OPTIONS = [
  { label: "All Time", value: "all_time" },
  { label: "This Month", value: "monthly" },
] as const;

function RankIcon({ rank }: { rank: number }) {
  if (rank === 1)
    return <Crown className="w-5 h-5 text-yellow-400 drop-shadow" />;
  if (rank === 2)
    return <Medal className="w-5 h-5 text-zinc-300 drop-shadow" />;
  if (rank === 3)
    return <Medal className="w-5 h-5 text-amber-600 drop-shadow" />;
  return (
    <span className="w-5 h-5 flex items-center justify-center text-xs font-bold text-zinc-500">
      {rank}
    </span>
  );
}

function EntryRow({
  entry,
  isCurrentUser,
  index,
}: {
  entry: LeaderboardEntry;
  isCurrentUser: boolean;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04 }}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
        isCurrentUser
          ? "bg-violet-500/10 border border-violet-500/30"
          : "hover:bg-zinc-800/40"
      }`}
    >
      <RankIcon rank={entry.rank} />

      {/* Avatar */}
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
          entry.rank === 1
            ? "bg-yellow-500/20 text-yellow-400"
            : entry.rank === 2
              ? "bg-zinc-400/20 text-zinc-300"
              : entry.rank === 3
                ? "bg-amber-600/20 text-amber-500"
                : "bg-zinc-800 text-zinc-400"
        }`}
      >
        {(entry.student_name || "?")[0].toUpperCase()}
      </div>

      {/* Name */}
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm font-medium truncate ${
            isCurrentUser ? "text-violet-300" : "text-zinc-200"
          }`}
        >
          {entry.student_name || "Student"}
          {isCurrentUser && (
            <span className="ml-1.5 text-[10px] text-violet-400/70">(you)</span>
          )}
        </p>
        {entry.branch && (
          <p className="text-[10px] text-zinc-500 truncate">{entry.branch}</p>
        )}
      </div>

      {/* Points */}
      <div className="text-right">
        <p className="text-sm font-bold text-white">
          {entry.total_points.toLocaleString()}
        </p>
        <p className="text-[10px] text-zinc-500">pts</p>
      </div>
    </motion.div>
  );
}

export default function LeaderboardTable({
  currentUserId,
}: {
  currentUserId?: number;
}) {
  const [period, setPeriod] = useState<"all_time" | "monthly">("all_time");
  const [branch, setBranch] = useState<string>("");

  const { data, isLoading } = useQuery({
    queryKey: ["leaderboard", period, branch],
    queryFn: () => fetchLeaderboard(period, branch || undefined) as Promise<LeaderboardResponse>,
    staleTime: 60_000,
  });

  // Discover unique branches from results
  const branches = data
    ? [...new Set(data.entries.filter((e) => e.branch).map((e) => e.branch!))]
        .sort()
    : [];

  return (
    <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-400" />
          <h3 className="text-white font-bold text-sm">Leaderboard</h3>
        </div>
        <div className="flex items-center gap-2">
          {/* Period toggle */}
          <div className="flex bg-zinc-800 rounded-lg p-0.5">
            {PERIOD_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setPeriod(opt.value)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                  period === opt.value
                    ? "bg-zinc-700 text-white"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Branch filter */}
          {branches.length > 0 && (
            <div className="relative">
              <select
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                className="appearance-none bg-zinc-800 text-zinc-300 text-xs rounded-lg px-3 py-1.5 pr-7 border border-zinc-700 focus:outline-none focus:border-violet-500"
              >
                <option value="">All Branches</option>
                {branches.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-500 pointer-events-none" />
            </div>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="p-3 space-y-1 max-h-[420px] overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700">
        {isLoading && (
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="h-12 rounded-xl bg-zinc-800/50 animate-pulse"
              />
            ))}
          </div>
        )}

        {!isLoading && data && data.entries.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-zinc-500">
            <Users className="w-8 h-8 mb-2" />
            <p className="text-sm">No data yet</p>
          </div>
        )}

        <AnimatePresence mode="popLayout">
          {data?.entries.map((entry, i) => (
            <EntryRow
              key={entry.student_id}
              entry={entry}
              isCurrentUser={entry.student_id === currentUserId}
              index={i}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Footer with current user rank */}
      {data && currentUserId && (
        <div className="border-t border-zinc-800 px-5 py-3">
          {(() => {
            const myEntry = data.entries.find(
              (e) => e.student_id === currentUserId
            );
            if (!myEntry) return null;
            return (
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span>Your Rank</span>
                <span className="font-bold text-violet-400">
                  #{myEntry.rank} of {data.total_participants}
                </span>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
