export class SWRError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message);
    this.name = 'SWRError';
    this.cause = options?.cause;
    Object.setPrototypeOf(this, SWRError.prototype);
  }
}
