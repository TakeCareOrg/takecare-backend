import express from "express";
import dotenv from "dotenv";
import morganMiddleware from "@middlewares/morganMiddleware";
import swaggerUi from "swagger-ui-express";
import helmet from "helmet";
import cors from "cors";
import connectToMongoDB from "@database/connect";

// Import the routes
import indexRouter from "@routes/index";
import authRouter from "@routes/authRouter";
import userRouter from "@routes/userRouter";
import chatRouter from "@routes/chatRouter";
import quizDataRouter from "@routes/quizRouter";
import metricsRouter from "@routes/metricsRouter";
import bodyParser from "body-parser";

import { initMailTransport } from "@services/mail";
import swaggerDocs from "@config/swagger";
import promBundle from "express-prom-bundle";

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

// Connect to the database
connectToMongoDB(process.env.TAKECARE_DATABASE_URL);
initMailTransport();

app.use(metricsMiddleware);
// parse application/json
app.use(express.json());
// parse application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: true }));
// Use Helmet to secure Express app by setting various HTTP headers
app.use(helmet());
// Enable CORS with various options
app.use(cors());
// Use Morgan middleware for logging requests
app.use(morganMiddleware);

// Body parser middleware to handle larger payloads (e.g., vocal messages)
app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));

// Tell the app to use the routes
app.use("/", indexRouter);
app.use("/auth", authRouter);
app.use("/users", userRouter);
app.use("/chat", chatRouter);
app.use("/quiz-data", quizDataRouter);
app.use("/metrics", metricsRouter);

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocs));

console.log("print ddd");

export { app };
