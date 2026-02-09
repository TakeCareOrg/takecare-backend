import { USER_DATA_UPDATES_TYPES } from "@constants/data-updates";

export interface User extends UserAttributions {
    user_id: string;
    email: string;
    appleId?: string;
    social_conn?: string;
    password: string;
    created_at: Date;
}

export interface UserAttributions {
    verified: boolean;
    role?: "user" | "admin";
    first_name: string;
    last_name: string;
    quiz_finished?: boolean;
    chat_tokens: number;
    chat_tokens_refreshed_at?: Date;
    avatar?: string;
}

export interface UserHealthAttributions {
    user_id: string;
    gender?: "male" | "female" | "other";
    birth_date?: Date;
    weight?: number;
    weight_unit?: "kg" | "lbs";
    height?: number;
    height_unit?: "cm" | "ft";
    alcohol?: "never" | "occasionally" | "cautiously" | "sometimes" | "often";
    smoking?: "never" | "occasionally" | "cautiously" | "sometimes" | "often";
    health_goal?: (
        | "stress_reduction"
        | "feel_better"
        | "health_improvement"
        | "physical_activity"
        | "sleep_quality"
        | "health_advices"
    )[];
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
    updated_at?: Date;
}

export interface UserInfoPayload extends UserAttributions {
    user_id: string;
    email: string;
    health: UserHealthAttributions;
}

export interface UserComplete extends User {
    health: UserHealthAttributions;
}

export interface UserUpdates {
    user_id: string;
    type: (typeof USER_DATA_UPDATES_TYPES)[number];
    updated_at: Date;
}
