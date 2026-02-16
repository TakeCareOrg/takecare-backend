import i18next from "i18next";
import middleware from "i18next-http-middleware";
import path from "path";
import fs from "fs";

const localesDir = path.join(process.cwd(), "src/i18n/locales");

const frTranslations = JSON.parse(
    fs.readFileSync(path.join(localesDir, "fr-FR.json"), "utf-8"),
);
const enTranslations = JSON.parse(
    fs.readFileSync(path.join(localesDir, "en-US.json"), "utf-8"),
);

i18next.use(middleware.LanguageDetector).init({
    fallbackLng: "fr",
    supportedLngs: ["fr", "en"],
    resources: {
        fr: { translation: frTranslations },
        en: { translation: enTranslations },
    },
    detection: {
        order: ["header", "querystring"],
        lookupHeader: "accept-language",
        caches: false,
    },
    interpolation: {
        escapeValue: false,
    },
    ns: ["translation"],
    defaultNS: "translation",
});

export default i18next;
