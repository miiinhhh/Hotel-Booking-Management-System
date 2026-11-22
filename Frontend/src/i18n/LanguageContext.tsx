import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { vi } from './locales/vi';
import { en } from './locales/en';

/** Ngôn ngữ hỗ trợ. Thêm ngôn ngữ mới: tạo file locales/<code>.ts rồi khai báo ở đây. */
export const LANGUAGES = [
  { code: 'vi', label: 'Tiếng Việt', locale: 'vi-VN' },
  { code: 'en', label: 'English', locale: 'en-US' },
] as const;

export type Language = (typeof LANGUAGES)[number]['code'];
export type TranslationKey = keyof typeof vi;
type Dictionary = Partial<Record<TranslationKey, string>>;

const DICTIONARIES: Record<Language, Dictionary> = { vi, en };
const STORAGE_KEY = 'stayluxe.language';

const readStored = (): Language => {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    if (value && LANGUAGES.some(l => l.code === value)) return value as Language;
  } catch { /* trình duyệt chặn storage → dùng mặc định */ }
  return 'vi';
};

interface LanguageContextValue {
  language: Language;
  /** Mã locale cho Intl (định dạng ngày, số). */
  locale: string;
  setLanguage: (language: Language) => void;
  /** Dịch theo khóa; `{name}` trong câu được thay bằng vars.name. Thiếu bản dịch → dùng tiếng Việt. */
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(readStored);

  const setLanguage = useCallback((next: Language) => {
    setLanguageState(next);
    try { localStorage.setItem(STORAGE_KEY, next); } catch { /* bỏ qua */ }
  }, []);

  useEffect(() => { document.documentElement.lang = language; }, [language]);

  const value = useMemo<LanguageContextValue>(() => {
    const dict = DICTIONARIES[language];
    const locale = LANGUAGES.find(l => l.code === language)?.locale ?? 'vi-VN';
    const t = (key: TranslationKey, vars?: Record<string, string | number>) => {
      let text = dict[key] ?? vi[key] ?? key;
      if (vars) for (const [name, v] of Object.entries(vars)) text = text.split(`{${name}}`).join(String(v));
      return text;
    };
    return { language, locale, setLanguage, t };
  }, [language, setLanguage]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLanguage = (): LanguageContextValue => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage phải nằm trong LanguageProvider');
  return ctx;
};

/** Khóa nhãn đánh giá theo điểm (thang 5). */
export const ratingLabelKey = (score: number): TranslationKey =>
  !score ? 'rating.none' : score >= 4.5 ? 'rating.excellent' : score >= 4 ? 'rating.veryGood' : score >= 3 ? 'rating.good' : 'rating.average';

/** Định dạng tiền VNĐ theo ngôn ngữ đang chọn (tiền tệ luôn là ₫, không quy đổi). */
export const formatMoney = (amount: number, locale: string) => `${Math.round(amount).toLocaleString(locale)} ₫`;
