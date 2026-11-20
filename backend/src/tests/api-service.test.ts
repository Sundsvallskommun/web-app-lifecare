import 'reflect-metadata';
import { AxiosError, AxiosHeaders } from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RequestWithUser } from '@/interfaces/auth.interface';
import { Contractor, User } from '@/interfaces/users.interface';
import { logger } from '@utils/logger';

const { axiosCall } = vi.hoisted(() => ({ axiosCall: vi.fn() }));

vi.mock('axios', async importOriginal => {
  const actual = await importOriginal<typeof import('axios')>();
  return { ...actual, default: Object.assign(axiosCall, { isAxiosError: actual.default.isAxiosError }) };
});

vi.mock('@/services/api-token.service', () => ({
  default: class {
    getToken = async () => 'secret-token';
  },
}));

const { default: ApiService } = await import('@/services/api.service');
const { refreshContracts } = await import('@/services/access.service');
const { AccountController } = await import('@/controllers/account.controller');
const { CitizenController } = await import('@/controllers/citizen.controller');
const { ContractorController } = await import('@/controllers/contractor.controller');
const { HealthController } = await import('@/controllers/health.controller');
const { OrganizationController } = await import('@/controllers/organization.controller');

/**
 * The real controllers and ApiService with only axios mocked, so every call that would leave
 * the application is seen, including those made by the access checks.
 */

const MY_ORG = 10;
const OTHER_ORG = 20;
const CONTRACT = 100;
const PERSON = 'b2c3d4e5-0000-4000-8000-000000000001';
const PERSONAL_NUMBER = '199001011234';
const MOBILE = '0701234567';

const contract = (orgId: number): Contractor => ({
  personId: PERSON,
  contractId: CONTRACT,
  orgId,
  orgName: `org ${orgId}`,
  isEmergencyClosed: false,
  hireDate: '',
  retireDate: '2999-12-31',
});

const admin = { username: 'Kalle01Kar', guid: 'creator', isSuperAdmin: false, contracts: [contract(MY_ORG)] } as User;
const superAdmin = { username: 'Kalle01Kar', guid: 'creator', isSuperAdmin: true } as User;
const requestAs = (user: User) => ({ user }) as unknown as RequestWithUser;

const newContractor = { personId: PERSON, ttlMonths: 6, orgId: MY_ORG, emailAddress: 'a@b.se', restrictedMobile: MOBILE };
const changedContractor = { personId: PERSON, contractId: CONTRACT, ttlMonths: 6, restrictedMobile: MOBILE };

const downstreamHas = (...contracts: Contractor[]) => axiosCall.mockResolvedValue({ data: contracts });
const loggedInfo = () => vi.mocked(logger.info).mock.calls.map(call => String(call[0]));

beforeEach(() => {
  axiosCall.mockReset();
  downstreamHas(contract(MY_ORG));
  vi.spyOn(logger, 'info').mockImplementation(() => logger);
  vi.spyOn(logger, 'warn').mockImplementation(() => logger);
  vi.spyOn(logger, 'error').mockImplementation(() => logger);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ApiService', () => {
  it.each(['get', 'post', 'patch', 'delete'] as const)('sends the user as X-Sent-By on %s', async method => {
    await new ApiService()[method]({ url: 'metaadmin/x' }, { username: 'Kalle01Kar' });

    expect(axiosCall.mock.calls[0][0].headers['X-Sent-By']).toBe('type=adAccount; Kalle01Kar');
  });

  it('sends no X-Sent-By without a user', async () => {
    await new ApiService().get({ url: 'metaadmin/x' });

    expect(axiosCall.mock.calls[0][0].headers).not.toHaveProperty('X-Sent-By');
  });

  it('logs neither the url nor the token when a call fails', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    axiosCall.mockImplementation(async config => {
      const failed = { ...config, headers: new AxiosHeaders() };
      throw new AxiosError('failed', 'ERR_BAD_RESPONSE', failed, null, { status: 500, data: {}, statusText: '', headers: {}, config: failed });
    });

    const error = await new ApiService().get({ url: `citizen/2281/${PERSONAL_NUMBER}/guid` }).catch(e => e);

    const written = [logger.info, logger.warn, logger.error, consoleError].flatMap(spy => vi.mocked(spy).mock.calls.flat()).join(' ');
    expect(`${written} ${error.message}`).not.toContain(PERSONAL_NUMBER);
    expect(written).not.toContain('secret-token');
  });
});

