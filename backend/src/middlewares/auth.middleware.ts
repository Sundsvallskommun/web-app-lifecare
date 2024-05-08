import { NextFunction, Request, Response } from 'express';
import { HttpException } from '@exceptions/HttpException';

const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.isAuthenticated()) {
      next();
    } else {
      next(new HttpException(401, 'Not Authorized'));
    }
  } catch (error) {
    next(new HttpException(401, 'Failed to authorize'));
  }
};

export default authMiddleware;
