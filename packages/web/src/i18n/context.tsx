import { createContext, useContext, useState, ReactNode, useMemo, useCallback } from 'react';
import { de as dateFnsDe } from 'date-fns/locale';
import { enUS as dateFnsEn } from 'date-fns/locale';
import enTranslations from './locales/en.yaml';
import deTranslations from './locales/de.yaml';
import type { Locale, LocaleContextType, TranslationFunction } from './types';
import { interpolate, getNestedValue } from './utils';

const STORAGE_KEY = 'recury-locale';
const DEFAULT_LOCALE: Locale = (import.meta.env.VITE_DEFAULT_LOCALE as Locale) || 'en';

const translations: Record<Locale, Record<string, unknown>> = {
  en: enTranslations,
  de: deTranslations,
};

const dateFnsLocales = {
  en: dateFnsEn,
  de: dateFnsDe,
};

const LocaleContext = createContext<LocaleContextType | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && (saved === 'en' || saved === 'de')) {
      return saved;
    }
    return DEFAULT_LOCALE;
  });

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem(STORAGE_KEY, newLocale);
  }, []);

  const t: TranslationFunction = useMemo(() => {
    return (key: string, params?: Record<string, string | number>): string => {
      const currentTranslations = translations[locale];
      let value = getNestedValue(currentTranslations, key);

      if (params?.count !== undefined && typeof params.count === 'number') {
        const pluralKey = params.count === 1 ? key : `${key}_plural`;
        const pluralValue = getNestedValue(currentTranslations, pluralKey);
        if (pluralValue) {
          value = pluralValue;
        }
      }

      if (typeof value !== 'string') {
        console.warn(`Translation missing: ${key}`);
        return key;
      }

      return params ? interpolate(value, params) : value;
    };
  }, [locale]);

  const dateFnsLocale = dateFnsLocales[locale];

  const contextValue = useMemo(
    () => ({ locale, setLocale, t, dateFnsLocale }),
    [locale, setLocale, t, dateFnsLocale]
  );

  return (
    <LocaleContext.Provider value={contextValue}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error('useLocale must be used within a LocaleProvider');
  }
  return context;
}
