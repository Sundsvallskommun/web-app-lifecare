import '@styles/tailwind.scss';
import AppLayout from '@layouts/app/app-layout.component';
import { ReactNode, Suspense } from 'react';
import i18nConfig from './i18nConfig';
import LoaderFullScreen from '@components/loader/loader-fullscreen';

const RootLayout = ({ children }: { children: ReactNode }) => (
  <html lang={i18nConfig.defaultLocale}>
    <body>
      <Suspense fallback={<LoaderFullScreen />}>
        <AppLayout>{children}</AppLayout>
      </Suspense>
    </body>
  </html>
);

export default RootLayout;
