export class ApplicationAlreadyInitializedError extends Error {
  constructor() {
    super('Application has already been initialized.');
    this.name = 'ApplicationAlreadyInitializedError';
  }
}