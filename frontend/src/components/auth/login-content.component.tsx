'use client';

import { useEffect, useRef } from 'react';
import { Button } from '@sk-web-gui/react';
import EmptyLayout from '@layouts/empty-layout/empty-layout.component';

export default function LoginContent() {
  const initialFocus = useRef<HTMLButtonElement>(null);
  const setInitialFocus = () => {
    setTimeout(() => {
      if (initialFocus.current) {
        initialFocus.current.focus();
      }
    });
  };

  const onLogin = () => {
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign(`${process.env.NEXT_PUBLIC_API_URL}/saml/login`);
  };

  useEffect(() => {
    setInitialFocus();
  }, []);

  return (
    <>
      <EmptyLayout>
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
                ref={initialFocus}
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
