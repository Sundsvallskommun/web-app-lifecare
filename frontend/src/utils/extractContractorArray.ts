import { BasicContractorData, Contractor, ContractorDataFormat, NestedContractorData } from '@interfaces/contractor';

export const extractContractorArray = (data: ContractorDataFormat | null): Contractor[] => {
  if (!data) {
    return [];
  }

  // Check if it's NestedContractorData
  if ('data' in data && 'message' in data.data) {
    return (data as NestedContractorData).data.data;
  }

  // Check if it's BasicContractorData
  if ('data' in data && Array.isArray(data.data)) {
    return (data as BasicContractorData).data;
  }

  return [];
};
