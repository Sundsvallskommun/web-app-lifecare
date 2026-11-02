import { Controller, Get, Body, UseBefore, Req, Post, Patch, Delete, Param } from 'routing-controllers';
import ApiService from '@/services/api.service';
import { OpenAPI } from 'routing-controllers-openapi';
import authMiddleware from '@/middlewares/auth.middleware';
import { HttpException } from '@/exceptions/HttpException';
import { RequestWithUser } from '@/interfaces/auth.interface';
import { IsNumber, IsOptional, IsString } from 'class-validator';
import { getApiBase } from '@/config/api-config';
import { allowedOrgIds, assertCanEditPerson, assertCanManageContract, assertInOrg, canSetUpPerson, toHttpException } from '@/services/access.service';

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
  personId: string;
  @IsNumber()
  contractId: number;
  @IsNumber()
  ttlMonths: number;
  // Person - only sent when it changes, since changing it is denied if the person has an active contract in another org
  @IsString()
  @IsOptional()
  restrictedMobile?: string;
}

@Controller()
@UseBefore(authMiddleware)
export class ContractorController {
  private apiService = new ApiService();

  @Get('/mycontractors')
  @OpenAPI({ summary: 'Get contractor by login name' })
  async getUserCompanyContractors(@Req() req: RequestWithUser): Promise<ResponseData<any>> {
    try {
      if (req.user.isSuperAdmin) {
        const url = `/${getApiBase('metaadmin')}/contractors`;
        const res = await this.apiService.get<any>({ url });
        return { data: res.data, message: 'success', status: 200 };
      }

      const orgIds = [...allowedOrgIds(req.user)];

      const contractors = [];

      for (let i = 0; i < orgIds.length; i++) {
        const orgId = orgIds[i];
        const url = `/${getApiBase('metaadmin')}/organization/${orgId}/contractors`;
        const res = await this.apiService.get<any>({ url });
        const { data } = res;
        contractors.push(...data);
      }

      return { data: contractors, message: 'success', status: 200 };
    } catch (error) {
      throw toHttpException(error);
    }
  }

  @Post('/contractor')
  @OpenAPI({ summary: 'Create new contractor for logged in users org' })
  async newOrgUser(@Req() req: RequestWithUser, @Body() body: NewContractorDTO): Promise<ResponseData<any> & { personUpdated: boolean }> {
    try {
      const { personId, ttlMonths, emailAddress, customFriendlyGivenname, restrictedMobile } = body;
      const { guid, isSuperAdmin } = req.user;

      let chosenOrgId = body.orgId;

      if (!chosenOrgId && !isSuperAdmin) {
        [chosenOrgId] = allowedOrgIds(req.user);
      }

      if (!chosenOrgId) {
        throw new HttpException(400, 'Bad data');
      }

      // Both before anything with an effect: the contract is created first, then the person is patched.
      assertInOrg(req.user, chosenOrgId);
      const personUpdated = await canSetUpPerson(req.user, personId);

      const urlContractor = `/${getApiBase('metaadmin')}/contractor`;

      const newContractorData = {
        personId,
        ttlMonths,
        emailAddress,
        orgId: chosenOrgId,
        // Based on the logged in user who created the user
        creatorPersonId: guid,
      };
      const contractorRes = await this.apiService.post<any>({ url: urlContractor, data: newContractorData });

      if (personUpdated) {
        const urlPerson = `/${getApiBase('metaadmin')}/person/${personId}`;
        const personData = {
          customFriendlyGivenname,
          restrictedMobile,
        };
        await this.apiService.patch<any>({ url: urlPerson, data: personData });
      }

      // personUpdated false: the person has an active contract elsewhere, so mobile and name were left as they were
      return { data: contractorRes, message: 'success', status: 200, personUpdated };
    } catch (error) {
      throw toHttpException(error);
    }
  }

  @Patch('/contractor')
  @OpenAPI({ summary: 'Patch user' })
  async updateOrgUser(@Req() req: RequestWithUser, @Body() body: PathContractorDTO): Promise<ResponseData<any>> {
    try {
      const { personId, contractId, ttlMonths, restrictedMobile } = body;

      await assertCanManageContract(req.user, personId, contractId);
      if (restrictedMobile) {
        await assertCanEditPerson(req.user, personId);
      }

      const url = `/${getApiBase('metaadmin')}/contractor/${contractId}`;

      let res: any = '';

      if (ttlMonths) {
        const patchContractorData = {
          ttlMonths,
        };
        res = await this.apiService.patch<{ status: string }>({ url, data: patchContractorData });
      }

      if (restrictedMobile) {
        const urlPerson = `/${getApiBase('metaadmin')}/person/${personId}`;
        const personData = {
          restrictedMobile,
        };
        await this.apiService.patch<{ status: string }>({ url: urlPerson, data: personData });
      }

      return { data: res, message: 'success', status: 200 };
    } catch (error) {
      throw toHttpException(error);
    }
  }

  @Delete('/contractor/:contractId/:personId')
  @OpenAPI({ summary: 'Delete contractor by contractId' })
  async deleteOrgUser(
    @Req() req: RequestWithUser,
    @Param('contractId') contractId: number,
    @Param('personId') personId: string,
  ): Promise<ResponseData<any>> {
    try {
      await assertCanManageContract(req.user, personId, contractId);

      const url = `/${getApiBase('metaadmin')}/contractor/${Number(contractId)}`;
      const contractorRes = await this.apiService.delete<{ status: string }>({ url });

      return { data: contractorRes, message: 'Contractor successfully deleted', status: 204 };
    } catch (error) {
      throw toHttpException(error);
    }
  }
}
