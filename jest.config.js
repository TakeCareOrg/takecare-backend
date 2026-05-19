/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
    preset: "ts-jest",
    testEnvironment: "node",
    transform: {
        "^.+\\.ts$": ["ts-jest", { tsconfig: "tsconfig.jest.json" }],
    },
    moduleNameMapper: {
        "^@middlewares/(.*)$": "<rootDir>/src/middlewares/$1",
        "^@routes/(.*)$": "<rootDir>/src/routes/$1",
        "^@libs/(.*)$": "<rootDir>/src/libs/$1",
        "^@models/(.*)$": "<rootDir>/src/models/$1",
        "^@services/(.*)$": "<rootDir>/src/services/$1",
        "^@dtypes/(.*)$": "<rootDir>/src/types/$1",
        "^@utils/(.*)$": "<rootDir>/src/utils/$1",
        "^@controllers/(.*)$": "<rootDir>/src/controllers/$1",
        "^@database/(.*)$": "<rootDir>/src/database/$1",
        "^@config/(.*)$": "<rootDir>/src/config/$1",
        "^@docs/(.*)$": "<rootDir>/src/docs/$1",
        "^@data/(.*)$": "<rootDir>/src/data/$1",
        "^@constants/(.*)$": "<rootDir>/src/constants/$1",
        "^@validators/(.*)$": "<rootDir>/src/validators/$1",
        "^@jobs/(.*)$": "<rootDir>/src/jobs/$1",
    },
    resolver: "jest-ts-webcompat-resolver",
};
