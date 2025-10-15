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
                message: "Authentification requise",
            });
            throw new Error("UNAUTHORIZED");
        }

        const user = await UserDB.findOne({ user_id: userId });

        if (!user) {
            throw new Error("AN_ERROR_OCCURRED");
        }

        if (!user.role?.includes("admin")) {
            console.log(user.role);
            res.status(403).json({
                success: false,
                message: "Accès refusé. Privilèges administrateur requis.",
            });
            throw new Error("UNAUTHORIZED");
        }

        next();
    } catch {
        res.status(500).json({
            success: false,
            message: "Erreur lors de la vérification des permissions",
        });
        throw new Error("AN_ERROR_OCCURRED");
    }
};
