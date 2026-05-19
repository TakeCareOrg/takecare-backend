import { z } from "zod";
import { WITHINGS_SUBSCRIBED_APPLIS } from "@constants/withings";

/**
 * Validators for Withings-facing surfaces. Three flavours:
 *
 *   1. `withingsWebhookSchema` — parses the unsigned form-urlencoded body
 *      Withings POSTs to `/withings/webhook`. Withings sends numeric
 *      strings; we coerce + sanity-bound here so downstream code can deal
 *      with pre-validated numbers.
 *
 *   2. `withingsDataQuerySchema` — `?start&end&types=...` on the read
 *      endpoint the mobile app hits. ISO datetime strings, optional
 *      type filter.
 *
 *   3. `withingsCallbackQuerySchema` — `?code&state` Withings appends
 *      when redirecting after authorisation. State is our own signed
 *      JWT, validated separately by `oauth.ts`.
 */

const MAX_WINDOW_DAYS = 7;
const MAX_WINDOW_SECONDS = MAX_WINDOW_DAYS * 24 * 60 * 60;

export const withingsWebhookSchema = z
    .object({
        userid: z.string().min(1).regex(/^\d+$/, "userid must be numeric"),
        appli: z
            .union([z.string(), z.number()])
            .transform((v) => Number(v))
            .refine(
                (n) =>
                    Number.isInteger(n) &&
                    WITHINGS_SUBSCRIBED_APPLIS.includes(n),
                {
                    message: "appli is not one of the subscribed types",
                },
            ),
        startdate: z
            .union([z.string(), z.number()])
            .transform((v) => Number(v))
            .refine((n) => Number.isFinite(n) && n > 0, {
                message: "startdate must be a positive unix timestamp",
            }),
        enddate: z
            .union([z.string(), z.number()])
            .transform((v) => Number(v))
            .refine((n) => Number.isFinite(n) && n > 0, {
                message: "enddate must be a positive unix timestamp",
            }),
    })
    .refine((data) => data.enddate >= data.startdate, {
        message: "enddate must be >= startdate",
        path: ["enddate"],
    })
    .refine((data) => data.enddate - data.startdate <= MAX_WINDOW_SECONDS, {
        // Defends against bogus webhooks claiming a year-wide window
        // (which would make our follow-up fetch ridiculously expensive).
        message: `window must not exceed ${MAX_WINDOW_DAYS} days`,
        path: ["enddate"],
    })
    .refine((data) => data.enddate <= Math.floor(Date.now() / 1000) + 86400, {
        // Allow a 1-day fudge for clock skew but reject obvious nonsense.
        message: "enddate must not be far in the future",
        path: ["enddate"],
    });

export const withingsDataQuerySchema = z.object({
    start: z.iso.datetime(),
    end: z.iso.datetime(),
    /**
     * Optional CSV filter — e.g. `?types=hr,steps`. Empty/missing means
     * "all types".
     */
    types: z.string().optional(),
});

export const withingsCallbackQuerySchema = z.object({
    code: z.string().min(1),
    state: z.string().min(1),
    /** Withings sometimes appends this on errors. */
    error: z.string().optional(),
});

export type WithingsWebhookInput = z.infer<typeof withingsWebhookSchema>;
export type WithingsDataQuery = z.infer<typeof withingsDataQuerySchema>;
export type WithingsCallbackQuery = z.infer<typeof withingsCallbackQuerySchema>;
