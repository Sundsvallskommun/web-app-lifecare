import { NextFunction, Request, Response } from 'express';
import { HttpException } from '@exceptions/HttpException';
import { logger } from '@utils/logger';

const errorMiddleware = (error: HttpException & { httpCode?: number; errors?: unknown[] }, req: Request, res: Response, next: NextFunction) => {
  try {
    const status: number = error.status || error.httpCode || 500;
    const message: string = error.message || 'Something went wrong';
    const errors = error.errors;

    const details = errors ? ` >> Errors:: ${JSON.stringify(errors)}` : '';
    console.error(`[${req.method}] ${req.path} >> StatusCode:: ${status}, Message:: ${message}${details}`);
    logger.error(`[${req.method}] ${req.path} >> StatusCode:: ${status}, Message:: ${message}${details}`);
    res.status(status).json(errors ? { message, errors } : { message });
  } catch (error) {
    next(error);
  }
};

export default errorMiddleware;
