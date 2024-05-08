import { Contractor } from '@interfaces/contractor';
import { ApiResponse, apiService } from './api-service';

const emptyContractor: Contractor = {
  contractId: 0,
  personId: '',
  personNumber: '',
  classified: '',
  givenname: '',
  lastname: '',
  userId: '',
  loginname: '',
  emailAddress: '',
  restrictedMobile: '',
  title: '',
  hireDate: '',
  retireDate: '',
  ordererId: 0,
  orgId: 0,
  orgName: '',
  isEmergencyClosed: false,
};

const emptyCitizenUser: CitizenUser = {
  personId: '',
  givenname: '',
  lastname: '',
};

export interface CitizenUser {
  personId: string;
  givenname: string;
  lastname: string;
}

export interface NewContractor {
  personId: string;
  orgId?: number; // only for super admins
  ttlMonths: number;
  emailAddress: string;
  // orgName: string | string[];
  customFriendlyGivenname?: string;
  restrictedMobile: string;
}

export interface ContractorUpdateData {
  ttlMonths: number;
  contractId: number;
  personId: string;
  restrictedMobile: string;
}

export const getContractorByLoginName = async (): Promise<{ data: Contractor[]; error?: Error; status?: number }> => {
  try {
    const response = await apiService.get<Contractor[]>(`/mycontractors`);
    return { data: response.data, status: 200 };
  } catch (e) {
    return {
      data: [],
      error: e.response?.status
        ? new Error(`Error ${e.response.status}: ${e.response.statusText}`)
        : new Error('An unknown error occurred'),
      status: e.response?.status,
    };
  }
};

export const lookUpCitizen = async (
  SocialSecurityNumber: string
): Promise<{ data: CitizenUser; error?: Error; status?: number }> => {
  try {
    const response = await apiService.post<ApiResponse<CitizenUser>>(`/lookup`, {
      SocialSecurityNumber,
    });
    return { data: response.data.data, status: 200 };
  } catch (e) {
    return {
      data: emptyCitizenUser,
      error: e.response?.status
        ? new Error(`Error ${e.response.status}: ${e.response.statusText}`)
        : new Error('An unknown error occurred'),
      status: e.response?.status,
    };
  }
};

export const newContractor = async (
  contractor: NewContractor
): Promise<{ data?: Contractor; message?: string; error?: Error }> => {
  try {
    const contractorData = {
      ...contractor,
      // orgName: Array.isArray(contractor.orgName) ? contractor.orgName.join(', ') : contractor.orgName,
    };

    const response = await apiService.post<Contractor>(`/contractor`, contractorData);
    return { data: response.data, message: 'Contractor created successfully' };
  } catch (e) {
    return {
      data: emptyContractor,
      error: e.response?.status
        ? new Error(`Error ${e.response.status}: ${e.response.statusText}`)
        : new Error('An unknown error occurred'),
    };
  }
};

export const updateContractorDetails = async (
  updatedData: ContractorUpdateData
): Promise<{ data?: Contractor; message?: string; error?: Error }> => {
  try {
    const response = await apiService.patch<Contractor>(`/contractor`, updatedData);
    return { data: response.data, message: 'Contractor updated successfully' };
  } catch (e) {
    return {
      data: emptyContractor,
      error: e.response?.status
        ? new Error(`Error ${e.response.status}: ${e.response.statusText}`)
        : new Error('An unknown error occurred'),
    };
  }
};

export const defaultDeleteMessage = 'Delete operation not successful';

export const deleteContractor = async (
  contractId: number,
  personId: string
): Promise<{ message?: string; error?: Error }> => {
  try {
    await apiService.delete(`/contractor/${contractId}/${personId}`);

    return { message: 'Contractor deleted successfully' };
  } catch (e) {
    return {
      message: e.message || defaultDeleteMessage,
      error: e.response?.status
        ? new Error(`Error ${e.response.status}: ${e.response.statusText}`)
        : new Error('An unknown error occurred'),
    };
  }
};
