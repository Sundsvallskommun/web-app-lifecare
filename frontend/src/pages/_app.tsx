import { defaultTheme, GuiProvider, extendTheme } from '@sk-web-gui/react';
import { useMemo, useState } from 'react';
import '@styles/tailwind.scss';
import { AppWrapper } from '../contexts/app.context';
import dayjs from 'dayjs';
import 'dayjs/locale/sv';
import utc from 'dayjs/plugin/utc';
import updateLocale from 'dayjs/plugin/updateLocale';
import LoginGuard from '@components/login-guard/login-guard';

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

function MyApp({ Component, pageProps }) {
  const [colorScheme] = useState('light');

  const theme = useMemo(
    () =>
      extendTheme({
        cursor: colorScheme === 'light' ? 'pointer' : 'default',
        colorSchemes: defaultTheme.colorSchemes,
      }),
    [colorScheme]
  );

  return (
    <GuiProvider theme={theme} colorScheme={colorScheme}>
      <AppWrapper>
        <LoginGuard>
          <Component {...pageProps} />
        </LoginGuard>
      </AppWrapper>
    </GuiProvider>
  );
}

export default MyApp;
