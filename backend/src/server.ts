import App from '@/app';
import { IndexController } from '@controllers/index.controller';
import validateEnv from '@utils/validateEnv';
import { UserController } from './controllers/user.controller';
import { HealthController } from './controllers/health.controller';
import { ContractorController } from './controllers/contractor.controller';
import { CitizenController } from './controllers/citizen.controller';
import { PersonController } from './controllers/person.controller';

validateEnv();

const app = new App([IndexController, UserController, CitizenController, ContractorController, PersonController, HealthController]);

app.listen();
