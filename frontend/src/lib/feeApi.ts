// Fee Management System API Client
const API_BASE = import.meta.env.VITE_API_BASE || "/api";
const FEE_BASE = `${API_BASE}/fees`;

// Helper functions
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

// Fee Plan Interfaces
export interface FeePlan {
  id: number;
  name: string;
  description: string | null;
  branch: string | null;
  course: string | null;
  level: string | null;
  fee_amount: number;
  fee_duration_days: number;
  currency: string;
  is_active: boolean;
  created_by_user_id: number;
  created_at: string;
  updated_at: string;
}

export interface FeePlanCreate {
  name: string;
  description?: string | null;
  branch?: string | null;
  course?: string | null;
  level?: string | null;
  fee_amount: number;
  fee_duration_days: number;
  currency?: string;
  is_active?: boolean;
}

export interface FeePlanUpdate {
  name?: string;
  description?: string | null;
  branch?: string | null;
  course?: string | null;
  level?: string | null;
  fee_amount?: number;
  fee_duration_days?: number;
  currency?: string;
  is_active?: boolean;
}

// Fee Assignment Interfaces
export interface FeeAssignment {
  id: number;
  student_profile_id: number;
  fee_plan_id: number;
  custom_fee_amount: number | null;
  discount_amount: number;
  discount_percentage: number;
  effective_fee_amount: number;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
  assigned_by_user_id: number;
  remarks: string | null;
  created_at: string;
  updated_at: string;
  fee_plan?: FeePlan;
}

export interface FeeAssignmentCreate {
  student_profile_id: number;
  fee_plan_id: number;
  custom_fee_amount?: number | null;
  discount_amount?: number;
  discount_percentage?: number;
  start_date: string;
  end_date?: string | null;
  remarks?: string | null;
}

// Fee Transaction Interfaces
export interface FeeTransaction {
  id: number;
  assignment_id: number;
  transaction_type: string;
  amount: number;
  payment_date: string;
  payment_mode: string;
  reference_number: string | null;
  balance_before: number;
  balance_after: number;
  remarks: string | null;
  is_partial: boolean;
  created_by_user_id: number;
  created_at: string;
  updated_at: string;
}

export interface FeeTransactionCreate {
  assignment_id: number;
  transaction_type?: string;
  amount: number;
  payment_date: string;
  payment_mode: string;
  reference_number?: string | null;
  remarks?: string | null;
  is_partial?: boolean;
}

// Student Fee Summary
export interface StudentFeeSummary {
  student_profile_id: number;
  student_name: string;
  student_public_id: string | null;
  current_assignment: FeeAssignment | null;
  total_paid: number;
  total_due: number;
  balance: number;
  last_payment_date: string | null;
  next_due_date: string | null;
  is_overdue: boolean;
  overdue_days: number;
  transactions: FeeTransaction[];
}

// Dashboard Statistics
export interface FeeDashboardStats {
  total_fee_collected_all_time: number;
  total_fee_collected_monthly: number;
  total_fee_collected_today: number;
  total_fees_due: number;
  total_active_students: number;
  students_with_due_fees: number;
  overdue_count: number;
  due_today_count: number;
  collection_summary: {
    today: number;
    this_month: number;
    all_time: number;
  };
}

// Fee Plan API
export async function createFeePlan(data: FeePlanCreate): Promise<FeePlan> {
  const res = await fetch(`${FEE_BASE}/plans`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  return readResponse<FeePlan>(res);
}

export async function getFeePlans(params?: {
  branch?: string;
  course?: string;
  is_active?: boolean;
}): Promise<FeePlan[]> {
  const queryParams = new URLSearchParams();
  if (params?.branch) queryParams.append("branch", params.branch);
  if (params?.course) queryParams.append("course", params.course);
  if (params?.is_active !== undefined) queryParams.append("is_active", String(params.is_active));
  
  const url = `${FEE_BASE}/plans${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
  const res = await fetch(url, {
    headers: getAuthHeaders(),
  });
  return readResponse<FeePlan[]>(res);
}

export async function getFeePlan(planId: number): Promise<FeePlan> {
  const res = await fetch(`${FEE_BASE}/plans/${planId}`, {
    headers: getAuthHeaders(),
  });
  return readResponse<FeePlan>(res);
}

export async function updateFeePlan(planId: number, data: FeePlanUpdate): Promise<FeePlan> {
  const res = await fetch(`${FEE_BASE}/plans/${planId}`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  return readResponse<FeePlan>(res);
}

export async function deleteFeePlan(planId: number): Promise<void> {
  const res = await fetch(`${FEE_BASE}/plans/${planId}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: "Failed to delete fee plan" }));
    throw new Error(error.detail || "Failed to delete fee plan");
  }
}

