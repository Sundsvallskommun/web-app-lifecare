export interface Contractor {
  personId: string;
  contractId: number;
  orgId: number;
  orgName: string;
  isEmergencyClosed: boolean;
  hireDate: string;
  retireDate: string;
}
export interface User {
  [key: string]: string | number | boolean | Contractor[];
  name: string;
  guid: string;
  personId: string;
  givenName: string;
  surname: string;
  username: string;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  orgId?: number;
  orgName?: string;
  retireDate?: string;
  contracts?: Contractor[];
}
