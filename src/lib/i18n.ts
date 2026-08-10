import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import enTranslations from "../locales/en.json";
import arTranslations from "../locales/ar.json";
import frTranslations from "../locales/fr.json"; // 1. استيراد ملف الفرنسية

const isBrowser = typeof window !== "undefined";

const en = (enTranslations as Record<string, unknown>).default ?? enTranslations;
const ar = (arTranslations as Record<string, unknown>).default ?? arTranslations;
const fr = (frTranslations as Record<string, unknown>).default ?? frTranslations; // 2. تهيئة الفرنسية

const getSavedLanguage = (): string => {
  if (isBrowser) {
    try {
      const saved = localStorage.getItem("app_lang");
      if (saved === "ar" || saved === "en" || saved === "fr") return saved; // 3. السماح بقراءة "fr" من التخزين
    } catch {
      // ignore storage access errors
    }
  }
  return "en";
};

const initialLang = getSavedLanguage();

if (!i18n.isInitialized) {
  i18n
    .use(initReactI18next)
    .init({
      resources: {
        en: { translation: en as Record<string, unknown> },
        ar: { translation: ar as Record<string, unknown> },
        fr: { translation: fr as Record<string, unknown> }, // 4. إضافتها للموارد
      },
      lng: initialLang,
      fallbackLng: "en",
      supportedLngs: ["en", "ar", "fr"], // 5. تفعيلها ضمن اللغات المدعومة
      interpolation: {
        escapeValue: false,
      },
      react: {
        useSuspense: false,
      },
    });
}

export function applyDocumentDirection(lng: string) {
  if (typeof document !== "undefined") {
    const dir = lng === "ar" ? "rtl" : "ltr";
    document.documentElement.setAttribute("dir", dir);
    document.documentElement.setAttribute("lang", lng);
    try {
      localStorage.setItem("app_lang", lng);
    } catch {
      // ignore
    }
  }
}

if (isBrowser) {
  i18n.on("languageChanged", (lng) => {
    applyDocumentDirection(lng);
  });

  applyDocumentDirection(i18n.language || initialLang);
}

export default i18n;