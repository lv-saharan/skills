/**
 * Configuration types
 *
 * @module config/types
 * @description Type definitions for configuration
 */

// ============================================
// Platform Configuration
// ============================================

export interface DelayConfig {
  mean: number;
  stdDev: number;
}

export interface RangeConfig {
  min: number;
  max: number;
}

export interface PlatformConfig {
  name: string;
  domain: string;
  urls: {
    home: string;
    login: string;
    explore?: string;
    creator?: string;
    creatorPublish?: string;
  };
  timeouts: {
    networkIdle: number;
    pageLoad: number;
    upload?: number;
    login: number;
    selector: number;
    qrCheckInterval: number;
  };
  delays: {
    afterNavigation: DelayConfig;
    afterClick: DelayConfig;
    batchInterval: DelayConfig;
  };
  stealthDelays: {
    'gui-native': { action: RangeConfig; read: RangeConfig };
    headless: { action: RangeConfig; read: RangeConfig };
  };
}

// ============================================
// Selectors Configuration
// ============================================

export interface SelectorsConfig {
  login: {
    modal: string;
    buttons: string[];
    userComponent: string;
    qr: string[];
    qrTab: string;
    smsTab?: string;
    phoneInput?: string;
    sendSmsButton?: string;
    smsCodeInput?: string;
  };
  interact: {
    note?: {
      container: string;
      content: string;
      interactContainer: string;
      engagementBar: string;
      leftArea: string;
    };
    like: {
      button: string;
      icon: string;
      activeState: string;
      count: string;
    };
    collect: {
      button: string;
      icon: string;
      activeState: string;
      count: string;
    };
    comment?: {
      button: string;
      input: string;
      submit: string;
      list: string;
    };
    follow: {
      primaryButton: string;
      fallbackButtons: string[];
      userInfoContainer: string;
      followingText: string;
      notFollowingText: string;
    };
  };
  search: {
    container: string;
    noteCard: string;
    noteLink: string;
    userCard: string;
    userLink: string;
    noteTitle: string;
    authorName: string;
    likeCount: string;
    coverImage: string;
    loading: string;
  };
}

// ============================================
// Errors Configuration
// ============================================

export type ErrorsConfig = Record<string, string>;

// ============================================
// Messages Configuration
// ============================================

export interface MessagesConfig {
  qr: {
    scanPrompt: string;
    expiredMessage: string;
    notFoundMessage: string;
    captureFailedMessage: string;
  };
  login: {
    success: string;
    failedCaptcha: string;
    failedErrorPage: string;
    browserClosed: string;
    pageClosed: string;
    cookieFailed: string;
  };
  interact: {
    notLoggedIn: string;
    success: string;
  };
}

// ============================================
// Login Method
// ============================================

/** Login method type */
export type LoginMethod = 'qr' | 'sms';

// ============================================
// Application Configuration
// ============================================

/**
 * Application configuration from environment
 *
 * Environment variables:
 * - PROXY: Proxy URL (optional)
 * - HEADLESS: Headless browser mode
 * - BROWSER_PATH: Custom browser executable path (optional)
 * - BROWSER_CHANNEL: Browser channel (e.g., 'chrome', 'msedge')
 * - DEBUG: Enable debug logging (default: false)
 * - LOGIN_TIMEOUT: Login timeout in milliseconds (default: 120000)
 * - LOGIN_METHOD: Login method 'qr' or 'sms' (default: 'qr')
 */
export interface AppConfig {
  /** Proxy URL */
  proxy: string | undefined;
  /** Headless browser mode */
  headless: boolean;
  /** Custom browser executable path */
  browserPath: string | undefined;
  /** Browser channel */
  browserChannel: string | undefined;
  /** Debug logging enabled */
  debug: boolean;
  /** Login timeout in milliseconds */
  loginTimeout: number;
  /** Default login method */
  loginMethod: LoginMethod;
}
