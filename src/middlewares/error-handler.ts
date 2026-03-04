import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { CustomError } from '../errors/custom-error';
import multer from 'multer';
import { deleteFile } from '../helper/helper.method';

export const errorHandler: ErrorRequestHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // 🧹 CLEAN UP FILES FIRST
  if (req.file) {
    deleteFile(req.file.path);
  }

  if (req.files) {
    Object.values(req.files as any)
      .flat()
      .forEach((file: any) => deleteFile(file.path));
  }

  if (err instanceof CustomError) {
    res.status(err.statusCode).send({ errors: err.serializeErrors() });
    return;
  }
  if (err instanceof multer.MulterError) {
    res.status(400).send({ errors: [{ message: err.message }] });
    return;
  }
  res.status(500).send({
    errors: [{ message: 'Something went wrong' }],
  });
};
