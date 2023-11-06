import { Controller, Get, Body, UseBefore, Req, Post, Patch, Delete, Param } from 'routing-controllers';
import ApiService from '@/services/api.service';
import { OpenAPI } from 'routing-controllers-openapi';
import authMiddleware from '@/middlewares/auth.middleware';
import { HttpException } from '@/exceptions/HttpException';
import { RequestWithUser } from '@/interfaces/auth.interface';
import { IsNumber, IsOptional, IsString } from 'class-validator';

interface ResponseData<T> {
  data: T;
  message: string;
  status: number;
}

export class NewContractorDTO {
  @IsString()
  personId: string;
  @IsNumber()
  ttlMonths: number;
  @IsNumber()
  orgId: number;
  @IsString()
  emailAddress: string;
  // Person
  @IsString()
  @IsOptional()
  customFriendlyGivenname?: string;
  @IsString()
  restrictedMobile: string;
}

export class PathContractorDTO {
  @IsString()
  @IsOptional()
  personId?: string;
  @IsNumber()
  contractId: number;
  @IsNumber()
  ttlMonths: number;
  @IsString()
  @IsOptional()
  restrictedMobile?: string;
  @IsString()
  @IsOptional()
  emailAddress?: string;

  /*
  
  // Person
  @IsString()
  @IsOptional()
  customFriendlyGivenname: string;*/
}

export class DeleteContractorDTO {
  @IsNumber()
  contractId: string;
}

@Controller()
export class ContractorController {
  private apiService = new ApiService();

  @Get('/mycontractors')
  @OpenAPI({ summary: 'Get contractor by login name' })
  @UseBefore(authMiddleware)
  async getUserCompanyContractors(@Req() req: RequestWithUser): Promise<ResponseData<any>> {
    try {
      const { orgId } = req.user;
      const url = `/metaadmin/1.0/organization/${orgId}/contractors`;
      const res = await this.apiService.get<{ status: string }>({ url });
      return { data: res.data, message: 'success', status: 200 };
    } catch (error) {
      throw new HttpException(500, error.message);
    }
  }

  @Post('/contractor')
  @OpenAPI({ summary: 'Create new contractor for logged in users org' })
  @UseBefore(authMiddleware)
  async newOrgUser(@Req() req: RequestWithUser, @Body() body: NewContractorDTO): Promise<ResponseData<any>> {
    try {
      console.log('req.user', req.user);
      console.log('req.user', body);
      const { personId, ttlMonths, emailAddress, customFriendlyGivenname, restrictedMobile, orgId } = body;
      // const { orgId, guid } = req.user;
      const { orgId: userOrgId, guid, isSuperAdmin } = req.user;

      const chosenOrgId = isSuperAdmin && body.orgId ? body.orgId : userOrgId;

      const urlContractor = `/metaadmin/1.0/contractor`;

      const newContractorData = {
        personId,
        ttlMonths,
        emailAddress,
        // Based on the logged in user wh0 created the user
        orgId: chosenOrgId,
        creatorPersonId: guid,
      };
      const contractorRes = await this.apiService.post<{ status: string }>({ url: urlContractor, data: newContractorData });

      const urlPerson = `/metaadmin/1.0/person/${personId}`;
      const personData = {
        customFriendlyGivenname,
        restrictedMobile,
      };
      await this.apiService.patch<{ status: string }>({ url: urlPerson, data: personData });

      return { data: contractorRes, message: 'success', status: 200 };
    } catch (error) {
      throw new HttpException(500, error.message);
    }
  }

  @Patch('/contractor')
  @OpenAPI({ summary: 'Patch user' })
  @UseBefore(authMiddleware)
  async updateOrgUser(@Req() req: RequestWithUser, @Body() body: PathContractorDTO): Promise<ResponseData<any>> {
    try {
      const { personId, contractId, ttlMonths, restrictedMobile, emailAddress } = body;
      const { orgId, guid } = req.user;
      const url = `/metaadmin/1.0/contractor/${contractId}`;

      let res: any = '';

      if (ttlMonths) {
        const patchContractorData = {
          // personId,
          ttlMonths,
          //emailAddress,
          // Based on the logged in user who created the user
          //orgId: orgId,
          //creatorPersonId: guid,
        };
        res = await this.apiService.patch<{ status: string }>({ url, data: patchContractorData });
      }

      if (personId && restrictedMobile) {
        const urlPerson = `/metaadmin/1.0/person/${personId}`;
        const personData = {
          // customFriendlyGivenname,
          restrictedMobile,
        };
        await this.apiService.patch<{ status: string }>({ url: urlPerson, data: personData });
      }

      return { data: res, message: 'success', status: 200 };
    } catch (error) {
      throw new HttpException(500, error.message);
    }
  }

  @Delete('/contractor/:contractId')
  @OpenAPI({ summary: 'Delete contractor by contractId' })
  @UseBefore(authMiddleware)
  async deleteOrgUser(@Req() req: RequestWithUser, @Param('contractId') contractId: number): Promise<ResponseData<any>> {
    try {
      // const { orgId, guid } = req.user;
      //const { contractId } = body;

      const url = `/metaadmin/1.0/contractor/${contractId}`;
      const contractorRes = await this.apiService.delete<{ status: string }>({ url });

      return { data: contractorRes, message: 'Contractor successfully deleted', status: 204 };
    } catch (error) {
      throw new HttpException(500, error.message);
    }
  }
}
