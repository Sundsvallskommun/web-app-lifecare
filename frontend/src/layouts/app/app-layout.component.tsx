'use client';

import { defaultTheme, GuiProvider, extendTheme } from '@sk-web-gui/react';
import { AppWrapper } from '@contexts/app.context';
import { ModalProvider } from '@contexts/modalContext';
import LoginGuard from '@components/login-guard/login-guard';
import dayjs from 'dayjs';
import 'dayjs/locale/sv';
import utc from 'dayjs/plugin/utc';
import updateLocale from 'dayjs/plugin/updateLocale';
import { ReactNode, useMemo, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { registerNavigator } from '@services/api-service';

dayjs.extend(utc);
dayjs.locale('sv');
dayjs.extend(updateLocale);
dayjs.updateLocale('sv', {
  months: [
    'Januari',
    'Februari',
    'Mars',
    'April',
    'Maj',
    'Juni',
    'Juli',
    'Augusti',
    'September',
    'Oktober',
    'November',
    'December',
  ],
  monthsShort: ['Jan', 'Feb', 'Mar', 'Apr', 'Maj', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec'],
});

export default function AppLayout({ children }: Readonly<{ children: ReactNode }>) {
  const router = useRouter();
  const [colorScheme] = useState('light');

  const theme = useMemo(
    () =>
      extendTheme({ cursor: colorScheme === 'light' ? 'pointer' : 'default', colorSchemes: defaultTheme.colorSchemes }),
    [colorScheme]
  );

  useEffect(() => {
    registerNavigator((path) => router.push(path));
  }, [router]);

  return (
    <GuiProvider theme={theme}>
      <ModalProvider>
        <AppWrapper>
          <LoginGuard>{children}</LoginGuard>
        </AppWrapper>
      </ModalProvider>
    </GuiProvider>
  );
}
