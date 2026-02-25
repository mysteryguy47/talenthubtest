// Attendance System API Client
const API_BASE = import.meta.env.VITE_API_BASE || "/api";
const ATTENDANCE_BASE = `${API_BASE}/attendance`;

// Helper functions (duplicated to avoid import issues)
function getAuthToken(): string | null {
  return localStorage.getItem("auth_token");
}

function getAuthHeaders(): HeadersInit {
  const token = getAuthToken();
  return {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  };
}

async function readResponse<T = any>(res: Response): Promise<T> {
  const text = await res.text();
  if (!res.ok) {
    try {
      const error = JSON.parse(text);
      throw new Error(error.detail || error.message || `Request failed: ${res.status}`);
    } catch (e) {
      if (e instanceof Error && e.message.includes('Request failed')) throw e;
      throw new Error(text || `Request failed: ${res.status}`);
    }
  }
  return text ? JSON.parse(text) : null;
}

export interface ClassSchedule {
  id: number;
  branch: string;
  course: string | null;
  level: string | null;
  batch_name: string | null;
  schedule_days: number[];
  time_slots: Array<{ start: string; end: string }> | null;
  is_active: boolean;
  created_by_user_id: number;
  created_at: string;
  updated_at: string;
}

export interface ClassSession {
  id: number;
  schedule_id: number | null;
  session_date: string;
  branch: string;
  course: string | null;
  level: string | null;
  batch_name: string | null;
  topic: string | null;
  teacher_remarks: string | null;
  is_completed: boolean;
  created_by_user_id: number;
  created_at: string;
  updated_at: string;
}

export interface AttendanceRecord {
  id: number;
  session_id: number;
  student_profile_id: number;
  status: "present" | "absent" | "on_break" | "leave";
  t_shirt_worn: boolean;
  remarks: string | null;
  marked_by_user_id: number;
  created_at: string;
  updated_at: string;
  session?: ClassSession;
  student_name?: string;
  student_public_id?: string;
}

export interface AttendanceStats {
  total_sessions: number;
  present_count: number;
  absent_count: number;
  on_break_count: number;
  leave_count: number;
  attendance_percentage: number;
  monthly_stats?: Record<string, { total: number; present: number; percentage: number }>;
}

export interface Certificate {
  id: number;
  student_profile_id: number;
  title: string;
  marks: number | null;
  date_issued: string;
  description: string | null;
  certificate_file_url: string | null;
  issued_by_user_id: number;
  created_at: string;
  student_name?: string;
  student_public_id?: string;
}

// Class Schedules
export async function createClassSchedule(schedule: Partial<ClassSchedule>): Promise<ClassSchedule> {
  const res = await fetch(`${ATTENDANCE_BASE}/schedules`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(schedule),
  });
  return readResponse<ClassSchedule>(res);
}

export async function getClassSchedules(branch?: string, course?: string): Promise<ClassSchedule[]> {
  const params = new URLSearchParams();
  if (branch) params.append("branch", branch);
  if (course) params.append("course", course);
  const res = await fetch(`${ATTENDANCE_BASE}/schedules?${params}`, {
    headers: getAuthHeaders(),
  });
  return readResponse<ClassSchedule[]>(res);
}

export async function updateClassSchedule(id: number, schedule: Partial<ClassSchedule>): Promise<ClassSchedule> {
  const res = await fetch(`${ATTENDANCE_BASE}/schedules/${id}`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(schedule),
  });
  return readResponse<ClassSchedule>(res);
}

export async function deleteClassSchedule(id: number): Promise<{ message: string }> {
  const res = await fetch(`${ATTENDANCE_BASE}/schedules/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  return readResponse<{ message: string }>(res);
}

// Class Sessions
export async function createClassSession(session: Partial<ClassSession>): Promise<ClassSession> {
  const res = await fetch(`${ATTENDANCE_BASE}/sessions`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(session),
  });
  return readResponse<ClassSession>(res);
}

export async function getClassSessions(params?: {
  branch?: string;
  course?: string;
  start_date?: string;
  end_date?: string;
}): Promise<ClassSession[]> {
  const queryParams = new URLSearchParams();
  if (params?.branch) queryParams.append("branch", params.branch);
  if (params?.course) queryParams.append("course", params.course);
  if (params?.start_date) queryParams.append("start_date", params.start_date);
  if (params?.end_date) queryParams.append("end_date", params.end_date);
  
  const res = await fetch(`${ATTENDANCE_BASE}/sessions?${queryParams}`, {
    headers: getAuthHeaders(),
  });
  return readResponse<ClassSession[]>(res);
}

export async function getClassSession(id: number): Promise<ClassSession> {
  const res = await fetch(`${ATTENDANCE_BASE}/sessions/${id}`, {
    headers: getAuthHeaders(),
  });
  return readResponse<ClassSession>(res);
}

export async function deleteClassSession(id: number): Promise<{ message: string }> {
  const res = await fetch(`${ATTENDANCE_BASE}/sessions/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  return readResponse<{ message: string }>(res);
}

// Attendance Records
export async function markAttendance(record: {
  session_id: number;
  student_profile_id: number;
  status: string;
  remarks?: string;
}): Promise<AttendanceRecord> {
  const res = await fetch(`${ATTENDANCE_BASE}/mark`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(record),
  });
  return readResponse<AttendanceRecord>(res);
}

