'use client';

import { useUserStore } from '@services/user-service/user-service';
import { useEffect, useState } from 'react';
import { useAppContext } from '@contexts/app.context';
import { usePathname, useRouter } from 'next/navigation';
import LoaderFullScreen from '@components/loader/loader-fullscreen';

export const LoginGuard: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const { setDefaults } = useAppContext();
  const { user, getMe, reset: resetUser } = useUserStore();
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  const logout = () => {
    setDefaults();
    resetUser();
    localStorage.clear();
  };

  useEffect(() => {
    const checkAuth = async () => {
      const res = await getMe();
      if (res.error) {
        logout();
        router.push(`/login?failMessage=${encodeURIComponent(res.message ?? '')}`);
      }
    };
    setMounted(true);
    checkAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!mounted || (!user.name && pathname !== '/login')) {
    return <LoaderFullScreen />;
  }

  return <>{children}</>;
};

export default LoginGuard;
