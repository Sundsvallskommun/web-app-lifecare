import { ChildOrganization, Contractor, Organization } from '@interfaces/lifecare';
import ApiService from '../../../backend/src/services/api.service';

const apiService = new ApiService();

export const getOrganizationByTreeLevelAndCompanyId = async (
  treeLevel: number,
  companyId: number
): Promise<Organization[]> => {
  const response = await apiService.get<Organization[]>({
    url: `/metaadmin/1.0/organization?treelevel=${treeLevel}&companyId=${companyId}`,
  });
  return response.data;
};

export const getChildrenByOrgId = async (orgId: number): Promise<ChildOrganization[]> => {
  const response = await apiService.get<ChildOrganization[]>({
    url: `/metaadmin/1.0/organization/${orgId}/children`,
  });
  return response.data;
};

export const getContractorsByOrgId = async (orgId: number): Promise<Contractor[]> => {
  const response = await apiService.get<Contractor[]>({
    url: `/metaadmin/1.0/organization/${orgId}/contractors`,
  });
  return response.data;
};
