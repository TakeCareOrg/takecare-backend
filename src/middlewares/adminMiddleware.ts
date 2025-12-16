import { UserDB } from "@database/models/user";
import { Request, Response, NextFunction } from "express";

export const isAdminMiddlware = async (
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> => {
    try {
        const userId = req.user?.user_id;

        if (!userId) {
            res.status(401).json({
                success: false,
                message: "Auth Required",
            });
            throw new Error("UNAUTHORIZED");
        }

        const user = await UserDB.findOne({ user_id: userId });

        if (!user) {
            throw new Error("AN_ERROR_OCCURRED");
        }

        if (!user.role?.includes("admin")) {
            res.status(403).json({
                success: false,
                message: "Access refused. Admin only.",
            });
            throw new Error("UNAUTHORIZED");
        }

        next();
    } catch {
        res.status(500).json({
            success: false,
            message: "Error checking admin permissions",
        });
        throw new Error("AN_ERROR_OCCURRED");
    }
};
