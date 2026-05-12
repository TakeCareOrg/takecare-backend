import express from "express";
import dotenv from "dotenv";
import morganMiddleware from "@middlewares/morganMiddleware";
import cors from "cors";
import helmet from "helmet";
import swaggerUi from "swagger-ui-express";
import middleware from "i18next-http-middleware";
import i18next from "@config/i18n";

// Import the routes
import adminRouter from "@routes/adminRouter";
import authRouter from "@routes/authRouter";
import chatRouter from "@routes/chatRouter";
import indexRouter from "@routes/index";
import metricsRouter from "@routes/metricsRouter";
import quizDataRouter from "@routes/quizRouter";
import userRouter from "@routes/userRouter";
import gamificationRouter from "@routes/gamificationRouter";

import swaggerDocs from "@config/swagger";
import promBundle from "express-prom-bundle";
import { auditMiddleware } from "@middlewares/auditMiddleware";

dotenv.config();
const app = express();

const metricsMiddleware = promBundle({
    includeMethod: true,
    includePath: true,
    normalizePath: (req) => req.route?.path ?? "No",
    buckets: [
        0.001, 0.01, 0.1, 1, 2, 3, 5, 7, 10, 15, 20, 25, 30, 35, 40, 50, 70,
        100, 200,
    ],
});

app.use(metricsMiddleware);
// parse application/json
app.use(express.json());
// parse application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: true }));
// Use Helmet to secure Express app by setting various HTTP headers
app.use(helmet());
// Enable CORS with various options
app.use(
    cors({
        origin: "http://localhost:5173",
        credentials: true,
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
        allowedHeaders: ["Content-Type", "Authorization"],
    }),
);
// Use Morgan middleware for logging requests
app.use(morganMiddleware);
// Audit middleware — logs authenticated user actions to MongoDB
app.use(auditMiddleware);
// Add translations to back-end
app.use(middleware.handle(i18next));

// Tell the app to use the routes
app.use("/", indexRouter);
app.use("/auth", authRouter);
app.use("/admin", adminRouter);
app.use("/users", userRouter);
app.use("/chat", chatRouter);
app.use("/quiz", quizDataRouter);
app.use("/gamification", gamificationRouter);
app.use("/metrics", metricsRouter);

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocs));

export { app };
