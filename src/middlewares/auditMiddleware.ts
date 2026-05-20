import { Request, Response, NextFunction } from "express";
import { AuditLogDB } from "@database/models/auditLog";
import Logger from "@libs/logger";

export const auditMiddleware = (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    const startTime = Date.now();

    res.on("finish", () => {
        if (!req.user) return;

        const durationMs = Date.now() - startTime;

        Logger.info(
            `[AUDIT] userId=${req.user.user_id} ${req.method} ${req.originalUrl} ${res.statusCode} ${durationMs}ms`,
        );

        AuditLogDB.create({
            userId: req.user.user_id,
            method: req.method,
            route: req.originalUrl,
            statusCode: res.statusCode,
            ip: req.ip ?? "",
            userAgent: req.headers["user-agent"] ?? "",
            durationMs,
            timestamp: new Date(),
        }).catch((err) => {
            Logger.error(`Failed to save audit log: ${err}`);
        });
    });

    next();
};
