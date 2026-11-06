import App from '@/app';
import { registeredControllers } from '@/registered-controllers';
import validateEnv from '@utils/validateEnv';

validateEnv();

const app = new App(registeredControllers);

app.listen();
