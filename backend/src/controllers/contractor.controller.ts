import { Controller, Get, Body, UseBefore, Req, Post, Patch, Delete, Param } from 'routing-controllers';
import ApiService from '@/services/api.service';
import { OpenAPI } from 'routing-controllers-openapi';
import authMiddleware from '@/middlewares/auth.middleware';
import { HttpException } from '@/exceptions/HttpException';
import { RequestWithUser } from '@/interfaces/auth.interface';
import { IsNumber, IsOptional, IsString } from 'class-validator';
import { Contractor } from '@/interfaces/users.interface';

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
  @IsString()
  restrictedMobile: string;
  @IsString()
  @IsOptional()
  emailAddress?: string;
}

export class DeleteContractorDTO {
  @IsNumber()
  contractId: string;
  @IsString()
  personId: string;
}
@Controller()
export class ContractorController {
  private apiService = new ApiService();

  /**
   * Check if the logged in user is allowed to modify the contract
   * @param personId personId of user to modify
   * @param contractId contractId of contract to modify
   * @param contracts Contracts of the logged in user
   * @returns boolean
   */
  async allowedToModifyContract(personId: string, contractId: number, contracts: Contractor[]): Promise<boolean> {
    if (!contracts || !personId || !contractId) {
      return false;
    }
    const url = `/metaadmin/1.0/contractor/${personId}`;
    const contractorRes = await this.apiService.get<Contractor[]>({ url });
    const { data: contractors } = contractorRes;

    const foundSameContractId = contractors.find(contractor => contractor.contractId === contractId);
    if (!foundSameContractId) {
      return false;
    }

    const loggedInUserGotSameOrgId = contracts.find(contract => contract.orgId === foundSameContractId.orgId);

    if (!loggedInUserGotSameOrgId) {
      return false;
    }

    return true;
  }

  @Get('/mycontractors')
  @OpenAPI({ summary: 'Get contractor by login name' })
  @UseBefore(authMiddleware)
  async getUserCompanyContractors(@Req() req: RequestWithUser): Promise<ResponseData<any>> {
    try {
      const { contracts, isSuperAdmin } = req.user;

      if (isSuperAdmin) {
        const url = `/metaadmin/1.0/contractors`;
        const res = await this.apiService.get<any>({ url });
        return { data: res.data, message: 'success', status: 200 };
      }

      const orgIds = contracts.map(contract => contract.orgId);

      const contractors = [];

      for (let i = 0; i < orgIds.length; i++) {
        const orgId = orgIds[i];
        const url = `/metaadmin/1.0/organization/${orgId}/contractors`;
        const res = await this.apiService.get<any>({ url });
        const { data } = res;
        contractors.push(...data);
      }

      return { data: contractors, message: 'success', status: 200 };
    } catch (error) {
      throw new HttpException(500, error.message);
    }
  }

  @Post('/contractor')
  @OpenAPI({ summary: 'Create new contractor for logged in users org' })
  @UseBefore(authMiddleware)
  async newOrgUser(@Req() req: RequestWithUser, @Body() body: NewContractorDTO): Promise<ResponseData<any>> {
    try {
      const { personId, ttlMonths, emailAddress, customFriendlyGivenname, restrictedMobile } = body;
      const { guid, isSuperAdmin, contracts } = req.user;

      let chosenOrgId = body.orgId;

      if (!chosenOrgId && contracts.length) {
        const firstContract = contracts[0];
        chosenOrgId = firstContract.orgId;
      }

      if (!isSuperAdmin) {
        const canCreateInOrg = contracts.find(contract => contract.orgId === chosenOrgId);
        if (!canCreateInOrg) {
          throw new HttpException(400, 'Bad data');
        }
      }

      if (!chosenOrgId) {
        throw new HttpException(400, 'Bad data');
      }

      const urlContractor = `/metaadmin/1.0/contractor`;

      const newContractorData = {
        personId,
        ttlMonths,
        emailAddress,
        orgId: chosenOrgId,
        // Based on the logged in user who created the user
        creatorPersonId: guid,
      };
      const contractorRes = await this.apiService.post<any>({ url: urlContractor, data: newContractorData });

      const urlPerson = `/metaadmin/1.0/person/${personId}`;
      const personData = {
        customFriendlyGivenname,
        restrictedMobile,
      };
      await this.apiService.patch<any>({ url: urlPerson, data: personData });

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
      const { isSuperAdmin } = req.user;

      if (!isSuperAdmin) {
        const { personId, contractId } = body;
        const canModifyContract = await this.allowedToModifyContract(personId, contractId, req.user.contracts);

        if (!canModifyContract) {
          throw new HttpException(400, 'Bad data');
        }
      }

      const { personId, contractId, ttlMonths, restrictedMobile } = body;
      const url = `/metaadmin/1.0/contractor/${contractId}`;

      let res: any = '';

      if (ttlMonths) {
        const patchContractorData = {
          ttlMonths,
        };
        res = await this.apiService.patch<{ status: string }>({ url, data: patchContractorData });
      }

      if (personId && restrictedMobile) {
        const urlPerson = `/metaadmin/1.0/person/${personId}`;
        const personData = {
          restrictedMobile,
        };
        await this.apiService.patch<{ status: string }>({ url: urlPerson, data: personData });
      }

      return { data: res, message: 'success', status: 200 };
    } catch (error) {
      throw new HttpException(500, error.message);
    }
  }

  @Delete('/contractor/:contractId/:personId')
  @OpenAPI({ summary: 'Delete contractor by contractId' })
  @UseBefore(authMiddleware)
  async deleteOrgUser(
    @Req() req: RequestWithUser,
    @Param('contractId') contractId: number,
    @Param('personId') personId: string,
  ): Promise<ResponseData<any>> {
    try {
      const { isSuperAdmin } = req.user;

      if (!isSuperAdmin) {
        const canModifyContract = await this.allowedToModifyContract(personId, contractId, req.user.contracts);

        if (!canModifyContract) {
          throw new HttpException(400, 'Bad data');
        }
      }

      const url = `/metaadmin/1.0/contractor/${contractId}`;
      const contractorRes = await this.apiService.delete<{ status: string }>({ url });

      return { data: contractorRes, message: 'Contractor successfully deleted', status: 204 };
    } catch (error) {
      throw new HttpException(500, error.message);
    }
  }
}
