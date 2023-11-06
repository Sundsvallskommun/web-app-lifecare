import { Controller, Body, UseBefore, Req, Post } from 'routing-controllers';
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

export class citizenDTO {
  @IsString()
  SocialSecurityNumber: string;
}

export class citizenSocialSecurityNumberDTO {
  @IsString()
  personId: string;
}

@Controller()
export class CitizenController {
  private apiService = new ApiService();

  @Post('/lookup')
  @OpenAPI({ summary: 'Get citizen info from social security number' })
  @UseBefore(authMiddleware)
  async getCitizen(@Req() req: RequestWithUser, @Body() body: citizenDTO): Promise<ResponseData<any>> {
    try {
      const { SocialSecurityNumber } = body;
      const urlForGuid = `/citizen/2.0/${SocialSecurityNumber}/guid`;
      const resGuid = await this.apiService.get<any>({ url: urlForGuid });

      if (!resGuid || !resGuid.data) {
        throw new HttpException(404, 'GUID not found for the provided SocialSecurityNumber');
      }

      const personId = resGuid.data;

      const url = `/citizen/2.0/${personId}`;
      const res = await this.apiService.get<any>({ url });
      const { givenname, lastname } = res.data;

      const resData = {
        personId,
        givenname,
        lastname,
      };

      return { data: resData, message: 'success', status: 200 };
    } catch (error) {
      throw new HttpException(500, error.message);
    }
  }

  @Post('/lookup/socialsecuritynumber')
  @OpenAPI({ summary: 'Get citizen social security number from personid' })
  @UseBefore(authMiddleware)
  async getCitizenSocialSecurityNumber(@Req() req: RequestWithUser, @Body() body: citizenSocialSecurityNumberDTO): Promise<ResponseData<any>> {
    try {
      const { personId } = body;
      const url = `/citizen/2.0/${personId}/personnumber`;
      const res = await this.apiService.get<any>({ url });

      return { data: res.data, message: 'success', status: 200 };
    } catch (error) {
      throw new HttpException(500, error.message);
    }
  }
}
