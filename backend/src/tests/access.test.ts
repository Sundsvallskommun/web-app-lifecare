import 'reflect-metadata';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HttpException } from '@/exceptions/HttpException';
import { RequestWithUser } from '@/interfaces/auth.interface';
import { Contractor, User } from '@/interfaces/users.interface';

const api = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
}));

vi.mock('@/services/api.service', () => ({
  default: class {
    get = api.get;
    post = api.post;
    patch = api.patch;
    delete = api.delete;
  },
}));

const {
  CONTRACTS_TTL_MS,
  allowedOrgIds,
  assertCanEditPerson,
  assertCanManageContract,
  assertCanManagePerson,
  assertInOrg,
  canSetUpPerson,
  isActiveContract,
  refreshContracts,
  statusOf,
} = await import('@/services/access.service');
const { AccountController } = await import('@/controllers/account.controller');
const { ContractorController } = await import('@/controllers/contractor.controller');
const { OrganizationController } = await import('@/controllers/organization.controller');

/**
 * The decision, not the transport: the API service is mocked and every case asserts the
 * status the client would see. 403 for both foreign and missing, so ids cannot be probed.
 */

const MY_ORG = 10;
const OTHER_ORG = 20;
const PERSON = 'b2c3d4e5-0000-4000-8000-000000000001';
const PAST = '2000-01-01';
const FUTURE = '2999-12-31';

const contract = (orgId: number, contractId = 100, overrides: Partial<Contractor> = {}): Contractor => ({
  personId: PERSON,
  contractId,
  orgId,
  orgName: `org ${orgId}`,
  isEmergencyClosed: false,
  hireDate: '',
  retireDate: FUTURE,
  ...overrides,
});

const userWith = (opts: { isSuperAdmin?: boolean; contracts?: Contractor[] } = {}): User => ({
  name: 'Admin',
  guid: 'creator',
  personId: 'creator',
  givenName: 'Ad',
  surname: 'Min',
  username: 'admin',
  isSuperAdmin: opts.isSuperAdmin ?? false,
  isAdmin: !opts.isSuperAdmin,
  contracts: opts.contracts ?? [contract(MY_ORG, 1)],
  contractsFetchedAt: Date.now(),
});

const admin = () => userWith();
const superAdmin = () => userWith({ isSuperAdmin: true, contracts: undefined });
const requestAs = (user: User) => ({ user }) as unknown as RequestWithUser;

const personHas = (...contracts: Contractor[]) => api.get.mockResolvedValue({ data: contracts, message: 'success' });
const personMissing = () => api.get.mockRejectedValue(new HttpException(404, 'Not found'));

const statusOfRejection = (promise: Promise<unknown>) =>
  promise.then(
    () => 'resolved',
    error => statusOf(error),
  );

beforeEach(() => {
  vi.clearAllMocks();
});

describe('statusOf', () => {
  it('reads the status off a routing-controllers error, where instanceof is always false', () => {
    expect(statusOf(new HttpException(403, 'MISSING_PERMISSIONS'))).toBe(403);
  });
});

describe('isActiveContract and allowedOrgIds (B1)', () => {
  const now = new Date(2026, 9, 30, 15, 0);

  it('counts a contract without retire date, or retiring today or later, as active', () => {
    expect(isActiveContract(contract(MY_ORG, 1, { retireDate: '' }), now)).toBe(true);
    expect(isActiveContract(contract(MY_ORG, 1, { retireDate: '2026-10-30' }), now)).toBe(true);
    expect(isActiveContract(contract(MY_ORG, 1, { retireDate: FUTURE }), now)).toBe(true);
  });

  it('does not count a retired or emergency-closed contract as active', () => {
    expect(isActiveContract(contract(MY_ORG, 1, { retireDate: '2026-10-29' }), now)).toBe(false);
    expect(isActiveContract(contract(MY_ORG, 1, { isEmergencyClosed: true }), now)).toBe(false);
  });

  it('gives access only to the orgs of active contracts', () => {
    const user = userWith({
      contracts: [contract(MY_ORG, 1), contract(OTHER_ORG, 2, { retireDate: PAST }), contract(30, 3, { isEmergencyClosed: true })],
    });

    expect([...allowedOrgIds(user)]).toEqual([MY_ORG]);
  });
});

