// 1. Response from getPersonId function
export interface PersonIdResponse {
  data: string;
}

// 2. Expected request data for updatePersonDetails
export interface PersonInfoUpdateData {
  name?: string;
  email?: string;
  restrictedMobileIsManagedByCMG?: boolean;
  restrictedMobile?: string;
}

// 3. Expected request data for createContractor
export interface ContractorData {
  name: string;
  position: string;
}

export interface Organization {
  id: number;
  name: string;
  treeLevel: number;
  companyId: number;
}

export interface ChildOrganization extends Organization {
  parentId: number;
}

export interface Contractor {
  id: number;
  name: string;
  orgId: number;
  citizenIdentifier: string;
  contractId: number;
  ttlMonths: number;
  data: {
    personId: string;
  };
}

export interface Person {
  personId: string;
  classified: string;
  firstname: string;
  middlename: string;
  lastname: string;
  friendlyGivenname: string;
  customFriendlyGivenname: string;
  workPhone: string;
  workMobile: string;
  restrictedMobile: string;
  restrictedMobileIsManagedByCMG: boolean;
}

export interface PersonUpdate {
  customFriendlyGivenname: string;
  restrictedMobile: string;
}
