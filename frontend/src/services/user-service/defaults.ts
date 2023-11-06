import { User } from '@interfaces/user';
import { ApiResponse } from '@services/api-service';

// export const defaultPermissions: Permissions = {
//   //   canEditSystemMessages: false,
// };

export const emptyUser: User = {
  name: '',
  username: '',
  // citizenIdentifier: '',
  // SSN: '',
  // phone: '',
  // company: [],
  // date: '',
  // id: '',
  // password: '',
  // email: '',
  isSuperAdmin: true,
  orgId: null,
  orgName: '',
  //   permissions: defaultPermissions,
};

export const emptyUserResponse: ApiResponse<User> = {
  data: emptyUser,
  message: 'none',
  status: 204,
};
