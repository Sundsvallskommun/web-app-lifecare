import LoginContent from '@components/auth/login-content.component';
import React from 'react';
import { Metadata } from 'next';

export const metadata: Metadata = { title: 'Kontohantering.sundsvall.se - Logga in' };

const Login: React.FC = () => {
  return <LoginContent />;
};

export default Login;
