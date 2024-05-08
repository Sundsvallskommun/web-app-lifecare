import { User } from '@interfaces/user';
import { ApiResponse, apiService } from '../api-service';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { __DEV__ } from '@sk-web-gui/react';
import { emptyUser } from './defaults';
import { ServiceResponse } from '@interfaces/service';

const handleSetUserResponse: (res: ApiResponse<User>) => User = (res) => ({
  name: res.data.name,
  username: res.data.username,
  isSuperAdmin: res.data.isSuperAdmin,
  isAdmin: res.data.isAdmin,
  orgId: res.data.orgId ?? undefined,
  orgName: res.data.orgName ?? undefined,
});

const getMe: () => Promise<ServiceResponse<User>> = () => {
  return apiService
    .get<ApiResponse<User>>('me')
    .then((res) => {
      return { data: handleSetUserResponse(res.data) };
    })
    .catch((e) => ({
      message: e.response?.data.message,
      error: e.response?.status ?? 'UNKNOWN ERROR',
    }));
};

interface State {
  user: User;
}
interface Actions {
  setUser: (user: User) => void;
  getMe: () => Promise<ServiceResponse<User>>;
  reset: () => void;
}

const initialState: State = {
  user: emptyUser,
};

export const useUserStore = create<State & Actions>()(
  devtools(
    (set, get) => ({
      ...initialState,
      setUser: (user) => set(() => ({ user })),
      getMe: async () => {
        let user = get().user;
        const res = await getMe();
        if (!res.error) {
          user = res.data;
          set(() => ({ user }));
        }
        return { data: user };
      },
      reset: () => {
        set(initialState);
      },
    }),
    { enabled: __DEV__ }
  )
);
