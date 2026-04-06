/**
 * CDP Browser Module
 *
 * @module browser/cdp
 * @description CDP-based browser connector for xhs-ts
 */

// Types
export { DEFAULT_CDP_CONNECT_TIMEOUT } from './constants';

// Connector
export { connectCDPBrowser, checkCDPConnection } from './connector';
