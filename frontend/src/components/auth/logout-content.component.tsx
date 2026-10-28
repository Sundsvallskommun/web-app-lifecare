'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LogoutContent() {
  const router = useRouter();

  useEffect(() => {
    router.push('/login');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <></>;
}
