/** Base error for all Persistor SDK errors. */
export class PersistorError extends Error {
  public readonly statusCode?: number;
  public readonly endpoint: string;

  constructor(message: string, endpoint: string, statusCode?: number) {
    super(message);
    this.name = 'PersistorError';
    this.endpoint = endpoint;
    this.statusCode = statusCode;
  }
}

/** Thrown on 404 responses. */
export class NotFoundError extends PersistorError {
  constructor(message: string, endpoint: string) {
    super(message, endpoint, 404);
    this.name = 'NotFoundError';
  }
}

/** Thrown on 401/403 responses. */
export class AuthenticationError extends PersistorError {
  constructor(message: string, endpoint: string, statusCode: 401 | 403 = 401) {
    super(message, endpoint, statusCode);
    this.name = 'AuthenticationError';
  }
}

/** Thrown on 400/422 responses. */
export class ValidationError extends PersistorError {
  constructor(message: string, endpoint: string, statusCode: 400 | 422 = 400) {
    super(message, endpoint, statusCode);
    this.name = 'ValidationError';
  }
}

/** Thrown when a request times out. */
export class TimeoutError extends PersistorError {
  constructor(endpoint: string) {
    super(`Request timed out: ${endpoint}`, endpoint);
    this.name = 'TimeoutError';
  }
}

/** Thrown on network failures. */
export class ConnectionError extends PersistorError {
  constructor(message: string, endpoint: string) {
    super(message, endpoint);
    this.name = 'ConnectionError';
  }
}
