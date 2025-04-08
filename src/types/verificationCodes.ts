export type VerificationCode = {
    user_id: string;
    code: string;
    is_reset: boolean;
    created_at: Date;
};
