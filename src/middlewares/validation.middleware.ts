// src/middlewares/validation.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { validateBudgetRequest, approvalSchema, rejectionSchema } from '../utils/validation.util';
import { validationErrorResponse } from '../utils/response.util';

export const validateCreateBudgetRequest = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { error, value } = validateBudgetRequest(req.body);

  if (error) {
    return validationErrorResponse(
      res,
      error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }))
    );
  }

  req.body = value;
  next();
};

export const validateApproval = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { error, value } = approvalSchema.validate(req.body, { abortEarly: false });

  if (error) {
    return validationErrorResponse(
      res,
      error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }))
    );
  }

  req.body = value;
  next();
};

export const validateRejection = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { error, value } = rejectionSchema.validate(req.body, { abortEarly: false });

  if (error) {
    return validationErrorResponse(
      res,
      error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }))
    );
  }

  req.body = value;
  next();
};
