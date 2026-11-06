import request from 'supertest';
import App from '@/app';
import { IndexController } from '@controllers/index.controller';
import { localApi } from '@utils/util';
import { describe, it } from 'vitest';

describe('Testing Index', () => {
  describe('[GET] /', () => {
    it('response statusCode 200', () => {
      const app = new App([IndexController]);
      return request(app.getServer()).get(localApi('/')).expect(200);
    });
  });
});
