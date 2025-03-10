import { CustomError } from './custom-error';

export class UnProcessableEntityError extends CustomError {
  statusCode = 422;

  constructor(public message: string) {
    super(message);

    Object.setPrototypeOf(this, UnProcessableEntityError.prototype);
  }

  serializeErrors() {
    return [{ message: this.message }];
  }
}
