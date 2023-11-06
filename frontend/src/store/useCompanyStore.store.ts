import { Organization } from '@interfaces/organization';
import { getOrganizationByTreeLevelAndCompanyId } from '@services/organization.service';
import { create } from 'zustand';
// import type { Organization } from './path-to-your-interfaces'; // Make sure to import the Organization interface from its location

interface State {
  companyList: Organization[];
  isLoading: boolean;
  //   error: Error | null;
}
interface Actions {
  fetchCompanies: () => Promise<void>;
}

const initialState: State = {
  companyList: [],
  isLoading: false,
  // error: Error | null;
};

const useCompanyStore = create<State & Actions>((set) => ({
  ...initialState,

  fetchCompanies: async () => {
    await set(() => ({ isLoading: true }));
    const res = await getOrganizationByTreeLevelAndCompanyId();
    const data = (!res.error && res.data) || initialState.companyList;
    await set(() => ({ companyList: data, isLoading: false }));
    // return { data, error: res.error };
  },

  //   fetchCompanies: async () => {
  //     set((state) => ({ ...state, isLoading: true }));
  //
  //
  // try {
  //   const response = await getOrganizationByTreeLevelAndCompanyId();
  //   set((state) => ({
  //     ...state,
  //     companyList: response.data || [],
  //     isLoading: false,
  //   }));
  // } catch (error) {
  //   console.error('Error fetching companies:', error);
  //   set((state) => ({
  //     ...state,
  //     error,
  //     isLoading: false,
  //   }));
  // }
  //   },
}));

export default useCompanyStore;