describe('refreshContracts (B2)', () => {
  it('re-reads the contracts once they are older than the TTL', async () => {
    const user = admin();
    user.contractsFetchedAt = Date.now() - CONTRACTS_TTL_MS - 1;
    api.get.mockResolvedValue({ data: [contract(OTHER_ORG, 9)], message: 'success' });

    await refreshContracts(user);

    expect(api.get).toHaveBeenCalledWith({ url: expect.stringContaining('/contractor/loginname/admin') });
    expect(user.contracts.map(c => c.orgId)).toEqual([OTHER_ORG]);
  });

  it('keeps fresh contracts without a call', async () => {
    const user = admin();

    await refreshContracts(user);

    expect(api.get).not.toHaveBeenCalled();
  });

  it('re-reads a session from before the cache existed', async () => {
    const user = admin();
    delete user.contractsFetchedAt;
    api.get.mockResolvedValue({ data: [], message: 'success' });

    await refreshContracts(user);

    expect(api.get).toHaveBeenCalled();
  });

  it('removes all access when the login no longer has contracts', async () => {
    const user = admin();
    user.contractsFetchedAt = 0;
    personMissing();

    await refreshContracts(user);

    expect(allowedOrgIds(user).size).toBe(0);
  });

  it('never calls for a super admin', async () => {
    await refreshContracts(superAdmin());

    expect(api.get).not.toHaveBeenCalled();
  });
});

describe('assertCanManageContract', () => {
  it('allows a contract in one of my orgs', async () => {
    personHas(contract(MY_ORG, 100), contract(OTHER_ORG, 200));

    await expect(assertCanManageContract(admin(), PERSON, 100)).resolves.toBeUndefined();
  });

  it('denies a contract in another org with 403', async () => {
    personHas(contract(MY_ORG, 100), contract(OTHER_ORG, 200));

    expect(await statusOfRejection(assertCanManageContract(admin(), PERSON, 200))).toBe(403);
  });

  it('denies a contract that does not belong to the person with 403', async () => {
    personHas(contract(MY_ORG, 100));

    expect(await statusOfRejection(assertCanManageContract(admin(), PERSON, 999))).toBe(403);
  });

  it('denies a missing person with 403, not 404', async () => {
    personMissing();

    expect(await statusOfRejection(assertCanManageContract(admin(), PERSON, 100))).toBe(403);
  });

  it('accepts the contract id as a string, as it arrives from a path parameter', async () => {
    personHas(contract(MY_ORG, 100));

    await expect(assertCanManageContract(admin(), PERSON, '100')).resolves.toBeUndefined();
  });

  it('lets a super admin through without a lookup', async () => {
    await expect(assertCanManageContract(superAdmin(), PERSON, 200)).resolves.toBeUndefined();
    expect(api.get).not.toHaveBeenCalled();
  });

  it('denies an admin whose own contract in the org has ended (B1)', async () => {
    personHas(contract(MY_ORG, 100));
    const retired = userWith({ contracts: [contract(MY_ORG, 1, { retireDate: PAST })] });

    expect(await statusOfRejection(assertCanManageContract(retired, PERSON, 100))).toBe(403);
  });

  it('denies an admin whose own contract in the org is emergency closed (B1)', async () => {
    personHas(contract(MY_ORG, 100));
    const closed = userWith({ contracts: [contract(MY_ORG, 1, { isEmergencyClosed: true })] });

    expect(await statusOfRejection(assertCanManageContract(closed, PERSON, 100))).toBe(403);
  });

  it.each(['../contractors', 'a/b', '', 'x'.repeat(65)])('rejects person id %j before it reaches a path', async personId => {
    expect(await statusOfRejection(assertCanManageContract(superAdmin(), personId, 100))).toBe(400);
    expect(api.get).not.toHaveBeenCalled();
  });
});

