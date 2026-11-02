import { Controller, Post, Body, UseBefore, Req } from 'routing-controllers';
import { OpenAPI } from 'routing-controllers-openapi';
import { RequestWithUser } from '@/interfaces/auth.interface';
import { IsString } from 'class-validator';
import ApiService from '@/services/api.service';
import { assertCanManagePerson, toHttpException } from '@/services/access.service';
import authMiddleware from '@/middlewares/auth.middleware';
import { getApiBase } from '@/config/api-config';

interface ResponseData<T> {
  data: T;
  message: string;
  status: number;
}

export class ResetPasswordDTO {
  @IsString()
  personId: string;
}

@Controller()
@UseBefore(authMiddleware)
export class AccountController {
  private apiService = new ApiService();

  @Post('/account')
  @OpenAPI({ summary: 'Reset contractor password and send SMS' })
  async resetPasswordAndSendSMS(@Req() req: RequestWithUser, @Body() body: ResetPasswordDTO): Promise<ResponseData<any>> {
    try {
      const { personId } = body;
      await assertCanManagePerson(req.user, personId);

      const url = `/${getApiBase('metaadmin')}/account/resetcontractorpwandsendsms`;

      const result = await this.apiService.post<{ status: string }>({ url: url, data: { personId } });

      return { data: result, message: 'Password reset and SMS sent successfully', status: 200 };
    } catch (error) {
      throw toHttpException(error);
    }
  }
}
