import { CustomError } from './custom-error';

export class GenericError extends CustomError {
  statusCode = 500;
  message = 'Internal Server Error';

  constructor(e?: Error | CustomError, errorSource?: string) {
    super('Internal Server Error');

    if (e instanceof CustomError) {
      this.message = e.message;
      this.statusCode = e.statusCode;
    } else if (e instanceof Error) {
      this.message = e.message;
    }

    Object.setPrototypeOf(this, GenericError.prototype);
  }

  serializeErrors() {
    return [{ message: this.message }];
  }
}
