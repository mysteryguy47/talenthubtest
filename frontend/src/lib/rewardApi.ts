import apiClient from "./apiClient";

const REWARD_BASE = "/users/rewards";

export interface Badge {
  id: number;
  badge_type: string;
  badge_name: string;
  badge_category: string;
  is_lifetime: boolean;
  month_earned?: string;
  earned_at: string;
}

export interface SuperProgress {
  current_letter?: string;
  current_points: number;
  next_milestone: number;
  next_milestone_type: string;
  progress_percentage: number;
  unlocked_rewards: string[];
}

export interface RewardSummary {
  total_points: number;
  current_streak: number;
  longest_streak: number;
  attendance_percentage: number;
  total_questions_attempted: number;
  super_progress: SuperProgress;
  current_badges: Badge[];
  lifetime_badges: Badge[];
  monthly_badges: Badge[];
  can_use_grace_skip: boolean;
  grace_skip_reason?: string;
}

export interface GraceSkipResponse {
  success: boolean;
  message: string;
  points_remaining: number;
  streak_preserved: boolean;
}

export async function getRewardSummary(): Promise<RewardSummary> {
    return apiClient.get<RewardSummary>(REWARD_BASE + "/summary");
  }
  
  export async function getStudentBadges(): Promise<Badge[]> {
    return apiClient.get<Badge[]>(REWARD_BASE + "/badges");
  }
  
  export async function redeemGraceSkip(): Promise<GraceSkipResponse> {
    return apiClient.post<GraceSkipResponse>(REWARD_BASE + "/grace-skip");
  }
  
