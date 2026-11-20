import { HttpException } from '@/exceptions/HttpException';
import { apiURL } from '@/utils/util';
import { User } from '@/interfaces/users.interface';
import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import ApiTokenService from './api-token.service';
import { logger } from '@utils/logger';

class ApiResponse<T> {
  data: T;
  message: string;
}

type SentBy = Pick<User, 'username'>;

const PERSONAL_NUMBER_PATTERN = /\b(\d{6})\d{0,2}-?\d{4}\b/g;
const maskPersonalNumbers = (text: string): string => text.replace(PERSONAL_NUMBER_PATTERN, '$1******');

const MAX_LOGGED_DETAIL_LENGTH = 200;

const describeFailure = (error: unknown): string => {
  if (!axios.isAxiosError(error)) {
    return 'no response';
  }
  if (!error.response) {
    return `no response (${error.code ?? 'unknown'})`;
  }
  const { status, data } = error.response;
  const problem = data && typeof data === 'object' ? (data as { title?: unknown; detail?: unknown }) : {};
  const text = [problem.title, problem.detail].filter(part => typeof part === 'string' && part).join(': ');
  return text ? `${status} ${maskPersonalNumbers(text).slice(0, MAX_LOGGED_DETAIL_LENGTH)}` : `${status}`;
};

class ApiService {
  private apiTokenService = new ApiTokenService();
  private async request<T>(config: AxiosRequestConfig, user?: SentBy): Promise<ApiResponse<T>> {
    const token = await this.apiTokenService.getToken();

    const defaultHeaders = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(user ? { 'X-Sent-By': `type=adAccount; ${user.username}` } : {}),
    };
    const defaultParams = {};

    const preparedConfig: AxiosRequestConfig = {
      ...config,
      headers: { ...defaultHeaders, ...config.headers },
      params: { ...defaultParams, ...config.params },
      url: apiURL(config.url),
    };

    try {
      const res = await axios(preparedConfig);
      return { data: res.data, message: 'success' };
    } catch (error: unknown | AxiosError) {
      const status = axios.isAxiosError(error) ? (error as AxiosError).response?.status : undefined;
      const path = maskPersonalNumbers((config.url ?? '').split('?')[0]);
      const line = `Downstream ${config.method ?? 'request'} ${path} failed: ${describeFailure(error)}`;
      if (status && status < 500) {
        logger.warn(line);
      } else {
        logger.error(line);
      }

      if (status === 404) {
        throw new HttpException(404, 'Not found');
      }

      if (status === 400) {
        throw new HttpException(400, 'Bad request to downstream API');
      }
      // NOTE: did you subscribe to the API called?
      throw new HttpException(500, 'Internal server error from gateway');
    }
  }

  public async get<T>(config: AxiosRequestConfig, user?: SentBy): Promise<ApiResponse<T>> {
    return this.request<T>({ ...config, method: 'GET' }, user);
  }

  public async post<T>(config: AxiosRequestConfig, user?: SentBy): Promise<ApiResponse<T>> {
    return this.request<T>({ ...config, method: 'POST' }, user);
  }

  public async patch<T>(config: AxiosRequestConfig, user?: SentBy): Promise<ApiResponse<T>> {
    return this.request<T>({ ...config, method: 'PATCH' }, user);
  }

  public async delete<T>(config: AxiosRequestConfig, user?: SentBy): Promise<ApiResponse<T>> {
    return this.request<T>({ ...config, method: 'DELETE' }, user);
  }
}

export default ApiService;
