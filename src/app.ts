import express from "express";
import dotenv from "dotenv";
import morganMiddleware from "./middlewares/morganMiddleware";
import indexRouter from "./routes";
import swaggerJSDoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import helmet from "helmet";
import cors from "cors";

dotenv.config();
const app = express();

// Use Helmet to secure Express app by setting various HTTP headers
app.use(helmet());
// Enable CORS with various options
app.use(cors());
// Use Morgan middleware for logging requests
app.use(morganMiddleware);

// Tell the app to use the routes
app.use("/", indexRouter);

// Swagger
const swaggerOptions = {
    swaggerDefinition: {
        info: {
            title: "Express API with Swagger",
            version: "1.0.0",
            description: "This is a simple API",
        },
    },
    apis: ["./src/routes/*.ts"],
};

const swaggerDocs = swaggerJSDoc(swaggerOptions);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocs));

export { app };
