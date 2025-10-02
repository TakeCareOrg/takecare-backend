import Logger from "@libs/logger";
import { sendMail } from "@services/mail";
import path from "path";
import fs from "fs";

type EmailVerificationCode = {
    code: string;
    to: string;
};

// const HTML_TEMPLATE_PATH = path.join(
//     __dirname,
//     "email-verification-template.html",
// );
const TEXT_TEMPLATE_PATH = path.join(
    __dirname,
    "email-verification-template.txt",
);

// const HTML_TEMPLATE = fs.readFileSync(HTML_TEMPLATE_PATH, "utf-8");
const TEXT_TEMPLATE = fs.readFileSync(TEXT_TEMPLATE_PATH, "utf-8");

async function sendVericationEmail(data: EmailVerificationCode) {
    try {
        // const html = HTML_TEMPLATE.replace("{{code}}", data.code);
        const text = TEXT_TEMPLATE.replace("{{code}}", data.code);

        await sendMail({
            to: data.to,
            subject: "Email Verification",
            text,
            // html,
        });
    } catch (error) {
        Logger.error(`Error sending verification email: ${error}`);
        throw new Error("ERROR_SENDING_VERIFICATION_EMAIL");
    }
}

export default sendVericationEmail;
