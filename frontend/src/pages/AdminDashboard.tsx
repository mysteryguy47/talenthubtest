import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { 
  getAdminStats, getAllStudents, getStudentStatsAdmin, AdminStats, StudentStats,
  deleteStudent, updateStudentPoints, refreshLeaderboard, getDatabaseStats, DatabaseStats,
  getStudentPracticeSessionDetailAdmin, PracticeSessionDetail,
  getStudentPaperAttemptDetailAdmin
} from "../lib/userApi";
import { PaperAttempt, PaperAttemptDetail } from "../lib/api";
import { Shield, Users, BarChart3, Target, TrendingUp, User as UserIcon, Award, Trash2, Edit2, RefreshCw, Database, Save, X, ExternalLink, Brain, FileText, Clock, Eye, CheckCircle2, XCircle } from "lucide-react";
import { useLocation } from "wouter";
import { formatDateToIST, formatDateOnlyToIST } from "../lib/timezoneUtils";

export default function AdminDashboard() {
  const { user, isAdmin } = useAuth();
  const [, setLocation] = useLocation();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [students, setStudents] = useState<User[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<User | null>(null);
  const [studentStats, setStudentStats] = useState<StudentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingPoints, setEditingPoints] = useState<number | null>(null);
  const [pointsInput, setPointsInput] = useState<string>("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);
  const [dbStats, setDbStats] = useState<DatabaseStats | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedSession, setSelectedSession] = useState<PracticeSessionDetail | null>(null);
  const [selectedPaperAttempt, setSelectedPaperAttempt] = useState<PaperAttemptDetail | null>(null);
  const [sortBy, setSortBy] = useState<"id" | "name" | "points" | "streak">("id");

  useEffect(() => {
    async function loadData() {
      try {
        console.log("🔄 [ADMIN] Loading admin stats...");
        const statsData = await getAdminStats();
        setStats(statsData);
        console.log("✅ [ADMIN] Admin stats loaded");

        console.log("🔄 [ADMIN] Loading students...");
        const studentsData = await getAllStudents();
        // Sort students by public_id (if available) or ID in ascending order
        const sortedStudents = [...studentsData].sort((a, b) => {
          if (a.public_id && b.public_id) {
            // Extract number from TH-0001 format
            const numA = parseInt(a.public_id.split('-')[1]) || 0;
            const numB = parseInt(b.public_id.split('-')[1]) || 0;
            return numA - numB;
          }
          return (a.public_id ? 0 : 1) - (b.public_id ? 0 : 1) || a.id - b.id;
        });
        setStudents(sortedStudents);
        console.log("✅ [ADMIN] Students loaded");

        console.log("🔄 [ADMIN] Loading database stats...");
        try {
          const dbStatsData = await getDatabaseStats();
          setDbStats(dbStatsData);
          console.log("✅ [ADMIN] Database stats loaded");
        } catch (dbError) {
          console.error("❌ [ADMIN] Failed to load database stats:", dbError);
          // Set empty stats so the UI doesn't break
          setDbStats({
            total_users: 0,
            total_students: 0,
            total_admins: 0,
            total_sessions: 0,
            total_paper_attempts: 0,
            total_rewards: 0,
            total_papers: 0,
            database_size_mb: 0
          });
        }
      } catch (error) {
        console.error("❌ [ADMIN] Failed to load admin data:", error);
        // Don't set loading to false if we failed, so user sees loading state
        // setLoading(false);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleStudentClick = async (student: User) => {
    setSelectedStudent(student);
    setEditingPoints(null);
    setPointsInput("");
    setSelectedSession(null);
    setSelectedPaperAttempt(null);
    try {
      const stats = await getStudentStatsAdmin(student.id);
      setStudentStats(stats);
    } catch (error) {
      console.error("Failed to load student stats:", error);
    }
  };

  const formatQuestion = (questionData: any, operationType: string): string => {
    if (typeof questionData === "string") {
      try {
        questionData = JSON.parse(questionData);
      } catch {
        return String(questionData);
      }
    }
    
    if (operationType === "add_sub" || operationType === "integer_add_sub") {
      const numbers = questionData.numbers || [];
      const operators = questionData.operators || [];
      return numbers.map((n: number, i: number) => 
        i < operators.length ? `${n} ${operators[i]}` : n
      ).join(" ") + " = ?";
    } else if (operationType === "multiplication") {
      return `${questionData.multiplicand || questionData.num1} × ${questionData.multiplier || questionData.num2} = ?`;
    } else if (operationType === "division") {
      return `${questionData.dividend || questionData.num1} ÷ ${questionData.divisor || questionData.num2} = ?`;
    } else if (operationType === "lcm") {
      return `LCM(${questionData.num1}, ${questionData.num2}) = ?`;
    } else if (operationType === "gcd") {
      return `GCD(${questionData.num1}, ${questionData.num2}) = ?`;
    } else if (operationType === "square_root") {
      return `√${questionData.number} = ?`;
    } else if (operationType === "cube_root") {
      return `∛${questionData.number} = ?`;
    } else if (operationType === "percentage") {
      return `${questionData.value}% of ${questionData.of} = ?`;
    }
    return JSON.stringify(questionData);
  };

  const handleDeleteStudent = async (studentId: number) => {
    if (!window.confirm("Are you sure you want to delete this student? This action cannot be undone.")) {
      return;
    }
    try {
      await deleteStudent(studentId);
      setStudents(students.filter(s => s.id !== studentId));
      if (selectedStudent?.id === studentId) {
        setSelectedStudent(null);
        setStudentStats(null);
      }
      // Reload stats
      const statsData = await getAdminStats();
      setStats(statsData);
      const dbStatsData = await getDatabaseStats();
      setDbStats(dbStatsData);
    } catch (error) {
      console.error("Failed to delete student:", error);
      alert("Failed to delete student. Please try again.");
    }
    setShowDeleteConfirm(null);
  };

  const isPaperAnswerCorrect = (studentAnswer: unknown, correctAnswer: unknown): boolean => {
    const a = Number(studentAnswer);
    const b = Number(correctAnswer);
    if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
    return Math.abs(a - b) < 1e-6;
  };

  const handleStartEditPoints = () => {
    if (studentStats) {
      setEditingPoints(studentStats.total_points);
      setPointsInput(studentStats.total_points.toString());
    }
  };

  const handleSavePoints = async () => {
    if (!selectedStudent || !pointsInput) return;
    const newPoints = parseInt(pointsInput);
    if (isNaN(newPoints) || newPoints < 0) {
      alert("Please enter a valid non-negative number");
      return;
    }
    try {
      await updateStudentPoints(selectedStudent.id, newPoints);
      // Reload data sequentially to avoid API storm
      const statsData = await getAdminStats();
      setStats(statsData);
      const studentsData = await getAllStudents();
      setStudents(studentsData);
      const stats = await getStudentStatsAdmin(selectedStudent.id);
      setStudentStats(stats);
      setEditingPoints(null);
      setPointsInput("");
    } catch (error) {
      console.error("Failed to update points:", error);
      alert("Failed to update points. Please try again.");
    }
  };

  const handleCancelEditPoints = () => {
    setEditingPoints(null);
    setPointsInput("");
  };

  const handleRefreshLeaderboard = async () => {
    setRefreshing(true);
    try {
      await refreshLeaderboard();
      // Reload stats
      const statsData = await getAdminStats();
      setStats(statsData);
      alert("Leaderboard refreshed successfully!");
    } catch (error) {
      console.error("Failed to refresh leaderboard:", error);
      alert("Failed to refresh leaderboard. Please try again.");
    } finally {
      setRefreshing(false);
    }
  };

  const getSortedStudents = () => {
    const sorted = [...students];
    switch (sortBy) {
      case "id":
        return sorted.sort((a, b) => {
          if (a.public_id && b.public_id) {
            const numA = parseInt(a.public_id.split('-')[1]) || 0;
            const numB = parseInt(b.public_id.split('-')[1]) || 0;
            return numA - numB;
          }
          return (a.public_id ? 0 : 1) - (b.public_id ? 0 : 1) || a.id - b.id;
        });
      case "name":
        return sorted.sort((a, b) => a.name.localeCompare(b.name));
      case "points":
        return sorted.sort((a, b) => b.total_points - a.total_points);
      case "streak":
        return sorted.sort((a, b) => (b.current_streak || 0) - (a.current_streak || 0));
      default:
        return sorted;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-xl text-white">Loading admin dashboard...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-bold text-red-600 mb-4">Access Denied</div>
          <div className="text-slate-600 dark:text-slate-400 mb-4">You do not have admin permissions to access this page.</div>
          <a href="/dashboard" className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 underline">
            Go to Dashboard
          </a>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex items-center justify-center">
        <div className="text-xl text-red-400 dark:text-red-400">Failed to load dashboard</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-32 pb-20 px-6 transition-colors duration-300">
      <div className="container mx-auto">
        {/* Page Header */}
        <header className="mb-12">
          <h1 className="text-5xl font-black tracking-tighter uppercase italic text-foreground mb-2 flex items-center gap-3">
            <Shield className="w-10 h-10 text-primary" />
            Admin Dashboard
          </h1>
          <p className="text-muted-foreground text-lg font-medium">Monitor all student activity and progress</p>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <div className="bg-card border border-border rounded-[2.5rem] p-8 shadow-xl hover:border-primary transition-all group">
            <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-all">
              <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-1">Total Students</div>
            <div className="text-3xl font-black italic text-card-foreground">{stats.total_students}</div>
          </div>

          <div className="bg-card border border-border rounded-[2.5rem] p-8 shadow-xl hover:border-primary transition-all group">
            <div className="w-12 h-12 bg-green-500/10 rounded-2xl flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-all">
              <BarChart3 className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-1">Total Sessions</div>
            <div className="text-3xl font-black italic text-card-foreground">{stats.total_sessions}</div>
          </div>

          <div className="bg-card border border-border rounded-[2.5rem] p-8 shadow-xl hover:border-primary transition-all group">
            <div className="w-12 h-12 bg-purple-500/10 rounded-2xl flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-all">
              <Target className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-1">Avg Accuracy</div>
            <div className="text-3xl font-black italic text-card-foreground">{stats?.average_accuracy?.toFixed(1) || '0.0'}%</div>
          </div>

          <div className="bg-card border border-border rounded-[2.5rem] p-8 shadow-xl hover:border-primary transition-all group">
            <div className="w-12 h-12 bg-orange-500/10 rounded-2xl flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-all">
              <TrendingUp className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
            <div className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-1">Active Today</div>
            <div className="text-3xl font-black italic text-card-foreground">{stats.active_students_today}</div>
          </div>
        </div>

        {/* Top Students */}
        <div className="mb-8 bg-card border border-border rounded-[2.5rem] p-8 shadow-xl">
          <h2 className="text-2xl font-black tracking-tight text-card-foreground mb-6 flex items-center gap-3">
            <Award className="w-6 h-6 text-primary" />
            Top Students
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {stats.top_students.slice(0, 5).map((student, index) => (
              <div
                key={student.user_id}
                className="p-4 bg-background/50 border border-border rounded-2xl transition-all hover:border-primary hover:bg-primary/5"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                    index === 0 ? "badge-gold text-white" :
                    index === 1 ? "badge-silver text-white" :
                    index === 2 ? "badge-bronze text-white" :
                    "bg-primary/10 text-primary"
                  }`}>
                    {index + 1}
                  </div>
                  {student.avatar_url ? (
                    <img src={student.avatar_url} alt={student.display_name || student.name} className="w-8 h-8 rounded-full" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-xs">
                      {(student.display_name || student.name).charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="font-bold text-card-foreground text-sm">{student.display_name || student.name}</div>
                <div className="text-xs text-primary font-medium mt-1">{student.total_points} points</div>
              </div>
            ))}
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Students List */}
          <div className="lg:col-span-2">
            <div className="bg-card border border-border rounded-[2.5rem] p-8 shadow-xl">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <h2 className="text-2xl font-black tracking-tight text-card-foreground flex items-center gap-3">
                    <Users className="w-6 h-6 text-primary" />
                    Students
                  </h2>
                  <span className="text-sm font-bold text-muted-foreground">{students.length} total</span>
                </div>
                <div className="flex items-center gap-3">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as "id" | "name" | "points" | "streak")}
                    className="px-3 py-2 bg-background dark:bg-slate-800 border border-border rounded-xl text-sm font-medium text-card-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="id">Sort by ID</option>
                    <option value="name">Sort by Name</option>
                    <option value="points">Sort by Points</option>
                    <option value="streak">Sort by Streak</option>
                  </select>
                  <button
                    onClick={handleRefreshLeaderboard}
                    disabled={refreshing}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                  >
                    <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
                    Refresh Leaderboard
                  </button>
                </div>
              </div>

              <div className="space-y-4 max-h-96 overflow-y-auto scrollbar-premium">
                {getSortedStudents().map((student) => (
                  <div
                    key={student.id}
                    onClick={() => handleStudentClick(student)}
                    className={`bg-background/50 border rounded-2xl p-6 cursor-pointer transition-all group ${
                      selectedStudent?.id === student.id
                        ? "border-primary bg-primary/10 shadow-lg"
                        : "border-border hover:border-primary hover:bg-primary/5"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        {student.avatar_url ? (
                          <img src={student.avatar_url} alt={student.display_name || student.name} className="w-12 h-12 rounded-full" />
                        ) : (
                          <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-all">
                            <UserIcon className="w-6 h-6 text-primary" />
                          </div>
                        )}
                        <div>
                          <div className="font-bold text-card-foreground group-hover:text-primary transition-colors flex items-center gap-2">
                            {student.display_name || student.name}
                            {student.public_id && (
                              <span className="text-xs font-medium text-muted-foreground">ID: {student.public_id}</span>
                            )}
                            {student.current_streak > 0 && (
                              <span className="text-xs font-medium text-orange-600">🔥 {student.current_streak}</span>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">{student.email}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-card-foreground">{student.total_points} pts</div>
                        <div className="text-xs text-muted-foreground">Total Points</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Student Details Sidebar */}
          <div className="lg:col-span-1">
            {selectedStudent && studentStats ? (
              <div className="bg-card border border-border rounded-[2.5rem] p-8 shadow-xl">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-black tracking-tight text-card-foreground flex items-center gap-2">
                    <UserIcon className="w-5 h-5 text-primary" />
                    {selectedStudent.name}
                  </h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setLocation(`/profile?user_id=${selectedStudent.id}`)}
                      className="p-2 hover:bg-primary/10 rounded-lg transition-colors"
                      title="View Profile"
                    >
                      <ExternalLink className="w-4 h-4 text-primary" />
                    </button>
                    <button
                      onClick={() => setSelectedStudent(null)}
                      className="p-2 hover:bg-destructive/10 rounded-lg transition-colors"
                    >
                      <X className="w-4 h-4 text-destructive" />
                    </button>
                  </div>
                </div>

                <div className="space-y-6">
                  {/* Points Section */}
                  <div className="bg-background/50 border border-border rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Total Points</span>
                      {editingPoints === null ? (
                        <button
                          onClick={handleStartEditPoints}
                          className="p-1 hover:bg-primary/10 rounded transition-colors"
                        >
                          <Edit2 className="w-4 h-4 text-primary" />
                        </button>
                      ) : (
                        <div className="flex gap-1">
                          <button
                            onClick={handleSavePoints}
                            className="p-1 hover:bg-green-500/10 rounded transition-colors"
                          >
                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                          </button>
                          <button
                            onClick={handleCancelEditPoints}
                            className="p-1 hover:bg-red-500/10 rounded transition-colors"
                          >
                            <X className="w-4 h-4 text-red-600" />
                          </button>
                        </div>
                      )}
                    </div>
                    {editingPoints !== null ? (
                      <input
                        type="number"
                        value={pointsInput}
                        onChange={(e) => setPointsInput(e.target.value)}
                        className="w-full px-3 py-2 bg-background dark:bg-slate-800 border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-foreground"
                        placeholder="Enter points"
                      />
                    ) : (
                      <div className="text-2xl font-black italic text-card-foreground">{studentStats.total_points || 0}</div>
                    )}
                  </div>

                  {/* Mental Math Metrics */}
                  <div>
                    <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
                      <Brain className="w-4 h-4 text-primary" />
                      Mental Math Practice
                    </div>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div className="bg-background/50 border border-border rounded-xl p-3 text-center">
                        <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">Accuracy</div>
                        <div className="text-lg font-black italic text-card-foreground">{studentStats.overall_accuracy.toFixed(1)}%</div>
                      </div>
                      <div className="bg-background/50 border border-border rounded-xl p-3 text-center">
                        <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">Sessions</div>
                        <div className="text-lg font-black italic text-card-foreground">{studentStats.total_sessions}</div>
                      </div>
                      <div className="bg-background/50 border border-border rounded-xl p-3 text-center">
                        <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">Correct</div>
                        <div className="text-lg font-black italic text-green-600 dark:text-green-400">{studentStats.total_correct}</div>
                      </div>
                      <div className="bg-background/50 border border-border rounded-xl p-3 text-center">
                        <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">Wrong</div>
                        <div className="text-lg font-black italic text-red-600 dark:text-red-400">{studentStats.total_wrong}</div>
                      </div>
                    </div>
                    <div className="bg-background/50 border border-border rounded-xl p-3 text-center">
                      <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">Total Questions</div>
                      <div className="text-xl font-black italic text-card-foreground">{studentStats.total_questions || 0}</div>
                    </div>
                  </div>

                  {/* Practice Paper Metrics */}
                  <div>
                    <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-primary" />
                      Practice Paper Attempts
                    </div>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div className="bg-background/50 border border-border rounded-xl p-3 text-center">
                        <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">Accuracy</div>
                        <div className="text-lg font-black italic text-card-foreground">
                          {studentStats.paper_overall_accuracy !== undefined ? studentStats.paper_overall_accuracy.toFixed(1) : "0.0"}%
                        </div>
                      </div>
                      <div className="bg-background/50 border border-border rounded-xl p-3 text-center">
                        <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">Sessions</div>
                        <div className="text-lg font-black italic text-card-foreground">{studentStats.total_paper_attempts || 0}</div>
                      </div>
                      <div className="bg-background/50 border border-border rounded-xl p-3 text-center">
                        <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">Correct</div>
                        <div className="text-lg font-black italic text-green-600 dark:text-green-400">{studentStats.paper_total_correct || 0}</div>
                      </div>
                      <div className="bg-background/50 border border-border rounded-xl p-3 text-center">
                        <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">Wrong</div>
                        <div className="text-lg font-black italic text-red-600 dark:text-red-400">{studentStats.paper_total_wrong || 0}</div>
                      </div>
                    </div>
                    <div className="bg-background/50 border border-border rounded-xl p-3 text-center">
                      <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">Total Questions</div>
                      <div className="text-xl font-black italic text-card-foreground">{studentStats.paper_total_questions || 0}</div>
                    </div>
                  </div>

                  {/* Badges */}
                  {studentStats.badges && studentStats.badges.length > 0 && (
                    <div>
                      <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
                        <Award className="w-4 h-4 text-primary" />
                        Badges
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {studentStats.badges.map((badge, index) => (
                          <span key={index} className="px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-bold border border-primary/20">
                            {badge}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Mental Math Sessions */}
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
                      <Brain className="w-4 h-4 text-primary" />
                      Mental Math Sessions
                    </h4>
                    {studentStats.recent_sessions && studentStats.recent_sessions.length > 0 ? (
                      <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-premium">
                        {studentStats.recent_sessions.map((session) => (
                          <div
                            key={session.id}
                            onClick={async () => {
                              if (!selectedStudent) return;
                              try {
                                const detail = await getStudentPracticeSessionDetailAdmin(selectedStudent.id, session.id);
                                setSelectedSession(detail);
                              } catch (err) {
                                console.error("Failed to load session details for admin:", err);
                                alert("Failed to load session details");
                              }
                            }}
                            className="bg-background/50 border border-border rounded-lg p-3 cursor-pointer hover:border-primary hover:bg-primary/5 transition-all"
                          >
                            <div className="flex items-center justify-between mb-1">
                              <div className="text-xs font-bold text-card-foreground">
                                {session.operation_type} - {session.difficulty_mode}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {formatDateOnlyToIST(session.started_at)}
                              </div>
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-xs items-center">
                              <div>
                                <span className="text-muted-foreground">Score: </span>
                                <span className="font-bold text-green-600 dark:text-green-400">{session.correct_answers}/{session.total_questions}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Accuracy: </span>
                                <span className="font-bold text-primary">{session.accuracy.toFixed(1)}%</span>
                              </div>
                              <div className="flex items-center justify-between gap-2">
                                <div>
                                  <span className="text-muted-foreground">Points: </span>
                                  <span className="font-bold text-yellow-600 dark:text-yellow-400">{session.points_earned}</span>
                                </div>
                                <Eye className="w-3 h-3 text-muted-foreground" />
                              </div>
                            </div>
                            {session.time_taken && (
                              <div className="mt-1 text-xs text-muted-foreground flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {Math.floor(session.time_taken / 60)}m {Math.floor(session.time_taken % 60)}s
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground py-2">No mental math sessions yet</div>
                    )}
                  </div>

                  {/* Practice Paper Sessions */}
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-primary" />
                      Practice Paper Sessions
                    </h4>
                    {studentStats.recent_paper_attempts && studentStats.recent_paper_attempts.length > 0 ? (
                      <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-premium">
                        {studentStats.recent_paper_attempts.map((attempt) => (
                          <div
                            key={attempt.id}
                            onClick={async () => {
                              if (!selectedStudent) return;
                              try {
                                const detail = await getStudentPaperAttemptDetailAdmin(selectedStudent.id, attempt.id);
                                setSelectedPaperAttempt(detail);
                              } catch (err) {
                                console.error("Failed to load paper attempt details for admin:", err);
                                alert("Failed to load paper attempt details");
                              }
                            }}
                            className="bg-background/50 border border-border rounded-lg p-3 cursor-pointer hover:border-primary hover:bg-primary/5 transition-all"
                          >
                            <div className="flex items-center justify-between mb-1">
                              <div className="text-xs font-bold text-card-foreground">
                                {attempt.paper_title}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {attempt.started_at ? formatDateOnlyToIST(attempt.started_at) : 'N/A'}
                              </div>
                            </div>
                            <div className="text-xs text-muted-foreground mb-2">
                              Level: {attempt.paper_level}
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-xs items-center">
                              <div>
                                <span className="text-muted-foreground">Score: </span>
                                <span className="font-bold text-green-600 dark:text-green-400">{attempt.correct_answers}/{attempt.total_questions}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Accuracy: </span>
                                <span className="font-bold text-primary">{attempt.accuracy.toFixed(1)}%</span>
                              </div>
                              <div className="flex items-center justify-between gap-2">
                                <div>
                                  <span className="text-muted-foreground">Points: </span>
                                  <span className="font-bold text-yellow-600 dark:text-yellow-400">{attempt.points_earned}</span>
                                </div>
                                <Eye className="w-3 h-3 text-muted-foreground" />
                              </div>
                            </div>
                            {attempt.time_taken && (
                              <div className="mt-1 text-xs text-muted-foreground flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {Math.floor(attempt.time_taken / 60)}m {Math.floor(attempt.time_taken % 60)}s
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground py-2">No practice paper sessions yet</div>
                    )}
                  </div>

                  <button
                    onClick={() => handleDeleteStudent(selectedStudent.id)}
                    className="w-full mt-4 px-4 py-2 bg-destructive text-destructive-foreground rounded-xl hover:bg-destructive/90 transition-colors flex items-center justify-center gap-2 font-bold"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Account
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-card border border-border rounded-[2.5rem] p-8 shadow-xl text-center">
                <UserIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <div className="text-muted-foreground font-medium">Select a student to view details</div>
              </div>
            )}
          </div>
        </div>

        {/* Session Detail Modal */}
        {selectedSession && selectedStudent && (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedSession(null)}
          >
            <div
              className="bg-card border border-border rounded-[2.5rem] shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-8 border-b border-border flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black tracking-tight text-card-foreground">
                    Practice Session Details
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedStudent.name} • {selectedSession.operation_type} • {selectedSession.difficulty_mode}
                  </p>
                  {selectedSession.completed_at && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Completed: {formatDateToIST(selectedSession.completed_at)}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setSelectedSession(null)}
                  className="p-2 hover:bg-destructive/10 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6 text-destructive" />
                </button>
              </div>

              <div className="p-8 overflow-y-auto flex-1 scrollbar-premium">
                {/* Session Summary */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
                  <div className="bg-background/50 border border-border rounded-2xl p-6 text-center">
                    <div className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-2">Score</div>
                    <div className="text-3xl font-black italic text-card-foreground">
                      {selectedSession.score}/{selectedSession.total_questions}
                    </div>
                  </div>
                  <div className="bg-background/50 border border-border rounded-2xl p-6 text-center">
                    <div className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-2">Accuracy</div>
                    <div className="text-3xl font-black italic text-card-foreground">
                      {selectedSession.accuracy.toFixed(1)}%
                    </div>
                  </div>
                  <div className="bg-background/50 border border-border rounded-2xl p-6 text-center">
                    <div className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-2">Time</div>
                    <div className="text-3xl font-black italic text-card-foreground">
                      {Math.floor(selectedSession.time_taken / 60)}m {Math.floor(selectedSession.time_taken % 60)}s
                    </div>
                  </div>
                  <div className="bg-background/50 border border-border rounded-2xl p-6 text-center">
                    <div className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-2">Points</div>
                    <div className="text-3xl font-black italic text-card-foreground">
                      +{selectedSession.points_earned}
                    </div>
                  </div>
                </div>

                {/* Questions List */}
                <div>
                  <h3 className="text-xl font-black tracking-tight text-card-foreground mb-6">
                    Questions & Answers
                  </h3>
                  <div className="space-y-4">
                    {selectedSession.attempts.map((attempt) => (
                      <div
                        key={attempt.id}
                        className={`bg-background/50 border rounded-2xl p-6 transition-all ${
                          attempt.is_correct
                            ? "border-green-500/20 bg-green-500/5"
                            : "border-red-500/20 bg-red-500/5"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-4">
                              <span className="font-bold text-card-foreground">
                                Q{attempt.question_number}:
                              </span>
                              <span className="text-card-foreground font-mono text-lg">
                                {formatQuestion(attempt.question_data, selectedSession.operation_type)}
                              </span>
                            </div>
                            <div className="flex items-center gap-6 text-sm">
                              <span className={attempt.is_correct ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
                                Student answer: <span className="font-bold">{attempt.user_answer !== null ? attempt.user_answer : "—"}</span>
                              </span>
                              <span className="text-muted-foreground">
                                Correct: <span className="font-bold">{attempt.correct_answer}</span>
                              </span>
                              <span className="text-muted-foreground">
                                Time: <span className="font-bold">{attempt.time_taken.toFixed(2)}s</span>
                              </span>
                            </div>
                          </div>
                          <div className="ml-4">
                            {attempt.is_correct ? (
                              <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
                            ) : (
                              <XCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Practice Paper Attempt Detail Modal */}
        {selectedPaperAttempt && selectedStudent && (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedPaperAttempt(null)}
          >
            <div
              className="bg-card border border-border rounded-[2.5rem] shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-8 border-b border-border flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black tracking-tight text-card-foreground">
                    Practice Paper Details
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedStudent.name} • {selectedPaperAttempt.paper_title} • {selectedPaperAttempt.paper_level}
                  </p>
                  {selectedPaperAttempt.completed_at && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Completed: {formatDateToIST(selectedPaperAttempt.completed_at)}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setSelectedPaperAttempt(null)}
                  className="p-2 hover:bg-destructive/10 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6 text-destructive" />
                </button>
              </div>

              <div className="p-8 overflow-y-auto flex-1 scrollbar-premium">
                {/* Attempt Summary */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
                  <div className="bg-background/50 border border-border rounded-2xl p-6 text-center">
                    <div className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-2">Score</div>
                    <div className="text-3xl font-black italic text-card-foreground">
                      {selectedPaperAttempt.correct_answers}/{selectedPaperAttempt.total_questions}
                    </div>
                  </div>
                <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-4 border border-green-200 dark:border-green-700 transition-all duration-300">
                  <div className="text-sm text-green-600 dark:text-green-300 font-semibold">Accuracy</div>
                  <div className="text-2xl font-bold text-green-900 dark:text-green-200">
                    {selectedPaperAttempt.accuracy.toFixed(1)}%
                  </div>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-4 border border-blue-200 dark:border-blue-700 transition-all duration-300">
                  <div className="text-sm text-blue-600 dark:text-blue-300 font-semibold">Time</div>
                  <div className="text-2xl font-bold text-blue-900 dark:text-blue-200">
                    {selectedPaperAttempt.time_taken != null
                      ? `${Math.floor(selectedPaperAttempt.time_taken / 60)}m ${Math.floor(selectedPaperAttempt.time_taken % 60)}s`
                      : "—"}
                  </div>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/30 rounded-lg p-4 border border-purple-200 dark:border-purple-700 transition-all duration-300">
                  <div className="text-sm text-purple-600 dark:text-purple-300 font-semibold">Points</div>
                  <div className="text-2xl font-bold text-purple-900 dark:text-purple-200">
                    +{selectedPaperAttempt.points_earned}
                  </div>
                </div>
              </div>

              {/* Questions List */}
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
                  Questions &amp; Answers
                </h3>
                <div className="space-y-3">
                  {selectedPaperAttempt.generated_blocks?.flatMap((b) => b.questions || []).map((q, idx) => {
                    const studentAnswer = selectedPaperAttempt.answers?.[String(q.id)];
                    const isCorrect = isPaperAnswerCorrect(studentAnswer, q.answer);
                    return (
                      <div
                        key={q.id ?? idx}
                        className={`rounded-lg p-4 border-2 transition-all duration-300 ${
                          isCorrect
                            ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700"
                            : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <span className="font-semibold text-slate-700 dark:text-white">
                                Q{idx + 1}:
                              </span>
                              <span className="text-slate-900 dark:text-white font-mono text-lg">
                                {q.text}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-4 text-sm">
                              <span className={isCorrect ? "text-green-700 dark:text-green-300" : "text-red-700 dark:text-red-300"}>
                                Student answer:{" "}
                                <span className="font-semibold">
                                  {studentAnswer != null ? String(studentAnswer) : "—"}
                                </span>
                              </span>
                              <span className="text-slate-600 dark:text-slate-300">
                                Correct: <span className="font-semibold">{String(q.answer)}</span>
                              </span>
                            </div>
                          </div>
                          <div className="ml-4">
                            {isCorrect ? (
                              <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
                            ) : (
                              <XCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

        {/* Database Stats */}
        {dbStats && (
          <div className="mt-8 bg-white/90 dark:bg-slate-800 backdrop-blur-sm rounded-2xl p-6 shadow-lg dark:shadow-xl border border-slate-200/50 dark:border-slate-700 transition-all duration-300">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Database className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Database Statistics</h2>
              </div>
              <button
                onClick={async () => {
                  try {
                    const dbStatsData = await getDatabaseStats();
                    setDbStats(dbStatsData);
                  } catch (error) {
                    console.error("Failed to refresh database stats:", error);
                    alert("Failed to refresh database stats. Please try again.");
                  }
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
              <div className="p-4 bg-slate-50 dark:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-600 transition-all duration-300">
                <div className="text-xs text-slate-600 dark:text-slate-300 mb-1">Total Users</div>
                <div className="text-xl font-bold text-slate-900 dark:text-white">{dbStats.total_users}</div>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-600 transition-all duration-300">
                <div className="text-xs text-slate-600 dark:text-slate-300 mb-1">Students</div>
                <div className="text-xl font-bold text-indigo-600 dark:text-indigo-400">{dbStats.total_students}</div>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-600 transition-all duration-300">
                <div className="text-xs text-slate-600 dark:text-slate-300 mb-1">Admins</div>
                <div className="text-xl font-bold text-purple-600 dark:text-purple-400">{dbStats.total_admins}</div>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-600 transition-all duration-300">
                <div className="text-xs text-slate-600 dark:text-slate-300 mb-1">Sessions</div>
                <div className="text-xl font-bold text-green-600 dark:text-green-400">{dbStats.total_sessions}</div>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-600 transition-all duration-300">
                <div className="text-xs text-slate-600 dark:text-slate-300 mb-1">Paper Attempts</div>
                <div className="text-xl font-bold text-blue-600 dark:text-blue-400">{dbStats.total_paper_attempts}</div>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-600 transition-all duration-300">
                <div className="text-xs text-slate-600 dark:text-slate-300 mb-1">Rewards</div>
                <div className="text-xl font-bold text-yellow-600 dark:text-yellow-400">{dbStats.total_rewards}</div>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-600 transition-all duration-300">
                <div className="text-xs text-slate-600 dark:text-slate-300 mb-1">DB Size</div>
                <div className="text-xl font-bold text-slate-900 dark:text-white">{dbStats.database_size_mb} MB</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

