import { getQuizData } from "../../src/controllers/quiz-data";
import Logger from "../../src/libs/logger";
import * as filesUtils from "../../src/utils/files";
import { Request, Response, NextFunction } from "express";

jest.mock("../../src/libs/logger");
jest.mock("../../src/utils/files");

describe("Quiz Data Controller Tests", () => {
    let req: Partial<Request>;
    let res: Partial<Response>;
    let next: NextFunction;
    let status: jest.Mock;
    let json: jest.Mock;

    beforeEach(() => {
        req = {
            body: {},
            user: undefined,
            params: {},
            query: {},
        };
        status = jest.fn().mockReturnThis();
        json = jest.fn().mockReturnThis();
        res = {
            status,
            json,
        };
        next = jest.fn();
        jest.clearAllMocks();
    });

    describe("getQuizData", () => {
        it("should return quiz data successfully with default language (fr)", async () => {
            const mockQuizData = {
                fr: {
                    questions: [
                        {
                            id: 1,
                            question: "Quel est votre âge?",
                            type: "number",
                        },
                        {
                            id: 2,
                            question: "Quel est votre poids?",
                            type: "number",
                        },
                    ],
                },
            };

            req.user = { user_id: "123" };
            req.params = { type: "health" };
            req.query = {};

            (filesUtils.getFile as jest.Mock).mockResolvedValue(
                Buffer.from(JSON.stringify(mockQuizData)),
            );

            await getQuizData(req as Request, res as Response, next);

            expect(filesUtils.getFile).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                health: mockQuizData.fr,
            });
        });

        it("should return quiz data with specified language", async () => {
            const mockQuizData = {
                en: {
                    questions: [{ id: 1, question: "What is your age?" }],
                },
                fr: {
                    questions: [{ id: 1, question: "Quel est votre âge ?" }],
                },
            };

            req.user = { user_id: "123" };
            req.params = { type: "fitness" };
            req.query = { lang: "en" };

            (filesUtils.getFile as jest.Mock).mockResolvedValue(
                Buffer.from(JSON.stringify(mockQuizData)),
            );

            await getQuizData(req as Request, res as Response, next);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                fitness: mockQuizData.en,
            });
        });

        it("should return 403 when user is not authenticated", async () => {
            req.user = undefined;
            req.params = { type: "health" };

            await getQuizData(req as Request, res as Response, next);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({ message: "UNAUTHORIZED" });
            expect(filesUtils.getFile).not.toHaveBeenCalled();
        });

        it("should return 400 when file type is missing", async () => {
            req.user = { user_id: "123" };
            req.params = {};

            await getQuizData(req as Request, res as Response, next);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                message: "MISSING_DATA_FILE_TYPE",
            });
            expect(filesUtils.getFile).not.toHaveBeenCalled();
        });

        it("should return 400 when file type is empty string", async () => {
            req.user = { user_id: "123" };
            req.params = { type: "" };

            await getQuizData(req as Request, res as Response, next);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                message: "MISSING_DATA_FILE_TYPE",
            });
        });

        it("should return 500 when file is not found", async () => {
            req.user = { user_id: "123" };
            req.params = { type: "nonexistent" };

            (filesUtils.getFile as jest.Mock).mockResolvedValue(null);

            await getQuizData(req as Request, res as Response, next);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                message: "FILE_NOT_FOUND",
            });
        });

        it("should throw error when file reading fails", async () => {
            req.user = { user_id: "123" };
            req.params = { type: "health" };

            const error = new Error("File system error");
            (filesUtils.getFile as jest.Mock).mockRejectedValue(error);

            await expect(
                getQuizData(req as Request, res as Response, next),
            ).rejects.toThrow(
                "Error reading health data: Error: File system error",
            );

            expect(Logger.error).toHaveBeenCalledWith(
                "Error reading health data: Error: File system error",
            );
        });

        it("should throw error when file contains invalid JSON", async () => {
            req.user = { user_id: "123" };
            req.params = { type: "health" };

            (filesUtils.getFile as jest.Mock).mockResolvedValue(
                Buffer.from("invalid json {{{"),
            );

            await expect(
                getQuizData(req as Request, res as Response, next),
            ).rejects.toThrow();

            expect(Logger.error).toHaveBeenCalled();
        });

        it("should return undefined when requested language is not available", async () => {
            const mockQuizData = {
                fr: {
                    questions: [{ id: 1, question: "Question" }],
                },
            };

            req.user = { user_id: "123" };
            req.params = { type: "health" };
            req.query = { lang: "es" };

            (filesUtils.getFile as jest.Mock).mockResolvedValue(
                Buffer.from(JSON.stringify(mockQuizData)),
            );

            await getQuizData(req as Request, res as Response, next);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                health: undefined,
            });
        });

        it("should handle empty file", async () => {
            req.user = { user_id: "123" };
            req.params = { type: "health" };

            (filesUtils.getFile as jest.Mock).mockResolvedValue(
                Buffer.from("{}"),
            );

            await getQuizData(req as Request, res as Response, next);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                health: undefined,
            });
        });

        it("should handle different quiz types", async () => {
            const types = ["health", "fitness", "nutrition", "mental"];

            for (const type of types) {
                const mockData = {
                    fr: {
                        questions: [{ id: 1, question: `${type} question` }],
                    },
                };

                req.user = { user_id: "123" };
                req.params = { type };
                req.query = {};

                (filesUtils.getFile as jest.Mock).mockResolvedValue(
                    Buffer.from(JSON.stringify(mockData)),
                );

                await getQuizData(req as Request, res as Response, next);

                expect(res.json).toHaveBeenCalledWith({
                    [type]: mockData.fr,
                });

                jest.clearAllMocks();
            }
        });

        it("should allow access when user object exists even with null user_id", async () => {
            const mockQuizData = {
                fr: { questions: [{ id: 1, question: "Question" }] },
            };

            req.user = { user_id: null } as never;
            req.params = { type: "health" };

            (filesUtils.getFile as jest.Mock).mockResolvedValue(
                Buffer.from(JSON.stringify(mockQuizData)),
            );

            await getQuizData(req as Request, res as Response, next);

            expect(res.status).toHaveBeenCalledWith(200);
        });

        it("should pass input to getFile without modification", async () => {
            req.user = { user_id: "123" };
            req.params = { type: "../../../etc/passwd" };

            const mockData = {
                fr: { questions: [] },
            };

            (filesUtils.getFile as jest.Mock).mockResolvedValue(
                Buffer.from(JSON.stringify(mockData)),
            );

            await getQuizData(req as Request, res as Response, next);

            expect(filesUtils.getFile).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(200);
        });

        it("should handle large quiz data files", async () => {
            const largeQuizData = {
                fr: {
                    questions: Array.from({ length: 1000 }, (_, i) => ({
                        id: i,
                        question: `Question ${i}`,
                        options: ["A", "B", "C", "D"],
                    })),
                },
            };

            req.user = { user_id: "123" };
            req.params = { type: "comprehensive" };

            (filesUtils.getFile as jest.Mock).mockResolvedValue(
                Buffer.from(JSON.stringify(largeQuizData)),
            );

            await getQuizData(req as Request, res as Response, next);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                comprehensive: largeQuizData.fr,
            });
        });
    });
});
