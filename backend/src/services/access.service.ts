import { getApiBase } from '@/config/api-config';
import { HttpException } from '@/exceptions/HttpException';
import { Contractor, User } from '@/interfaces/users.interface';
import ApiService from '@/services/api.service';
import { logger } from '@utils/logger';

/**
 * Access model: an admin acts within the orgs of their own active contracts and may touch
 * contracts in those orgs. A super admin may touch everything (role-only).
 *
 * The platform API sees only this application's machine token, so these checks are the
 * only place where "this contract is in your org" is decided.
 */

const apiService = new ApiService();

// How long the contracts read from metaadmin are trusted before they are read again (B2).
export const CONTRACTS_TTL_MS = 5 * 60 * 1000;

// personId is interpolated into downstream paths, so it must not be able to leave its segment.
const PERSON_ID_PATTERN = /^[A-Za-z0-9-]{1,64}$/;

/**
 * Status of an error without instanceof, which is always false on routing-controllers'
 * HttpError because it calls Object.setPrototypeOf in its constructor.
 */
export const statusOf = (error: unknown): number | undefined => {
  const candidate = error as { status?: unknown; httpCode?: unknown };
  const status = candidate?.status ?? candidate?.httpCode;
  return typeof status === 'number' ? status : undefined;
};

/** Lets an HTTP error pass through a catch-all with its own status; anything else becomes a 500. */
export const toHttpException = (error: unknown): HttpException => {
  const status = statusOf(error);
  const message = (error as Error)?.message ?? 'Internal server error';
  return new HttpException(status ?? 500, message);
};

/** A contract that has neither passed its retire date nor been emergency closed (B1). */
export const isActiveContract = (contract: Contractor, now = new Date()): boolean => {
  if (contract.isEmergencyClosed) return false;
  if (!contract.retireDate) return true;

  const retireDate = new Date(contract.retireDate);
  if (Number.isNaN(retireDate.getTime())) return true;

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return retireDate >= startOfToday;
};

/** The orgs the session may act within: those of its own active contracts. Never from the request. */
export const allowedOrgIds = (user: User): Set<number> => {
  return new Set((user.contracts ?? []).filter(contract => isActiveContract(contract)).map(contract => contract.orgId));
};

/** The contracts behind a login name, in the shape kept in the session. */
export const fetchContracts = async (username: string): Promise<Contractor[]> => {
  const res = await apiService.get<Contractor[]>({ url: `/${getApiBase('metaadmin')}/contractor/loginname/${username}` });

  return (res.data ?? []).map(contract => ({
    personId: contract.personId,
    contractId: contract.contractId,
    orgId: contract.orgId,
    orgName: contract.orgName,
    isEmergencyClosed: contract.isEmergencyClosed,
    hireDate: contract.hireDate,
    retireDate: contract.retireDate,
  }));
};

/**
 * Re-reads the session's contracts once they are older than CONTRACTS_TTL_MS (B2), so a
 * removed or emergency-closed contract stops granting access within minutes rather than
 * at the end of the session. Mutates the session user, which express-session then saves.
 */
export const refreshContracts = async (user: User, now = Date.now()): Promise<void> => {
  if (user.isSuperAdmin) return;
  if (typeof user.contractsFetchedAt === 'number' && now - user.contractsFetchedAt < CONTRACTS_TTL_MS) return;

  try {
    user.contracts = await fetchContracts(user.username);
  } catch (error) {
    if (statusOf(error) !== 404) throw error;
    user.contracts = [];
  }
  user.contractsFetchedAt = now;
};

const deny = (resource: string, id: string | number, user: User): never => {
  logger.warn(`Access denied: ${resource} '${id}' is outside the orgs of '${user.username}'`);
  throw new HttpException(403, 'MISSING_PERMISSIONS');
};

const actingOrgIds = (user: User): Set<number> => {
  const orgIds = allowedOrgIds(user);
  if (orgIds.size === 0) throw new HttpException(403, 'MISSING_REPRESENTING_CONTEXT');
  return orgIds;
};

