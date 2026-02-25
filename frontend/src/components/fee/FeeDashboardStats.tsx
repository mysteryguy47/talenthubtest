import { DollarSign, TrendingUp, Users, AlertCircle, Calendar, CreditCard } from "lucide-react";
import { FeeDashboardStats as FeeDashboardStatsType } from "../../lib/feeApi";

interface FeeDashboardStatsProps {
  stats: FeeDashboardStatsType | null;
  loading: boolean;
  onStatClick?: (statType: string) => void;
}

export default function FeeDashboardStats({ stats, loading, onStatClick }: FeeDashboardStatsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg dark:shadow-xl border border-slate-200/50 dark:border-slate-700/50 animate-pulse"
          >
            <div className="h-12 bg-slate-200 dark:bg-slate-700 rounded-xl mb-4"></div>
            <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded-lg"></div>
          </div>
        ))}
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* Total Collected All Time */}
      <div 
        onClick={() => onStatClick?.("total_collected_all_time")}
        className={`bg-gradient-to-br from-emerald-500/10 to-green-600/10 dark:from-emerald-500/20 dark:to-green-600/20 backdrop-blur-sm rounded-2xl p-6 shadow-lg dark:shadow-xl border border-emerald-200/50 dark:border-emerald-700/50 transition-all duration-300 hover:shadow-xl hover:scale-[1.02] ${onStatClick ? 'cursor-pointer' : ''}`}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="p-3 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl shadow-lg">
            <DollarSign className="w-6 h-6 text-white" />
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {formatCurrency(stats.total_fee_collected_all_time)}
            </div>
          </div>
        </div>
        <div className="text-sm font-semibold text-slate-600 dark:text-slate-400">Total Collected (All Time)</div>
        <div className="mt-2 text-xs text-slate-500 dark:text-slate-500">
          Lifetime revenue
        </div>
      </div>

      {/* Monthly Collection */}
      <div 
        onClick={() => onStatClick?.("total_collected_monthly")}
        className={`bg-gradient-to-br from-blue-500/10 to-indigo-600/10 dark:from-blue-500/20 dark:to-indigo-600/20 backdrop-blur-sm rounded-2xl p-6 shadow-lg dark:shadow-xl border border-blue-200/50 dark:border-blue-700/50 transition-all duration-300 hover:shadow-xl hover:scale-[1.02] ${onStatClick ? 'cursor-pointer' : ''}`}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
            <TrendingUp className="w-6 h-6 text-white" />
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {formatCurrency(stats.total_fee_collected_monthly)}
            </div>
          </div>
        </div>
        <div className="text-sm font-semibold text-slate-600 dark:text-slate-400">Monthly Collection</div>
        <div className="mt-2 text-xs text-slate-500 dark:text-slate-500">
          This month
        </div>
      </div>

      {/* Today's Collection */}
      <div 
        onClick={() => onStatClick?.("total_collected_today")}
        className={`bg-gradient-to-br from-purple-500/10 to-pink-600/10 dark:from-purple-500/20 dark:to-pink-600/20 backdrop-blur-sm rounded-2xl p-6 shadow-lg dark:shadow-xl border border-purple-200/50 dark:border-purple-700/50 transition-all duration-300 hover:shadow-xl hover:scale-[1.02] ${onStatClick ? 'cursor-pointer' : ''}`}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl shadow-lg">
            <Calendar className="w-6 h-6 text-white" />
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {formatCurrency(stats.total_fee_collected_today)}
            </div>
          </div>
        </div>
        <div className="text-sm font-semibold text-slate-600 dark:text-slate-400">Today's Collection</div>
        <div className="mt-2 text-xs text-slate-500 dark:text-slate-500">
          Daily revenue
        </div>
      </div>

      {/* Total Due */}
      <div 
        onClick={() => onStatClick?.("total_fees_due")}
        className={`bg-gradient-to-br from-orange-500/10 to-red-600/10 dark:from-orange-500/20 dark:to-red-600/20 backdrop-blur-sm rounded-2xl p-6 shadow-lg dark:shadow-xl border border-orange-200/50 dark:border-orange-700/50 transition-all duration-300 hover:shadow-xl hover:scale-[1.02] ${onStatClick ? 'cursor-pointer' : ''}`}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="p-3 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl shadow-lg">
            <AlertCircle className="w-6 h-6 text-white" />
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
              {formatCurrency(stats.total_fees_due)}
            </div>
          </div>
        </div>
        <div className="text-sm font-semibold text-slate-600 dark:text-slate-400">Total Fees Due</div>
        <div className="mt-2 text-xs text-slate-500 dark:text-slate-500">
          Pending payments
        </div>
      </div>

      {/* Active Students */}
      <div 
        onClick={() => onStatClick?.("active_students")}
        className={`bg-gradient-to-br from-cyan-500/10 to-teal-600/10 dark:from-cyan-500/20 dark:to-teal-600/20 backdrop-blur-sm rounded-2xl p-6 shadow-lg dark:shadow-xl border border-cyan-200/50 dark:border-cyan-700/50 transition-all duration-300 hover:shadow-xl hover:scale-[1.02] ${onStatClick ? 'cursor-pointer' : ''}`}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="p-3 bg-gradient-to-br from-cyan-500 to-teal-600 rounded-xl shadow-lg">
            <Users className="w-6 h-6 text-white" />
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-cyan-600 dark:text-cyan-400">
              {stats.total_active_students}
            </div>
          </div>
        </div>
        <div className="text-sm font-semibold text-slate-600 dark:text-slate-400">Active Students</div>
        <div className="mt-2 text-xs text-slate-500 dark:text-slate-500">
          With fee plans
        </div>
      </div>

      {/* Students with Due Fees */}
      <div 
        onClick={() => onStatClick?.("students_with_due")}
        className={`bg-gradient-to-br from-amber-500/10 to-yellow-600/10 dark:from-amber-500/20 dark:to-yellow-600/20 backdrop-blur-sm rounded-2xl p-6 shadow-lg dark:shadow-xl border border-amber-200/50 dark:border-amber-700/50 transition-all duration-300 hover:shadow-xl hover:scale-[1.02] ${onStatClick ? 'cursor-pointer' : ''}`}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="p-3 bg-gradient-to-br from-amber-500 to-yellow-600 rounded-xl shadow-lg">
            <CreditCard className="w-6 h-6 text-white" />
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {stats.students_with_due_fees}
            </div>
          </div>
        </div>
        <div className="text-sm font-semibold text-slate-600 dark:text-slate-400">Students with Due</div>
        <div className="mt-2 text-xs text-slate-500 dark:text-slate-500">
          Pending fees
        </div>
      </div>

      {/* Overdue Count */}
      <div 
        onClick={() => onStatClick?.("overdue_students")}
        className={`bg-gradient-to-br from-red-500/10 to-rose-600/10 dark:from-red-500/20 dark:to-rose-600/20 backdrop-blur-sm rounded-2xl p-6 shadow-lg dark:shadow-xl border border-red-200/50 dark:border-red-700/50 transition-all duration-300 hover:shadow-xl hover:scale-[1.02] ${onStatClick ? 'cursor-pointer' : ''}`}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="p-3 bg-gradient-to-br from-red-500 to-rose-600 rounded-xl shadow-lg">
            <AlertCircle className="w-6 h-6 text-white" />
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              {stats.overdue_count}
            </div>
          </div>
        </div>
        <div className="text-sm font-semibold text-slate-600 dark:text-slate-400">Overdue Students</div>
        <div className="mt-2 text-xs text-slate-500 dark:text-slate-500">
          Past due date
        </div>
      </div>

      {/* Due Today */}
      <div 
        onClick={() => onStatClick?.("due_today")}
        className={`bg-gradient-to-br from-indigo-500/10 to-violet-600/10 dark:from-indigo-500/20 dark:to-violet-600/20 backdrop-blur-sm rounded-2xl p-6 shadow-lg dark:shadow-xl border border-indigo-200/50 dark:border-indigo-700/50 transition-all duration-300 hover:shadow-xl hover:scale-[1.02] ${onStatClick ? 'cursor-pointer' : ''}`}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="p-3 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl shadow-lg">
            <Calendar className="w-6 h-6 text-white" />
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
              {stats.due_today_count}
            </div>
          </div>
        </div>
        <div className="text-sm font-semibold text-slate-600 dark:text-slate-400">Due Today</div>
        <div className="mt-2 text-xs text-slate-500 dark:text-slate-500">
          Payment due today
        </div>
      </div>
    </div>
  );
}
