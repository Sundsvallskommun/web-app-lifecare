import { BasicContractorData } from '@interfaces/contractor';
import { getContractorByLoginName } from '@services/contractor.service';
import { create } from 'zustand';

interface ContractorStore {
  contractorData: BasicContractorData | null;
  setContractorData: (data: BasicContractorData) => void;
  fetchContractorData: () => Promise<void>;
}

const useContractorStore = create<ContractorStore>((set) => ({
  contractorData: null,
  setContractorData: (data) => set({ contractorData: data }),
  fetchContractorData: async () => {
    try {
      const fetchedContractorData = await getContractorByLoginName();
      const mappedData = {
        data: fetchedContractorData.data,
        message: 'Fetched contractor data.',
        status: fetchedContractorData.status || 0,
      };

      set({ contractorData: mappedData });
    } catch (error) {
      console.error('Error fetching contractor data:', error);
    }
  },
}));

export default useContractorStore;
