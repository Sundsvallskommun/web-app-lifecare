import { ChildOrganization, Contractor, Organization } from '@interfaces/organization';
import { ApiResponse, apiService } from './api-service';

export const emptyOrganization: Organization = {
  orgId: 0,
  orgName: '',
  companyId: 0,
  parentId: 0,
  topOrgId: 0,
  orgPath: '',
  isLeafLevel: false,
  isExternal: false,
  isSchool: false,
  treeLevel: 0,
  isEnabled: false,
};

export const getOrganizationByTreeLevelAndCompanyId = async (): Promise<{
  data: Organization[];
  error?: Error;
  status?: number;
}> => {
  try {
    const response = await apiService.get<ApiResponse<Organization[]>>(`/organization`);

    return { data: response.data.data, status: 200 };
  } catch (e) {
    return {
      data: [emptyOrganization],
      error: e.response?.status
        ? new Error(`Error ${e.response.status}: ${e.response.statusText}`)
        : new Error('An unknown error occurred'),
      status: e.response?.status,
    };
  }
};

export const getChildrenByOrgId = async (orgId: number): Promise<ChildOrganization[]> => {
  const response = await apiService.get<ChildOrganization[]>(`/metaadmin/1.0/organization/${orgId}/children`);
  return response.data;
};

export const getContractorsByOrgId = async (orgId: number): Promise<Contractor[]> => {
  const response = await apiService.get<Contractor[]>(`/metaadmin/1.0/organization/${orgId}/contractors`);
  return response.data;
};
