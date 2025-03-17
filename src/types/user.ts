export interface User {
    user_id: string;
    email: string;
    appleId?: string;
    social_conn?: string;
    password: string;
    created_at: Date;
    resetCode?: string;
}

export interface UserAttributions {
    user_id: string;
    verified: boolean;
    role: string;
    first_name: string;
    last_name: string;
    quiz_finished: boolean;
    chat_tokens: number;
    chat_tokens_refreshed_at: Date;
    avatar: string;
}

export interface UserHealthAttributions {
    user_id: string;
    gender?: string;
    age?: number;
    weight?: number;
    weight_unit?: string;
    height?: number;
    height_unit?: string;
    alcohol?: string;
    smoking?: string;
    health_goal?: string[];
    professional_help?: string[];
    medication_treatment?: string;
    medical_treatments?: string[];
    surgery_before?: string[];
    chronic_illness?: string[];
    allergies?: string[];
    practice_sports?: string[];
    stress_level?: number;
    summary_message?: string;
    created_at: Date;
}

export interface UserInfoPayload extends UserAttributions {
    user_id: string;
    email: string;
    health: UserHealthAttributions;
}

export const users: User[] = [];
