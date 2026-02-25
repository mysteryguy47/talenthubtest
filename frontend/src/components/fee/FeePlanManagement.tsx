import { useState, useEffect } from "react";
import {
  Plus, Edit2, Trash2, X, Save, Loader2, AlertCircle, CheckCircle2,
  DollarSign, Calendar, MapPin, BookOpen, Search, Filter
} from "lucide-react";
import {
  FeePlan,
  FeePlanCreate,
  FeePlanUpdate,
  createFeePlan,
  getFeePlans,
  updateFeePlan,
  deleteFeePlan,
} from "../../lib/feeApi";
import { BRANCHES, COURSES } from "../../constants/index";

interface FeePlanManagementProps {
  onPlanSelect?: (plan: FeePlan) => void;
  selectedPlanId?: number | null;
}

export default function FeePlanManagement({ onPlanSelect, selectedPlanId }: FeePlanManagementProps) {
  const [plans, setPlans] = useState<FeePlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<FeePlan | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterBranch, setFilterBranch] = useState<string>("");
  const [filterCourse, setFilterCourse] = useState<string>("");
  const [filterActive, setFilterActive] = useState<boolean | null>(null);

  // Form state
  const [formData, setFormData] = useState<FeePlanCreate>({
    name: "",
    description: "",
    branch: null,
    course: null,
    level: null,
    fee_amount: 0,
    fee_duration_days: 30,
    currency: "INR",
    is_active: true,
  });
  const [durationDaysInput, setDurationDaysInput] = useState<string | null>(null);

  useEffect(() => {
    loadPlans();
  }, [filterBranch, filterCourse, filterActive]);

  const loadPlans = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getFeePlans({
        branch: filterBranch || undefined,
        course: filterCourse || undefined,
        is_active: filterActive !== null ? filterActive : undefined,
      });
      setPlans(data);
    } catch (err: any) {
      setError(err.message || "Failed to load fee plans");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingPlan(null);
    setFormData({
      name: "",
      description: "",
      branch: null,
      course: null,
      level: null,
      fee_amount: 0,
      fee_duration_days: 30,
      currency: "INR",
      is_active: true,
    });
    setDurationDaysInput(null);
    setShowCreateModal(true);
    setError(null);
    setSuccess(null);
  };

  const handleEdit = (plan: FeePlan) => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name,
      description: plan.description || "",
      branch: plan.branch || null,
      course: plan.course || null,
      level: plan.level || null,
      fee_amount: plan.fee_amount,
      fee_duration_days: plan.fee_duration_days,
      currency: plan.currency,
      is_active: plan.is_active,
    });
    setDurationDaysInput(plan.fee_duration_days.toString());
    setShowCreateModal(true);
    setError(null);
    setSuccess(null);
  };

  const handleDelete = async (planId: number) => {
    if (!window.confirm("Are you sure you want to deactivate this fee plan?")) {
      return;
    }
    try {
      await deleteFeePlan(planId);
      setSuccess("Fee plan deactivated successfully");
      loadPlans();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to delete fee plan");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);
      setSuccess(null);
      if (editingPlan) {
        const updateData: FeePlanUpdate = {
          ...formData,
          branch: formData.branch || null,
          course: formData.course || null,
          level: formData.level || null,
        };
        await updateFeePlan(editingPlan.id, updateData);
        setSuccess("Fee plan updated successfully");
      } else {
        await createFeePlan(formData);
        setSuccess("Fee plan created successfully");
      }
      setShowCreateModal(false);
      loadPlans();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to save fee plan");
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

  const filteredPlans = plans.filter((plan) => {
    const search = searchTerm.toLowerCase();
    return (
      plan.name.toLowerCase().includes(search) ||
      plan.description?.toLowerCase().includes(search) ||
      ""
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Fee Plans</h2>
          <p className="text-slate-600 dark:text-slate-400 mt-1">Manage fee plan templates</p>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 dark:bg-indigo-500 text-white rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-colors shadow-lg hover:shadow-xl"
        >
          <Plus className="w-5 h-5" />
          Create Plan
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search plans..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent bg-slate-700 dark:bg-slate-700 text-white dark:text-white"
          />
        </div>
        <select
          value={filterBranch}
          onChange={(e) => setFilterBranch(e.target.value)}
          className="premium-select"
        >
          <option value="">All Branches</option>
          {BRANCHES.map((branch) => (
            <option key={branch} value={branch}>
              {branch}
            </option>
          ))}
        </select>
        <select
          value={filterCourse}
          onChange={(e) => setFilterCourse(e.target.value)}
          className="premium-select"
        >
          <option value="">All Courses</option>
          {COURSES.map((course) => (
            <option key={course} value={course}>
              {course}
            </option>
          ))}
        </select>
        <select
          value={filterActive === null ? "" : filterActive ? "true" : "false"}
          onChange={(e) => setFilterActive(e.target.value === "" ? null : e.target.value === "true")}
          className="premium-select"
        >
          <option value="">All Status</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
      </div>

      {/* Plans Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600 dark:text-indigo-400" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPlans.map((plan) => (
            <div
              key={plan.id}
              className={`bg-white dark:bg-slate-800 rounded-xl border-2 p-6 transition-all duration-200 hover:shadow-lg ${
                selectedPlanId === plan.id
                  ? "border-indigo-500 dark:border-indigo-400 shadow-lg"
                  : "border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-600"
              } ${!plan.is_active ? "opacity-60" : ""}`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-1">
                    {plan.name}
                  </h3>
                  {plan.description && (
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                      {plan.description}
                    </p>
                  )}
                </div>
                {!plan.is_active && (
                  <span className="px-2 py-1 text-xs font-semibold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 rounded">
                    Inactive
                  </span>
                )}
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm">
                  <DollarSign className="w-4 h-4 text-green-600 dark:text-green-400" />
                  <span className="text-slate-600 dark:text-slate-400">Fee Amount:</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    {formatCurrency(plan.fee_amount)}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-slate-600 dark:text-slate-400">Duration:</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    {plan.fee_duration_days} days
                  </span>
                </div>
                {plan.branch && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    <span className="text-slate-600 dark:text-slate-400">Branch:</span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      {plan.branch}
                    </span>
                  </div>
                )}
                {plan.course && (
                  <div className="flex items-center gap-2 text-sm">
                    <BookOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span className="text-slate-600 dark:text-slate-400">Course:</span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      {plan.course}
                    </span>
                  </div>
                )}
                {plan.level && (
                  <div className="text-sm">
                    <span className="text-slate-600 dark:text-slate-400">Level: </span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      {plan.level}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 pt-4 border-t border-slate-200 dark:border-slate-700">
                <button
                  onClick={() => handleEdit(plan)}
                  className="flex-1 px-3 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors flex items-center justify-center gap-2"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(plan.id)}
                  className="px-3 py-2 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                {onPlanSelect && (
                  <button
                    onClick={() => onPlanSelect(plan)}
                    className="px-3 py-2 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors"
                    title="Select Plan"
                  >
                    Select
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {filteredPlans.length === 0 && !loading && (
        <div className="text-center py-12 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
          <DollarSign className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-400">No fee plans found</p>
          <button
            onClick={handleCreate}
            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Create First Plan
          </button>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto scrollbar-premium">
            <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-6 flex items-center justify-between">
              <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {editingPlan ? "Edit Fee Plan" : "Create Fee Plan"}
              </h3>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setDurationDaysInput(null);
                }}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Plan Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                    placeholder="e.g., Monthly Abacus Fee"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description || ""}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                    placeholder="Optional description"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Branch
                  </label>
                  <select
                    value={formData.branch || ""}
                    onChange={(e) => setFormData({ ...formData, branch: e.target.value || null })}
                    className="premium-select"
                  >
                    <option value="">All Branches</option>
                    {BRANCHES.map((branch) => (
                      <option key={branch} value={branch}>
                        {branch}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Course
                  </label>
                  <select
                    value={formData.course || ""}
                    onChange={(e) => setFormData({ ...formData, course: e.target.value || null })}
                    className="premium-select"
                  >
                    <option value="">All Courses</option>
                    {COURSES.map((course) => (
                      <option key={course} value={course}>
                        {course}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Fee Amount (INR) *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={formData.fee_amount || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "") {
                        setFormData({ ...formData, fee_amount: 0 });
                      } else {
                        const numVal = parseFloat(val);
                        if (!isNaN(numVal)) {
                          setFormData({ ...formData, fee_amount: numVal });
                        }
                      }
                    }}
                    onBlur={(e) => {
                      if (e.target.value === "" || e.target.value === "0") {
                        setFormData({ ...formData, fee_amount: 0 });
                      }
                    }}
                    className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Duration (Days) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={durationDaysInput !== null ? durationDaysInput : formData.fee_duration_days.toString()}
                    onChange={(e) => {
                      const val = e.target.value;
                      setDurationDaysInput(val);
                      if (val === "") {
                        // Allow empty string while user is typing - don't update formData yet
                        return;
                      } else {
                        const numVal = parseInt(val);
                        if (!isNaN(numVal) && numVal >= 1) {
                          setFormData({ ...formData, fee_duration_days: numVal });
                        }
                      }
                    }}
                    onBlur={(e) => {
                      const val = e.target.value;
                      if (val === "" || val === "0" || parseInt(val) < 1 || isNaN(parseInt(val))) {
                        // Set to default when user leaves the field empty or invalid
                        setFormData({ ...formData, fee_duration_days: 30 });
                        setDurationDaysInput(null);
                      } else {
                        // Sync the input value with formData
                        const numVal = parseInt(val);
                        if (!isNaN(numVal) && numVal >= 1) {
                          setFormData({ ...formData, fee_duration_days: numVal });
                          setDurationDaysInput(null); // Reset to null so it uses formData value
                        }
                      }
                    }}
                    className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                    />
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Active
                    </span>
                  </label>
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
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2.5 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2.5 bg-indigo-600 dark:bg-indigo-500 text-white rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-colors flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {editingPlan ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
