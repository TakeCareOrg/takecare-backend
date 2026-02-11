import { Router } from "express";
import controller from "@controllers/admin";
import { authenticateJWT } from "@middlewares/authMiddleware";
import { isAdminMiddlware } from "@middlewares/adminMiddleware";

const router = Router();

// POST -> /admin/login
router.post("/login", controller.loginAdmin);

// GET -> /admin/me
router.get("/me", authenticateJWT, isAdminMiddlware, controller.me);

//GET -> /admin/users
router.get("/users", authenticateJWT, isAdminMiddlware, controller.getUsers);

// GET -> /admin/user/health/:userId
router.get(
    "/user/health/:userId",
    authenticateJWT,
    isAdminMiddlware,
    controller.getHealthData,
);

// PUT -> /admin/users/:userId
router.put(
    "/users/:userId",
    authenticateJWT,
    isAdminMiddlware,
    controller.editUser,
);

export default router;
