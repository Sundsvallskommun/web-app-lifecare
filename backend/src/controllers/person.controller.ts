import { Controller, Get, Body, UseBefore, Req, Patch } from 'routing-controllers';
import ApiService from '@/services/api.service';
import { OpenAPI } from 'routing-controllers-openapi';
import authMiddleware from '@/middlewares/auth.middleware';
import { HttpException } from '@/exceptions/HttpException';
import { RequestWithUser } from '@/interfaces/auth.interface';
import { IsString } from 'class-validator';

interface ResponseData<T> {
  data: T;
  message: string;
  status: number;
}

export class PatchPersonDTO {
  @IsString()
  customFriendlyGivenname: string;

  @IsString()
  restrictedMobile: string;
}

@Controller()
export class PersonController {
  private apiService = new ApiService();

  @Get('/person')
  @OpenAPI({ summary: 'Get details of a person by personId' })
  @UseBefore(authMiddleware)
  async getPersonDetails(@Req() req: RequestWithUser): Promise<ResponseData<any>> {
    try {
      const { personId } = req.user;
      const url = `/metaadmin/1.0/person/${personId}`;
      const res = await this.apiService.get<{ status: string }>({ url });
      return { data: res.data, message: 'success', status: 200 };
    } catch (error) {
      throw new HttpException(500, error.message);
    }
  }

  @Patch('/person')
  @OpenAPI({ summary: 'Patch details of a person by personId' })
  @UseBefore(authMiddleware)
  async updatePersonDetails(@Req() req: RequestWithUser, @Body() body: PatchPersonDTO): Promise<ResponseData<any>> {
    try {
      const { personId } = req.user;
      const { customFriendlyGivenname, restrictedMobile } = body;
      const url = `/metaadmin/1.0/person/${personId}`;
      const personData = {
        customFriendlyGivenname,
        restrictedMobile,
      };
      const personRes = await this.apiService.patch<{ status: string }>({ url, data: personData });
      return { data: personRes, message: 'success', status: 200 };
    } catch (error) {
      throw new HttpException(500, error.message);
    }
  }
}