describe('assertCanManagePerson', () => {
  it('allows a person with a contract in my org', async () => {
    personHas(contract(MY_ORG, 100));

    await expect(assertCanManagePerson(admin(), PERSON)).resolves.toBeUndefined();
  });

  it('allows a person who also has an active contract in another org', async () => {
    personHas(contract(MY_ORG, 100), contract(OTHER_ORG, 200));

    await expect(assertCanManagePerson(admin(), PERSON)).resolves.toBeUndefined();
  });

  it('denies a person contracted only in another org with 403', async () => {
    personHas(contract(OTHER_ORG, 200));

    expect(await statusOfRejection(assertCanManagePerson(admin(), PERSON))).toBe(403);
  });

  it('denies a person whose contract in my org has ended, even with no other contract (B1)', async () => {
    personHas(contract(MY_ORG, 100, { retireDate: PAST }));

    expect(await statusOfRejection(assertCanManagePerson(admin(), PERSON))).toBe(403);
  });

  it('denies a person who has moved on: ended in my org, active in another (B1)', async () => {
    personHas(contract(MY_ORG, 100, { retireDate: PAST }), contract(OTHER_ORG, 200));

    expect(await statusOfRejection(assertCanManagePerson(admin(), PERSON))).toBe(403);
  });

  it('denies a person whose contract in my org is emergency closed (B1)', async () => {
    personHas(contract(MY_ORG, 100, { isEmergencyClosed: true }));

    expect(await statusOfRejection(assertCanManagePerson(admin(), PERSON))).toBe(403);
  });

  it('denies a person with no contracts with 403', async () => {
    personHas();

    expect(await statusOfRejection(assertCanManagePerson(admin(), PERSON))).toBe(403);
  });

  it('denies a missing person with 403, not 404', async () => {
    personMissing();

    expect(await statusOfRejection(assertCanManagePerson(admin(), PERSON))).toBe(403);
  });

  it('lets a super admin through without a lookup', async () => {
    await expect(assertCanManagePerson(superAdmin(), PERSON)).resolves.toBeUndefined();
    expect(api.get).not.toHaveBeenCalled();
  });
});

describe('assertCanEditPerson', () => {
  it('allows a person whose every contract is in my orgs', async () => {
    personHas(contract(MY_ORG, 100), contract(MY_ORG, 101));

    await expect(assertCanEditPerson(admin(), PERSON)).resolves.toBeUndefined();
  });

  it('denies a person who also has an active contract in another org with 403', async () => {
    personHas(contract(MY_ORG, 100), contract(OTHER_ORG, 200));

    expect(await statusOfRejection(assertCanEditPerson(admin(), PERSON))).toBe(403);
  });

  it('allows a person whose contract in another org has ended', async () => {
    personHas(contract(MY_ORG, 100), contract(OTHER_ORG, 200, { retireDate: PAST }));

    await expect(assertCanEditPerson(admin(), PERSON)).resolves.toBeUndefined();
  });

  it('denies a person whose only contract in my org has ended (B1)', async () => {
    personHas(contract(MY_ORG, 100, { retireDate: PAST }));

    expect(await statusOfRejection(assertCanEditPerson(admin(), PERSON))).toBe(403);
  });

  it('denies a person with no contracts with 403', async () => {
    personHas();

    expect(await statusOfRejection(assertCanEditPerson(admin(), PERSON))).toBe(403);
  });

  it('denies a missing person with 403, not 404', async () => {
    personMissing();

    expect(await statusOfRejection(assertCanEditPerson(admin(), PERSON))).toBe(403);
  });
});

describe('canSetUpPerson', () => {
  it('allows a person with no contracts yet', async () => {
    personMissing();

    expect(await canSetUpPerson(admin(), PERSON)).toBe(true);
  });

  it('allows a person already contracted in my orgs', async () => {
    personHas(contract(MY_ORG, 100));

    expect(await canSetUpPerson(admin(), PERSON)).toBe(true);
  });

  it('allows a person whose contract in another org has ended', async () => {
    personHas(contract(OTHER_ORG, 200, { retireDate: PAST }));

    expect(await canSetUpPerson(admin(), PERSON)).toBe(true);
  });

  it('leaves a person actively contracted in another org alone', async () => {
    personHas(contract(OTHER_ORG, 200));

    expect(await canSetUpPerson(admin(), PERSON)).toBe(false);
  });

  it('rejects a malformed person id with 400', async () => {
    expect(await statusOfRejection(canSetUpPerson(admin(), '../x'))).toBe(400);
  });
});

describe('assertInOrg', () => {
  it('allows one of my orgs', () => {
    expect(() => assertInOrg(admin(), MY_ORG)).not.toThrow();
  });

  it('denies another org with 403', () => {
    expect(() => assertInOrg(admin(), OTHER_ORG)).toThrow(expect.objectContaining({ httpCode: 403 }));
  });

  it('allows any org for a super admin', () => {
    expect(() => assertInOrg(superAdmin(), OTHER_ORG)).not.toThrow();
  });
});

