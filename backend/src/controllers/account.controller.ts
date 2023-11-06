import { Controller, Post, Body, UseBefore, Req } from 'routing-controllers';
import { OpenAPI } from 'routing-controllers-openapi';
import { RequestWithUser } from '@/interfaces/auth.interface';
import { HttpException } from '@/exceptions/HttpException';
import { IsString } from 'class-validator';
import ApiService from '@/services/api.service';
import authMiddleware from '@/middlewares/auth.middleware';

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
export class AccountController {
  private apiService = new ApiService();

  @Post('/account')
  @OpenAPI({ summary: 'Reset contractor password and send SMS' })
  @UseBefore(authMiddleware)
  async resetPasswordAndSendSMS(@Req() req: RequestWithUser, @Body() body: ResetPasswordDTO): Promise<ResponseData<any>> {
    try {
      const { personId } = body;

      const url = `/metaadmin/1.0/account/resetcontractorpwandsendsms`;

      const result = await this.apiService.post<{ status: string }>({ url: url, data: body });

      return { data: result, message: 'Password reset and SMS sent successfully', status: 200 };
    } catch (error) {
      throw new HttpException(500, error.message);
    }
  }
}