export async function markBulkAttendance(data: {
  session_id: number;
  attendance_data: Array<{
    session_id: number;
    student_profile_id: number;
    status: string;
    t_shirt_worn?: boolean;
    remarks?: string;
  }>;
}): Promise<AttendanceRecord[]> {
  const res = await fetch(`${ATTENDANCE_BASE}/mark-bulk`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  return readResponse<AttendanceRecord[]>(res);
}

export async function getAttendanceRecords(params?: {
  student_profile_id?: number;
  session_id?: number;
  start_date?: string;
  end_date?: string;
}): Promise<AttendanceRecord[]> {
  const queryParams = new URLSearchParams();
  if (params?.student_profile_id) queryParams.append("student_profile_id", params.student_profile_id.toString());
  if (params?.session_id) queryParams.append("session_id", params.session_id.toString());
  if (params?.start_date) queryParams.append("start_date", params.start_date);
  if (params?.end_date) queryParams.append("end_date", params.end_date);
  
  const res = await fetch(`${ATTENDANCE_BASE}/records?${queryParams}`, {
    headers: getAuthHeaders(),
  });
  return readResponse<AttendanceRecord[]>(res);
}

export async function deleteAttendanceRecord(
  sessionId: number,
  studentProfileId: number
): Promise<{ message: string }> {
  const res = await fetch(`${ATTENDANCE_BASE}/records?session_id=${sessionId}&student_profile_id=${studentProfileId}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  return readResponse<{ message: string }>(res);
}

export async function getAttendanceStats(
  studentProfileId: number,
  startDate?: string,
  endDate?: string
): Promise<AttendanceStats> {
  const queryParams = new URLSearchParams();
  if (startDate) queryParams.append("start_date", startDate);
  if (endDate) queryParams.append("end_date", endDate);
  
  const res = await fetch(`${ATTENDANCE_BASE}/stats/${studentProfileId}?${queryParams}`, {
    headers: getAuthHeaders(),
  });
  return readResponse<AttendanceStats>(res);
}

// Certificates
export async function createCertificate(certificate: {
  student_profile_id: number;
  title: string;
  marks?: number;
  date_issued: string;
  description?: string;
  certificate_file_url?: string;
}): Promise<Certificate> {
  const res = await fetch(`${ATTENDANCE_BASE}/certificates`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(certificate),
  });
  return readResponse<Certificate>(res);
}

export async function getCertificates(studentProfileId?: number): Promise<Certificate[]> {
  const queryParams = new URLSearchParams();
  if (studentProfileId) queryParams.append("student_profile_id", studentProfileId.toString());
  
  const res = await fetch(`${ATTENDANCE_BASE}/certificates?${queryParams}`, {
    headers: getAuthHeaders(),
  });
  return readResponse<Certificate[]>(res);
}

export async function deleteCertificate(id: number): Promise<{ message: string }> {
  const res = await fetch(`${ATTENDANCE_BASE}/certificates/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  return readResponse<{ message: string }>(res);
}

// Helper: Get students for attendance
export async function getStudentsForAttendance(branch?: string, course?: string): Promise<Array<{
  id: number;
  user_id: number;
  public_id: string | null;
  name: string;
  display_name: string | null;
  class_name: string | null;
  course: string | null;
  level: string | null;
  branch: string | null;
}>> {
  const queryParams = new URLSearchParams();
  if (branch) queryParams.append("branch", branch);
  if (course) queryParams.append("course", course);
  
  const res = await fetch(`${ATTENDANCE_BASE}/students?${queryParams}`, {
    headers: getAuthHeaders(),
  });
  return readResponse(res);
}

// Attendance Metrics
export interface AttendanceMetrics {
  date: string;
  date_stats: {
    present: number;
    absent: number;
    on_break: number;
    total_marked: number;
    attendance_percentage: number;
  };
  monthly_stats: {
    present: number;
    total: number;
    attendance_percentage: number;
  };
}

export async function getAttendanceMetrics(params?: {
  date?: string;
  branch?: string;
  course?: string;
}): Promise<AttendanceMetrics> {
  const queryParams = new URLSearchParams();
  if (params?.date) queryParams.append("date", params.date);
  if (params?.branch) queryParams.append("branch", params.branch);
  if (params?.course) queryParams.append("course", params.course);
  
  const res = await fetch(`${ATTENDANCE_BASE}/metrics?${queryParams}`, {
    headers: getAuthHeaders(),
  });
  return readResponse<AttendanceMetrics>(res);
}
