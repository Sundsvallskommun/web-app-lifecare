import { Controller, Get, UseBefore, Req } from 'routing-controllers';
import ApiService from '@/services/api.service';
import { OpenAPI } from 'routing-controllers-openapi';
import authMiddleware from '@/middlewares/auth.middleware';
import { RequestWithUser } from '@/interfaces/auth.interface';
import { allowedOrgIds, toHttpException } from '@/services/access.service';
import { getApiBase } from '@/config/api-config';

interface ApiOrganization {
  orgId: number;
  orgName: string;
  companyId: number;
  parentId: number;
  topOrgId: number;
  orgPath: string;
  isLeafLevel: boolean;
  isExternal: boolean;
  isSchool: boolean;
  treeLevel: number;
  isEnabled: boolean;
}

interface ResponseData<T> {
  data: T;
  message: string;
  status: number;
}

type Organization = Pick<ApiOrganization, 'orgId' | 'orgName'>;

@Controller()
@UseBefore(authMiddleware)
export class OrganizationController {
  private apiService = new ApiService();

  @Get('/organization')
  @OpenAPI({ summary: 'Get orgName by treeLevel and companyId' })
  async getCompanies(@Req() req: RequestWithUser): Promise<ResponseData<Organization[]>> {
    try {
      if (req.user.isSuperAdmin) {
        const url = `/${getApiBase('metaadmin')}/organization?treeLevel=2&companyId=71`;
        const res = await this.apiService.get<ApiOrganization[]>({ url });
        const { data } = res;
        const orgs = data?.map(org => ({
          orgId: org.orgId,
          orgName: org.orgName,
        }));
        return { data: orgs, message: 'success', status: 200 };
      }

      // Active orgs only (B1), one entry each: delete() is true only for the first contract per org
      const orgIds = allowedOrgIds(req.user);
      const orgs = (req.user.contracts ?? [])
        .filter(contract => orgIds.delete(contract.orgId))
        .map(contract => ({
          orgId: contract.orgId,
          orgName: contract.orgName,
        }));

      return { data: orgs, message: 'success', status: 200 };
    } catch (error) {
      throw toHttpException(error);
    }
  }
}
