import { apiService } from './api-service';

const emptyAccount: Account = {
  personId: '',
};

export interface Account {
  personId: string;
}

export const resetPasswordAndSendSMS = async (
  account: Account
): Promise<{ data?: Account; message?: string; error?: Error; status?: number }> => {
  try {
    const response = await apiService.post<Account>(`/account`, account);
    return { data: response.data, message: 'Reset password and sent sms success' };
  } catch (e) {
    return {
      data: emptyAccount,
      error: e.response?.status
        ? new Error(`Error ${e.response.status}: ${e.response.statusText}`)
        : new Error('An unknown error occurred'),
      status: e.response?.status,
    };
  }
};
