import {
    Counter,
    Histogram,
    collectDefaultMetrics,
    Registry,
} from "prom-client";
// const {
//     Counter,
//     Histogram,
//     collectDefaultMetrics,
//     Registry,
// } = require("prom-client");

const register = new Registry();
collectDefaultMetrics({ register });

const quizzCompletedCounter = new Counter({
    name: "quizz_completed_total",
    help: "Number of quizz completed",
});

const quizzDurationHistogram = new Histogram({
    name: "quizz_duration_seconds",
    help: "Quizz duration in seconds",
    buckets: [0.1, 0.5, 1, 2, 5, 10],
});

const userCreatedCounter = new Counter({
    name: "user_created_total",
    help: "Number of user created",
});

const apiResponseDurationHistogram = new Histogram({
    name: "api_response_duration_seconds",
    help: "API response duration in seconds",
    buckets: [0.1, 0.5, 1, 2, 5, 10],
});

const apiRequestCounter = new Counter({
    name: "api_request_total",
    help: "Number of API requests",
});

const apiErrorCounter = new Counter({
    name: "api_error_total",
    help: "Number of API errors",
    labelNames: [],
});

register.registerMetric(quizzCompletedCounter);
register.registerMetric(quizzDurationHistogram);
register.registerMetric(userCreatedCounter);
register.registerMetric(apiResponseDurationHistogram);
register.registerMetric(apiRequestCounter);
register.registerMetric(apiErrorCounter);

export {
    register,
    quizzCompletedCounter,
    quizzDurationHistogram,
    userCreatedCounter,
    apiResponseDurationHistogram,
    apiRequestCounter,
    apiErrorCounter,
};
