export interface UserProgress {
    steps: number;
    weeklySteps: number;
    consecutiveDays: number;
    timestamp: string;
}

export interface AchievementResult {
    achievementId: string;
    pointsEarned: number;
    completedAt: string;
    metadata: AchievementMetadata;
}

export interface AchievementMetadata {
    title: string;
    icon: string;
    description?: string;
}

export type AchievementValidator = (data: UserProgress) => boolean;

export type AchievementType = "daily" | "weekly" | "streak" | "milestone";

export interface AchievementRule {
    id: string;
    type: AchievementType;
    validator: AchievementValidator;
    points: number;
    metadata: AchievementMetadata;
}

export type AchievementRules = Record<string, AchievementRule>;

export interface LevelInfo {
    level: number;
    title: string;
    currentPoints: number;
    pointsForCurrentLevel: number;
    pointsForNextLevel: number | null;
    progressToNextLevel: number;
}

export interface DailyActivity {
    date: string;
    steps: number;
    completed: boolean;
}

export interface UserGamificationData {
    userId: string;
    achievements: AchievementResult[];
    totalPoints: number;
    dailyActivities: DailyActivity[];
}

export interface GamificationProcessResult {
    newAchievements: AchievementResult[];
    pointsEarned: number;
    currentStreak: number;
    streakBonus: number;
    levelInfo: LevelInfo;
    totalPoints: number;
    dailyActivities: DailyActivity[];
}
