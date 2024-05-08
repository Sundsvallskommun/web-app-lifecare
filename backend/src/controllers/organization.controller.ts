import { Controller, Get, UseBefore, Req } from 'routing-controllers';
import ApiService from '@/services/api.service';
import { OpenAPI } from 'routing-controllers-openapi';
import authMiddleware from '@/middlewares/auth.middleware';
import { HttpException } from '@/exceptions/HttpException';
import { RequestWithUser } from '@/interfaces/auth.interface';

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
export class OrganizationController {
  private apiService = new ApiService();

  @Get('/organization')
  @OpenAPI({ summary: 'Get orgName by treeLevel and companyId' })
  @UseBefore(authMiddleware)
  async getCompanies(@Req() req: RequestWithUser): Promise<ResponseData<Organization[]>> {
    try {
      if (req.user.isSuperAdmin) {
        const url = `/metaadmin/1.0/organization?treeLevel=2&companyId=71`;
        const res = await this.apiService.get<ApiOrganization[]>({ url });
        const { data } = res;
        const orgs = data?.map(org => ({
          orgId: org.orgId,
          orgName: org.orgName,
        }));
        return { data: orgs, message: 'success', status: 200 };
      }

      const { contracts } = req.user;
      const orgs = contracts.map(contract => ({
        orgId: contract.orgId,
        orgName: contract.orgName,
      }));

      return { data: orgs, message: 'success', status: 200 };
    } catch (error) {
      throw new HttpException(500, error.message);
    }
  }
}
