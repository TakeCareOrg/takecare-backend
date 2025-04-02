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
import { initMailTransport } from "@services/mail";
import swaggerDocs from "@config/swagger";

dotenv.config();
const app = express();

// Connect to the database
connectToMongoDB(process.env.TAKECARE_DATABASE_URL);
initMailTransport();

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

// Tell the app to use the routes
app.use("/", indexRouter);
app.use("/auth", authRouter);
app.use("/users", userRouter);
app.use("/chat", chatRouter);

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocs));

export { app };
