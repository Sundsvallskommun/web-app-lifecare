export interface Organization {
  orgId: number;
  orgName: string;
  companyId: number;
  parentId: number;
  topOrgId: number;
  orgPath: string;
  isLeafLevel: boolean;
  isExternal: boolean;
  isSchool: boolean;
  treeLevel: number;
  isEnabled: boolean;
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
