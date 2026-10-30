import { Controller, Body, UseBefore, Req, Post } from 'routing-controllers';
import ApiService from '@/services/api.service';
import { OpenAPI } from 'routing-controllers-openapi';
import authMiddleware from '@/middlewares/auth.middleware';
import { HttpException } from '@/exceptions/HttpException';
import { RequestWithUser } from '@/interfaces/auth.interface';
import { toHttpException } from '@/services/access.service';
import { IsString } from 'class-validator';
import { getApiBase } from '@/config/api-config';
import { MUNICIPALITY_ID } from '@config';

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
@UseBefore(authMiddleware)
export class CitizenController {
  private apiService = new ApiService();

  @Post('/lookup')
  @OpenAPI({ summary: 'Get citizen info from social security number' })
  async getCitizen(@Req() req: RequestWithUser, @Body() body: citizenDTO): Promise<ResponseData<any>> {
    try {
      const { SocialSecurityNumber } = body;
      const urlForGuid = `/${getApiBase('citizen')}/${MUNICIPALITY_ID}/${SocialSecurityNumber}/guid`;
      const resGuid = await this.apiService.get<any>({ url: urlForGuid });

      if (!resGuid || !resGuid.data) {
        throw new HttpException(404, 'GUID not found for the provided SocialSecurityNumber');
      }

      const personId = resGuid.data;

      const url = `/${getApiBase('citizen')}/${MUNICIPALITY_ID}/${personId}`;
      const res = await this.apiService.get<any>({ url });
      const { givenname, lastname } = res.data;

      const resData = {
        personId,
        givenname,
        lastname,
      };

      return { data: resData, message: 'success', status: 200 };
    } catch (error) {
      throw toHttpException(error);
    }
  }

  @Post('/lookup/socialsecuritynumber')
  @OpenAPI({ summary: 'Get citizen social security number from personid' })
  async getCitizenSocialSecurityNumber(@Req() req: RequestWithUser, @Body() body: citizenSocialSecurityNumberDTO): Promise<ResponseData<any>> {
    try {
      const { personId } = body;
      const url = `${getApiBase('citizen')}/${MUNICIPALITY_ID}/${personId}/personnumber`;
      const res = await this.apiService.get<any>({ url });

      return { data: res.data, message: 'success', status: 200 };
    } catch (error) {
      throw toHttpException(error);
    }
  }
}
