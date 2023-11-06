import { HttpException } from '@/exceptions/HttpException';
import { RequestWithUser } from '@/interfaces/auth.interface';
import authMiddleware from '@middlewares/auth.middleware';
import { PrismaClient } from '@prisma/client';
import { Controller, Get, Req, Res, UseBefore } from 'routing-controllers';
import { OpenAPI } from 'routing-controllers-openapi';

const prisma = new PrismaClient();

interface UserData {
  name: string;
  username: string;
  email: string;
  orgId: number;
  orgName: string;
}

@Controller()
export class UserController {
  @Get('/me')
  @OpenAPI({ summary: 'Return current user' })
  @UseBefore(authMiddleware)
  async getUser(@Req() req: RequestWithUser, @Res() response: any): Promise<UserData> {
    const { name, username, email, orgId, orgName } = req.user;

    if (!name) {
      throw new HttpException(400, 'Bad Request');
    }

    const userData: UserData = {
      name,
      username,
      email,
      orgId,
      orgName,
    };

    return response.send({ data: userData, message: 'success' });
  }
}