const assertPersonId = (personId: string): void => {
  if (typeof personId !== 'string' || !PERSON_ID_PATTERN.test(personId)) {
    throw new HttpException(400, 'Bad Request');
  }
};

/** All contracts of a person, or null when the person has none (downstream 404). */
const getPersonContracts = async (personId: string): Promise<Contractor[] | null> => {
  try {
    const res = await apiService.get<Contractor[]>({ url: `/${getApiBase('metaadmin')}/contractor/${personId}` });
    return res.data ?? [];
  } catch (error) {
    if (statusOf(error) === 404) return null;
    throw error;
  }
};

const hasActiveContractOutside = (contracts: Contractor[], orgIds: Set<number>): boolean =>
  contracts.some(contract => isActiveContract(contract) && !orgIds.has(contract.orgId));

/** The caller may create a contract in this org. */
export const assertInOrg = (user: User, orgId: number): void => {
  if (!Number.isInteger(orgId) || orgId <= 0) throw new HttpException(400, 'Bad Request');
  if (user.isSuperAdmin) return;

  if (!actingOrgIds(user).has(orgId)) {
    deny('org', orgId, user);
  }
};

/** The caller may change the contract: it belongs to this person and lies in one of the caller's orgs. */
export const assertCanManageContract = async (user: User, personId: string, contractId: number | string): Promise<void> => {
  assertPersonId(personId);
  const id = Number(contractId);
  if (!Number.isInteger(id) || id <= 0) throw new HttpException(400, 'Bad Request');
  if (user.isSuperAdmin) return;

  const orgIds = actingOrgIds(user);
  const contracts = await getPersonContracts(personId);
  const contract = contracts?.find(candidate => candidate.contractId === id);

  if (!contract || !orgIds.has(contract.orgId)) {
    deny('contract', id, user);
  }
};

// An ended contract ties the person to the org no more than it gives the caller access (B1)
const hasActiveContractIn = (contracts: Contractor[], orgIds: Set<number>): boolean =>
  contracts.some(contract => isActiveContract(contract) && orgIds.has(contract.orgId));

/**
 * The caller may act on the person's account (password reset): the person has an active
 * contract in one of the caller's orgs. The SMS goes to the number on file, which
 * assertCanEditPerson keeps out of reach of other orgs, so one shared org is enough here.
 */
export const assertCanManagePerson = async (user: User, personId: string): Promise<void> => {
  assertPersonId(personId);
  if (user.isSuperAdmin) return;

  const orgIds = actingOrgIds(user);
  const contracts = (await getPersonContracts(personId)) ?? [];

  if (!hasActiveContractIn(contracts, orgIds)) {
    deny('person', personId, user);
  }
};

/**
 * The caller may change the person's own fields (mobile, display name): the person has an
 * active contract in one of the caller's orgs and no active contract anywhere else. These fields are
 * shared across orgs, so one shared org is not enough - it would let org A point org B's
 * password SMS at its own phone (B3).
 */
export const assertCanEditPerson = async (user: User, personId: string): Promise<void> => {
  assertPersonId(personId);
  if (user.isSuperAdmin) return;

  const orgIds = actingOrgIds(user);
  const contracts = (await getPersonContracts(personId)) ?? [];

  if (!hasActiveContractIn(contracts, orgIds) || hasActiveContractOutside(contracts, orgIds)) {
    deny('person', personId, user);
  }
};

/**
 * Whether a new contract may also set the person's own fields (B3). The contract itself is
 * always allowed in the caller's org; the person's fields are left alone when the person has
 * an active contract elsewhere, so the number the password SMS goes to stays theirs.
 */
export const canSetUpPerson = async (user: User, personId: string): Promise<boolean> => {
  assertPersonId(personId);
  if (user.isSuperAdmin) return true;

  const orgIds = actingOrgIds(user);
  const contracts = (await getPersonContracts(personId)) ?? [];

  if (hasActiveContractOutside(contracts, orgIds)) {
    logger.info(`Person fields left unchanged: '${personId}' has an active contract outside the orgs of '${user.username}'`);
    return false;
  }
  return true;
};
