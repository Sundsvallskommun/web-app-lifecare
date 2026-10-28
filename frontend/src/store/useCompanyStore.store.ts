import { Organization } from '@interfaces/organization';
import { getOrganizationByTreeLevelAndCompanyId } from '@services/organization.service';
import { createWithEqualityFn } from 'zustand/traditional';

interface State {
  companyList: Organization[];
  isLoading: boolean;
}
interface Actions {
  fetchCompanies: () => Promise<void>;
}

const initialState: State = {
  companyList: [],
  isLoading: false,
};

const useCompanyStore = createWithEqualityFn<State & Actions>((set) => ({
  ...initialState,

  fetchCompanies: async () => {
    await set(() => ({ isLoading: true }));
    const res = await getOrganizationByTreeLevelAndCompanyId();
    const data = (!res.error && res.data) || initialState.companyList;
    await set(() => ({ companyList: data, isLoading: false }));
  },
}));

export default useCompanyStore;
