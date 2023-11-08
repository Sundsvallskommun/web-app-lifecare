import { User } from '@interfaces/user';
import { ApiResponse } from '@services/api-service';

// export const defaultPermissions: Permissions = {
//   //   canEditSystemMessages: false,
// };

export const emptyUser: User = {
  name: '',
  username: '',
  isAdmin: false,
  isSuperAdmin: false,
  orgId: null,
  orgName: '',
};

export const emptyUserResponse: ApiResponse<User> = {
  data: emptyUser,
  message: 'none',
  status: 204,
};
