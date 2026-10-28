import LogoutContent from '@components/auth/logout-content.component';
import React from 'react';
import { Metadata } from 'next';

export const metadata: Metadata = { title: 'Kontohantering.sundsvall.se - Logga ut' };

const Logout: React.FC = () => {
  return <LogoutContent />;
};

export default Logout;
