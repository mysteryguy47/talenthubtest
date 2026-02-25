import { useState, useEffect } from "react";
import {
  CreditCard, Save, X, Loader2, AlertCircle, CheckCircle2,
  DollarSign, Calendar, FileText, Receipt
} from "lucide-react";
import {
  FeeAssignment,
  FeeTransactionCreate,
  createFeeTransaction,
  getFeeAssignments,
  getFeeTransactions,
  FeeTransaction,
} from "../../lib/feeApi";

interface PaymentRecordingProps {
  studentProfileId: number;
  onPaymentRecorded?: () => void;
}

const PAYMENT_MODES = ["cash", "online", "cheque", "bank_transfer"];
const TRANSACTION_TYPES = ["payment", "adjustment", "refund"];

export default function PaymentRecording({ studentProfileId, onPaymentRecorded }: PaymentRecordingProps) {
  const [assignment, setAssignment] = useState<FeeAssignment | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<FeeTransaction[]>([]);

  const [formData, setFormData] = useState<FeeTransactionCreate>({
    assignment_id: 0,
    transaction_type: "payment",
    amount: 0,
    payment_date: new Date().toISOString().split("T")[0],
    payment_mode: "cash",
    reference_number: "",
    remarks: "",
    is_partial: false,
  });

  useEffect(() => {
    loadAssignment();
  }, [studentProfileId]);

  useEffect(() => {
    if (assignment) {
      loadTransactions();
    }
  }, [assignment]);

  const loadAssignment = async () => {
    try {
      setLoading(true);
      setError(null);
      const assignments = await getFeeAssignments({
        student_profile_id: studentProfileId,
        is_active: true,
      });
      if (assignments.length > 0) {
        setAssignment(assignments[0]);
        setFormData((prev) => ({ ...prev, assignment_id: assignments[0].id }));
      }
    } catch (err: any) {
      setError(err.message || "Failed to load fee assignment");
    } finally {
      setLoading(false);
    }
  };

  const loadTransactions = async () => {
    if (!assignment) return;
    try {
      const txs = await getFeeTransactions({ assignment_id: assignment.id });
      setTransactions(txs);
      
      // Calculate current balance
      const totalPaid = txs
        .filter((t) => t.transaction_type === "payment" && t.amount > 0)
        .reduce((sum, t) => sum + t.amount, 0);
      
      const totalRefunds = txs
        .filter((t) => t.transaction_type === "refund" || (t.transaction_type === "adjustment" && t.amount < 0))
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);
      
      const currentBalance = Math.max(0, assignment.effective_fee_amount - totalPaid + totalRefunds);
      setBalance(currentBalance);
      
      // Set default amount to balance if payment
      if (formData.transaction_type === "payment" && currentBalance > 0) {
        setFormData((prev) => ({ ...prev, amount: currentBalance }));
      }
    } catch (err: any) {
      console.error("Failed to load transactions:", err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignment) return;

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const transactionData: FeeTransactionCreate = {
        ...formData,
        assignment_id: assignment.id,
        payment_date: new Date(formData.payment_date + "T00:00:00").toISOString(),
      };

      await createFeeTransaction(transactionData);
      setSuccess("Payment recorded successfully");
      setShowModal(false);
      loadTransactions();
      if (onPaymentRecorded) {
        onPaymentRecorded();
      }
      
      // Reset form
      setFormData({
        assignment_id: assignment.id,
        transaction_type: "payment",
        amount: balance,
        payment_date: new Date().toISOString().split("T")[0],
        payment_mode: "cash",
        reference_number: "",
        remarks: "",
        is_partial: false,
      });
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to record payment");
    } finally {
      setSaving(false);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-600 dark:text-indigo-400" />
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4">
        <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
          <AlertCircle className="w-5 h-5" />
          <span>No active fee assignment found for this student</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Balance Info */}
      <div className="bg-gradient-to-br from-indigo-500/10 to-purple-600/10 dark:from-indigo-500/20 dark:to-purple-600/20 rounded-xl p-4 border border-indigo-200/50 dark:border-indigo-700/50">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">Current Balance</div>
            <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
              {formatCurrency(balance)}
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">Effective Fee</div>
            <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {formatCurrency(assignment.effective_fee_amount)}
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
          <span className="text-red-600 dark:text-red-400">{error}</span>
        </div>
      )}
      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
          <span className="text-green-600 dark:text-green-400">{success}</span>
        </div>
      )}

      {/* Record Payment Button */}
      <button
        onClick={() => setShowModal(true)}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 dark:bg-indigo-500 text-white rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-colors shadow-lg hover:shadow-xl font-semibold"
      >
        <CreditCard className="w-5 h-5" />
        Record Payment
      </button>

      {/* Payment Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto scrollbar-premium">
            <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-6 flex items-center justify-between">
              <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Receipt className="w-6 h-6" />
                Record Payment
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Transaction Type */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Transaction Type *
                </label>
                <select
                  required
                  value={formData.transaction_type}
                  onChange={(e) => {
                    const type = e.target.value;
                    setFormData({ ...formData, transaction_type: type });
                    if (type === "payment" && balance > 0) {
                      setFormData((prev) => ({ ...prev, amount: balance }));
                    }
                  }}
                  className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent bg-slate-700 dark:bg-slate-700 text-white dark:text-white"
                >
                  {TRANSACTION_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Amount */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Amount (INR) *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={formData.amount || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "") {
                        setFormData({ ...formData, amount: 0 });
                      } else {
                        const numVal = parseFloat(val);
                        if (!isNaN(numVal)) {
                          setFormData({ ...formData, amount: numVal });
                        }
                      }
                    }}
                    onBlur={(e) => {
                      if (e.target.value === "" || e.target.value === "0") {
                        setFormData({ ...formData, amount: 0 });
                      }
                    }}
                    className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent bg-slate-700 dark:bg-slate-700 text-white dark:text-white"
                  />
                  {formData.transaction_type === "payment" && balance > 0 && (
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, amount: balance })}
                      className="mt-2 text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      Use full balance ({formatCurrency(balance)})
                    </button>
                  )}
                </div>

                {/* Payment Date */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Payment Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.payment_date}
                    onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent bg-slate-700 dark:bg-slate-700 text-white dark:text-white"
                  />
                </div>

                {/* Payment Mode */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Payment Mode *
                  </label>
                  <select
                    required
                    value={formData.payment_mode}
                    onChange={(e) => setFormData({ ...formData, payment_mode: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent bg-slate-700 dark:bg-slate-700 text-white dark:text-white"
                  >
                    {PAYMENT_MODES.map((mode) => (
                      <option key={mode} value={mode}>
                        {mode.charAt(0).toUpperCase() + mode.slice(1).replace("_", " ")}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Reference Number */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Reference Number
                  </label>
                  <input
                    type="text"
                    value={formData.reference_number || ""}
                    onChange={(e) => setFormData({ ...formData, reference_number: e.target.value || null })}
                    placeholder="Transaction/Cheque number"
                    className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent bg-slate-700 dark:bg-slate-700 text-white dark:text-white"
                  />
                </div>
              </div>

              {/* Partial Payment */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_partial"
                  checked={formData.is_partial}
                  onChange={(e) => setFormData({ ...formData, is_partial: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                />
                <label htmlFor="is_partial" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  This is a partial payment
                </label>
              </div>

              {/* Remarks */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Remarks
                </label>
                <textarea
                  value={formData.remarks || ""}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value || null })}
                  rows={3}
                  placeholder="Optional remarks or notes"
                  className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent bg-slate-700 dark:bg-slate-700 text-white dark:text-white"
                />
              </div>

              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-600 dark:text-red-400 text-sm">
                  {error}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2.5 bg-indigo-600 dark:bg-indigo-500 text-white rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Record Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
