import LoaderFullScreen from '@components/loader/loader-fullscreen';
import { useRouter } from 'next/router';
import { useEffect } from 'react';

export default function Index() {
  const router = useRouter();
  useEffect(() => {
    router.push('/kontohantering');
  }, []);
  return <LoaderFullScreen />;
}
