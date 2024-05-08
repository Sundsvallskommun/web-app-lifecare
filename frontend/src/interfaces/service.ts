export interface ServiceResponse<T> {
  data?: T;
  error?: number | string | boolean;
  message?: string;
}
