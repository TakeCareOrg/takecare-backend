import { Router } from "express";
import controller from "@controllers/withings";
import { authenticateJWT } from "@middlewares/authMiddleware";

/**
 * Withings integration routes.
 *
 *   Authenticated (JWT):
 *     GET    /withings/status
 *     POST   /withings/oauth/init
 *     GET    /withings/data
 *     DELETE /withings/disconnect
 *
 *   Public:
 *     GET    /withings/oauth/callback   ← Withings 302s here
 *     POST   /withings/webhook          ← Withings NotifyAPI POSTs here
 *     HEAD   /withings/webhook          ← Withings verification ping on subscribe
 *
 * The public callback embeds a signed `state` JWT to recover the local
 * user_id, so we can do the token exchange without forwarding the
 * mobile-app JWT through the OAuth redirect (which we couldn't anyway).
 */

const router = Router();

// Public endpoints — these MUST come before any middleware that
// requires JWT auth, or Withings's callbacks get 401'd.
router.get("/oauth/callback", controller.handleOAuthCallback);
router.post("/webhook", controller.handleWebhook);
// Withings sends a HEAD request to verify the webhook endpoint when
// the subscription is first registered. Respond 200 unconditionally.
router.head("/webhook", (_req, res) => {
    res.status(200).end();
});

// Authenticated endpoints
router.get("/status", authenticateJWT, controller.getStatus);
router.post("/oauth/init", authenticateJWT, controller.initConnect);
router.get("/data", authenticateJWT, controller.getData);
router.delete("/disconnect", authenticateJWT, controller.disconnect);

export default router;
