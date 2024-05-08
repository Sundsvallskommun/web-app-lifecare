import { useEffect, useRef } from 'react';
import EmptyLayout from '../layouts/empty-layout/empty-layout.component';
import { useRouter } from 'next/router';
import { Button } from '@sk-web-gui/react';

export default function Start() {
  const router = useRouter();

  const initalFocus = useRef(null);
  const setInitalFocus = () => {
    setTimeout(() => {
      initalFocus.current && initalFocus.current.focus();
    });
  };

  const onLogin = () => {
    // NOTE: send user to login with SSO
    router.push(`${process.env.NEXT_PUBLIC_API_URL}/saml/login`);
  };

  useEffect(() => {
    setInitalFocus();
  }, []);

  return (
    <>
      <EmptyLayout title="Kontohantering.sundsvall.se - Logga In">
        <main>
          <div className="flex items-center justify-center min-h-screen">
            <div className="max-w-5xl w-full flex flex-col bg-white p-20 shadow-lg text-left">
              <div className="mb-14">
                <h1 className="mb-10 text-xl">Kontohantering.sundsvall.se</h1>
                <p className="my-0">Hantering av LOV användare till Lifecare</p>
              </div>

              <Button
                variant="primary"
                color="vattjom"
                onClick={() => onLogin()}
                ref={initalFocus}
                data-cy="loginButton"
              >
                Logga in
              </Button>
            </div>
          </div>
        </main>
      </EmptyLayout>
    </>
  );
}
