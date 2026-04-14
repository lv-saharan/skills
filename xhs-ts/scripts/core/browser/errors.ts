/**
 * Browser Module Errors
 *
 * @module core/browser/errors
 * @description Unified error types for browser operations
 */

// ============================================
// Error Codes
// ============================================

/**
 * Browser error codes
 */
export enum BrowserErrorCode {
  /** Browser executable not found */
  EXECUTABLE_NOT_FOUND = 'BROWSER_EXECUTABLE_NOT_FOUND',
  /** Port unavailable or in use */
  PORT_UNAVAILABLE = 'BROWSER_PORT_UNAVAILABLE',
  /** Connection to browser failed */
  CONNECTION_FAILED = 'BROWSER_CONNECTION_FAILED',
  /** Stealth script injection failed */
  STEALTH_INJECTION_FAILED = 'BROWSER_STEALTH_INJECTION_FAILED',
  /** Process termination failed */
  PROCESS_TERMINATION_FAILED = 'BROWSER_PROCESS_TERMINATION_FAILED',
  /** Browser endpoint not ready */
  ENDPOINT_NOT_READY = 'BROWSER_ENDPOINT_NOT_READY',
  /** Invalid configuration */
  INVALID_CONFIG = 'BROWSER_INVALID_CONFIG',
  /** User data directory corrupted */
  USER_DATA_CORRUPTED = 'USER_DATA_CORRUPTED',
}

// ============================================
// Error Classes
// ============================================

/**
 * Base browser error class
 */
export class BrowserError extends Error {
  /**
   * Create a BrowserError
   * @param message - Error message
   * @param code - Error code
   * @param cause - Optional underlying cause
   */
  constructor(
    message: string,
    public code: BrowserErrorCode,
    public cause?: unknown
  ) {
    super(message);
    this.name = 'BrowserError';
  }

  /**
   * Convert to plain object for serialization
   */
  toJSON(): { name: string; message: string; code: string; cause?: unknown } {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      ...(this.cause ? { cause: this.cause } : {}),
    };
  }
}

/**
 * User data corrupted error - includes cleanup suggestion
 */
export class UserDataCorruptedError extends BrowserError {
  /**
   * User name affected
   */
  public readonly user: string;

  /**
   * Path to user data directory
   */
  public readonly userDataPath: string;

  /**
   * Create a UserDataCorruptedError
   * @param user - User name affected
   * @param userDataPath - Path to user data directory
   */
  constructor(user: string, userDataPath: string) {
    super(
      `User data directory may be corrupted for user "${user}". Browser process died immediately after startup. This is likely due to corrupted browser profile data in: ${userDataPath}`,
      BrowserErrorCode.USER_DATA_CORRUPTED
    );
    this.name = 'UserDataCorruptedError';
    this.user = user;
    this.userDataPath = userDataPath;
  }

  /**
   * Convert to plain object for serialization
   */
  toJSON(): {
    name: string;
    message: string;
    code: string;
    user: string;
    userDataPath: string;
    suggestCleanup: boolean;
  } {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      user: this.user,
      userDataPath: this.userDataPath,
      suggestCleanup: true,
    };
  }
}

// ============================================
// Error Factory Functions
// ============================================

/**
 * Create a BrowserError with specified code
 */
export function createBrowserError(
  code: BrowserErrorCode,
  message: string,
  cause?: unknown
): BrowserError {
  return new BrowserError(message, code, cause);
}

/**
 * Create executable not found error
 */
export function createExecutableNotFoundError(customPath?: string): BrowserError {
  const message = customPath
    ? `Custom browser executable not found at: ${customPath}`
    : 'Chromium browser not found. Please install Playwright browsers with: npm run install:browser';
  return new BrowserError(message, BrowserErrorCode.EXECUTABLE_NOT_FOUND);
}

/**
 * Create port unavailable error
 */
export function createPortUnavailableError(port: number, preferredPort?: number): BrowserError {
  const message =
    preferredPort && preferredPort !== port
      ? `Preferred port ${preferredPort} unavailable, fallback port ${port} also unavailable`
      : `Port ${port} is unavailable`;
  return new BrowserError(message, BrowserErrorCode.PORT_UNAVAILABLE);
}

/**
 * Create connection failed error
 */
export function createConnectionFailedError(endpoint: string, timeout?: number): BrowserError {
  const message =
    `Failed to connect to browser at ${endpoint}` + (timeout ? ` within ${timeout}ms` : '');
  return new BrowserError(message, BrowserErrorCode.CONNECTION_FAILED);
}

/**
 * Create endpoint not ready error
 */
export function createEndpointNotReadyError(port: number, timeout: number): BrowserError {
  return new BrowserError(
    `Browser endpoint not ready within ${timeout}ms on port ${port}`,
    BrowserErrorCode.ENDPOINT_NOT_READY
  );
}

/**
 * Create process termination failed error
 */
export function createProcessTerminationFailedError(pid: number): BrowserError {
  return new BrowserError(
    `Failed to terminate browser process with PID ${pid}`,
    BrowserErrorCode.PROCESS_TERMINATION_FAILED
  );
}

/**
 * Create user data corrupted error
 */
export function createUserDataCorruptedError(
  user: string,
  userDataPath: string
): UserDataCorruptedError {
  return new UserDataCorruptedError(user, userDataPath);
}

// ============================================
// Type Guards
// ============================================

/**
 * Check if error is a BrowserError
 */
export function isBrowserError(error: unknown): error is BrowserError {
  return error instanceof BrowserError;
}

/**
 * Check if error has specific code
 */
export function isBrowserErrorCode(error: unknown, code: BrowserErrorCode): error is BrowserError {
  return isBrowserError(error) && error.code === code;
}

/**
 * Check if error is UserDataCorruptedError
 */
export function isUserDataCorruptedError(error: unknown): error is UserDataCorruptedError {
  return error instanceof UserDataCorruptedError;
}
