import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import {
  DollarSign,
  Calendar,
  Users,
  Settings,
  CheckCircle2,
  XCircle,
  Clock,
  Save,
  Plus,
  Filter,
  Loader2,
  AlertCircle,
  TrendingUp,
  CreditCard,
  Edit,
  Trash2,
} from "lucide-react";
import AttendanceCalendar from "../components/AttendanceCalendar";
import FeeDashboardStats from "../components/fee/FeeDashboardStats";
import StudentFeeList from "../components/fee/StudentFeeList";
import StudentFeeDetails from "../components/fee/StudentFeeDetails";
import PaymentRecording from "../components/fee/PaymentRecording";
import FeePlanManagement from "../components/fee/FeePlanManagement";
import FeeAssignment from "../components/fee/FeeAssignment";
import {
  getStudentsForAttendance,
  markBulkAttendance,
  getClassSessions,
  getAttendanceRecords,
  createClassSession,
  ClassSession,
  AttendanceRecord,
  getClassSchedules,
  createClassSchedule,
  updateClassSchedule,
  deleteClassSchedule,
  ClassSchedule,
} from "../lib/attendanceApi";
import {
  getFeeDashboardStats,
  getStudentsWithFees,
  StudentFeeSummary,
} from "../lib/feeApi";
import { BRANCHES, COURSES } from "../constants/index";

type ViewMode = "overview" | "attendance" | "fees" | "schedules";

