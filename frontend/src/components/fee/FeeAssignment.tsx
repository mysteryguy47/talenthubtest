import { useState, useEffect } from "react";
import {
  UserPlus, Save, X, Loader2, AlertCircle, CheckCircle2,
  DollarSign, Calendar, Percent, FileText, Users, Search
} from "lucide-react";
import {
  FeePlan,
  FeeAssignmentCreate,
  createFeeAssignment,
  getFeePlans,
  getFeeAssignments,
} from "../../lib/feeApi";
import { getAllStudents, User } from "../../lib/userApi";
import { getStudentsForAttendance } from "../../lib/attendanceApi";
import { BRANCHES, COURSES } from "../../constants/index";

interface FeeAssignmentProps {
  onAssignmentCreated?: () => void;
}

export default function FeeAssignment({ onAssignmentCreated }: FeeAssignmentProps) {
  const [plans, setPlans] = useState<FeePlan[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<string>("");
  const [selectedCourse, setSelectedCourse] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");

  const [formData, setFormData] = useState<FeeAssignmentCreate>({
    student_profile_id: 0,
    fee_plan_id: 0,
    custom_fee_amount: null,
    discount_amount: 0,
    discount_percentage: 0,
    start_date: new Date().toISOString().split("T")[0],
    end_date: null,
    remarks: "",
  });

  const [calculatedEffectiveFee, setCalculatedEffectiveFee] = useState(0);

  useEffect(() => {
    loadPlans();
    if (selectedBranch) {
      loadStudents();
    }
  }, [selectedBranch, selectedCourse]);

  useEffect(() => {
    if (formData.fee_plan_id > 0) {
      const plan = plans.find((p) => p.id === formData.fee_plan_id);
      if (plan) {
        calculateEffectiveFee(plan);
      }
    }
  }, [formData.fee_plan_id, formData.custom_fee_amount, formData.discount_amount, formData.discount_percentage, plans]);

  const loadPlans = async () => {
    try {
      const data = await getFeePlans({ is_active: true });
      setPlans(data);
    } catch (err: any) {
      console.error("Failed to load plans:", err);
    }
  };

  const loadStudents = async () => {
    try {
      setLoading(true);
      const data = await getStudentsForAttendance(selectedBranch, selectedCourse || undefined);
      setStudents(data);
    } catch (err: any) {
      setError(err.message || "Failed to load students");
    } finally {
      setLoading(false);
    }
  };

  const calculateEffectiveFee = (plan: FeePlan) => {
    const baseAmount = formData.custom_fee_amount ?? plan.fee_amount;
    const discount = formData.discount_amount + (baseAmount * formData.discount_percentage / 100);
    const effective = Math.max(0, baseAmount - discount);
    setCalculatedEffectiveFee(effective);
  };

  const handleCreate = () => {
    setFormData({
      student_profile_id: 0,
      fee_plan_id: 0,
      custom_fee_amount: null,
      discount_amount: 0,
      discount_percentage: 0,
      start_date: new Date().toISOString().split("T")[0],
      end_date: null,
      remarks: "",
    });
    setCalculatedEffectiveFee(0);
    setShowModal(true);
    setError(null);
    setSuccess(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.student_profile_id || !formData.fee_plan_id) {
      setError("Please select a student and fee plan");
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      await createFeeAssignment(formData);
      setSuccess("Fee plan assigned successfully");
      setShowModal(false);
      if (onAssignmentCreated) {
        onAssignmentCreated();
      }
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to assign fee plan");
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

  const filteredStudents = students.filter((student) => {
    const search = searchTerm.toLowerCase();
    return (
      student.name.toLowerCase().includes(search) ||
      student.display_name?.toLowerCase().includes(search) ||
      student.public_id?.toLowerCase().includes(search) ||
      ""
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Assign Fee Plans</h2>
          <p className="text-slate-600 dark:text-slate-400 mt-1">Assign fee plans to students with discounts</p>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 dark:bg-indigo-500 text-white rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-colors shadow-lg hover:shadow-xl"
        >
          <UserPlus className="w-5 h-5" />
          Assign Plan
        </button>
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

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Branch *
          </label>
          <select
            required
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            className="premium-select w-full"
          >
            <option value="">Select Branch</option>
            {BRANCHES.map((branch) => (
              <option key={branch} value={branch}>
                {branch}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Course (Optional)
          </label>
          <select
            value={selectedCourse}
            onChange={(e) => setSelectedCourse(e.target.value)}
            className="premium-select w-full"
          >
            <option value="">All Courses</option>
            {COURSES.map((course) => (
              <option key={course} value={course}>
                {course}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Assignment Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto scrollbar-premium">
            <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-6 flex items-center justify-between">
              <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <UserPlus className="w-6 h-6" />
                Assign Fee Plan
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Student Selection */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Student *
                  </label>
                  {selectedBranch ? (
                    <div className="space-y-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                        <input
                          type="text"
                          placeholder="Search students..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full pl-10 pr-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 mb-2"
                        />
                      </div>
                      <select
                        required
                        value={formData.student_profile_id}
                        onChange={(e) => setFormData({ ...formData, student_profile_id: parseInt(e.target.value) })}
                        className="premium-select w-full"
                      >
                        <option value={0}>Select Student</option>
                        {filteredStudents.map((student) => (
                          <option key={student.id} value={student.id}>
                            {student.display_name || student.name} {student.public_id ? `(${student.public_id})` : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="text-sm text-slate-600 dark:text-slate-400">
                      Please select a branch first to load students
                    </div>
                  )}
                </div>

                {/* Fee Plan */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Fee Plan *
                  </label>
                  <select
                    required
                    value={formData.fee_plan_id}
                    onChange={(e) => setFormData({ ...formData, fee_plan_id: parseInt(e.target.value) })}
                    className="premium-select w-full"
                  >
                    <option value={0}>Select Fee Plan</option>
                    {plans.map((plan) => (
                      <option key={plan.id} value={plan.id}>
                        {plan.name} - {formatCurrency(plan.fee_amount)} ({plan.fee_duration_days} days)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Custom Fee Amount */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Custom Fee Amount (Optional)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.custom_fee_amount === null ? "" : formData.custom_fee_amount}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormData({ ...formData, custom_fee_amount: val === "" ? null : (parseFloat(val) || null) });
                    }}
                    placeholder="Override plan amount"
                    className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent bg-slate-700 dark:bg-slate-700 text-white dark:text-white"
                  />
                </div>

                {/* Start Date */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent bg-slate-700 dark:bg-slate-700 text-white dark:text-white"
                  />
                </div>

                {/* Discount Amount */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Discount Amount (INR)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.discount_amount || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "") {
                        setFormData({ ...formData, discount_amount: 0 });
                      } else {
                        const numVal = parseFloat(val);
                        if (!isNaN(numVal)) {
                          setFormData({ ...formData, discount_amount: numVal });
                        }
                      }
                    }}
                    onBlur={(e) => {
                      if (e.target.value === "" || e.target.value === "0") {
                        setFormData({ ...formData, discount_amount: 0 });
                      }
                    }}
                    className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent bg-slate-700 dark:bg-slate-700 text-white dark:text-white"
                  />
                </div>

                {/* Discount Percentage */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Discount Percentage (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={formData.discount_percentage || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "") {
                        setFormData({ ...formData, discount_percentage: 0 });
                      } else {
                        const numVal = parseFloat(val);
                        if (!isNaN(numVal)) {
                          setFormData({ ...formData, discount_percentage: numVal });
                        }
                      }
                    }}
                    onBlur={(e) => {
                      if (e.target.value === "" || e.target.value === "0") {
                        setFormData({ ...formData, discount_percentage: 0 });
                      }
                    }}
                    className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent bg-slate-700 dark:bg-slate-700 text-white dark:text-white"
                  />
                </div>

                {/* Effective Fee Display */}
                {calculatedEffectiveFee > 0 && (
                  <div className="md:col-span-2 bg-gradient-to-br from-green-500/10 to-emerald-600/10 dark:from-green-500/20 dark:to-emerald-600/20 rounded-xl p-4 border border-green-200/50 dark:border-green-700/50">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-slate-600 dark:text-slate-400">Effective Fee</div>
                      <div className="text-xl font-bold text-green-600 dark:text-green-400">
                        {formatCurrency(calculatedEffectiveFee)}
                      </div>
                    </div>
                  </div>
                )}

                {/* Remarks */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Remarks (Optional)
                  </label>
                  <textarea
                    value={formData.remarks || ""}
                    onChange={(e) => setFormData({ ...formData, remarks: e.target.value || null })}
                    rows={3}
                    placeholder="Optional remarks"
                    className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent bg-slate-700 dark:bg-slate-700 text-white dark:text-white"
                  />
                </div>
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
                  disabled={saving || !formData.student_profile_id || !formData.fee_plan_id}
                  className="px-4 py-2.5 bg-indigo-600 dark:bg-indigo-500 text-white rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Assign Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {!selectedBranch && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6 text-center">
          <Users className="w-12 h-12 text-blue-400 mx-auto mb-4" />
          <p className="text-blue-600 dark:text-blue-400">
            Please select a branch to view and assign fee plans to students
          </p>
        </div>
      )}
    </div>
  );
}
