import axios from 'axios';
import Router from 'next/router';
import { apiURL } from '@utils/api-url';

export interface Data {
  error?: string;
}

export interface ApiResponse<T> {
  data: T;
  message: string;
  status: number;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
let isChangingRoute = false;
let isRedirectingToLogin = false;

Router.events.on('routeChangeStart', () => {
  isChangingRoute = true;
});

Router.events.on('routeChangeComplete', (route) => {
  isRedirectingToLogin = false;
  isChangingRoute = false;
  if (route === '/login') {
    isRedirectingToLogin = false;
  }
});

export const handleError = (error) => {
  if (error.response.status === 401 && Router.pathname !== '/login' && !isRedirectingToLogin) {
    isRedirectingToLogin = true;
    Router.push('/login');
  }

  throw error;
};

const defaultOptions = {
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const get = <T>(url: string, options?: { [key: string]: any }) =>
  axios.get<T>(apiURL(url), { ...defaultOptions, ...options }).catch(handleError);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const post = <T>(url: string, data: any, options?: { [key: string]: any }) => {
  return axios.post<T>(apiURL(url), data, { ...defaultOptions, ...options }).catch(handleError);
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const remove = <T>(url: string, options?: { [key: string]: any }) => {
  return axios.delete<T>(apiURL(url), { ...defaultOptions, ...options }).catch(handleError);
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const patch = <T>(url: string, data: any, options?: { [key: string]: any }) => {
  return axios.patch<T>(apiURL(url), data, { ...defaultOptions, ...options }).catch(handleError);
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const put = <T>(url: string, data: any, options?: { [key: string]: any }) => {
  return axios.put<T>(apiURL(url), data, { ...defaultOptions, ...options }).catch(handleError);
};

export const apiService = { get, post, put, patch, delete: remove };
