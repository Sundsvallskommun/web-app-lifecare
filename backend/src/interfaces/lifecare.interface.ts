export interface PersonIdResponse {
  personId: string;
}

export interface PersonInfoResponse {
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

export interface UpdatePersonDetailsData {
  customFriendlyGivenname?: string;
  restrictedMobile?: string;
  restrictedMobileIsManagedByCMG?: boolean;
}

export interface ContractorData {
  personId: string;
  orgId: number;
  ttlMonths: number;
  emailAddress: string;
  creatorPersonId: string;
}
