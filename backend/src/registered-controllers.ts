import { IndexController } from '@controllers/index.controller';
import { UserController } from '@controllers/user.controller';
import { HealthController } from '@controllers/health.controller';
import { ContractorController } from '@controllers/contractor.controller';
import { CitizenController } from '@controllers/citizen.controller';
import { OrganizationController } from '@controllers/organization.controller';
import { AccountController } from '@controllers/account.controller';

export const registeredControllers = [
  IndexController,
  UserController,
  CitizenController,
  AccountController,
  ContractorController,
  OrganizationController,
  HealthController,
];
