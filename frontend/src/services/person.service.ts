import { Person, PersonUpdate } from '@interfaces/lifecare';
import { apiService } from './api-service';

const emptyPerson: Person = {
  personId: '',
  classified: '',
  firstname: '',
  middlename: '',
  lastname: '',
  friendlyGivenname: '',
  customFriendlyGivenname: '',
  workPhone: '',
  workMobile: '',
  restrictedMobile: '',
  restrictedMobileIsManagedByCMG: false,
};

export const getPersonDetails = async (
  personId: string
): Promise<{ data?: Person; message?: string; error?: Error }> => {
  try {
    const response = await apiService.get<Person>(`/metaadmin/1.0/person/${personId}`);
    return { data: response.data, message: 'Person received successfully' };
  } catch (e) {
    return {
      data: emptyPerson,
      error: e.response?.status
        ? new Error(`Error ${e.response.status}: ${e.response.statusText}`)
        : new Error('An unknown error occurred'),
      message: e.response?.data?.message || 'Error fetching person details',
    };
  }
};

export const updatePersonDetails = async (
  personId: string,
  updateData: PersonUpdate
): Promise<{ data?: PersonUpdate; message?: string; error?: Error }> => {
  try {
    const response = await apiService.patch<PersonUpdate>(`/metaadmin/1.0/person/${personId}`, updateData);
    return { data: response.data, message: 'Person updated successfully' };
  } catch (e) {
    return {
      data: null,
      error: e.response?.status
        ? new Error(`Error ${e.response.status}: ${e.response.statusText}`)
        : new Error('An unknown error occurred'),
      message: e.response?.data?.message || 'Error updating person details',
    };
  }
};
