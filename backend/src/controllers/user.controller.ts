import { HttpException } from '@/exceptions/HttpException';
import { RequestWithUser } from '@/interfaces/auth.interface';
import { User } from '@/interfaces/users.interface';
import authMiddleware from '@middlewares/auth.middleware';
import { Controller, Get, Req, Res, UseBefore } from 'routing-controllers';
import { OpenAPI } from 'routing-controllers-openapi';

type UserData = Pick<User, 'name' | 'username' | 'orgId' | 'orgName' | 'isAdmin' | 'isSuperAdmin'>;

/*interface UserData {
  name: string;
  username: string;
  email: string;
  orgId: number;
  orgName: string;
  isAdmin: boolean;
  isSuperAdmin: boolean;
}*/

@Controller()
export class UserController {
  @Get('/me')
  @OpenAPI({ summary: 'Return current user' })
  @UseBefore(authMiddleware)
  async getUser(@Req() req: RequestWithUser, @Res() response: any): Promise<UserData> {
    const { name, username, isSuperAdmin, isAdmin, orgId, orgName } = req.user;

    if (!name) {
      throw new HttpException(400, 'Bad Request');
    }

    const userData: UserData = {
      name,
      username,
      isSuperAdmin,
      isAdmin,
      orgId,
      orgName,
    };

    return response.send({ data: userData, message: 'success' });
  }
}
