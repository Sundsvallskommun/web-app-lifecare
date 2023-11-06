export interface Contractor {
  contractId: number;
  personId: string;
  personNumber: string;
  classified: string;
  givenname: string;
  lastname: string;
  userId: string;
  loginname: string;
  emailAddress: string;
  restrictedMobile: string;
  title: string;
  hireDate: string;
  retireDate: string;
  ordererId: number;
  orgId: number;
  orgName: string | string[];
  isEmergencyClosed: boolean;
}

export interface ContractorWithName extends Contractor {
  name: string;
}

export interface BasicContractorData {
  data: Contractor[];
  message: string;
  status: number;
}

export interface NestedContractorData {
  data: BasicContractorData;
  status: number;
}

export type ContractorDataFormat = BasicContractorData | NestedContractorData;
