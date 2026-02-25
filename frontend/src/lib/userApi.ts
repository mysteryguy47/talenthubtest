import type { PaperAttemptDetail } from "./api";
import apiClient from "./apiClient";

// User API client - Uses centralized API client with retry logic and error handling

export interface User {
  id: number;
  email: string;
  name: string;
  display_name?: string;
  avatar_url?: string;
  role: string;
  total_points: number;
  current_streak: number;
  longest_streak: number;
  created_at: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface PracticeSessionData {
  operation_type: string;
  difficulty_mode: string;
  total_questions: number;
  correct_answers: number;
  wrong_answers: number;
  accuracy: number;
  score: number;
  time_taken: number;
  points_earned: number;
  attempts: Array<{
    question_data: any;
    user_answer: number | null;
    correct_answer: number;
    is_correct: boolean;
    time_taken: number;
    question_number: number;
  }>;
}

export interface PracticeSession {
  id: number;
  operation_type: string;
  difficulty_mode: string;
  total_questions: number;
  correct_answers: number;
  wrong_answers: number;
  accuracy: number;
  score: number;
  time_taken: number;
  points_earned: number;
  started_at: string;
  completed_at?: string;
}

export interface Attempt {
  id: number;
  question_data: any;
  user_answer: number | null;
  correct_answer: number;
  is_correct: boolean;
  time_taken: number;
  question_number: number;
  created_at: string;
}

export interface PracticeSessionDetail extends PracticeSession {
  attempts: Attempt[];
}

export interface PaperAttempt {
  id: number;
  paper_title: string;
  paper_level: string;
  total_questions: number;
  correct_answers: number;
  wrong_answers: number;
  accuracy: number;
  score: number;
  time_taken: number | null;
  points_earned: number;
  started_at: string;
  completed_at: string | null;
}

export interface StudentStats {
  total_sessions: number;
  total_questions: number;
  total_correct: number;
  total_wrong: number;
  overall_accuracy: number;
  total_points: number;
  current_streak: number;
  longest_streak: number;
  badges: string[];
  recent_sessions: PracticeSession[];
  recent_paper_attempts?: PaperAttempt[];
}

export interface AdminStats {
  total_students: number;
  total_sessions: number;
  total_questions: number;
  average_accuracy: number;
}

export interface LeaderboardEntry {
  rank: number;
  user_id: number;
  name: string;
  avatar_url?: string;
  total_points?: number;
  weekly_points?: number;
}

// Set auth token
export function setAuthToken(token: string): void {
  localStorage.setItem("auth_token", token);
}

// Remove auth token
export function removeAuthToken(): void {
  localStorage.removeItem("auth_token");
}

// Login with Google OAuth token - Uses centralized API client
export async function loginWithGoogle(token: string): Promise<LoginResponse> {
  console.log("🔵 [LOGIN] Login started, token length:", token.length);
  
  try {
    const data = await apiClient.login<LoginResponse>("/users/login", { credential: token });
    
    if (!data || !data.access_token) {
      console.error("❌ [LOGIN] No access_token in response:", data);
      throw new Error("No access token in response");
    }
    
    console.log("✅ [LOGIN] Login successful!");
    setAuthToken(data.access_token);
    return data;
  } catch (error: any) {
    console.error("❌ [LOGIN] Login failed:", error);
    throw error instanceof Error ? error : new Error(`Login failed: ${error?.toString() || 'Unknown error'}`);
  }
}

// Update display name
export async function updateDisplayName(displayName: string | null): Promise<User> {
  return apiClient.put<User>("/users/me/display-name", { display_name: displayName });
}

// Get current user
export async function getCurrentUser(): Promise<User> {
  console.log("🟡 [API] getCurrentUser called");
  
  try {
    const user = await apiClient.get<User>("/users/me");
    
    if (!user) {
      throw new Error("No user data received");
    }
    
    console.log("✅ [API] User fetched:", user.email);
    // Update stored user data
    localStorage.setItem("user_data", JSON.stringify(user));
    return user;
  } catch (error: any) {
    console.error("❌ [API] Failed to get user:", error);
    
    // Handle 401 - clear auth state
    const errorMsg = error?.message || "";
    if (errorMsg.includes("Unauthorized") || errorMsg.includes("401") || errorMsg.includes("Please log in again")) {
      console.log("❌ [API] 401 Unauthorized - clearing auth state");
      removeAuthToken();
      localStorage.removeItem("user_data");
    }
    
    throw error;
  }
}

// Save practice session
export async function savePracticeSession(session: PracticeSessionData): Promise<any> {
  console.log("🟡 [API] savePracticeSession called");
  console.log("🟡 [API] Session data:", {
    operation_type: session.operation_type,
    total_questions: session.total_questions,
    correct_answers: session.correct_answers,
    attempts_count: session.attempts.length
  });
  
  try {
    const data = await apiClient.post("/users/practice-session", session);
    console.log("✅ [API] Practice session saved successfully!");
    return data;
  } catch (error) {
    console.error("❌ [API] Save failed:", error);
    throw error;
  }
}

// Get student stats
export async function getStudentStats(): Promise<StudentStats> {
  console.log("🟡 [API] getStudentStats called");
  
  try {
    const data = await apiClient.get<StudentStats>("/users/stats");
    console.log("✅ [API] Stats loaded:", {
      total_points: data?.total_points,
      total_sessions: data?.total_sessions,
      recent_sessions: data?.recent_sessions?.length || 0
    });
    return data;
  } catch (error) {
    console.error("❌ [API] Stats failed:", error);
    throw error;
  }
}

// Get overall leaderboard
export async function getOverallLeaderboard(): Promise<LeaderboardEntry[]> {
  return apiClient.get<LeaderboardEntry[]>("/users/leaderboard/overall");
}

// Get weekly leaderboard
export async function getWeeklyLeaderboard(): Promise<LeaderboardEntry[]> {
  return apiClient.get<LeaderboardEntry[]>("/users/leaderboard/weekly");
}

// Admin: Get all students
export async function getAllStudents(): Promise<User[]> {
  return apiClient.get<User[]>("/users/admin/students");
}

// Admin: Get admin stats
export async function getAdminStats(): Promise<AdminStats> {
  return apiClient.get<AdminStats>("/users/admin/stats");
}

// Admin: Get student stats
export async function getStudentStatsAdmin(studentId: number): Promise<StudentStats> {
  return apiClient.get<StudentStats>(`/users/admin/students/${studentId}/stats`);
}

// Admin: Delete student
export async function deleteStudent(studentId: number): Promise<{ message: string }> {
  return apiClient.delete<{ message: string }>(`/users/admin/students/${studentId}`);
}

// Admin: Update student points
export async function updateStudentPoints(studentId: number, points: number): Promise<{ message: string; old_points: number; new_points: number }> {
  return apiClient.put<{ message: string; old_points: number; new_points: number }>(`/users/admin/students/${studentId}/points`, { points });
}

// Admin: Refresh leaderboard
export async function refreshLeaderboard(): Promise<{ message: string }> {
  return apiClient.post<{ message: string }>("/users/admin/leaderboard/refresh");
}

// Admin: Get database stats
export interface DatabaseStats {
  total_users: number;
  total_students: number;
  total_admins: number;
  total_sessions: number;
  total_paper_attempts: number;
  total_rewards: number;
  total_papers: number;
  database_size_mb: number;
}

export async function getDatabaseStats(): Promise<DatabaseStats> {
  console.log("🔄 [API] Fetching database stats...");
  return apiClient.get<DatabaseStats>("/users/admin/database/stats", { timeout: 20000 });
}

// Admin: Get detailed practice session (with attempts) for a specific student
export async function getStudentPracticeSessionDetailAdmin(
  studentId: number,
  sessionId: number
): Promise<PracticeSessionDetail> {
  return apiClient.get<PracticeSessionDetail>(`/users/admin/students/${studentId}/practice-session/${sessionId}`);
}

// Admin: Get detailed practice paper attempt for a specific student
export async function getStudentPaperAttemptDetailAdmin(
  studentId: number,
  attemptId: number
): Promise<PaperAttemptDetail> {
  return apiClient.get<PaperAttemptDetail>(`/users/admin/students/${studentId}/paper-attempt/${attemptId}`);
}

// Promote self to admin (if email is in ADMIN_EMAILS)
// Get practice session details with attempts
export async function getPracticeSessionDetail(sessionId: number): Promise<PracticeSessionDetail> {
  return apiClient.get<PracticeSessionDetail>(`/users/practice-session/${sessionId}`);
}

// Student Profile Types
export interface StudentProfile {
  id: number;
  user_id: number;
  public_id: string | null;
  internal_uuid: string;
  full_name: string | null;
  display_name: string | null;
  class_name: string | null;
  course: string | null;
  level_type: string | null;
  level: string | null;
  branch: string | null;
  status: string;
  join_date: string | null;
  finish_date: string | null;
  parent_contact_number: string | null;
  created_at: string;
  updated_at: string;
}

export interface StudentProfileUpdate {
  full_name?: string | null;
  display_name?: string | null;
  class_name?: string | null;
  course?: string | null;
  level_type?: string | null;
  level?: string | null;
  branch?: string | null;
  status?: string;
  join_date?: string | null;
  finish_date?: string | null;
  parent_contact_number?: string | null;
}export interface ProfileAuditLog {
  id: number;
  profile_id: number;
  changed_by_user_id: number;
  changed_by_name: string | null;
  field_name: string;
  old_value: string | null;
  new_value: string | null;
  change_reason: string | null;
  created_at: string;
}

// Get current user's student profile
export async function getStudentProfile(): Promise<StudentProfile> {
  return apiClient.get<StudentProfile>("/users/profile");
}

// Get student profile by user ID
export async function getStudentProfileById(userId: number): Promise<StudentProfile> {
  return apiClient.get<StudentProfile>(`/users/profile/${userId}`);
}

// Update student profile (admin only)
export async function updateStudentProfile(profileData: StudentProfileUpdate): Promise<StudentProfile> {
  return apiClient.put<StudentProfile>("/users/profile", profileData);
}

// Update student profile by user ID (admin only)
export async function updateStudentProfileById(userId: number, profileData: StudentProfileUpdate): Promise<StudentProfile> {
  return apiClient.put<StudentProfile>(`/users/profile/${userId}`, profileData);
}

// Get profile audit logs (admin only)
export async function getProfileAuditLogs(userId: number): Promise<ProfileAuditLog[]> {
  return apiClient.get<ProfileAuditLog[]>(`/users/profile/${userId}/audit-logs`);
}

// Get valid levels for a course and level type
export async function getValidLevels(course: string, levelType: string): Promise<{ levels: string[] }> {
  return apiClient.get<{ levels: string[] }>(`/users/valid-levels?course=${encodeURIComponent(course)}&level_type=${encodeURIComponent(levelType)}`);
}

// Student ID Management Interfaces
export interface StudentIDInfo {
  user_id: number;
  current_public_id: string | null;
  student_name: string;
  email: string;
}

export interface UpdateStudentIDRequest {
  new_public_id: string;
}

export interface UpdateStudentIDResponse {
  success: boolean;
  message: string;
  old_public_id: string | null;
  new_public_id: string;
  student_name: string;
}

// Student ID Management Functions
export async function getStudentIDInfo(studentId: number): Promise<StudentIDInfo> {
  return apiClient.get(`/admin/students/${studentId}/id-info`);
}

export async function updateStudentPublicId(studentId: number, request: UpdateStudentIDRequest): Promise<UpdateStudentIDResponse> {
  return apiClient.put(`/users/admin/students/${studentId}/public-id`, request);
}

export async function generateNextStudentId(branch?: string): Promise<{suggested_id: string; prefix: string; branch?: string}> {
  const endpoint = branch 
    ? `/users/admin/generate-student-id?branch=${encodeURIComponent(branch)}`
    : "/users/admin/generate-student-id";
  return apiClient.post(endpoint, {});
}

export interface VacantId {
  id: number;
  public_id: string;
  original_student_name: string | null;
  deleted_at: string | null;
}

export interface VacantIdsResponse {
  vacant_ids: VacantId[];
}

export async function getVacantIds(): Promise<VacantIdsResponse> {
  return apiClient.get("/users/admin/vacant-ids");
}

export interface PointsLogEntry {
  id: number;
  points: number;
  source_type: string;
  description: string;
  source_id: number | null;
  metadata: Record<string, any> | null;
  created_at: string;
}

export interface PointsSummaryResponse {
  total_points_from_logs: number;
  total_points_from_user: number;
  match: boolean;
  logs: PointsLogEntry[];
  total_entries: number;
}

export async function getPointsLogs(limit: number = 100, offset: number = 0): Promise<PointsSummaryResponse> {
  return apiClient.get(`/users/points/logs?limit=${limit}&offset=${offset}`);
}