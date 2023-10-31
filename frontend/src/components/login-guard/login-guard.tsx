import { useUserStore } from '@services/user-service/user-service';
import { useEffect, useState } from 'react';
import { useAppContext } from '@contexts/app.context';
import { useRouter } from 'next/router';
import LoaderFullScreen from '@components/loader/loader-fullscreen';

export const LoginGuard: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const { setDefaults } = useAppContext();
  const { user, getMe, reset: resetUser } = useUserStore();
  const router = useRouter();
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
        router.push(
          {
            pathname: '/login',
            query: {
              failMessage: res.message,
            },
          },
          '/login'
        );
      }
    };
    setMounted(true);
    checkAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!mounted || (!user.name && router.pathname !== '/login')) {
    return <LoaderFullScreen />;
  }

  return <>{children}</>;
};

export default LoginGuard;
