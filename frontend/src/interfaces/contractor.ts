export interface Contractor {
  contractId: number;
  personId: string;
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
  orgName: string;
  isEmergencyClosed: boolean;
}

export interface ContractorWithName extends Contractor {
  name: string;
}
