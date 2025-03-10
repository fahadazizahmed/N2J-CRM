import { Response } from 'express';

// Define allowed status codes for clarity
export type IStatusCode = 200 | 201 | 400 | 404 | 422;

/**
 * Sends a standardized error response
 * @param res Express Response object
 * @param message Error message
 * @param statusCode HTTP status code
 * @param data Optional additional data
 */
export const sendErrorResponse = (
  res: Response,
  message: string,
  statusCode: IStatusCode,
  data: any = null
): void => {
  const responseObject: Record<string, any> = {
    success: false,
    errors: [{ message }],
  };

  if (data) {
    responseObject.data = data;
  }

  res.status(statusCode).json(responseObject);
};

/**
 * Sends a standardized success response
 * @param res Express Response object
 * @param message Success message
 * @param statusCode HTTP status code
 * @param data Optional additional data
 */
export const sendSuccessResponse = (
  res: Response,
  message: string,
  statusCode: IStatusCode = 200,
  data: any = null
): void => {
  const responseObject: Record<string, any> = {
    success: true,
    message,
    ...(data && { data }), // Adds `data` only if it exists
  };

  res.status(statusCode).json(responseObject);
};
