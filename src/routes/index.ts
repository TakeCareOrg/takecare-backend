import { Request, Response, Router } from "express";

const router = Router();

/**
 * @swagger
 * /:
 *  get:
 *    description: This should return the main page
 *    responses:
 *      '200':
 *        description: A successful response
 */

router.get("/", (req: Request, res: Response) => {
    res.send("Welcome to TakeCare Beta API");
});

export default router;
