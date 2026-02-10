import { z } from "zod";

export const registerSchema = z.object({
    email: z.email("Invalid email address"),
    password: z
        .string()
        .min(6, "Password must be at least 6 characters")
        .max(64, "Password must be at most 64 characters"),
});

export const loginSchema = z.object({
    email: z.email("Invalid email address"),
    password: z.string().min(1, "Password is required"),
});

export const verifyEmailSchema = z.object({
    code: z
        .string()
        .length(6, "Verification code must be 6 digits")
        .regex(/^\d{6}$/, "Verification code must be numeric"),
});

export const forgotPasswordSchema = z.object({
    email: z.email("Invalid email address"),
});

export const verifyResetCodeSchema = z.object({
    email: z.email("Invalid email address"),
    code: z
        .string()
        .length(6, "Reset code must be 6 digits")
        .regex(/^\d{6}$/, "Reset code must be numeric"),
});

export const resetPasswordSchema = z.object({
    password: z
        .string()
        .min(6, "Password must be at least 6 characters")
        .max(64, "Password must be at most 64 characters"),
});