// Fee Assignment API
export async function createFeeAssignment(data: FeeAssignmentCreate): Promise<FeeAssignment> {
  const res = await fetch(`${FEE_BASE}/assignments`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  return readResponse<FeeAssignment>(res);
}

export async function getFeeAssignments(params?: {
  student_profile_id?: number;
  fee_plan_id?: number;
  is_active?: boolean;
}): Promise<FeeAssignment[]> {
  const queryParams = new URLSearchParams();
  if (params?.student_profile_id) queryParams.append("student_profile_id", String(params.student_profile_id));
  if (params?.fee_plan_id) queryParams.append("fee_plan_id", String(params.fee_plan_id));
  if (params?.is_active !== undefined) queryParams.append("is_active", String(params.is_active));
  
  const url = `${FEE_BASE}/assignments${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
  const res = await fetch(url, {
    headers: getAuthHeaders(),
  });
  return readResponse<FeeAssignment[]>(res);
}

export async function updateFeeAssignment(assignmentId: number, data: Partial<FeeAssignmentCreate>): Promise<FeeAssignment> {
  const res = await fetch(`${FEE_BASE}/assignments/${assignmentId}`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  return readResponse<FeeAssignment>(res);
}

// Fee Transaction API
export async function createFeeTransaction(data: FeeTransactionCreate): Promise<FeeTransaction> {
  const res = await fetch(`${FEE_BASE}/transactions`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  return readResponse<FeeTransaction>(res);
}

export async function getFeeTransactions(params?: {
  assignment_id?: number;
  student_profile_id?: number;
  start_date?: string;
  end_date?: string;
  payment_mode?: string;
}): Promise<FeeTransaction[]> {
  const queryParams = new URLSearchParams();
  if (params?.assignment_id) queryParams.append("assignment_id", String(params.assignment_id));
  if (params?.student_profile_id) queryParams.append("student_profile_id", String(params.student_profile_id));
  if (params?.start_date) queryParams.append("start_date", params.start_date);
  if (params?.end_date) queryParams.append("end_date", params.end_date);
  if (params?.payment_mode) queryParams.append("payment_mode", params.payment_mode);
  
  const url = `${FEE_BASE}/transactions${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
  const res = await fetch(url, {
    headers: getAuthHeaders(),
  });
  return readResponse<FeeTransaction[]>(res);
}

// Student Fee Summary API
export async function getStudentFeeSummary(studentProfileId: number): Promise<StudentFeeSummary> {
  const res = await fetch(`${FEE_BASE}/students/${studentProfileId}/summary`, {
    headers: getAuthHeaders(),
  });
  return readResponse<StudentFeeSummary>(res);
}

// Dashboard API
export async function getFeeDashboardStats(): Promise<FeeDashboardStats> {
  const res = await fetch(`${FEE_BASE}/dashboard/stats`, {
    headers: getAuthHeaders(),
  });
  return readResponse<FeeDashboardStats>(res);
}

export async function getStudentsWithFees(params?: {
  branch?: string;
  course?: string;
  show_overdue_only?: boolean;
}): Promise<StudentFeeSummary[]> {
  const queryParams = new URLSearchParams();
  if (params?.branch) queryParams.append("branch", params.branch);
  if (params?.course) queryParams.append("course", params.course);
  if (params?.show_overdue_only) queryParams.append("show_overdue_only", "true");
  
  const url = `${FEE_BASE}/dashboard/students${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
  const res = await fetch(url, {
    headers: getAuthHeaders(),
  });
  return readResponse<StudentFeeSummary[]>(res);
}
