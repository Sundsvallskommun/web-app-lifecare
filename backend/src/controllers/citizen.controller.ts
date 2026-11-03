import { Controller, Body, UseBefore, Req, Post } from 'routing-controllers';
import ApiService from '@/services/api.service';
import { OpenAPI } from 'routing-controllers-openapi';
import authMiddleware from '@/middlewares/auth.middleware';
import { HttpException } from '@/exceptions/HttpException';
import { RequestWithUser } from '@/interfaces/auth.interface';
import { toHttpException } from '@/services/access.service';
import { Allow } from 'class-validator';
import { getApiBase } from '@/config/api-config';
import { MUNICIPALITY_ID } from '@config';
import { logger } from '@utils/logger';
import { ipKeyGenerator, rateLimit } from 'express-rate-limit';

interface ResponseData<T> {
  data: T;
  message: string;
  status: number;
}

export const LOOKUP_LIMIT = 30;
const LOOKUP_WINDOW_MS = 15 * 60 * 1000;

// Interpolated into a downstream path. The frontend sends it with or without the hyphen.
const SOCIAL_SECURITY_NUMBER_PATTERN = /^\d{8}-?\d{4}$/;

const maskSocialSecurityNumber = (socialSecurityNumber: string): string => `${socialSecurityNumber.slice(0, 6)}******`;

// Action level, so it runs after the class-level auth and anonymous requests never count.
const lookupRateLimit = rateLimit({
  windowMs: LOOKUP_WINDOW_MS,
  limit: LOOKUP_LIMIT,
  standardHeaders: true,
  legacyHeaders: false,
  // Not the session, since logging in again would start a new count.
  keyGenerator: req => (req as RequestWithUser).user?.username?.toLowerCase() ?? ipKeyGenerator(req.ip ?? ''),
  // The key is the user and IP only a fallback, so the header from nginx does not matter.
  validate: { xForwardedForHeader: false },
  handler: (_req, _res, next) => next(new HttpException(429, 'Too many lookups')),
});

export class citizenDTO {
  // Checked in the handler: a validator's error carries the rejected value, and
  // the error middleware would log and return the personal number.
  @Allow()
  SocialSecurityNumber: string;
}

@Controller()
@UseBefore(authMiddleware)
export class CitizenController {
  private apiService = new ApiService();

  @Post('/lookup')
  @UseBefore(lookupRateLimit)
  @OpenAPI({ summary: 'Get citizen info from social security number' })
  async getCitizen(@Req() req: RequestWithUser, @Body() body: citizenDTO): Promise<ResponseData<any>> {
    try {
      const { SocialSecurityNumber } = body;

      if (typeof SocialSecurityNumber !== 'string' || !SOCIAL_SECURITY_NUMBER_PATTERN.test(SocialSecurityNumber)) {
        throw new HttpException(400, 'Bad Request');
      }

      logger.info(`Citizen lookup: '${maskSocialSecurityNumber(SocialSecurityNumber)}' by '${req.user.username}'`);

      const urlForGuid = `/${getApiBase('citizen')}/${MUNICIPALITY_ID}/${SocialSecurityNumber}/guid`;
      const resGuid = await this.apiService.get<any>({ url: urlForGuid });

      if (!resGuid || !resGuid.data) {
        throw new HttpException(404, 'GUID not found for the provided SocialSecurityNumber');
      }

      const personId = resGuid.data;

      const url = `/${getApiBase('citizen')}/${MUNICIPALITY_ID}/${personId}`;
      const res = await this.apiService.get<any>({ url });
      const { givenname, lastname } = res.data;

      const resData = {
        personId,
        givenname,
        lastname,
      };

      return { data: resData, message: 'success', status: 200 };
    } catch (error) {
      throw toHttpException(error);
    }
  }
}
