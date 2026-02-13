import i18next, { TFunction } from "i18next";
import Backend from "i18next-fs-backend";
import path from "path";

let isInitialized = false;

export const initI18nForTests = async (): Promise<TFunction> => {
    if (isInitialized) {
        return i18next.t;
    }

    const localesPath = path.join(
        process.cwd(),
        "src/i18n/locales/{{lng}}.json",
    );

    await i18next.use(Backend).init({
        lng: "fr-FR",
        fallbackLng: "fr-FR",
        supportedLngs: ["fr-FR", "en-US"],
        backend: {
            loadPath: localesPath,
        },
        interpolation: {
            escapeValue: false,
        },
        debug: false,
    });

    isInitialized = true;
    return i18next.t;
};

export const t: TFunction = i18next.t.bind(i18next);
