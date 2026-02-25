import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import {
  DollarSign, Users, CreditCard, FileText, Settings, Loader2,
  AlertCircle, RefreshCw, Filter, Search
} from "lucide-react";
import { getFeeDashboardStats, StudentFeeSummary } from "../lib/feeApi";
import FeeDashboardStats from "../components/fee/FeeDashboardStats";
import StudentFeeList from "../components/fee/StudentFeeList";
import FeePlanManagement from "../components/fee/FeePlanManagement";
import FeeAssignment from "../components/fee/FeeAssignment";
import PaymentRecording from "../components/fee/PaymentRecording";
import StudentFeeDetails from "../components/fee/StudentFeeDetails";
import { BRANCHES, COURSES } from "../constants/index";

type TabType = "dashboard" | "students" | "plans" | "payments";

export default function AdminFeeManagement() {
  const { isAdmin } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("dashboard");
  const [selectedStudent, setSelectedStudent] = useState<StudentFeeSummary | null>(null);
  const [selectedStudentForPayment, setSelectedStudentForPayment] = useState<number | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<string>("");
  const [selectedCourse, setSelectedCourse] = useState<string>("");
  const [showOverdueOnly, setShowOverdueOnly] = useState(false);
  const [selectedStatView, setSelectedStatView] = useState<string | null>(null);

  useEffect(() => {
    if (isAdmin) {
      loadStats();
    }
  }, [isAdmin]);

  const loadStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getFeeDashboardStats();
      setStats(data);
    } catch (err: any) {
      setError(err.message || "Failed to load fee dashboard");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    loadStats();
  };

  const handleStudentClick = (student: StudentFeeSummary) => {
    setSelectedStudent(student);
  };

  const handleCloseDetails = () => {
    setSelectedStudent(null);
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center transition-colors duration-300">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <p className="text-white">Access Denied</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: "dashboard" as TabType, label: "Dashboard", icon: DollarSign },
    { id: "students" as TabType, label: "Students", icon: Users },
    { id: "plans" as TabType, label: "Fee Plans", icon: FileText },
    { id: "payments" as TabType, label: "Record Payment", icon: CreditCard },
  ];

  return (
    <div className="min-h-screen bg-background pt-32 pb-20 px-6 transition-colors duration-300">
      <div className="container mx-auto">
        {/* Page Header */}
        <header className="mb-12">
          <h1 className="text-5xl font-black tracking-tighter uppercase italic text-foreground mb-2 flex items-center gap-3">
            <DollarSign className="w-10 h-10 text-primary" />
            Fee Management
          </h1>
          <p className="text-muted-foreground text-lg font-medium">Manage student fees, plans, and payments</p>
        </header>

        {/* Navigation Tabs */}
        <div className="bg-card border border-border rounded-[2.5rem] p-8 shadow-xl mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-black tracking-tight text-card-foreground">Navigation</h2>
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`p-6 rounded-2xl border-2 transition-all hover:shadow-lg ${
                    activeTab === tab.id
                      ? "bg-primary/10 border-primary text-primary shadow-lg"
                      : "bg-background/50 border-border text-muted-foreground hover:border-primary hover:text-primary hover:bg-primary/5"
                  }`}
                >
                  <Icon className="w-8 h-8 mx-auto mb-3" />
                  <div className="text-sm font-bold uppercase tracking-widest text-center">
                    {tab.label}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-600 dark:text-red-400 mb-8">
            <AlertCircle className="w-6 h-6" />
            <span className="font-medium">{error}</span>
          </div>
        )}

        {/* Tab Content */}
        <div className="space-y-6">
          {activeTab === "dashboard" && (
            <div className="space-y-8">
              <FeeDashboardStats 
                stats={stats} 
                loading={loading} 
                onStatClick={(statType) => {
                  setSelectedStatView(statType);
                  setActiveTab("students");
                  // Set filters based on stat type
                  if (statType === "overdue_students" || statType === "due_today") {
                    setShowOverdueOnly(true);
                  }
                }}
              />
              
              {/* Stat Detail View */}
              {selectedStatView && (
                <div className="bg-card border border-border rounded-[2.5rem] p-8 shadow-xl">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-2xl font-black tracking-tight text-card-foreground">
                      {selectedStatView === "total_collected_all_time" && "Total Collected (All Time)"}
                      {selectedStatView === "total_collected_monthly" && "Monthly Collection"}
                      {selectedStatView === "total_collected_today" && "Today's Collection"}
                      {selectedStatView === "total_fees_due" && "Total Fees Due"}
                      {selectedStatView === "active_students" && "Active Students"}
                      {selectedStatView === "students_with_due" && "Students with Due Fees"}
                      {selectedStatView === "overdue_students" && "Overdue Students"}
                      {selectedStatView === "due_today" && "Due Today"}
                    </h3>
                    <button
                      onClick={() => {
                        setSelectedStatView(null);
                        setShowOverdueOnly(false);
                      }}
                      className="px-4 py-2 bg-background border border-border rounded-xl hover:bg-primary/5 transition-colors"
                    >
                      Close
                    </button>
                  </div>
                  <StudentFeeList
                    onStudentClick={handleStudentClick}
                    selectedBranch={selectedBranch || undefined}
                    selectedCourse={selectedCourse || undefined}
                    showOverdueOnly={selectedStatView === "overdue_students" || selectedStatView === "due_today"}
                  />
                </div>
              )}
              
              {/* Quick Actions */}
              <div className="bg-card border border-border rounded-[2.5rem] p-8 shadow-xl">
                <h3 className="text-2xl font-black tracking-tight text-card-foreground mb-6">Quick Actions</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <button
                    onClick={() => setActiveTab("students")}
                    className="p-6 bg-background/50 border border-border rounded-2xl hover:border-primary hover:bg-primary/5 transition-all hover:shadow-lg text-left group"
                  >
                    <Users className="w-8 h-8 text-primary mb-4 group-hover:scale-110 transition-transform" />
                    <h4 className="text-lg font-bold text-card-foreground mb-2">
                      View Students
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      View all students with fee assignments
                    </p>
                  </button>
                  <button
                    onClick={() => setActiveTab("plans")}
                    className="p-6 bg-background/50 border border-border rounded-2xl hover:border-primary hover:bg-primary/5 transition-all hover:shadow-lg text-left group"
                  >
                    <FileText className="w-8 h-8 text-primary mb-4 group-hover:scale-110 transition-transform" />
                    <h4 className="text-lg font-bold text-card-foreground mb-2">
                      Manage Plans
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      Create and manage fee plans
                    </p>
                  </button>
                  <button
                    onClick={() => setActiveTab("payments")}
                    className="p-6 bg-background/50 border border-border rounded-2xl hover:border-primary hover:bg-primary/5 transition-all hover:shadow-lg text-left group"
                  >
                    <CreditCard className="w-8 h-8 text-primary mb-4 group-hover:scale-110 transition-transform" />
                    <h4 className="text-lg font-bold text-card-foreground mb-2">
                      Record Payment
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      Record fee payments and adjustments
                    </p>
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === "students" && (
            <div className="bg-card border border-border rounded-[2.5rem] p-8 shadow-xl">
              {/* Filters */}
              <div className="mb-8">
                <h3 className="text-2xl font-black tracking-tight text-card-foreground mb-6 flex items-center gap-3">
                  <Filter className="w-6 h-6 text-primary" />
                  Filters
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div>
                    <label className="block text-sm font-bold uppercase tracking-widest text-muted-foreground mb-3">
                      Branch
                    </label>
                    <select
                      value={selectedBranch}
                      onChange={(e) => setSelectedBranch(e.target.value)}
                      className="premium-select w-full"
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
                    <label className="block text-sm font-bold uppercase tracking-widest text-muted-foreground mb-3">
                      Course
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
                  <div className="flex items-end">
                    <label className="flex items-center gap-3 cursor-pointer p-3 bg-background/50 border border-border rounded-xl hover:border-primary transition-all">
                      <input
                        type="checkbox"
                        checked={showOverdueOnly}
                        onChange={(e) => setShowOverdueOnly(e.target.checked)}
                        className="w-4 h-4 text-primary border-border rounded focus:ring-primary/20"
                      />
                      <span className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
                        Show Overdue Only
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              <StudentFeeList
                onStudentClick={handleStudentClick}
                selectedBranch={selectedBranch || undefined}
                selectedCourse={selectedCourse || undefined}
                showOverdueOnly={showOverdueOnly}
              />
            </div>
          )}

          {activeTab === "plans" && (
            <div className="space-y-8">
              <div className="bg-card border border-border rounded-[2.5rem] p-8 shadow-xl">
                <div className="mb-6">
                  <h3 className="text-2xl font-black tracking-tight text-card-foreground mb-2 flex items-center gap-3">
                    <FileText className="w-6 h-6 text-primary" />
                    Fee Plans Management
                  </h3>
                  <p className="text-muted-foreground">Create and manage fee plans for different courses and levels</p>
                </div>
                <FeePlanManagement />
              </div>
              <div className="bg-card border border-border rounded-[2.5rem] p-8 shadow-xl">
                <div className="mb-6">
                  <h3 className="text-2xl font-black tracking-tight text-card-foreground mb-2 flex items-center gap-3">
                    <Users className="w-6 h-6 text-primary" />
                    Fee Assignment
                  </h3>
                  <p className="text-muted-foreground">Assign fee plans to students and manage their fee structures</p>
                </div>
                <FeeAssignment onAssignmentCreated={handleRefresh} />
              </div>
            </div>
          )}

          {activeTab === "payments" && (
            <div className="bg-card border border-border rounded-[2.5rem] p-8 shadow-xl">
              <div className="mb-8">
                <h3 className="text-2xl font-black tracking-tight text-card-foreground mb-2 flex items-center gap-3">
                  <CreditCard className="w-6 h-6 text-primary" />
                  Record Payment
                </h3>
                <p className="text-muted-foreground">Select a student to record their payment</p>
              </div>

              <div className="mb-8">
                <label className="block text-sm font-bold uppercase tracking-widest text-muted-foreground mb-3">
                  Select Student (by ID)
                </label>
                <input
                  type="number"
                  placeholder="Enter student profile ID"
                  value={selectedStudentForPayment || ""}
                  onChange={(e) => setSelectedStudentForPayment(e.target.value ? parseInt(e.target.value) : null)}
                  className="w-full max-w-md px-4 py-3 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
              </div>

              {selectedStudentForPayment && (
                <PaymentRecording
                  studentProfileId={selectedStudentForPayment}
                  onPaymentRecorded={() => {
                    handleRefresh();
                    setSelectedStudentForPayment(null);
                  }}
                />
              )}

              {!selectedStudentForPayment && (
                <div className="text-center py-12 bg-background/50 border border-border rounded-2xl">
                  <CreditCard className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    Enter a student profile ID to record payment
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Student Fee Details Modal */}
      {selectedStudent && (
        <StudentFeeDetails
          studentProfileId={selectedStudent.student_profile_id}
          onClose={handleCloseDetails}
          onRefresh={() => {
            handleRefresh();
            handleCloseDetails();
          }}
        />
      )}
    </div>
  );
}
