import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import {
  getStudentsForAttendance,
  markBulkAttendance,
  getClassSessions,
  getAttendanceRecords,
  createClassSession,
  deleteClassSession,
  ClassSession,
  AttendanceRecord,
  getAttendanceMetrics,
  AttendanceMetrics,
  deleteAttendanceRecord,
} from "../lib/attendanceApi";
import {
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  Users,
  Save,
  Plus,
  Filter,
  Loader2,
  AlertCircle,
  Edit,
  Trash2,
  TrendingUp,
  Shirt,
} from "lucide-react";
import AttendanceCalendar from "../components/AttendanceCalendar";

const BRANCHES = ["Rohini-16", "Rohini-11", "Gurgaon", "Online"];
const COURSES = ["Abacus", "Vedic Maths", "Handwriting"];

export default function AdminAttendance() {
  const { isAdmin } = useAuth();
  const [selectedBranch, setSelectedBranch] = useState<string>("");
  const [selectedCourse, setSelectedCourse] = useState<string>("");
  const [students, setStudents] = useState<any[]>([]);
  const [sessions, setSessions] = useState<ClassSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<ClassSession | null>(null);
  const [attendanceData, setAttendanceData] = useState<Record<number, string>>({});
  const [tshirtData, setTshirtData] = useState<Record<number, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [calendarSessions, setCalendarSessions] = useState<ClassSession[]>([]);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date | null>(null);
  const [metrics, setMetrics] = useState<AttendanceMetrics | null>(null);
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  const [showCreateSchedule, setShowCreateSchedule] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({
    name: "Class",
    branch: "",
    course: "",
    time: "10:00",
  });
  const [dateSessions, setDateSessions] = useState<ClassSession[]>([]);
  const [editingSession, setEditingSession] = useState<ClassSession | null>(null);

  // Load calendar sessions
  useEffect(() => {
    loadCalendarSessions();
  }, [selectedBranch, selectedCourse]);

  // Load metrics when date or filters change
  useEffect(() => {
    loadMetrics();
  }, [selectedDate, selectedBranch, selectedCourse]);

  // Load students when filters change
  useEffect(() => {
    loadStudents();
  }, [selectedBranch, selectedCourse]);

  // Load sessions for selected date
  useEffect(() => {
    if (selectedCalendarDate) {
      loadDateSessions();
      setSelectedDate(selectedCalendarDate);
    }
  }, [selectedCalendarDate, selectedBranch, selectedCourse]);

  // Auto-select first session when date sessions are loaded (only if no session is selected)
  useEffect(() => {
    if (dateSessions.length > 0) {
      // Check if current selected session is in the dateSessions list
      const currentSessionValid = selectedSession && dateSessions.some(s => s.id === selectedSession.id);
      
      if (!currentSessionValid) {
        // Auto-select first session for the date
        const firstSession = dateSessions[0];
        setSelectedSession(firstSession);
      }
    } else if (dateSessions.length === 0 && selectedCalendarDate) {
      // No sessions for this date, clear selection
      setSelectedSession(null);
      setAttendanceData({});
      setTshirtData({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateSessions, selectedCalendarDate]);

  // Load existing attendance when session is selected
  useEffect(() => {
    if (selectedSession) {
      loadExistingAttendance();
    } else {
      setAttendanceData({});
      setTshirtData({});
    }
  }, [selectedSession]);

  const loadCalendarSessions = async () => {
    try {
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
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

  const loadMetrics = async () => {
    try {
      setLoadingMetrics(true);
      const dateStr = selectedDate.toISOString().split("T")[0];
      const branch = selectedBranch || undefined;
      const data = await getAttendanceMetrics({
        date: dateStr,
        branch: branch,
        course: selectedCourse || undefined,
      });
      setMetrics(data);
    } catch (err: any) {
      console.error("Failed to load metrics:", err);
    } finally {
      setLoadingMetrics(false);
    }
  };

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

  const loadDateSessions = async () => {
    if (!selectedCalendarDate) {
      setDateSessions([]);
      return;
    }
    
    try {
      const dateStr = selectedCalendarDate.toISOString().split("T")[0];
      const startOfDay = new Date(selectedCalendarDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(selectedCalendarDate);
      endOfDay.setHours(23, 59, 59, 999);
      
      const branch = selectedBranch || undefined;
      const data = await getClassSessions({
        branch: branch,
        course: selectedCourse || undefined,
        start_date: startOfDay.toISOString(),
        end_date: endOfDay.toISOString(),
      });
      
      // Filter sessions for the exact date (fix timezone issue)
      const filtered = data.filter(s => {
        const sessionDate = new Date(s.session_date);
        const targetDate = new Date(selectedCalendarDate);
        return (
          sessionDate.getFullYear() === targetDate.getFullYear() &&
          sessionDate.getMonth() === targetDate.getMonth() &&
          sessionDate.getDate() === targetDate.getDate()
        );
      });
      
      setDateSessions(filtered);
      
      // Check if current selected session is still valid for this date
      if (selectedSession) {
        const stillExists = filtered.some(s => s.id === selectedSession.id);
        if (!stillExists) {
          // Current session is not for this date, clear it
          setSelectedSession(null);
        }
      }
    } catch (err: any) {
      console.error("Failed to load date sessions:", err);
      setDateSessions([]);
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

  const handleCalendarDateClick = (date: Date) => {
    setSelectedCalendarDate(date);
    setSelectedDate(date);
    setShowCreateSchedule(false);
    // Don't clear session/attendance here - let useEffect handle it after dateSessions loads
  };

  const handleCreateSchedule = async () => {
    if (!selectedCalendarDate || !scheduleForm.branch) {
      setError("Branch is required");
      return;
    }

    try {
      setError(null);
      
      // Create session date with time
      const sessionDateTime = new Date(selectedCalendarDate);
      const [hours, minutes] = scheduleForm.time.split(":");
      sessionDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      
      const session = await createClassSession({
        session_date: sessionDateTime.toISOString(),
        branch: scheduleForm.branch,
        course: scheduleForm.course || null,
        level: null,
        batch_name: scheduleForm.name || "Class",
        topic: null,
        teacher_remarks: null,
      });

        setSuccess("Schedule created successfully!");
      setTimeout(() => setSuccess(null), 3000);

      // Reset form
      setScheduleForm({
        name: "Class",
        branch: selectedBranch || "",
        course: selectedCourse || "",
        time: "10:00",
      });
      setShowCreateSchedule(false);
      
      // Reload data
      await loadDateSessions();
      await loadCalendarSessions();
      await loadMetrics();
    } catch (err: any) {
      setError(err.message || "Failed to create schedule");
    }
  };

  const handleDeleteSession = async (sessionId: number) => {
    if (!confirm("Are you sure you want to delete this schedule? This will also delete all attendance records for this session.")) return;
    
    try {
      setError(null);
      await deleteClassSession(sessionId);
      setSuccess("Schedule deleted successfully!");
      setTimeout(() => setSuccess(null), 3000);
      
      // Reload data
      await loadDateSessions();
      await loadCalendarSessions();
      await loadMetrics();
      
      // Clear selected session if it was deleted
      if (selectedSession?.id === sessionId) {
        setSelectedSession(null);
        setAttendanceData({});
        setTshirtData({});
      }
    } catch (err: any) {
      setError(err.message || "Failed to delete schedule");
    }
  };

  const handleEditSession = (session: ClassSession) => {
    setEditingSession(session);
    setScheduleForm({
      name: session.batch_name || "Class",
      branch: session.branch,
      course: session.course || "",
      time: new Date(session.session_date).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }),
    });
    setShowCreateSchedule(true);
  };

  const handleStatusChange = (studentId: number, status: string) => {
    // Toggle behavior: if already set to this status, remove it (unmark)
    // Otherwise, set it to the new status
    const currentStatus = attendanceData[studentId];
    if (currentStatus === status) {
      // Remove the status (unmark)
      const newData = { ...attendanceData };
      delete newData[studentId];
      setAttendanceData(newData);
    } else {
      // Set the new status
      setAttendanceData({ ...attendanceData, [studentId]: status });
    }
  };

  const handleTshirtToggle = (studentId: number) => {
    setTshirtData({ ...tshirtData, [studentId]: !tshirtData[studentId] });
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
    if (!selectedDate || students.length === 0) {
      setError("Please select a date and ensure students are loaded");
      return;
    }

    try {
      setSaving(true);
      setError(null);

      // Find or create session for the selected date
      let session = selectedSession;
      
      if (!session && dateSessions.length > 0) {
        // Use first session for this date
        session = dateSessions[0];
        setSelectedSession(session);
      }
      
      if (!session) {
        // Create a new session for this date
        const sessionDateObj = new Date(selectedDate);
        sessionDateObj.setHours(10, 0, 0, 0);
        const branch = selectedBranch || "Rohini-16";
        
        session = await createClassSession({
          session_date: sessionDateObj.toISOString(),
          branch: branch,
          course: selectedCourse || null,
          level: null,
          batch_name: "Class",
          topic: null,
          teacher_remarks: null,
        });
        
        setSelectedSession(session);
        setSessions([...sessions, session]);
      }

      // Get all existing records for this session to know which ones to delete
      const existingRecords = await getAttendanceRecords({ session_id: session.id });
      const existingStudentIds = new Set(existingRecords.map(r => r.student_profile_id));
      const currentStudentIds = new Set(Object.keys(attendanceData).map(id => parseInt(id)));
      
      // Delete records for students that are no longer marked
      for (const record of existingRecords) {
        if (!currentStudentIds.has(record.student_profile_id)) {
          // Student was previously marked but is now unmarked - delete the record
          try {
            await deleteAttendanceRecord(session.id, record.student_profile_id);
          } catch (err) {
            console.error(`Failed to delete attendance for student ${record.student_profile_id}:`, err);
          }
        }
      }

      // Only send students that have a status set (are marked)
      const attendance_data = students
        .filter(student => attendanceData[student.id]) // Only include marked students
        .map((student) => ({
          session_id: session.id,
          student_profile_id: student.id,
          status: attendanceData[student.id],
          t_shirt_worn: tshirtData[student.id] || false,
        }));

      // Only call markBulkAttendance if there are students to mark
      if (attendance_data.length > 0) {
        await markBulkAttendance({
          session_id: session.id,
          attendance_data,
        });
      }

      // Update selectedSession if we created/used a new one
      if (session.id !== selectedSession?.id) {
        setSelectedSession(session);
      }

      setSuccess("Attendance marked successfully!");
      setTimeout(() => setSuccess(null), 3000);
      
      // Reload data - ensure we reload everything
      await loadDateSessions();
      // Reload attendance for the session we just saved to
      await loadExistingAttendance();
      await loadMetrics();
      await loadCalendarSessions();
    } catch (err: any) {
      setError(err.message || "Failed to mark attendance");
    } finally {
      setSaving(false);
    }
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

  // Format date for display
  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-background pt-32 pb-20 px-6 transition-colors duration-300">
      <div className="container mx-auto">
        {/* Page Header */}
        <header className="mb-12">
          <h1 className="text-5xl font-black tracking-tighter uppercase italic text-foreground mb-2 flex items-center gap-3">
            <Calendar className="w-10 h-10 text-primary" />
            Attendance Management
          </h1>
          <p className="text-muted-foreground text-lg font-medium">Mark and manage student attendance</p>
        </header>

        {/* Metrics Dashboard */}
        <div className="bg-gradient-to-br from-card/95 via-card/90 to-card/95 border border-border/80 rounded-[2.5rem] p-8 shadow-2xl shadow-indigo-500/10 dark:shadow-indigo-500/20 backdrop-blur-sm mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-2xl shadow-lg ring-2 ring-indigo-200/50 dark:ring-indigo-500/30">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-2xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 dark:from-indigo-400 dark:via-purple-400 dark:to-pink-400">
              Attendance Metrics
            </h2>
          </div>

          {loadingMetrics ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : metrics ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-background/50 border border-border rounded-2xl p-6">
                <div className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-2">
                  Selected Date
                </div>
                <div className="text-lg font-black text-card-foreground">
                  {formatDate(selectedDate)}
                </div>
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Present:</span>
                    <span className="font-bold text-green-600 dark:text-green-400">{metrics.date_stats.present}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Absent:</span>
                    <span className="font-bold text-red-600 dark:text-red-400">{metrics.date_stats.absent}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Attendance:</span>
                    <span className="font-bold text-primary">{metrics.date_stats.attendance_percentage.toFixed(1)}%</span>
                  </div>
                </div>
              </div>

              <div className="bg-background/50 border border-border rounded-2xl p-6">
                <div className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-2">
                  Current Month
                </div>
                <div className="text-3xl font-black text-primary mb-2">
                  {metrics.monthly_stats.attendance_percentage.toFixed(1)}%
                </div>
                <div className="text-sm text-muted-foreground">
                  {metrics.monthly_stats.present} / {metrics.monthly_stats.total} present
                </div>
              </div>

              <div className="bg-background/50 border border-border rounded-2xl p-6">
                <div className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-2">
                  Today's Total
                </div>
                <div className="text-3xl font-black text-card-foreground mb-2">
                  {metrics.date_stats.total_marked}
                </div>
                <div className="text-sm text-muted-foreground">Students marked</div>
              </div>

              <div className="bg-background/50 border border-border rounded-2xl p-6">
                <div className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-2">
                  On Break
                </div>
                <div className="text-3xl font-black text-orange-600 dark:text-orange-400 mb-2">
                  {metrics.date_stats.on_break}
                </div>
                <div className="text-sm text-muted-foreground">Today</div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">No metrics available</div>
          )}
        </div>

        {/* Calendar View */}
        <div className="bg-gradient-to-br from-card/95 via-card/90 to-card/95 border border-border/80 rounded-[2.5rem] p-8 shadow-2xl shadow-indigo-500/10 dark:shadow-indigo-500/20 backdrop-blur-sm mb-8">
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
            selectedDate={selectedCalendarDate || selectedDate}
            isStudentView={false}
          />

          {/* Date Selection Details */}
          {selectedCalendarDate && (
            <div className="mt-6 bg-background/50 border border-border rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-black text-card-foreground">
                  {formatDate(selectedCalendarDate)}
                </h3>
                {!showCreateSchedule && (
                  <button
                    onClick={() => {
                      setShowCreateSchedule(true);
                      setEditingSession(null);
                      setScheduleForm({
                        name: "Class",
                        branch: selectedBranch || "",
                        course: selectedCourse || "",
                        time: "10:00",
                      });
                    }}
                    className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors shadow-lg font-bold"
                  >
                    <Plus className="w-5 h-5" />
                    Create Schedule
                  </button>
                )}
              </div>

              {/* Create Schedule Form */}
              {showCreateSchedule && (
                <div className="mb-6 p-6 bg-card border border-border rounded-2xl">
                  <h4 className="text-lg font-black text-card-foreground mb-4">
                    {editingSession ? "Edit Schedule" : "Create New Schedule"}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-bold uppercase tracking-widest text-muted-foreground mb-2">
                        Schedule Name
                      </label>
                      <input
                        type="text"
                        value={scheduleForm.name}
                        onChange={(e) => setScheduleForm({ ...scheduleForm, name: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-700 dark:bg-slate-700 text-white border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                        placeholder="Class"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold uppercase tracking-widest text-muted-foreground mb-2">
                        Branch *
                      </label>
                      <select
                        value={scheduleForm.branch}
                        onChange={(e) => setScheduleForm({ ...scheduleForm, branch: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-700 dark:bg-slate-700 text-white border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                      >
                        <option value="" className="bg-slate-700 text-white">Select Branch</option>
                        {BRANCHES.map((branch) => (
                          <option key={branch} value={branch}>
                            {branch}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold uppercase tracking-widest text-muted-foreground mb-2">
                        Course
                      </label>
                      <select
                        value={scheduleForm.course}
                        onChange={(e) => setScheduleForm({ ...scheduleForm, course: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-700 dark:bg-slate-700 text-white border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                      >
                        <option value="" className="bg-slate-700 text-white">All Courses</option>
                        {COURSES.map((course) => (
                          <option key={course} value={course}>
                            {course}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold uppercase tracking-widest text-muted-foreground mb-2">
                        Time
                      </label>
                      <input
                        type="time"
                        value={scheduleForm.time}
                        onChange={(e) => setScheduleForm({ ...scheduleForm, time: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-700 dark:bg-slate-700 text-white border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                      />
                    </div>
                  </div>
                  <div className="flex gap-4 mt-4">
                    <button
                      onClick={handleCreateSchedule}
                      className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors shadow-lg font-bold"
                    >
                      <Save className="w-5 h-5" />
                      {editingSession ? "Update" : "Create"} Schedule
                    </button>
                    <button
                      onClick={() => {
                        setShowCreateSchedule(false);
                        setEditingSession(null);
                      }}
                      className="px-6 py-3 bg-background border border-border rounded-xl hover:bg-primary/5 transition-colors font-bold"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Scheduled Classes Table */}
              {dateSessions.length > 0 && (
                <div>
                  <h4 className="text-lg font-black text-card-foreground mb-4">Scheduled Classes</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-3 px-4 text-sm font-black uppercase tracking-widest text-muted-foreground">Name</th>
                          <th className="text-left py-3 px-4 text-sm font-black uppercase tracking-widest text-muted-foreground">Branch</th>
                          <th className="text-left py-3 px-4 text-sm font-black uppercase tracking-widest text-muted-foreground">Course</th>
                          <th className="text-left py-3 px-4 text-sm font-black uppercase tracking-widest text-muted-foreground">Time</th>
                          <th className="text-right py-3 px-4 text-sm font-black uppercase tracking-widest text-muted-foreground">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dateSessions.map((session) => {
                          const sessionTime = new Date(session.session_date);
                          return (
                            <tr key={session.id} className="border-b border-border/50 hover:bg-primary/5 transition-colors">
                              <td className="py-3 px-4 font-medium text-card-foreground">{session.batch_name || "Class"}</td>
                              <td className="py-3 px-4 text-muted-foreground">{session.branch}</td>
                              <td className="py-3 px-4 text-muted-foreground">{session.course || "—"}</td>
                              <td className="py-3 px-4 text-muted-foreground">
                                {sessionTime.toLocaleTimeString("en-US", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  hour12: true,
                                })}
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={async () => {
                                      setSelectedSession(session);
                                      // Load attendance will be triggered by useEffect, but call it explicitly for immediate feedback
                                      await loadExistingAttendance();
                                    }}
                                    className={`p-2 rounded-lg transition-colors ${
                                      selectedSession?.id === session.id
                                        ? "bg-primary/20 text-primary"
                                        : "hover:bg-primary/10"
                                    }`}
                                    title="Mark Attendance"
                                  >
                                    <Users className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleEditSession(session)}
                                    className="p-2 hover:bg-primary/10 rounded-lg transition-colors"
                                    title="Edit"
                                  >
                                    <Edit className="w-4 h-4 text-primary" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteSession(session.id)}
                                    className="p-2 hover:bg-red-500/10 rounded-lg transition-colors"
                                    title="Delete"
                                  >
                                    <Trash2 className="w-4 h-4 text-red-600" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
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
                className="premium-select w-full"
              >
                <option value="" className="bg-slate-700 text-white">All Branches</option>
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
                className="premium-select w-full"
              >
                <option value="" className="bg-slate-700 text-white">All Courses</option>
                {COURSES.map((course) => (
                  <option key={course} value={course}>
                    {course}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-4 mt-6">
            <button
              onClick={handleSubmitAttendance}
              disabled={saving || !selectedDate || students.length === 0}
              className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg font-bold"
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
              className="flex items-center gap-2 px-6 py-3 bg-background border border-border rounded-xl hover:bg-primary/5 hover:border-primary transition-colors font-bold"
            >
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              Mark All Present
            </button>

            <button
              onClick={handleMarkAllAbsent}
              className="flex items-center gap-2 px-6 py-3 bg-background border border-border rounded-xl hover:bg-primary/5 hover:border-primary transition-colors font-bold"
            >
              <XCircle className="w-5 h-5 text-red-600" />
              Mark All Absent
            </button>
          </div>

          {/* Status Messages */}
          {success && (
            <div className="mt-4 p-4 bg-green-500/10 border border-green-500/20 rounded-2xl flex items-center gap-3 text-green-600 dark:text-green-400">
              <CheckCircle2 className="w-6 h-6" />
              <span className="font-medium">{success}</span>
            </div>
          )}

          {error && (
            <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-600 dark:text-red-400">
              <AlertCircle className="w-6 h-6" />
              <span className="font-medium">{error}</span>
            </div>
          )}
        </div>

        {/* Students List */}
        <div className="bg-card border border-border rounded-[2.5rem] p-8 shadow-xl">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-black tracking-tight text-card-foreground flex items-center gap-3">
              <Users className="w-6 h-6 text-primary" />
              Students ({students.length})
            </h2>
          </div>

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
              <button
                      onClick={() => handleTshirtToggle(student.id)}
                      className={`p-3 rounded-xl transition-all ${
                        tshirtData[student.id]
                          ? "bg-orange-500/10 text-orange-600 border-2 border-orange-500 shadow-lg"
                          : "bg-background border-2 border-border text-muted-foreground hover:border-orange-500 hover:text-orange-600 hover:bg-orange-500/5"
                      }`}
                      title="T-shirt Worn"
                    >
                      <Shirt className="w-5 h-5" />
                    </button>
                </div>
                  </div>
                ))}
              </div>
          )}
              </div>
              </div>
    </div>
  );
}
