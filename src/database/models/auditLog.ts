import mongoose, { Schema, Document } from "mongoose";

export interface IAuditLog extends Document {
    userId: string;
    method: string;
    route: string;
    statusCode: number;
    ip: string;
    userAgent: string;
    durationMs: number;
    timestamp: Date;
}

const AuditLogSchema = new Schema<IAuditLog>({
    userId: { type: String, required: true, index: true },
    method: { type: String, required: true },
    route: { type: String, required: true },
    statusCode: { type: Number, required: true },
    ip: { type: String, default: "" },
    userAgent: { type: String, default: "" },
    durationMs: { type: Number, required: true },
    timestamp: { type: Date, default: Date.now },
});

// TTL index: auto-delete after 90 days
AuditLogSchema.index(
    { timestamp: 1 },
    { expireAfterSeconds: 60 * 60 * 24 * 90 },
);

export const AuditLogDB = mongoose.model<IAuditLog>("AuditLog", AuditLogSchema);
