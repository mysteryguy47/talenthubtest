/**
 * StreakDisplay — shows current streak, today's progress, next milestone.
 */

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Flame, Target, TrendingUp, Calendar } from "lucide-react";
import { fetchStreak } from "../../lib/rewardsApi";

const MILESTONES = [3, 7, 14, 30, 60, 100];

export default function StreakDisplay() {
  const { data, isLoading } = useQuery({
    queryKey: ["streak"],
    queryFn: fetchStreak,
    staleTime: 30_000,
  });

  if (isLoading) {
    return (
      <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800 p-6 animate-pulse">
        <div className="h-20 bg-zinc-800 rounded-xl" />
      </div>
    );
  }

  if (!data) return null;

  const streakDays = data.current_streak;
  const longestStreak = data.longest_streak;
  const todayCount = data.today_qualifying_count;
  const threshold = data.today_threshold;
  const todayPct = Math.min((todayCount / threshold) * 100, 100);
  const qualified = todayCount >= threshold;

  // Next milestone
  const nextMilestone = MILESTONES.find((m) => m > streakDays) ?? null;
  const prevMilestone = [...MILESTONES].reverse().find((m) => m <= streakDays) ?? 0;
  const milestonePct = nextMilestone
    ? ((streakDays - prevMilestone) / (nextMilestone - prevMilestone)) * 100
    : 100;

  // Flame color by streak tier
  const flameColor =
    streakDays >= 60
      ? "text-purple-400"
      : streakDays >= 30
        ? "text-yellow-400"
        : streakDays >= 14
          ? "text-orange-400"
          : streakDays >= 7
            ? "text-amber-500"
            : streakDays >= 3
              ? "text-red-400"
              : "text-zinc-500";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl bg-zinc-900/60 border border-zinc-800 p-6 space-y-5"
    >
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <motion.div
            animate={
              streakDays > 0
                ? { scale: [1, 1.15, 1], rotate: [0, -5, 5, 0] }
                : {}
            }
            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
          >
            <Flame className={`w-8 h-8 ${flameColor}`} />
          </motion.div>
          <div>
            <p className="text-3xl font-extrabold text-white leading-none">
              {streakDays}
            </p>
            <p className="text-xs text-zinc-400 mt-0.5">day streak</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-zinc-500 text-xs">
          <TrendingUp className="w-3.5 h-3.5" />
          <span>Best: {longestStreak}d</span>
        </div>
      </div>

      {/* Today's progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-zinc-400 flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5" />
            Today&apos;s progress
          </span>
          <span
            className={
              qualified
                ? "text-emerald-400 font-semibold"
                : "text-zinc-500"
            }
          >
            {todayCount}/{threshold} questions
          </span>
        </div>

        <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${todayPct}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className={`h-full rounded-full ${
              qualified
                ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,.4)]"
                : "bg-amber-500"
            }`}
          />
        </div>

        {qualified && (
          <p className="text-xs text-emerald-400/80 text-center font-medium">
            Streak secured for today!
          </p>
        )}
      </div>

      {/* Next milestone */}
      {nextMilestone && (
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-zinc-400 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              Next milestone
            </span>
            <span className="text-zinc-300 font-medium">
              {nextMilestone}-day streak
            </span>
          </div>

          <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${milestonePct}%` }}
              transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
              className="h-full rounded-full bg-violet-500/80"
            />
          </div>

          <p className="text-[10px] text-zinc-600 text-center">
            {nextMilestone - streakDays} days to go
          </p>
        </div>
      )}

      {!nextMilestone && streakDays >= 100 && (
        <p className="text-xs text-center text-yellow-400 font-semibold">
          All streak milestones achieved!
        </p>
      )}
    </motion.div>
  );
}
