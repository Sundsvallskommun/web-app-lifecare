import { ConfirmationDialogContextProvider } from '@sk-web-gui/react';
import { createContext, useContext, useState } from 'react';

export interface AppContextInterface {
  isCookieConsentOpen: boolean;
  setIsCookieConsentOpen: (isOpen: boolean) => void;

  setDefaults: () => void;
}

const AppContext = createContext<AppContextInterface>(null);

export function AppWrapper({ children }) {
  const contextDefaults = {
    isCookieConsentOpen: true,
  };
  const setDefaults = () => {
    setIsCookieConsentOpen(contextDefaults.isCookieConsentOpen);
  };
  const [isCookieConsentOpen, setIsCookieConsentOpen] = useState(true);

  return (
    <ConfirmationDialogContextProvider>
      <AppContext.Provider
        value={{
          isCookieConsentOpen,
          setIsCookieConsentOpen: (isOpen: boolean) => setIsCookieConsentOpen(isOpen),

          setDefaults,
        }}
      >
        {children}
      </AppContext.Provider>
    </ConfirmationDialogContextProvider>
  );
}

export function useAppContext() {
  return useContext(AppContext);
}
