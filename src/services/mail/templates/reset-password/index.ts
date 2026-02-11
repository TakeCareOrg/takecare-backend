import Logger from "@libs/logger";
import { sendMail } from "@services/mail";
import path from "path";
import fs from "fs";

type ResetPasswordEmail = {
    code: string;
    to: string;
};

const HTML_TEMPLATE_PATH = path.join(__dirname, "reset_password.html");
const HTML_TEMPLATE = fs.readFileSync(HTML_TEMPLATE_PATH, "utf-8");

async function sendResetPasswordEmail(data: ResetPasswordEmail) {
    try {
        const html = HTML_TEMPLATE.replace("{{resetCode}}", data.code);

        await sendMail({
            to: data.to,
            subject: "Reset Your Password",
            html,
        });
    } catch (error) {
        Logger.error(`Error sending reset password email: ${error}`);
        throw new Error("ERROR_SENDING_RESET_PASSWORD_EMAIL");
    }
}

export default sendResetPasswordEmail;
