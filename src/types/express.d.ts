import { UserPayload } from "@utils/jwt";

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