describe('user-initiated downstream calls', () => {
  it.each<[string, User, (req: RequestWithUser) => Promise<unknown>]>([
    ['GET /mycontractors as admin', admin, req => new ContractorController().getUserCompanyContractors(req)],
    ['GET /mycontractors as superadmin', superAdmin, req => new ContractorController().getUserCompanyContractors(req)],
    ['POST /contractor as admin', admin, req => new ContractorController().newOrgUser(req, newContractor)],
    ['POST /contractor as superadmin', superAdmin, req => new ContractorController().newOrgUser(req, newContractor)],
    ['PATCH /contractor as admin', admin, req => new ContractorController().updateOrgUser(req, changedContractor)],
    ['PATCH /contractor as superadmin', superAdmin, req => new ContractorController().updateOrgUser(req, changedContractor)],
    ['DELETE /contractor as admin', admin, req => new ContractorController().deleteOrgUser(req, CONTRACT, PERSON)],
    ['DELETE /contractor as superadmin', superAdmin, req => new ContractorController().deleteOrgUser(req, CONTRACT, PERSON)],
    ['POST /account as admin', admin, req => new AccountController().resetPasswordAndSendSMS(req, { personId: PERSON })],
    ['POST /account as superadmin', superAdmin, req => new AccountController().resetPasswordAndSendSMS(req, { personId: PERSON })],
    ['POST /lookup', admin, req => new CitizenController().getCitizen(req, { SocialSecurityNumber: PERSONAL_NUMBER })],
    ['GET /organization as superadmin', superAdmin, req => new OrganizationController().getCompanies(req)],
    ['the contracts refresh', admin, req => refreshContracts(req.user, Date.now())],
  ])('all carry the user on %s', async (_name, user, action) => {
    await action(requestAs({ ...user }));

    const sentBy = axiosCall.mock.calls.map(([config]) => config.headers['X-Sent-By']);
    expect(sentBy.length).toBeGreaterThan(0);
    expect(new Set(sentBy)).toEqual(new Set(['type=adAccount; Kalle01Kar']));
  });
});

describe('the health check', () => {
  it('carries no user', async () => {
    await new HealthController().up();

    expect(axiosCall).toHaveBeenCalledTimes(1);
    expect(axiosCall.mock.calls[0][0].headers).not.toHaveProperty('X-Sent-By');
  });
});

describe('the log of write actions', () => {
  it('has who created what, and who changed the person', async () => {
    await new ContractorController().newOrgUser(requestAs(admin), newContractor);

    expect(loggedInfo()).toEqual([
      `Contract create: person '${PERSON}' in org ${MY_ORG} by 'Kalle01Kar'`,
      `Person update: '${PERSON}' by 'Kalle01Kar'`,
    ]);
  });

  it('does not claim a person update when the person has an active contract elsewhere', async () => {
    downstreamHas(contract(OTHER_ORG));

    await new ContractorController().newOrgUser(requestAs(admin), newContractor);

    expect(loggedInfo().filter(line => line.startsWith('Person update'))).toEqual([]);
    expect(loggedInfo()).toContain(`Person fields left unchanged: '${PERSON}' has an active contract outside the orgs of 'Kalle01Kar'`);
  });

  it('has who changed what', async () => {
    await new ContractorController().updateOrgUser(requestAs(admin), changedContractor);

    expect(loggedInfo()).toEqual([
      `Contract update: ${CONTRACT} of person '${PERSON}' by 'Kalle01Kar'`,
      `Person update: '${PERSON}' by 'Kalle01Kar'`,
    ]);
  });

  it('has who deleted what', async () => {
    await new ContractorController().deleteOrgUser(requestAs(admin), CONTRACT, PERSON);

    expect(loggedInfo()).toEqual([`Contract delete: ${CONTRACT} of person '${PERSON}' by 'Kalle01Kar'`]);
  });

  it('has who reset which password', async () => {
    await new AccountController().resetPasswordAndSendSMS(requestAs(admin), { personId: PERSON });

    expect(loggedInfo()).toEqual([`Password reset: person '${PERSON}' by 'Kalle01Kar'`]);
  });

  it('has the attempt even when the downstream call fails, since the effect is then unknown', async () => {
    axiosCall.mockImplementation(async ({ method }) => {
      if (method === 'GET') return { data: [contract(MY_ORG)] };
      throw new Error('timeout');
    });

    await expect(new AccountController().resetPasswordAndSendSMS(requestAs(admin), { personId: PERSON })).rejects.toMatchObject({ status: 500 });

    expect(loggedInfo()).toEqual([`Password reset: person '${PERSON}' by 'Kalle01Kar'`]);
  });

  it('has no action for a denied write, which the access check logs as denied', async () => {
    downstreamHas(contract(OTHER_ORG));

    await expect(new ContractorController().deleteOrgUser(requestAs(admin), CONTRACT, PERSON)).rejects.toMatchObject({ status: 403 });

    expect(loggedInfo()).toEqual([]);
    expect(vi.mocked(logger.warn).mock.calls.map(call => String(call[0]))).toEqual([
      `Access denied: contract '${CONTRACT}' is outside the orgs of 'Kalle01Kar'`,
    ]);
  });
});
