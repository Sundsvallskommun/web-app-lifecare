import { Controller, Get } from 'routing-controllers';
import { Public } from '@/middlewares/global-auth';

@Controller()
export class IndexController {
  @Public('Service root - returns a static OK, reveals nothing')
  @Get('/')
  index() {
    return 'OK';
  }
}
