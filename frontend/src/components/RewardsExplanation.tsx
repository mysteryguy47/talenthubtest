import { useState, useEffect } from "react";
import { X, Gift, Trophy, Target, Flame, Calendar, Zap, Award, Star, Lock, CheckCircle2, TrendingUp, Sparkles, Crown, Medal, PartyPopper, BookOpen, Info } from "lucide-react";
import { getRewardSummary, getStudentBadges, redeemGraceSkip, RewardSummary, Badge, GraceSkipResponse } from "../lib/rewardApi";

interface RewardsExplanationProps {
  isOpen: boolean;
  onClose: () => void;
  currentPoints?: number;
}

export default function RewardsExplanation({ isOpen, onClose, currentPoints = 0 }: RewardsExplanationProps) {
  const [summary, setSummary] = useState<RewardSummary | null>(null);
  const [allBadges, setAllBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(false);
  const [redeemingGraceSkip, setRedeemingGraceSkip] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [summaryData, badgesData] = await Promise.all([
        getRewardSummary(),
        getStudentBadges()
      ]);
      setSummary(summaryData);
      setAllBadges(badgesData);
    } catch (err) {
      console.error("Failed to load reward data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleGraceSkip = async () => {
    if (!summary?.can_use_grace_skip) return;
    if (!confirm("Redeem Grace Skip for 2000 points to preserve your streak?")) return;
    try {
      setRedeemingGraceSkip(true);
      const response: GraceSkipResponse = await redeemGraceSkip();
      alert(response.message);
      await loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to redeem grace skip");
    } finally {
      setRedeemingGraceSkip(false);
    }
  };

  if (!isOpen) return null;

  const points = summary?.total_points || currentPoints || 0;
  const streak = summary?.current_streak || 0;
  const attendance = summary?.attendance_percentage || 0;
  const questions = summary?.total_questions_attempted || 0;
  const superProgress = summary?.super_progress;

  // SUPER Journey Rewards (from FIXES_SUMMARY.md)
  const superRewards = [
    { points: 1500, icon: "🍫", title: "Chocolate", type: "chocolate", color: "from-amber-500 to-orange-500" },
    { points: 3000, icon: "S", title: "SUPER - S", description: "Started", type: "letter", color: "from-blue-500 to-indigo-500" },
    { points: 4500, icon: "🍫", title: "Chocolate", type: "chocolate", color: "from-amber-500 to-orange-500" },
    { points: 6000, icon: "U", title: "SUPER - U", description: "Understanding", type: "letter", color: "from-purple-500 to-pink-500" },
    { points: 7500, icon: "🍫", title: "Chocolate", type: "chocolate", color: "from-amber-500 to-orange-500" },
    { points: 9000, icon: "P", title: "SUPER - P", description: "Practice", type: "letter", color: "from-green-500 to-emerald-500" },
    { points: 10500, icon: "🍫", title: "Chocolate", type: "chocolate", color: "from-amber-500 to-orange-500" },
    { points: 12000, icon: "E", title: "SUPER - E", description: "Excellence", type: "letter", color: "from-yellow-500 to-amber-500" },
    { points: 13500, icon: "🍫", title: "Chocolate", type: "chocolate", color: "from-amber-500 to-orange-500" },
    { points: 15000, icon: "R", title: "SUPER - R", description: "Ready", type: "letter", color: "from-red-500 to-pink-500" },
    { points: 16500, icon: "🍫", title: "Chocolate", type: "chocolate", color: "from-amber-500 to-orange-500" },
    { points: 18000, icon: "🎁", title: "Mystery Gift", type: "special", color: "from-pink-500 to-rose-500" },
    { points: 19500, icon: "🍫", title: "Chocolate", type: "chocolate", color: "from-amber-500 to-orange-500" },
    { points: 21000, icon: "🎉", title: "Party", type: "special", color: "from-violet-500 to-purple-500" },
  ];

  const nextReward = superRewards.find(r => points < r.points) || superRewards[superRewards.length - 1];
  const progress = nextReward ? (points / nextReward.points) * 100 : 100;

  // Monthly Badges (9 total from FIXES_SUMMARY.md)
  const monthlyBadges = [
    { type: "accuracy_ace", name: "Accuracy Ace", icon: Target, color: "from-blue-500 to-cyan-500", hint: "≥90% accuracy (min 10 questions)" },
    { type: "perfect_precision", name: "Perfect Precision", icon: Sparkles, color: "from-yellow-500 to-amber-500", hint: "100% accuracy (min 5 questions)" },
    { type: "comeback_kid", name: "Comeback Kid", icon: TrendingUp, color: "from-green-500 to-emerald-500", hint: "≥20% accuracy improvement" },
    { type: "monthly_streak", name: "Monthly Streak Champion", icon: Flame, color: "from-orange-500 to-red-500", hint: "Full calendar month without break" },
    { type: "attendance_champion", name: "Attendance Champion", icon: Calendar, color: "from-indigo-500 to-purple-500", hint: "100% attendance for the month" },
    { type: "gold_tshirt_star", name: "Gold T-Shirt Star", icon: Star, color: "from-yellow-400 to-orange-400", hint: "Wear T-shirt to all classes" },
    { type: "leaderboard_gold", name: "Leaderboard Champion", icon: Trophy, color: "from-yellow-500 to-amber-600", hint: "Top 1 in monthly leaderboard" },
    { type: "leaderboard_silver", name: "Leaderboard Runner-up", icon: Medal, color: "from-gray-300 to-gray-500", hint: "Top 2 in monthly leaderboard" },
    { type: "leaderboard_bronze", name: "Leaderboard Third Place", icon: Award, color: "from-amber-600 to-amber-800", hint: "Top 3 in monthly leaderboard" },
  ];

  // Lifetime Badges (3 total from FIXES_SUMMARY.md)
  const lifetimeBadges = [
    { type: "bronze_mind", name: "Bronze Mind", icon: BookOpen, color: "from-amber-600 to-amber-800", hint: "500+ questions (lifetime)", threshold: 500 },
    { type: "silver_mind", name: "Silver Mind", icon: BookOpen, color: "from-gray-300 to-gray-500", hint: "2000+ questions (lifetime)", threshold: 2000 },
    { type: "gold_mind", name: "Gold Mind", icon: BookOpen, color: "from-yellow-500 to-amber-600", hint: "5000+ questions (lifetime)", threshold: 5000 },
  ];

  const earnedBadgeTypes = new Set((summary?.current_badges || []).map(b => b.badge_type));
  const earnedMonthly = monthlyBadges.filter(b => earnedBadgeTypes.has(b.type));
  const lockedMonthly = monthlyBadges.filter(b => !earnedBadgeTypes.has(b.type));
  const earnedLifetime = lifetimeBadges.filter(b => {
    if (b.type === "bronze_mind") return questions >= 500;
    if (b.type === "silver_mind") return questions >= 2000;
    if (b.type === "gold_mind") return questions >= 5000;
    return earnedBadgeTypes.has(b.type);
  });
  const lockedLifetime = lifetimeBadges.filter(b => {
    if (b.type === "bronze_mind") return questions < 500;
    if (b.type === "silver_mind") return questions < 2000;
    if (b.type === "gold_mind") return questions < 5000;
    return !earnedBadgeTypes.has(b.type);
  });

  const getBadgeIcon = (Icon: any) => <Icon className="w-5 h-5" />;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-6xl max-h-[95vh] bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 rounded-3xl shadow-2xl border-2 border-indigo-200 dark:border-slate-700 overflow-hidden">
        {/* Header */}
        <div className="relative bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 p-6 text-white">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-700/50 to-purple-700/50"></div>
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <Trophy className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-black tracking-tighter uppercase italic">Your Rewards</h2>
                <p className="text-sm text-white/90">Celebrate your progress and achievements!</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur-sm flex items-center justify-center transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(95vh-180px)] p-6 space-y-6 scrollbar-premium">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-slate-600 dark:text-slate-400">Loading rewards...</div>
            </div>
          ) : (
            <>
              {/* Section 1: Your Progress */}
              <section className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-6 border border-slate-200 dark:border-slate-700">
                <h3 className="text-xl font-black tracking-tighter uppercase italic text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                  <Target className="w-5 h-5 text-indigo-500" />
                  Your Progress
                </h3>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl p-4 text-white">
                    <div className="flex items-center justify-between mb-2">
                      <Zap className="w-5 h-5" />
                      <span className="text-xs opacity-90">Points</span>
                    </div>
                    <div className="text-2xl font-black">{points.toLocaleString()}</div>
                  </div>

                  <div className="bg-gradient-to-br from-orange-500 to-red-600 rounded-xl p-4 text-white">
                    <div className="flex items-center justify-between mb-2">
                      <Flame className="w-5 h-5" />
                      <span className="text-xs opacity-90">Streak</span>
                    </div>
                    <div className="text-2xl font-black">{streak} days</div>
                    {summary?.can_use_grace_skip && (
                      <button
                        onClick={handleGraceSkip}
                        disabled={redeemingGraceSkip}
                        className="mt-2 text-xs bg-white/20 hover:bg-white/30 px-2 py-1 rounded-lg transition-colors disabled:opacity-50 w-full"
                      >
                        {redeemingGraceSkip ? "Redeeming..." : "Preserve (2000 pts)"}
                      </button>
                    )}
                  </div>

                  <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl p-4 text-white">
                    <div className="flex items-center justify-between mb-2">
                      <Calendar className="w-5 h-5" />
                      <span className="text-xs opacity-90">Attendance</span>
                    </div>
                    <div className="text-2xl font-black">{attendance.toFixed(1)}%</div>
                  </div>

                  <div className="bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl p-4 text-white">
                    <div className="flex items-center justify-between mb-2">
                      <Target className="w-5 h-5" />
                      <span className="text-xs opacity-90">Questions</span>
                    </div>
                    <div className="text-2xl font-black">{questions.toLocaleString()}</div>
                  </div>
                </div>

                {/* SUPER Progress */}
                {superProgress && (
                  <div className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-slate-700 dark:to-slate-800 rounded-xl p-5 border border-purple-200 dark:border-slate-600">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="text-lg font-bold text-slate-900 dark:text-slate-100">SUPER Journey</h4>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          {superProgress.current_letter 
                            ? `Current: ${superProgress.current_letter} - ${superProgress.current_letter === "S" ? "Started" : superProgress.current_letter === "U" ? "Understanding" : superProgress.current_letter === "P" ? "Practice" : superProgress.current_letter === "E" ? "Excellence" : "Ready"}`
                            : "Start your journey!"}
                        </p>
                      </div>
                      <Star className="w-6 h-6 text-yellow-500" />
                    </div>
                    <div className="mb-2">
                      <div className="flex justify-between text-sm text-slate-600 dark:text-slate-400 mb-1">
                        <span>Next: {nextReward?.title}</span>
                        <span>{Math.min(progress, 100).toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-purple-500 to-indigo-600 transition-all duration-500 rounded-full"
                          style={{ width: `${Math.min(progress, 100)}%` }}
                        />
                      </div>
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {points.toLocaleString()} / {nextReward?.points.toLocaleString()} points
                    </div>
                  </div>
                )}
              </section>

              {/* Section 2: Points System */}
              <section className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl p-6 border border-blue-200 dark:border-blue-800">
                <h3 className="text-lg font-black tracking-tighter uppercase italic text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-blue-500" />
                  Points System
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span className="text-slate-700 dark:text-slate-300"><strong>Daily login:</strong> +10 points</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span className="text-slate-700 dark:text-slate-300"><strong>Per question:</strong> +1 point (attempted)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span className="text-slate-700 dark:text-slate-300"><strong>Per correct:</strong> +10 points</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span className="text-slate-700 dark:text-slate-300"><strong>Streak bonuses:</strong> 7/14/21 days and full month</span>
                  </div>
                </div>
              </section>

              {/* Section 3: Monthly Badges */}
              <section className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-6 border border-slate-200 dark:border-slate-700">
                <h3 className="text-lg font-black tracking-tighter uppercase italic text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                  <Award className="w-5 h-5 text-yellow-500" />
                  Monthly Badges (9 total)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {earnedMonthly.map((badge) => {
                    const Icon = badge.icon;
                    return (
                      <div key={badge.type} className={`bg-gradient-to-br ${badge.color} rounded-xl p-4 text-white relative overflow-hidden`}>
                        <div className="flex items-center gap-2 mb-2">
                          {getBadgeIcon(Icon)}
                          <CheckCircle2 className="w-4 h-4 ml-auto" />
                        </div>
                        <div className="font-bold text-sm">{badge.name}</div>
                      </div>
                    );
                  })}
                  {lockedMonthly.map((badge) => {
                    const Icon = badge.icon;
                    return (
                      <div key={badge.type} className="bg-slate-100 dark:bg-slate-700 rounded-xl p-4 border-2 border-dashed border-slate-300 dark:border-slate-600 opacity-60">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="text-slate-400">{getBadgeIcon(Icon)}</div>
                          <Lock className="w-4 h-4 ml-auto text-slate-400" />
                        </div>
                        <div className="font-bold text-sm text-slate-600 dark:text-slate-400">{badge.name}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-500 mt-1 flex items-start gap-1">
                          <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                          <span>{badge.hint}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* Section 4: Lifetime Badges */}
              <section className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-6 border border-slate-200 dark:border-slate-700">
                <h3 className="text-lg font-black tracking-tighter uppercase italic text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                  <Crown className="w-5 h-5 text-amber-500" />
                  Lifetime Badges (3 total)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {earnedLifetime.map((badge) => {
                    const Icon = badge.icon;
                    return (
                      <div key={badge.type} className={`bg-gradient-to-br ${badge.color} rounded-xl p-4 text-white relative overflow-hidden`}>
                        <div className="flex items-center gap-2 mb-2">
                          {getBadgeIcon(Icon)}
                          <CheckCircle2 className="w-4 h-4 ml-auto" />
                        </div>
                        <div className="font-bold text-sm">{badge.name}</div>
                        <div className="text-xs opacity-90 mt-1">{badge.hint}</div>
                      </div>
                    );
                  })}
                  {lockedLifetime.map((badge) => {
                    const Icon = badge.icon;
                    return (
                      <div key={badge.type} className="bg-slate-100 dark:bg-slate-700 rounded-xl p-4 border-2 border-dashed border-slate-300 dark:border-slate-600 opacity-60">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="text-slate-400">{getBadgeIcon(Icon)}</div>
                          <Lock className="w-4 h-4 ml-auto text-slate-400" />
                        </div>
                        <div className="font-bold text-sm text-slate-600 dark:text-slate-400">{badge.name}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-500 mt-1 flex items-start gap-1">
                          <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                          <span>{badge.hint}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* Section 5: SUPER Journey Rewards */}
              <section className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-6 border border-slate-200 dark:border-slate-700">
                <h3 className="text-lg font-black tracking-tighter uppercase italic text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                  <Gift className="w-5 h-5 text-pink-500" />
                  SUPER Journey Rewards
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {superRewards.map((reward, index) => {
                    const unlocked = points >= reward.points;
                    return (
                      <div
                        key={index}
                        className={`relative rounded-xl p-4 border-2 transition-all duration-300 ${
                          unlocked
                            ? `bg-gradient-to-br ${reward.color} text-white shadow-lg scale-105`
                            : "bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 opacity-60"
                        }`}
                      >
                        {unlocked && (
                          <div className="absolute top-2 right-2">
                            <div className="w-6 h-6 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                              <Star className="w-3 h-3 text-yellow-300 fill-yellow-300" />
                            </div>
                          </div>
                        )}
                        <div className="text-center">
                          <div className={`text-3xl mb-2 ${unlocked ? "" : "opacity-50"}`}>{reward.icon}</div>
                          <div className={`font-bold text-xs ${unlocked ? "text-white" : "text-slate-600 dark:text-slate-400"}`}>
                            {reward.title}
                          </div>
                          {reward.description && (
                            <div className={`text-xs mt-1 ${unlocked ? "text-white/90" : "text-slate-500"}`}>
                            {reward.description}
                          </div>
                          )}
                          <div className={`text-xs mt-2 ${unlocked ? "text-white/80" : "text-slate-500"}`}>
                            {reward.points.toLocaleString()} pts
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-100 dark:bg-slate-800 p-4 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={onClose}
            className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
          >
            Got it! Let's Earn More! 🚀
          </button>
        </div>
      </div>
    </div>
  );
}
