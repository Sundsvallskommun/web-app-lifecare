import React, { useState, createContext, ReactNode } from 'react';

interface ModalContextType {
  isModalOpen: boolean;
  setModalOpen: (isOpen: boolean) => void;
}

interface ModalProviderProps {
  children: ReactNode;
}

// Provide a default value for the context
export const ModalContext = createContext<ModalContextType>({
  isModalOpen: false,
  setModalOpen: () => console.warn('No modal provider'),
});

export const ModalProvider: React.FC<ModalProviderProps> = ({ children }) => {
  const [isModalOpen, setModalOpen] = useState(false);

  return <ModalContext.Provider value={{ isModalOpen, setModalOpen }}>{children}</ModalContext.Provider>;
};