export default function AdminUnifiedManagement() {
  const { isAdmin } = useAuth();
  const [viewMode, setViewMode] = useState<ViewMode>("overview");
  
  // Attendance state
  const [selectedBranch, setSelectedBranch] = useState<string>("");
  const [selectedCourse, setSelectedCourse] = useState<string>("");
  const [students, setStudents] = useState<any[]>([]);
  const [sessions, setSessions] = useState<ClassSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<ClassSession | null>(null);
  const [attendanceData, setAttendanceData] = useState<Record<number, string>>({});
  const [tshirtData, setTshirtData] = useState<Record<number, boolean>>({});
  const [sessionDate, setSessionDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [calendarSessions, setCalendarSessions] = useState<ClassSession[]>([]);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date | null>(null);
  const [schedules, setSchedules] = useState<ClassSchedule[]>([]);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ClassSchedule | null>(null);
  const [scheduleForm, setScheduleForm] = useState({
    branch: "",
    course: "",
    level: "",
    batch_name: "",
    schedule_days: [] as number[],
    time_slots: [] as Array<{ start: string; end: string }>,
    is_active: true,
  });

  // Fee state
  const [feeStats, setFeeStats] = useState<any>(null);
  const [feeLoading, setFeeLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<StudentFeeSummary | null>(null);
  const [selectedStudentForPayment, setSelectedStudentForPayment] = useState<number | null>(null);
  const [showOverdueOnly, setShowOverdueOnly] = useState(false);
  const [selectedStatView, setSelectedStatView] = useState<string | null>(null);

  // General state
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (isAdmin) {
      loadStudents();
      loadSessions();
      loadSchedules();
      loadFeeStats();
    }
  }, [isAdmin, selectedBranch, selectedCourse]);

  useEffect(() => {
    loadCalendarSessions();
  }, [selectedBranch, selectedCourse]);

  useEffect(() => {
    if (selectedSession) {
      loadExistingAttendance();
    } else {
      setAttendanceData({});
    }
  }, [selectedSession, students]);

  const loadStudents = async () => {
    try {
      setLoading(true);
      const branch = selectedBranch || undefined;
      const data = await getStudentsForAttendance(branch, selectedCourse || undefined);
      setStudents(data);
    } catch (err: any) {
      setError(err.message || "Failed to load students");
    } finally {
      setLoading(false);
    }
  };

  const loadSessions = async () => {
    try {
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      
      const branch = selectedBranch || undefined;
      const data = await getClassSessions({
        branch: branch,
        course: selectedCourse || undefined,
        start_date: startOfMonth.toISOString(),
        end_date: endOfMonth.toISOString(),
      });
      setSessions(data);
    } catch (err: any) {
      console.error("Failed to load sessions:", err);
    }
  };

  const loadCalendarSessions = async () => {
    try {
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      startOfMonth.setMonth(startOfMonth.getMonth() - 1);
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 2, 0);
      
      const branch = selectedBranch || undefined;
      const data = await getClassSessions({
        branch: branch,
        course: selectedCourse || undefined,
        start_date: startOfMonth.toISOString(),
        end_date: endOfMonth.toISOString(),
      });
      setCalendarSessions(data);
    } catch (err: any) {
      console.error("Failed to load calendar sessions:", err);
    }
  };

  const loadSchedules = async () => {
    try {
      const branch = selectedBranch || undefined;
      const data = await getClassSchedules(branch, selectedCourse || undefined);
      setSchedules(data);
    } catch (err: any) {
      console.error("Failed to load schedules:", err);
    }
  };

  const loadFeeStats = async () => {
    try {
      setFeeLoading(true);
      const data = await getFeeDashboardStats();
      setFeeStats(data);
    } catch (err: any) {
      setError(err.message || "Failed to load fee stats");
    } finally {
      setFeeLoading(false);
    }
  };

  const findOrCreateSession = async () => {
    if (!sessionDate || students.length === 0) return;
    
    try {
      const sessionDateObj = new Date(sessionDate);
      const startOfDay = new Date(sessionDateObj);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(sessionDateObj);
      endOfDay.setHours(23, 59, 59, 999);
      
      const branch = selectedBranch || undefined;
      const existingSessions = await getClassSessions({
        branch: branch,
        course: selectedCourse || undefined,
        start_date: startOfDay.toISOString(),
        end_date: endOfDay.toISOString(),
      });
      
      const matchingSession = existingSessions.find(s => {
        const sessionDate = new Date(s.session_date);
        return sessionDate.toDateString() === sessionDateObj.toDateString();
      });
      
      if (matchingSession) {
        setSelectedSession(matchingSession);
      } else {
        setSelectedSession(null);
        setAttendanceData({});
      }
    } catch (err: any) {
      console.error("Failed to find/create session:", err);
      setError("Failed to load session for selected date");
    }
  };

  const loadExistingAttendance = async () => {
    if (!selectedSession) return;
    
    try {
      const records = await getAttendanceRecords({ session_id: selectedSession.id });
      const data: Record<number, string> = {};
      const tshirt: Record<number, boolean> = {};
      records.forEach((record) => {
        data[record.student_profile_id] = record.status;
        tshirt[record.student_profile_id] = record.t_shirt_worn || false;
      });
      setAttendanceData(data);
      setTshirtData(tshirt);
    } catch (err: any) {
      console.error("Failed to load attendance:", err);
    }
  };

  const handleStatusChange = (studentId: number, status: string) => {
    setAttendanceData({ ...attendanceData, [studentId]: status });
  };

  const handleMarkAllPresent = () => {
    const data: Record<number, string> = {};
    students.forEach((student) => {
      data[student.id] = "present";
    });
    setAttendanceData(data);
  };

  const handleMarkAllAbsent = () => {
    const data: Record<number, string> = {};
    students.forEach((student) => {
      data[student.id] = "absent";
    });
    setAttendanceData(data);
  };

  const handleSubmitAttendance = async () => {
    if (!sessionDate || students.length === 0) {
      setError("Please select a date and ensure students are loaded");
      return;
    }

    try {
      setSaving(true);
      setError(null);

      let session = selectedSession;
      
      if (!session) {
        const sessionDateObj = new Date(sessionDate);
        const branch = selectedBranch || "All Branches";
        const firstStudent = students[0];
        
        session = await createClassSession({
          session_date: sessionDateObj.toISOString(),
          branch: branch,
          course: selectedCourse || firstStudent?.course || null,
          level: firstStudent?.level || null,
          batch_name: null,
          topic: null,
          teacher_remarks: null,
        });
        
        setSelectedSession(session);
        setSessions([...sessions, session]);
      }

      const attendance_data = students.map((student) => ({
        session_id: session.id,
        student_profile_id: student.id,
        status: attendanceData[student.id] || "present",
        t_shirt_worn: tshirtData[student.id] || false,
      }));

      await markBulkAttendance({
        session_id: session.id,
        attendance_data,
      });

      setSuccess("Attendance marked successfully!");
      setTimeout(() => setSuccess(null), 3000);
      await loadExistingAttendance();
    } catch (err: any) {
      setError(err.message || "Failed to mark attendance");
    } finally {
      setSaving(false);
    }
  };

  const handleCalendarDateClick = (date: Date) => {
    setSelectedCalendarDate(date);
    setSessionDate(date.toISOString().split("T")[0]);
    setSelectedSession(null);
    setAttendanceData({});
    setViewMode("attendance");
  };

  const handleCreateSchedule = async () => {
    try {
      setError(null);
      
      if (!scheduleForm.branch) {
        setError("Branch is required");
        return;
      }
      if (scheduleForm.schedule_days.length === 0) {
        setError("At least one schedule day is required");
        return;
      }

      const scheduleData = {
        branch: scheduleForm.branch,
        course: scheduleForm.course || null,
        level: scheduleForm.level || null,
        batch_name: scheduleForm.batch_name || null,
        schedule_days: scheduleForm.schedule_days,
        time_slots: scheduleForm.time_slots.length > 0 ? scheduleForm.time_slots : null,
        is_active: scheduleForm.is_active,
      };

      if (editingSchedule) {
        await updateClassSchedule(editingSchedule.id, scheduleData);
        setSuccess("Schedule updated successfully!");
      } else {
        await createClassSchedule(scheduleData);
        setSuccess("Schedule created successfully!");
      }

      setShowScheduleModal(false);
      setEditingSchedule(null);
      setScheduleForm({
        branch: "",
        course: "",
        level: "",
        batch_name: "",
        schedule_days: [],
        time_slots: [],
        is_active: true,
      });
      await loadSchedules();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      const errorMessage = err.message || "Failed to save schedule";
      setError(errorMessage);
      console.error("Save schedule error:", err);
    }
  };

  const handleEditSchedule = (schedule: ClassSchedule) => {
    setEditingSchedule(schedule);
    setScheduleForm({
      branch: schedule.branch,
      course: schedule.course || "",
      level: schedule.level || "",
      batch_name: schedule.batch_name || "",
      schedule_days: schedule.schedule_days || [],
      time_slots: schedule.time_slots || [],
      is_active: schedule.is_active,
    });
    setShowScheduleModal(true);
  };

  const handleDeleteSchedule = async (id: number) => {
    if (!confirm("Are you sure you want to delete this schedule? This action cannot be undone.")) return;
    try {
      setError(null);
      await deleteClassSchedule(id);
      setSuccess("Schedule deleted successfully!");
      // Reload schedules after successful deletion
      await loadSchedules();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      const errorMessage = err.message || "Failed to delete schedule";
      setError(errorMessage);
      console.error("Delete schedule error:", err);
      // Don't reload schedules on error to prevent confusion
    }
  };

  const toggleScheduleDay = (day: number) => {
    setScheduleForm({
      ...scheduleForm,
      schedule_days: scheduleForm.schedule_days.includes(day)
        ? scheduleForm.schedule_days.filter((d) => d !== day)
        : [...scheduleForm.schedule_days, day],
    });
  };

  const addTimeSlot = () => {
    setScheduleForm({
      ...scheduleForm,
      time_slots: [...scheduleForm.time_slots, { start: "10:00", end: "11:00" }],
    });
  };

  const updateTimeSlot = (index: number, field: "start" | "end", value: string) => {
    const newSlots = [...scheduleForm.time_slots];
    newSlots[index] = { ...newSlots[index], [field]: value };
    setScheduleForm({ ...scheduleForm, time_slots: newSlots });
  };

  const removeTimeSlot = (index: number) => {
    setScheduleForm({
      ...scheduleForm,
      time_slots: scheduleForm.time_slots.filter((_, i) => i !== index),
    });
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex items-center justify-center transition-colors duration-300">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 dark:text-red-400 mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-300">Access Denied</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-32 pb-20 px-6 transition-colors duration-300">
      <div className="container mx-auto">
        {/* Page Header */}
        <header className="mb-12">
          <h1 className="text-5xl font-black tracking-tighter uppercase italic text-foreground mb-2 flex items-center gap-3">
            <Settings className="w-10 h-10 text-primary" />
            Unified Management
          </h1>
          <p className="text-muted-foreground text-lg font-medium">
            Manage attendance, fees, and schedules in one place
          </p>
        </header>

        {/* View Mode Tabs */}
        <div className="bg-card border border-border rounded-[2.5rem] p-8 shadow-xl mb-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { id: "overview" as ViewMode, label: "Overview", icon: TrendingUp },
              { id: "attendance" as ViewMode, label: "Attendance", icon: Calendar },
              { id: "fees" as ViewMode, label: "Fees", icon: DollarSign },
              { id: "schedules" as ViewMode, label: "Schedules", icon: Settings },
            ].map((mode) => {
              const Icon = mode.icon;
              return (
                <button
                  key={mode.id}
                  onClick={() => {
                    setViewMode(mode.id);
                    setSelectedStatView(null);
                  }}
                  className={`p-6 rounded-2xl border-2 transition-all hover:shadow-lg ${
                    viewMode === mode.id
                      ? "bg-primary/10 border-primary text-primary shadow-lg"
                      : "bg-background/50 border-border text-muted-foreground hover:border-primary hover:text-primary hover:bg-primary/5"
                  }`}
                >
                  <Icon className="w-8 h-8 mx-auto mb-3" />
                  <div className="text-sm font-bold uppercase tracking-widest text-center">
                    {mode.label}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Filters */}
        <div className="bg-card border border-border rounded-[2.5rem] p-8 shadow-xl mb-8">
          <h2 className="text-2xl font-black tracking-tight text-card-foreground mb-6 flex items-center gap-3">
            <Filter className="w-6 h-6 text-primary" />
            Filters
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold uppercase tracking-widest text-muted-foreground mb-3">
                Branch
              </label>
              <select
                value={selectedBranch}
                onChange={(e) => {
                  setSelectedBranch(e.target.value);
                  setSelectedSession(null);
                }}
                className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
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
                Course (Optional)
              </label>
              <select
                value={selectedCourse}
                onChange={(e) => {
                  setSelectedCourse(e.target.value);
                  setSelectedSession(null);
                }}
                className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
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
        </div>

        {/* Status Messages */}
        {success && (
          <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-2xl flex items-center gap-3 text-green-600 dark:text-green-400 mb-8">
            <CheckCircle2 className="w-6 h-6" />
            <span className="font-medium">{success}</span>
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-600 dark:text-red-400 mb-8">
            <AlertCircle className="w-6 h-6" />
            <span className="font-medium">{error}</span>
          </div>
        )}

        {/* Overview View */}
        {viewMode === "overview" && (
          <div className="space-y-8">
            {/* Fee Stats */}
            <div className="bg-card border border-border rounded-[2.5rem] p-8 shadow-xl">
              <h2 className="text-2xl font-black tracking-tight text-card-foreground mb-6 flex items-center gap-3">
                <DollarSign className="w-6 h-6 text-primary" />
                Fee Statistics
              </h2>
              <FeeDashboardStats 
                stats={feeStats} 
                loading={feeLoading} 
                onStatClick={(statType) => {
                  setSelectedStatView(statType);
                  setViewMode("fees");
                  if (statType === "overdue_students" || statType === "due_today") {
                    setShowOverdueOnly(true);
                  }
                }}
              />
            </div>

            {/* Calendar */}
            <div className="bg-gradient-to-br from-card/95 via-card/90 to-card/95 border border-border/80 rounded-[2.5rem] p-8 shadow-2xl shadow-indigo-500/10 dark:shadow-indigo-500/20 backdrop-blur-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-2xl shadow-lg ring-2 ring-indigo-200/50 dark:ring-indigo-500/30">
                  <Calendar className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-2xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 dark:from-indigo-400 dark:via-purple-400 dark:to-pink-400">
                  Attendance Calendar
                </h2>
              </div>
              <AttendanceCalendar
                sessions={calendarSessions}
                onDateClick={handleCalendarDateClick}
                selectedDate={selectedCalendarDate || (sessionDate ? new Date(sessionDate) : null)}
                isStudentView={false}
              />
            </div>
          </div>
        )}

        {/* Attendance View */}
        {viewMode === "attendance" && (
          <div className="space-y-8">
            {/* Calendar */}
            <div className="bg-gradient-to-br from-card/95 via-card/90 to-card/95 border border-border/80 rounded-[2.5rem] p-8 shadow-2xl shadow-indigo-500/10 dark:shadow-indigo-500/20 backdrop-blur-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-2xl shadow-lg ring-2 ring-indigo-200/50 dark:ring-indigo-500/30">
                  <Calendar className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-2xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 dark:from-indigo-400 dark:via-purple-400 dark:to-pink-400">
                  Attendance Calendar
                </h2>
              </div>
              <AttendanceCalendar
                sessions={calendarSessions}
                onDateClick={handleCalendarDateClick}
                selectedDate={selectedCalendarDate || (sessionDate ? new Date(sessionDate) : null)}
                isStudentView={false}
              />
            </div>

            {/* Attendance Form */}
            <div className="bg-card border border-border rounded-[2.5rem] p-8 shadow-xl">
              <h2 className="text-2xl font-black tracking-tight text-card-foreground mb-6 flex items-center gap-3">
                <Calendar className="w-6 h-6 text-primary" />
                Mark Attendance
              </h2>

              <div className="mb-6">
                <label className="block text-sm font-bold uppercase tracking-widest text-muted-foreground mb-3">
                  Session Date
                </label>
                <input
                  type="date"
                  value={sessionDate}
                  onChange={(e) => {
                    setSessionDate(e.target.value);
                    setSelectedSession(null);
                    setAttendanceData({});
                  }}
                  className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
              </div>

              <div className="flex flex-wrap items-center gap-4 mb-6">
                <button
                  onClick={handleSubmitAttendance}
                  disabled={saving || !sessionDate || students.length === 0}
                  className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                >
                  {saving ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Save className="w-5 h-5" />
                  )}
                  {selectedSession ? "Update Attendance" : "Save Attendance"}
                </button>

                <button
                  onClick={handleMarkAllPresent}
                  className="flex items-center gap-2 px-6 py-3 bg-background border border-border rounded-xl hover:bg-primary/5 hover:border-primary transition-colors"
                >
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  Mark All Present
                </button>

                <button
                  onClick={handleMarkAllAbsent}
                  className="flex items-center gap-2 px-6 py-3 bg-background border border-border rounded-xl hover:bg-primary/5 hover:border-primary transition-colors"
                >
                  <XCircle className="w-5 h-5 text-red-600" />
                  Mark All Absent
                </button>
              </div>

              {/* Students List */}
              <div className="space-y-4">
                <h3 className="text-xl font-black tracking-tight text-card-foreground flex items-center gap-3">
                  <Users className="w-5 h-5 text-primary" />
                  Students ({students.length})
                </h3>

                {loading ? (
                  <div className="text-center py-12 bg-slate-900 rounded-xl">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-400 mx-auto mb-4" />
                    <p className="text-white">Loading students...</p>
                  </div>
                ) : students.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No students found for selected branch/course</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {students.map((student) => (
                      <div
                        key={student.id}
                        className="flex items-center justify-between p-6 bg-background/50 border border-border rounded-2xl hover:border-primary hover:bg-primary/5 transition-all"
                      >
                        <div className="flex-1">
                          <div className="font-bold text-card-foreground">
                            {student.display_name || student.name}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {student.public_id && `ID: ${student.public_id}`}
                            {student.class_name && ` • Class: ${student.class_name}`}
                            {student.level && ` • Level: ${student.level}`}
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleStatusChange(student.id, "present")}
                            className={`px-6 py-3 rounded-xl text-sm font-bold uppercase tracking-widest transition-all ${
                              attendanceData[student.id] === "present"
                                ? "bg-green-500/10 text-green-600 border-2 border-green-500 shadow-lg"
                                : "bg-background border-2 border-border text-muted-foreground hover:border-green-500 hover:text-green-600 hover:bg-green-500/5"
                            }`}
                          >
                            Present
                          </button>
                          <button
                            onClick={() => handleStatusChange(student.id, "absent")}
                            className={`px-6 py-3 rounded-xl text-sm font-bold uppercase tracking-widest transition-all ${
                              attendanceData[student.id] === "absent"
                                ? "bg-red-500/10 text-red-600 border-2 border-red-500 shadow-lg"
                                : "bg-background border-2 border-border text-muted-foreground hover:border-red-500 hover:text-red-600 hover:bg-red-500/5"
                            }`}
                          >
                            Absent
                          </button>
                          <button
                            onClick={() => handleStatusChange(student.id, "on_break")}
                            className={`px-6 py-3 rounded-xl text-sm font-bold uppercase tracking-widest transition-all ${
                              attendanceData[student.id] === "on_break"
                                ? "bg-orange-500/10 text-orange-600 border-2 border-orange-500 shadow-lg"
                                : "bg-background border-2 border-border text-muted-foreground hover:border-orange-500 hover:text-orange-600 hover:bg-orange-500/5"
                            }`}
                          >
                            Break
                          </button>
                          <label className="flex items-center gap-2 px-4 py-3 bg-background/50 border-2 border-border rounded-xl hover:border-primary transition-all cursor-pointer">
                            <input
                              type="checkbox"
                              checked={tshirtData[student.id] || false}
                              onChange={(e) => setTshirtData({ ...tshirtData, [student.id]: e.target.checked })}
                              className="w-4 h-4 text-primary border-border rounded focus:ring-primary/20"
                            />
                            <span className="text-sm font-bold text-muted-foreground">⭐ T-Shirt</span>
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Fees View */}
        {viewMode === "fees" && (
          <div className="space-y-8">
            <FeeDashboardStats 
              stats={feeStats} 
              loading={feeLoading} 
              onStatClick={(statType) => {
                setSelectedStatView(statType);
                if (statType === "overdue_students" || statType === "due_today") {
                  setShowOverdueOnly(true);
                }
              }}
            />

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
                  onStudentClick={setSelectedStudent}
                  selectedBranch={selectedBranch || undefined}
                  selectedCourse={selectedCourse || undefined}
                  showOverdueOnly={selectedStatView === "overdue_students" || selectedStatView === "due_today"}
                />
              </div>
            )}

            {!selectedStatView && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-card border border-border rounded-[2.5rem] p-8 shadow-xl">
                  <h3 className="text-2xl font-black tracking-tight text-card-foreground mb-6">
                    Fee Plans
                  </h3>
                  <FeePlanManagement />
                </div>
                <div className="bg-card border border-border rounded-[2.5rem] p-8 shadow-xl">
                  <h3 className="text-2xl font-black tracking-tight text-card-foreground mb-6">
                    Assign Fees
                  </h3>
                  <FeeAssignment onAssignmentCreated={loadFeeStats} />
                </div>
              </div>
            )}

            <div className="bg-card border border-border rounded-[2.5rem] p-8 shadow-xl">
              <h3 className="text-2xl font-black tracking-tight text-card-foreground mb-6">
                Record Payment
              </h3>
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
                    loadFeeStats();
                    setSelectedStudentForPayment(null);
                  }}
                />
              )}
            </div>
          </div>
        )}

        {/* Schedules View */}
        {viewMode === "schedules" && (
          <div className="space-y-8">
            <div className="bg-card border border-border rounded-[2.5rem] p-8 shadow-xl">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-black tracking-tight text-card-foreground flex items-center gap-3">
                  <Settings className="w-6 h-6 text-primary" />
                  Class Schedules
                </h2>
                <button
                  onClick={() => {
                    setEditingSchedule(null);
                    setScheduleForm({
                      branch: selectedBranch || "",
                      course: selectedCourse || "",
                      level: "",
                      batch_name: "",
                      schedule_days: [],
                      time_slots: [],
                      is_active: true,
                    });
                    setShowScheduleModal(true);
                  }}
                  className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors shadow-lg"
                >
                  <Plus className="w-5 h-5" />
                  Create Schedule
                </button>
              </div>

              {schedules.length === 0 ? (
                <div className="text-center py-12 bg-background/50 border border-border rounded-2xl">
                  <Settings className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">No schedules found</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {schedules.map((schedule) => {
                    const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
                    const scheduleDayNames = schedule.schedule_days.map((d) => dayNames[d]);
                    return (
                      <div
                        key={schedule.id}
                        className="p-6 bg-background/50 border border-border rounded-2xl hover:border-primary hover:bg-primary/5 transition-all"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h3 className="font-bold text-card-foreground mb-1">
                              {schedule.branch}
                            </h3>
                            {schedule.course && (
                              <p className="text-sm text-muted-foreground">{schedule.course}</p>
                            )}
                            {schedule.level && (
                              <p className="text-xs text-muted-foreground">Level: {schedule.level}</p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEditSchedule(schedule)}
                              className="p-2 hover:bg-primary/10 rounded-lg transition-colors"
                            >
                              <Edit className="w-4 h-4 text-primary" />
                            </button>
                            <button
                              onClick={() => handleDeleteSchedule(schedule.id)}
                              className="p-2 hover:bg-red-500/10 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </button>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div>
                            <p className="text-xs font-semibold text-muted-foreground mb-1">Days:</p>
                            <div className="flex flex-wrap gap-1">
                              {scheduleDayNames.map((day, idx) => (
                                <span
                                  key={idx}
                                  className="px-2 py-1 bg-primary/10 text-primary rounded-lg text-xs font-bold"
                                >
                                  {day}
                                </span>
                              ))}
                            </div>
                          </div>
                          {schedule.time_slots && schedule.time_slots.length > 0 && (
                            <div>
                              <p className="text-xs font-semibold text-muted-foreground mb-1">Time:</p>
                              {schedule.time_slots.map((slot, idx) => (
                                <p key={idx} className="text-xs text-muted-foreground">
                                  {slot.start} - {slot.end}
                                </p>
                              ))}
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-1 rounded-lg text-xs font-bold ${
                                schedule.is_active
                                  ? "bg-green-500/10 text-green-600"
                                  : "bg-gray-500/10 text-gray-600"
                              }`}
                            >
                              {schedule.is_active ? "Active" : "Inactive"}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Schedule Modal */}
        {showScheduleModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-[2.5rem] p-8 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto scrollbar-premium">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-black tracking-tight text-card-foreground">
                  {editingSchedule ? "Edit Schedule" : "Create Schedule"}
                </h2>
                <button
                  onClick={() => {
                    setShowScheduleModal(false);
                    setEditingSchedule(null);
                    setScheduleForm({
                      branch: "",
                      course: "",
                      level: "",
                      batch_name: "",
                      schedule_days: [],
                      time_slots: [],
                      is_active: true,
                    });
                  }}
                  className="p-2 hover:bg-primary/10 rounded-lg transition-colors"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold uppercase tracking-widest text-muted-foreground mb-3">
                    Branch *
                  </label>
                  <select
                    value={scheduleForm.branch}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, branch: e.target.value })}
                    className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
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
                  <label className="block text-sm font-bold uppercase tracking-widest text-muted-foreground mb-3">
                    Course (Optional)
                  </label>
                  <select
                    value={scheduleForm.course}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, course: e.target.value })}
                    className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
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
                  <label className="block text-sm font-bold uppercase tracking-widest text-muted-foreground mb-3">
                    Level (Optional)
                  </label>
                  <input
                    type="text"
                    value={scheduleForm.level}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, level: e.target.value })}
                    placeholder="e.g., Level 1, Junior-1"
                    className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold uppercase tracking-widest text-muted-foreground mb-3">
                    Batch Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={scheduleForm.batch_name}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, batch_name: e.target.value })}
                    placeholder="e.g., Morning Batch, Evening Batch"
                    className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold uppercase tracking-widest text-muted-foreground mb-3">
                    Schedule Days *
                  </label>
                  <div className="grid grid-cols-7 gap-2">
                    {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, index) => (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleScheduleDay(index)}
                        className={`p-3 rounded-xl border-2 transition-all ${
                          scheduleForm.schedule_days.includes(index)
                            ? "bg-primary/10 border-primary text-primary"
                            : "bg-background border-border text-muted-foreground hover:border-primary"
                        }`}
                      >
                        <div className="text-xs font-bold">{day}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-bold uppercase tracking-widest text-muted-foreground">
                      Time Slots (Optional)
                    </label>
                    <button
                      type="button"
                      onClick={addTimeSlot}
                      className="px-4 py-2 bg-primary/10 text-primary rounded-xl hover:bg-primary/20 transition-colors text-sm font-bold"
                    >
                      <Plus className="w-4 h-4 inline mr-1" />
                      Add Time Slot
                    </button>
                  </div>
                  {scheduleForm.time_slots.map((slot, index) => (
                    <div key={index} className="flex items-center gap-2 mb-2">
                      <input
                        type="time"
                        value={slot.start}
                        onChange={(e) => updateTimeSlot(index, "start", e.target.value)}
                        className="flex-1 px-4 py-3 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                      />
                      <span className="text-muted-foreground">to</span>
                      <input
                        type="time"
                        value={slot.end}
                        onChange={(e) => updateTimeSlot(index, "end", e.target.value)}
                        className="flex-1 px-4 py-3 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => removeTimeSlot(index)}
                        className="p-2 hover:bg-red-500/10 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={scheduleForm.is_active}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, is_active: e.target.checked })}
                    className="w-4 h-4 text-primary border-border rounded focus:ring-primary/20"
                  />
                  <label htmlFor="is_active" className="text-sm font-bold text-muted-foreground">
                    Active Schedule
                  </label>
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={handleCreateSchedule}
                    className="flex-1 px-6 py-3 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors shadow-lg font-bold"
                  >
                    {editingSchedule ? "Update Schedule" : "Create Schedule"}
                  </button>
                  <button
                    onClick={() => {
                      setShowScheduleModal(false);
                      setEditingSchedule(null);
                      setScheduleForm({
                        branch: "",
                        course: "",
                        level: "",
                        batch_name: "",
                        schedule_days: [],
                        time_slots: [],
                        is_active: true,
                      });
                    }}
                    className="px-6 py-3 bg-background border border-border rounded-xl hover:bg-primary/5 transition-colors font-bold"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Student Fee Details Modal */}
        {selectedStudent && (
          <StudentFeeDetails
            studentProfileId={selectedStudent.student_profile_id}
            onClose={() => setSelectedStudent(null)}
            onRefresh={() => {
              loadFeeStats();
              setSelectedStudent(null);
            }}
          />
        )}
      </div>
    </div>
  );
}