describe('the controllers', () => {
  it('reset the password of a person in my org, even one also contracted elsewhere', async () => {
    personHas(contract(MY_ORG, 100), contract(OTHER_ORG, 200));
    api.post.mockResolvedValue({ data: {}, message: 'success' });

    await new AccountController().resetPasswordAndSendSMS(requestAs(admin()), { personId: PERSON, extra: 'x' } as never);

    // Only the person id is forwarded, not the rest of the body
    expect(api.post).toHaveBeenCalledWith(expect.objectContaining({ data: { personId: PERSON } }));
  });

  it('do not reset the password of a person in another org, and answer 403 rather than 500', async () => {
    personHas(contract(OTHER_ORG, 200));

    const status = await statusOfRejection(new AccountController().resetPasswordAndSendSMS(requestAs(admin()), { personId: PERSON }));

    expect(status).toBe(403);
    expect(api.post).not.toHaveBeenCalled();
  });

  it('do not delete a contract in another org', async () => {
    personHas(contract(OTHER_ORG, 200));

    const status = await statusOfRejection(new ContractorController().deleteOrgUser(requestAs(admin()), 200, PERSON));

    expect(status).toBe(403);
    expect(api.delete).not.toHaveBeenCalled();
  });

  it('extend a contract in my org without touching the person when the mobile is unchanged', async () => {
    personHas(contract(MY_ORG, 100), contract(OTHER_ORG, 200));
    api.patch.mockResolvedValue({ data: {}, message: 'success' });

    await new ContractorController().updateOrgUser(requestAs(admin()), { personId: PERSON, contractId: 100, ttlMonths: 6 });

    expect(api.patch).toHaveBeenCalledTimes(1);
    expect(api.patch).toHaveBeenCalledWith(expect.objectContaining({ data: { ttlMonths: 6 } }));
  });

  it('do not change the mobile of a person who also has a contract in another org', async () => {
    personHas(contract(MY_ORG, 100), contract(OTHER_ORG, 200));

    const status = await statusOfRejection(
      new ContractorController().updateOrgUser(requestAs(admin()), {
        personId: PERSON,
        contractId: 100,
        ttlMonths: 6,
        restrictedMobile: '0701234567',
      }),
    );

    expect(status).toBe(403);
    expect(api.patch).not.toHaveBeenCalled();
  });

  const newContractor = (orgId: number) => ({
    personId: PERSON,
    orgId,
    ttlMonths: 6,
    emailAddress: 'a@b.se',
    restrictedMobile: '0701234567',
  });

  it('create a contract and set the person up for a new person', async () => {
    personMissing();
    api.post.mockResolvedValue({ data: {}, message: 'success' });
    api.patch.mockResolvedValue({ data: {}, message: 'success' });

    const res = await new ContractorController().newOrgUser(requestAs(admin()), newContractor(MY_ORG));

    expect(res.personUpdated).toBe(true);
    expect(api.post).toHaveBeenCalledTimes(1);
    expect(api.patch).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ restrictedMobile: '0701234567' }) }));
  });

  it('create a contract for a person contracted in another org, but leave their mobile and name alone', async () => {
    personHas(contract(OTHER_ORG, 200));
    api.post.mockResolvedValue({ data: {}, message: 'success' });

    const res = await new ContractorController().newOrgUser(requestAs(admin()), newContractor(MY_ORG));

    expect(res.personUpdated).toBe(false);
    expect(api.post).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ orgId: MY_ORG }) }));
    expect(api.patch).not.toHaveBeenCalled();
  });

  it('do not create a contract in another org', async () => {
    const status = await statusOfRejection(new ContractorController().newOrgUser(requestAs(admin()), newContractor(OTHER_ORG)));

    expect(status).toBe(403);
    expect(api.post).not.toHaveBeenCalled();
  });

  it('answer 400, not a crash, when a super admin creates a contract without an org', async () => {
    const status = await statusOfRejection(new ContractorController().newOrgUser(requestAs(superAdmin()), newContractor(0)));

    expect(status).toBe(400);
  });

  it('list only the contractors of my active orgs, once per org (B1)', async () => {
    const user = userWith({
      contracts: [contract(MY_ORG, 1), contract(MY_ORG, 2), contract(OTHER_ORG, 3, { retireDate: PAST })],
    });
    api.get.mockResolvedValue({ data: [{ contractId: 100 }], message: 'success' });

    const res = await new ContractorController().getUserCompanyContractors(requestAs(user));

    expect(api.get).toHaveBeenCalledTimes(1);
    expect(api.get).toHaveBeenCalledWith({ url: expect.stringContaining(`/organization/${MY_ORG}/contractors`) });
    expect(res.data).toHaveLength(1);
  });

  it('offer only my active orgs, once each (B1)', async () => {
    const user = userWith({
      contracts: [contract(MY_ORG, 1), contract(MY_ORG, 2), contract(OTHER_ORG, 3, { isEmergencyClosed: true })],
    });

    const res = await new OrganizationController().getCompanies(requestAs(user));

    expect(res.data).toEqual([{ orgId: MY_ORG, orgName: `org ${MY_ORG}` }]);
  });
});
