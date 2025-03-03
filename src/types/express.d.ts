/* eslint-disable @typescript-eslint/no-explicit-any */
import { UserPayload } from "@utils/jwt";
import { NextFunction, Request, Response } from "express";

export type RequestMiddleware = (
    req: Request,
    res: Response,
    next: NextFunction,
) => void | Promise<void> | any;

declare module "express" {
    export interface Request {
        user?: UserPayload;
    }
}

// Extend Express Request type to include user property
declare global {
    namespace Express {
        interface Request {
            user?: UserPayload;
        }
    }
}
