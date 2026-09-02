import { ReactNode } from 'react';
import i18nConfig from '../i18nConfig';

export const generateStaticParams = () => i18nConfig.locales.map((locale) => ({ locale }));
export const dynamicParams = false;

export default function LocaleLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <>{children}</>;
}
