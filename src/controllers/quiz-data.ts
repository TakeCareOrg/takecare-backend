import { RequestMiddleware } from "@dtypes/express";
import Logger from "@libs/logger";
import { getFile } from "@utils/files";
import path from "path";

export const getQuizData: RequestMiddleware = async (req, res) => {
    const user = req.user;

    if (!user) {
        res.status(403).json({ message: "UNAUTHORIZED" });
        return;
    }

    if (!req.params.type) {
        res.status(400).json({ message: "MISSING_DATA_FILE_TYPE" });
        return;
    }

    try {
        const file = await getFile(
            path.join(__dirname, `../data/quiz/${req.params.type}.json`),
        );

        if (!file) {
            res.status(500).json({ message: "FILE_NOT_FOUND" });
            return;
        }

        const data = JSON.parse(file.toString())[`${req.query.lang ?? "en"}`];

        res.status(200).json({ [`${req.params.type}`]: data });
    } catch (error) {
        Logger.error(`Error reading ${req.params.type} data: ${error}`);
        throw new Error(`Error reading ${req.params.type} data: ${error}`);
    }
};

export default { getQuizData };
