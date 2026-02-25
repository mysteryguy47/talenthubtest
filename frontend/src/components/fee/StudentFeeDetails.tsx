import { useState, useEffect } from "react";
import {
  X, Loader2, AlertCircle, DollarSign, Calendar, FileText,
  CheckCircle2, Clock, User as UserIcon, TrendingDown, TrendingUp
} from "lucide-react";
import {
  StudentFeeSummary,
  getStudentFeeSummary,
  FeeTransaction,
} from "../../lib/feeApi";

interface StudentFeeDetailsProps {
  studentProfileId: number;
  onClose: () => void;
  onRefresh?: () => void;
}

export default function StudentFeeDetails({ studentProfileId, onClose, onRefresh }: StudentFeeDetailsProps) {
  const [summary, setSummary] = useState<StudentFeeSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSummary();
  }, [studentProfileId]);

  const loadSummary = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getStudentFeeSummary(studentProfileId);
      setSummary(data);
    } catch (err: any) {
      setError(err.message || "Failed to load fee details");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "—";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto scrollbar-premium">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600 dark:text-indigo-400" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto scrollbar-premium">
          <div className="p-6">
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <AlertCircle className="w-5 h-5" />
                <span>{error}</span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="mt-4 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!summary) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-6 flex items-center justify-between z-10">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <UserIcon className="w-6 h-6" />
              {summary.student_name}
              {summary.student_public_id && (
                <span className="text-lg font-normal text-slate-500 dark:text-slate-400">
                  ({summary.student_public_id})
                </span>
              )}
            </h2>
            <p className="text-slate-600 dark:text-slate-400 mt-1">Fee Details & Transaction History</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-green-500/10 to-emerald-600/10 dark:from-green-500/20 dark:to-emerald-600/20 rounded-xl p-4 border border-green-200/50 dark:border-green-700/50">
              <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">Total Paid</div>
              <div className="text-xl font-bold text-green-600 dark:text-green-400">
                {formatCurrency(summary.total_paid)}
              </div>
            </div>
            <div className="bg-gradient-to-br from-blue-500/10 to-indigo-600/10 dark:from-blue-500/20 dark:to-indigo-600/20 rounded-xl p-4 border border-blue-200/50 dark:border-blue-700/50">
              <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">Total Due</div>
              <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
                {formatCurrency(summary.total_due)}
              </div>
            </div>
            <div className={`bg-gradient-to-br rounded-xl p-4 border ${
              summary.balance > 0
                ? "from-orange-500/10 to-red-600/10 dark:from-orange-500/20 dark:to-red-600/20 border-orange-200/50 dark:border-orange-700/50"
                : "from-green-500/10 to-emerald-600/10 dark:from-green-500/20 dark:to-emerald-600/20 border-green-200/50 dark:border-green-700/50"
            }`}>
              <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">Balance</div>
              <div className={`text-xl font-bold ${
                summary.balance > 0
                  ? "text-orange-600 dark:text-orange-400"
                  : "text-green-600 dark:text-green-400"
              }`}>
                {formatCurrency(summary.balance)}
              </div>
            </div>
            <div className={`bg-gradient-to-br rounded-xl p-4 border ${
              summary.is_overdue
                ? "from-red-500/10 to-rose-600/10 dark:from-red-500/20 dark:to-rose-600/20 border-red-200/50 dark:border-red-700/50"
                : "from-indigo-500/10 to-purple-600/10 dark:from-indigo-500/20 dark:to-purple-600/20 border-indigo-200/50 dark:border-indigo-700/50"
            }`}>
              <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">Next Due Date</div>
              <div className={`text-xl font-bold ${
                summary.is_overdue
                  ? "text-red-600 dark:text-red-400"
                  : "text-indigo-600 dark:text-indigo-400"
              }`}>
                {formatDate(summary.next_due_date)}
              </div>
              {summary.is_overdue && (
                <div className="text-xs text-red-600 dark:text-red-400 mt-1">
                  {summary.overdue_days} days overdue
                </div>
              )}
            </div>
          </div>

          {/* Assignment Details */}
          {summary.current_assignment && (
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">Fee Assignment Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">Fee Plan</div>
                  <div className="font-semibold text-slate-900 dark:text-slate-100">
                    {summary.current_assignment.fee_plan?.name || "—"}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">Effective Fee</div>
                  <div className="font-semibold text-slate-900 dark:text-slate-100">
                    {formatCurrency(summary.current_assignment.effective_fee_amount)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">Discount</div>
                  <div className="font-semibold text-slate-900 dark:text-slate-100">
                    {summary.current_assignment.discount_amount > 0 || summary.current_assignment.discount_percentage > 0
                      ? `${formatCurrency(summary.current_assignment.discount_amount)} (${summary.current_assignment.discount_percentage}%)`
                      : "No discount"}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">Start Date</div>
                  <div className="font-semibold text-slate-900 dark:text-slate-100">
                    {formatDate(summary.current_assignment.start_date)}
                  </div>
                </div>
                {summary.current_assignment.remarks && (
                  <div className="md:col-span-2">
                    <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">Remarks</div>
                    <div className="text-slate-900 dark:text-slate-100">
                      {summary.current_assignment.remarks}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Transaction History */}
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">Transaction History</h3>
            {summary.transactions.length === 0 ? (
              <div className="text-center py-8 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                <FileText className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-600 dark:text-slate-400">No transactions found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {summary.transactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 hover:border-indigo-300 dark:hover:border-indigo-600 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className={`p-2 rounded-lg ${
                            transaction.transaction_type === "payment"
                              ? "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
                              : transaction.transaction_type === "refund"
                              ? "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
                              : "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400"
                          }`}>
                            {transaction.transaction_type === "payment" ? (
                              <TrendingUp className="w-4 h-4" />
                            ) : (
                              <TrendingDown className="w-4 h-4" />
                            )}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900 dark:text-slate-100">
                              {transaction.transaction_type.charAt(0).toUpperCase() + transaction.transaction_type.slice(1)}
                              {transaction.is_partial && " (Partial)"}
                            </div>
                            <div className="text-sm text-slate-600 dark:text-slate-400">
                              {formatDateTime(transaction.payment_date)}
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <div className="text-slate-500 dark:text-slate-400 mb-1">Amount</div>
                            <div className={`font-semibold ${
                              transaction.transaction_type === "payment"
                                ? "text-green-600 dark:text-green-400"
                                : "text-red-600 dark:text-red-400"
                            }`}>
                              {transaction.transaction_type === "payment" ? "+" : "-"}
                              {formatCurrency(Math.abs(transaction.amount))}
                            </div>
                          </div>
                          <div>
                            <div className="text-slate-500 dark:text-slate-400 mb-1">Mode</div>
                            <div className="font-semibold text-slate-900 dark:text-slate-100 capitalize">
                              {transaction.payment_mode.replace("_", " ")}
                            </div>
                          </div>
                          <div>
                            <div className="text-slate-500 dark:text-slate-400 mb-1">Balance Before</div>
                            <div className="font-semibold text-slate-900 dark:text-slate-100">
                              {formatCurrency(transaction.balance_before)}
                            </div>
                          </div>
                          <div>
                            <div className="text-slate-500 dark:text-slate-400 mb-1">Balance After</div>
                            <div className="font-semibold text-slate-900 dark:text-slate-100">
                              {formatCurrency(transaction.balance_after)}
                            </div>
                          </div>
                          {transaction.reference_number && (
                            <div className="md:col-span-2">
                              <div className="text-slate-500 dark:text-slate-400 mb-1">Reference</div>
                              <div className="font-semibold text-slate-900 dark:text-slate-100">
                                {transaction.reference_number}
                              </div>
                            </div>
                          )}
                          {transaction.remarks && (
                            <div className="md:col-span-2">
                              <div className="text-slate-500 dark:text-slate-400 mb-1">Remarks</div>
                              <div className="text-slate-900 dark:text-slate-100">
                                {transaction.remarks}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
