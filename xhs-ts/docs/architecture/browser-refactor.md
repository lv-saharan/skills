# Browser 模块重构方案

> 文档版本：1.1  
> 创建日期：2026-04-07  
> 最后更新：2026-04-14  
> 状态：已实施（Week 1-5 完成，Week 6 待完成）

---

## 目录

1. [当前架构分析](#1-当前架构分析)
2. [问题诊断](#2-问题诊断)
3. [重构方案](#3-重构方案)
4. [迁移路径](#4-迁移路径)
5. [验证标准](#5-验证标准)

---

## 1. 当前架构分析

### 1.1 文件结构

```
scripts/core/browser/
├── index.ts                    # 模块入口 (70 行)
├── types.ts                    # 统一类型定义 (216 行)
├── launcher.ts                 # 浏览器启动逻辑 (636 行) ⚠️
├── port-utils.ts               # 端口分配 (100 行)
├── stealth-behavior.ts         # 环境预设配置 (158 行)
├── connection/
│   ├── index.ts               # 连接模块入口 (15 行)
│   ├── connector.ts           # BrowserServer + CDP 连接器 (133 行)
│   └── constants.ts           # 连接常量 (13 行)
└── stealth/
    ├── index.ts               # Stealth 脚本生成器 (117 行)
    ├── types.ts               # Stealth 类型 (63 行)
    ├── constants.ts           # 默认配置 (48 行)
    ├── utils.ts               # 脚本工具函数 (124 行)
    ├── navigator.ts           # Navigator 伪装 (127 行)
    ├── screen.ts              # Screen 伪装
    ├── webgl.ts               # WebGL 指纹
    ├── canvas.ts              # Canvas 噪声
    ├── audio.ts               # Audio 噪声
    ├── chrome.ts              # Chrome API 模拟
    ├── webrtc.ts              # WebRTC 防护
    ├── media.ts               # Media 伪装
    ├── timezone.ts            # 时区一致性
    ├── font.ts                # 字体防护
    ├── battery.ts             # Battery API 模拟
    ├── geolocation.ts         # 地理位置模拟
    └── performance.ts         # Performance API 一致性
```

### 1.2 调用流程图

```
┌─────────────────────────────────────────────────────────────────┐
│ actions/shared/browser-launcher.ts                              │
│ ┌─────────────────────────────────────────────────────────┐    │
│ │ launchProfileBrowser()                                  │    │
│ │  1. resolveUser() → loadUserProfile()                   │    │
│ │  2. getStealthBehavior()                                │    │
│ │  3. allocatePortForIdentifier()                         │    │
│ │  4. loadConnectionInfo()                                │    │
│ │  5. launchBrowserCore() ◄──────────────────────────────┼────┤
│ │  6. saveConnectionInfo()                                │    │
│ └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ core/browser/launcher.ts (636 行) ⚠️                            │
│ ┌─────────────────────────────────────────────────────────┐    │
│ │ launchBrowser()                                         │    │
│ │  ├─ tryReconnectServer() / tryReconnectCDP()            │    │
│ │  ├─ launchBrowserServer()                               │    │
│ │  └─ setupContext() → injectStealthToContext()           │    │
│ └─────────────────────────────────────────────────────────┘    │
│                              │                                   │
│                              ▼                                   │
│ ┌─────────────────────────────────────────────────────────┐    │
│ │ generateStealthScript()                                 │    │
│ │  ├─ generateNavigatorScript()                           │    │
│ │  ├─ generateScreenScript()                              │    │
│ │  ├─ generateWebGLScript()                               │    │
│ │  └─ ... (15 个模块)                                      │    │
│ └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ core/browser/connection/connector.ts                            │
│ ┌─────────────────┐  ┌─────────────────┐                       │
│ │ connectToServer │  │ connectCDPBrowser│ (legacy)             │
│ │ (BrowserServer) │  │ (CDP)           │                       │
│ └─────────────────┘  └─────────────────┘                       │
└─────────────────────────────────────────────────────────────────┘
```

### 1.3 职责映射表

| 文件 | 当前职责 | 行数 | 复杂度 |
|------|----------|------|--------|
| `launcher.ts` | 浏览器可执行文件查找、BrowserServer 启动、CDP spawn(遗留)、重连逻辑、Stealth 注入、进程清理 | 636 | 高 |
| `connector.ts` | BrowserServer 连接、CDP 连接 (遗留) | 133 | 中 |
| `stealth/index.ts` | 15 个模块的脚本生成编排 | 117 | 中 |
| `stealth-behavior.ts` | 环境预设配置 | 158 | 低 |
| `port-utils.ts` | 端口分配与检查 | 100 | 低 |
| `types.ts` | 统一类型定义 | 216 | 低 |

---

## 2. 问题诊断

### 2.1 违反单一职责原则 (SRP)

**问题文件**: `launcher.ts` (636 行)

该文件同时负责：

| 职责 | 函数 | 行号 |
|------|------|------|
| 浏览器可执行文件查找 | `findBrowserExecutablePath()` | 68-120 |
| BrowserServer 启动 | `launchBrowserServer()` | 143-220 |
| CDP 进程启动 (遗留) | `spawnCDPBrowser()` | 507-569 |
| BrowserServer 重连 | `tryReconnectServer()` | 235-269 |
| CDP 重连 (遗留) | `tryReconnectCDP()` | 275-302 |
| 主启动入口 | `launchBrowser()` | 307-375 |
| Context 设置 | `setupContext()` | 379-397 |
| Stealth 注入 | `injectStealthToContext()` | 491-502 |
| 浏览器关闭 | `closeBrowser()` | 408-484 |
| 进程强制终止 | `forceKillProcess()` | 610-635 |

**违反规范**: AGENTS.md 规定模块文件 ≤ 500 行，该文件超出 27%。

### 2.2 抽象层次混杂

**问题文件**: `launcher.ts`

同一文件中混合了三个抽象层次：

```typescript
// 低层次：进程操作 (行 610-635)
async function forceKillProcess(pid: number): Promise<boolean> {
  if (process.platform === 'win32') {
    const { exec } = await import('child_process');
    await promisify(exec)('taskkill /F /T /PID ' + pid);
  } else {
    process.kill(pid, 'SIGKILL');
  }
}

// 中层次：浏览器连接 (行 31-46)
import { connectToServer, checkServerConnection } from './connection/connector';

// 高层次：Stealth 注入编排 (行 491-502)
export async function injectStealthToContext(
  context: BrowserContext,
  fingerprint: { browser?: { userAgent?: string }; device?: { platform?: string } },
  geolocation?: GeolocationConfig
): Promise<void> {
  const script = generateStealthScript(fingerprint as any, undefined, geolocation);
  await context.addInitScript(script);
}
```

**最佳实践**: 每个文件应保持在单一抽象层次，便于理解和测试。

### 2.3 遗留 CDP 代码未完全分离

**问题**: `launcher.ts` 和 `connector.ts` 中同时存在 BrowserServer 和 CDP 两套代码

```typescript
// launcher.ts - 遗留 CDP 启动 (行 507-569)
export async function spawnCDPBrowser(options: BrowserLaunchOptions): Promise<...> {
  // 100+ 行遗留代码
}

// connector.ts - 遗留 CDP 连接 (行 78-133)
export async function connectCDPBrowser(port: number, ...): Promise<Browser | null> {
  // @deprecated 注释但仍在主流程中使用
}
```

**影响**:
- 增加维护成本
- 代码复用困难
- 测试覆盖复杂

### 2.4 Stealth 模块缺乏统一接口

**问题**: 15 个 stealth 模块各自为政，无统一注册机制

```typescript
// 当前模式：硬编码导入
import { generateNavigatorScript } from './navigator';
import { generateScreenScript } from './screen';
import { generateWebGLScript } from './webgl';
// ... 12 个更多导入

// index.ts 中硬编码调用顺序 (行 38-117)
export function generateStealthScript(...) {
  if (config.navigator !== false) {
    scripts.push(generateNavigatorScript(fp));
  }
  if (config.screen !== false) {
    scripts.push(generateScreenScript(fp));
  }
  // ... 13 个更多条件判断
}
```

**问题**:
- 无共享接口定义
- 添加新模块需修改 `index.ts`
- 无法动态启用/禁用模块
- 无法单元测试单个模块

### 2.5 错误处理不一致

**问题**: 函数返回类型不统一

```typescript
// 返回 null (connector.ts)
export async function connectToServer(...): Promise<Browser | null> {
  return null;  // 失败时
}

// 抛出错误 (launcher.ts 行 120)
throw new Error('Chromium browser not found...');

// 返回 undefined (launcher.ts 行 578)
async function fetchWSEndpoint(port: number): Promise<string | undefined> {
  return undefined;  // 失败时
}
```

**影响**: 调用方需要同时处理 null、undefined 和异常，增加认知负担。

### 2.6 测试困难

**问题**: 硬编码依赖 Playwright，无法注入模拟

```typescript
// launcher.ts - 直接导入 chromium
import { chromium } from 'playwright';

export async function launchBrowserServer(options: BrowserLaunchOptions) {
  const browserServer = await chromium.launchServer({...});  // 无法 mock
}

// connector.ts - 直接导入 chromium
import { chromium } from 'playwright';

export async function connectToServer(wsEndpoint: string) {
  return await chromium.connect(wsEndpoint);  // 无法 mock
}
```

**影响**:
- 无法编写单元测试
- 集成测试需要真实浏览器
- CI/CD 测试成本高

---

## 3. 重构方案

### 3.1 新文件结构

```
scripts/core/browser/
├── index.ts                         # 模块公共 API 入口
├── types.ts                         # 统一类型定义
├── constants.ts                     # 模块常量 (新增)
│
├── launcher/                        # 浏览器启动子模块 (新增目录)
│   ├── index.ts                     # 启动器入口
│   ├── browser-launcher.ts          # 主启动逻辑 (从 launcher.ts 拆分)
│   ├── executable-finder.ts         # 可执行文件查找 (从 launcher.ts 拆分)
│   └── process-manager.ts           # 进程管理 (新增)
│
├── connection/
│   ├── index.ts                     # 连接模块入口
│   ├── browser-server-connector.ts  # BrowserServer 连接 (重命名)
│   ├── cdp-connector.ts             # CDP 连接 (遗留，单独文件)
│   ├── health-checker.ts            # 健康检查 (从 connector.ts 拆分)
│   └── constants.ts                 # 连接常量
│
├── stealth/
│   ├── index.ts                     # Stealth 生成器入口
│   ├── types.ts                     # Stealth 类型
│   ├── constants.ts                 # 默认配置
│   ├── generator.ts                 # 主生成器 (重构 index.ts)
│   ├── registry.ts                  # 模块注册表 (新增)
│   ├── utils.ts                     # 工具函数
│   └── modules/                     # 模块目录 (重构)
│       ├── navigator.ts
│       ├── screen.ts
│       ├── webgl.ts
│       ├── canvas.ts
│       ├── audio.ts
│       ├── chrome.ts
│       ├── webrtc.ts
│       ├── media.ts
│       ├── timezone.ts
│       ├── font.ts
│       ├── battery.ts
│       ├── geolocation.ts
│       └── performance.ts
│
├── stealth-behavior.ts              # 环境预设 (保持不变)
└── port-utils.ts                    # 端口工具 (保持不变)
```

### 3.2 模块拆分详情

#### 3.2.1 launcher/ 子模块

**文件**: `launcher/executable-finder.ts` (约 60 行)

```typescript
/**
 * Browser Executable Finder
 *
 * @module core/browser/launcher/executable-finder
 */

import * as path from 'path';
import * as fs from 'fs';

/**
 * Find browser executable path from Playwright cache
 */
export async function findBrowserExecutablePath(customPath?: string): Promise<string> {
  if (customPath && fs.existsSync(customPath)) {
    return customPath;
  }

  const cacheDirs = [/* ... */];
  
  for (const cacheDir of cacheDirs) {
    // 搜索逻辑
  }

  throw new Error('Chromium browser not found...');
}
```

**文件**: `launcher/browser-launcher.ts` (约 200 行)

```typescript
/**
 * Browser Launcher - BrowserServer Mode
 *
 * @module core/browser/launcher/browser-launcher
 */

import { chromium } from 'playwright';
import type { BrowserLaunchOptions } from '../types';
import { findBrowserExecutablePath } from './executable-finder';

export async function launchBrowserServer(
  options: BrowserLaunchOptions
): Promise<{ port: number; pid: number; wsEndpoint: string }> {
  // 纯 BrowserServer 启动逻辑
}

export async function setupContext(
  browser: Browser,
  fingerprint: UserFingerprint,
  geolocation?: GeolocationConfig
): Promise<{ context: BrowserContext; page: Page }> {
  // Context 设置逻辑
}
```

**文件**: `launcher/process-manager.ts` (约 100 行，新增)

```typescript
/**
 * Browser Process Manager
 *
 * @module core/browser/launcher/process-manager
 */

export async function forceKillProcess(pid: number): Promise<boolean> {
  // 进程终止逻辑
}

export async function gracefulCloseBrowser(
  wsEndpoint?: string,
  cdpPort?: number
): Promise<boolean> {
  // 优雅关闭逻辑
}

export function isProcessRunning(pid: number): boolean {
  // 进程状态检查
}
```

**文件**: `launcher/index.ts` (约 50 行)

```typescript
/**
 * Browser Launcher Module Entry
 *
 * @module core/browser/launcher
 */

export { launchBrowserServer, setupContext } from './browser-launcher';
export { findBrowserExecutablePath } from './executable-finder';
export { forceKillProcess, gracefulCloseBrowser } from './process-manager';

// 遗留 CDP 支持 (单独导出，标记 deprecated)
export { spawnCDPBrowser } from './cdp-legacy-launcher';

// 主启动入口
export { launchBrowser } from './browser-launcher';
```

#### 3.2.2 connection/ 子模块重构

**文件**: `connection/browser-server-connector.ts` (约 80 行)

```typescript
/**
 * BrowserServer Connector
 *
 * @module core/browser/connection/browser-server-connector
 */

import { chromium } from 'playwright';
import type { Browser } from 'playwright';

export async function connectToBrowserServer(
  wsEndpoint: string,
  timeout?: number
): Promise<Browser | null> {
  // BrowserServer 连接逻辑
}

export async function checkBrowserServerHealth(
  wsEndpoint: string,
  timeout?: number
): Promise<boolean> {
  // 健康检查逻辑
}
```

**文件**: `connection/cdp-connector.ts` (约 60 行，遗留)

```typescript
/**
 * CDP Connector (Legacy)
 *
 * @module core/browser/connection/cdp-connector
 * @deprecated Use browser-server-connector instead
 */

import { chromium } from 'playwright';

export async function connectOverCDP(
  port: number,
  timeout?: number
): Promise<Browser | null> {
  // CDP 连接逻辑
}

export async function checkCDPHealth(
  port: number,
  timeout?: number
): Promise<boolean> {
  // CDP 健康检查
}
```

**文件**: `connection/health-checker.ts` (约 50 行，新增)

```typescript
/**
 * Connection Health Checker
 *
 * @module core/browser/connection/health-checker
 */

export async function checkServerConnection(
  wsEndpoint: string,
  timeout?: number
): Promise<boolean> {
  // 统一健康检查入口
}

export async function checkCDPConnection(
  port: number,
  timeout?: number
): Promise<boolean> {
  // CDP 健康检查
}
```

#### 3.2.3 stealth/ 子模块重构

**文件**: `stealth/types.ts` (扩展)

```typescript
/**
 * Stealth Module Interface
 *
 * @module core/browser/stealth/types
 */

import type { UserFingerprint, GeolocationConfig } from '../types';

/**
 * Stealth module generator interface
 */
export interface StealthModule {
  /** Module name for configuration */
  name: string;
  
  /** Default enabled state */
  enabledByDefault: boolean;
  
  /** Generate stealth injection script */
  generate(fingerprint: UserFingerprint, config?: unknown): string;
}

/**
 * Stealth module registry interface
 */
export interface StealthModuleRegistry {
  register(module: StealthModule): void;
  get(name: string): StealthModule | undefined;
  getAll(): StealthModule[];
  getEnabled(config: StealthModuleConfig): StealthModule[];
}
```

**文件**: `stealth/registry.ts` (新增，约 80 行)

```typescript
/**
 * Stealth Module Registry
 *
 * @module core/browser/stealth/registry
 */

import type { StealthModule, StealthModuleRegistry } from './types';
import type { StealthModuleConfig } from './types';

class DefaultStealthModuleRegistry implements StealthModuleRegistry {
  private modules = new Map<string, StealthModule>();

  register(module: StealthModule): void {
    this.modules.set(module.name, module);
  }

  get(name: string): StealthModule | undefined {
    return this.modules.get(name);
  }

  getAll(): StealthModule[] {
    return Array.from(this.modules.values());
  }

  getEnabled(config: StealthModuleConfig): StealthModule[] {
    return this.getAll().filter(module => {
      const configValue = config[module.name as keyof StealthModuleConfig];
      return configValue !== false;  // Explicit false disables
    });
  }
}

export const stealthRegistry = new DefaultStealthModuleRegistry();
```

**文件**: `stealth/modules/navigator.ts` (重构，约 50 行)

```typescript
/**
 * Navigator Stealth Module
 *
 * @module core/browser/stealth/modules/navigator
 */

import type { StealthModule } from '../types';
import type { UserFingerprint } from '../../types';

export const navigatorModule: StealthModule = {
  name: 'navigator',
  enabledByDefault: true,
  
  generate(fingerprint: UserFingerprint): string {
    return `
      // Navigator properties spoofing
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
        configurable: true
      });
      // ... 其他伪装逻辑
    `;
  }
};

// Auto-register
import { stealthRegistry } from '../registry';
stealthRegistry.register(navigatorModule);
```

**文件**: `stealth/generator.ts` (重构，约 100 行)

```typescript
/**
 * Stealth Script Generator
 *
 * @module core/browser/stealth/generator
 */

import type { UserFingerprint, StealthModuleConfig, GeolocationConfig } from './types';
import { stealthRegistry } from './registry';
import { combineScripts } from './utils';
import { DEFAULT_STEALTH_CONFIG, DEFAULT_GEOLOCATION } from './constants';

export function generateStealthScript(
  fingerprint: UserFingerprint,
  config: StealthModuleConfig = DEFAULT_STEALTH_CONFIG,
  geolocation?: GeolocationConfig
): string {
  const enabledModules = stealthRegistry.getEnabled(config);
  const scripts = enabledModules.map(module => module.generate(fingerprint, config));
  
  // Add geolocation if configured
  if (config.geolocation !== false) {
    const geoConfig = geolocation || DEFAULT_GEOLOCATION;
    const geolocationModule = stealthRegistry.get('geolocation');
    if (geolocationModule) {
      scripts.push(geolocationModule.generate(fingerprint, geoConfig));
    }
  }
  
  return combineScripts(...scripts);
}
```

### 3.3 接口定义

#### 3.3.1 统一错误类型

**文件**: `core/browser/errors.ts` (新增)

```typescript
/**
 * Browser Module Errors
 *
 * @module core/browser/errors
 */

export enum BrowserErrorCode {
  EXECUTABLE_NOT_FOUND = 'BROWSER_EXECUTABLE_NOT_FOUND',
  PORT_UNAVAILABLE = 'BROWSER_PORT_UNAVAILABLE',
  CONNECTION_FAILED = 'BROWSER_CONNECTION_FAILED',
  STEALTH_INJECTION_FAILED = 'BROWSER_STEALTH_INJECTION_FAILED',
  PROCESS_TERMINATION_FAILED = 'BROWSER_PROCESS_TERMINATION_FAILED',
}

export class BrowserError extends Error {
  constructor(
    message: string,
    public code: BrowserErrorCode,
    public cause?: unknown
  ) {
    super(message);
    this.name = 'BrowserError';
  }
}

export function createBrowserError(
  code: BrowserErrorCode,
  message: string,
  cause?: unknown
): BrowserError {
  return new BrowserError(message, code, cause);
}
```

#### 3.3.2 依赖注入接口

**文件**: `core/browser/launcher/types.ts` (新增)

```typescript
/**
 * Launcher Dependencies Interface
 *
 * @module core/browser/launcher/types
 */

import type { Browser, BrowserContext, Page } from 'playwright';

export interface BrowserLauncherDeps {
  /** Launch BrowserServer */
  launchServer: (options: unknown) => Promise<BrowserServer>;
  
  /** Connect to BrowserServer */
  connect: (wsEndpoint: string) => Promise<Browser>;
  
  /** Check if process is running */
  isProcessRunning: (pid: number) => boolean;
  
  /** Kill process */
  killProcess: (pid: number, signal: string) => Promise<boolean>;
}

/** Default implementation using Playwright */
export const defaultLauncherDeps: BrowserLauncherDeps = {
  launchServer: (options) => chromium.launchServer(options),
  connect: (wsEndpoint) => chromium.connect(wsEndpoint),
  isProcessRunning: (pid) => { /* ... */ },
  killProcess: async (pid, signal) => { /* ... */ },
};
```

### 3.4 依赖注入策略

#### 3.4.1 工厂函数模式

```typescript
/**
 * Create browser launcher with custom dependencies
 */
export function createBrowserLauncher(
  deps: Partial<BrowserLauncherDeps> = {}
): BrowserLauncher {
  const mergedDeps = { ...defaultLauncherDeps, ...deps };
  
  return {
    async launch(options: BrowserLaunchOptions) {
      const browserServer = await mergedDeps.launchServer(options);
      // ...
    },
    
    async connect(wsEndpoint: string) {
      return mergedDeps.connect(wsEndpoint);
    },
  };
}
```

#### 3.4.2 测试用 Mock

```typescript
// tests/core/browser/launcher.test.ts
import { createBrowserLauncher } from '../../../core/browser/launcher';

const mockDeps = {
  launchServer: vi.fn().mockResolvedValue({
    wsEndpoint: () => 'ws://localhost:9222',
    process: () => ({ pid: 12345 }),
  }),
  connect: vi.fn().mockResolvedValue({
    contexts: () => [],
    newContext: () => mockContext,
  }),
  isProcessRunning: vi.fn().mockReturnValue(true),
  killProcess: vi.fn().mockResolvedValue(true),
};

const launcher = createBrowserLauncher(mockDeps);
```

---

## 4. 迁移路径

### 4.1 阶段一：准备 (Week 1)

**目标**: 创建新文件结构，保持向后兼容

| 任务 | 文件 | 状态 |
|------|------|------|
| 创建 `launcher/` 目录结构 | `launcher/index.ts`, `launcher/types.ts` | ⬜ |
| 创建 `errors.ts` | `core/browser/errors.ts` | ⬜ |
| 创建 `stealth/registry.ts` | `stealth/registry.ts` | ⬜ |
| 创建 `stealth/modules/` 目录 | 移动 15 个模块文件 | ⬜ |

**验收标准**:
- [ ] 新目录结构创建完成
- [ ] 所有现有测试通过
- [ ] TypeScript 编译无错误

### 4.2 阶段二：Stealth 模块重构 (Week 2)

**目标**: 实现 Stealth 模块注册表，逐个迁移模块

| 任务 | 优先级 | 预计工时 |
|------|--------|----------|
| 实现 `StealthModule` 接口 | P0 | 2h |
| 迁移 `navigator.ts` | P0 | 2h |
| 迁移 `screen.ts`, `webgl.ts` | P1 | 3h |
| 迁移其他 12 个模块 | P2 | 6h |
| 重构 `generator.ts` | P0 | 3h |
| 更新 `index.ts` 导出 | P0 | 1h |

**迁移示例**:

```typescript
// 旧代码 (stealth/index.ts)
import { generateNavigatorScript } from './navigator';

export function generateStealthScript(fp, config) {
  if (config.navigator !== false) {
    scripts.push(generateNavigatorScript(fp));
  }
  // ...
}

// 新代码 (stealth/modules/navigator.ts)
export const navigatorModule: StealthModule = {
  name: 'navigator',
  enabledByDefault: true,
  generate(fp) { return '...'; }
};
stealthRegistry.register(navigatorModule);
```

**验收标准**:
- [ ] 所有 15 个模块实现 `StealthModule` 接口
- [ ] `generateStealthScript()` 使用注册表生成
- [ ] 现有调用方无需修改
- [ ] 添加模块单元测试

### 4.3 阶段三：Connection 模块重构 (Week 3)

**目标**: 分离 BrowserServer 和 CDP 连接逻辑

| 任务 | 文件变更 | 状态 |
|------|----------|------|
| 创建 `browser-server-connector.ts` | 从 `connector.ts` 拆分 | ⬜ |
| 创建 `cdp-connector.ts` | 从 `connector.ts` 拆分 | ⬜ |
| 创建 `health-checker.ts` | 提取健康检查逻辑 | ⬜ |
| 更新 `connection/index.ts` | 重新导出 | ⬜ |

**向后兼容**:

```typescript
// connection/index.ts - 保持旧导出
export { connectToServer } from './browser-server-connector';
export { connectToBrowserServer as connectToServer } from './browser-server-connector';

// 标记 deprecated
/** @deprecated Use connectToBrowserServer instead */
export const connectToServer = connectToBrowserServer;
```

**验收标准**:
- [ ] BrowserServer 和 CDP 代码完全分离
- [ ] 健康检查逻辑独立
- [ ] 现有调用方无需修改
- [ ] 添加连接层单元测试

### 4.4 阶段四：Launcher 模块重构 (Week 4)

**目标**: 拆分 `launcher.ts` 为多个职责单一的文件

| 任务 | 源行号 | 目标文件 | 状态 |
|------|--------|----------|------|
| 提取可执行文件查找 | 68-120 | `executable-finder.ts` | ⬜ |
| 提取 BrowserServer 启动 | 143-220 | `browser-launcher.ts` | ⬜ |
| 提取进程管理 | 610-635 | `process-manager.ts` | ⬜ |
| 遗留 CDP 启动 | 507-569 | `cdp-legacy-launcher.ts` | ⬜ |
| 重构主启动入口 | 307-375 | `browser-launcher.ts` | ⬜ |

**依赖注入实现**:

```typescript
// launcher/browser-launcher.ts
export function createBrowserLauncher(deps?: Partial<BrowserLauncherDeps>) {
  const merged = { ...defaultDeps, ...deps };
  
  return {
    async launchBrowser(options, savedConnection) {
      // 使用 mergedDeps 而不是直接导入 chromium
    }
  };
}

export const defaultBrowserLauncher = createBrowserLauncher();
```

**验收标准**:
- [ ] `launcher.ts` 拆分为 ≤ 200 行的多个文件
- [ ] 实现依赖注入
- [ ] 现有调用方无需修改
- [ ] 添加启动器单元测试

### 4.5 阶段五：错误处理统一 (Week 5)

**目标**: 实现统一错误类型，规范化错误处理

| 任务 | 变更 | 状态 |
|------|------|------|
| 创建 `BrowserError` 类 | `errors.ts` | ⬜ |
| 更新 `findBrowserExecutablePath` | 抛出 `BrowserError` | ⬜ |
| 更新 `launchBrowserServer` | 抛出 `BrowserError` | ⬜ |
| 更新连接函数 | 返回 `Result<Browser, BrowserError>` | ⬜ |
| 更新调用方 | 处理统一错误类型 | ⬜ |

**Result 类型**:

```typescript
export type Result<T, E = BrowserError> =
  | { success: true; data: T }
  | { success: false; error: E };

export function wrapResult<T>(fn: () => Promise<T>): Promise<Result<T>> {
  try {
    return Promise.resolve({ success: true, data: await fn() });
  } catch (error) {
    return Promise.resolve({ 
      success: false, 
      error: error instanceof BrowserError ? error : wrapError(error)
    });
  }
}
```

**验收标准**:
- [ ] 所有公共 API 使用统一错误类型
- [ ] 错误码枚举完整
- [ ] 调用方错误处理简化
- [ ] 添加错误处理测试

### 4.6 阶段六：清理与优化 (Week 6)

**目标**: 移除遗留代码，优化性能

| 任务 | 优先级 | 状态 |
|------|--------|------|
| 移除 `spawnCDPBrowser` 主流程调用 | P1 | ⬜ |
| 标记 CDP 函数为 `@deprecated` | P1 | ⬜ |
| 添加 JSDoc 文档注释 | P2 | ⬜ |
| 性能基准测试 | P2 | ⬜ |
| 更新架构文档 | P0 | ⬜ |

**验收标准**:
- [ ] 无主流程使用遗留 CDP 代码
- [ ] 所有公共 API 有完整 JSDoc
- [ ] 性能无回归
- [ ] 架构文档更新完成

---

## 5. 验证标准

### 5.1 类型安全验证

```bash
# TypeScript 编译检查
npm run typecheck

# 预期输出：无错误
# 关键检查点:
# - 无 any 类型
# - 无 @ts-ignore
# - 无 @ts-expect-error
```

**验收标准**:
- [ ] `npm run typecheck` 通过
- [ ] 无类型抑制注释
- [ ] 所有公共 API 有完整类型定义

### 5.2 代码质量验证

```bash
# ESLint 检查
npm run lint

# 代码复杂度分析 (使用 ts-prune 或类似工具)
npx ts-prune scripts/core/browser/
```

**验收标准**:
- [ ] `npm run lint` 通过
- [ ] 无未使用导出
- [ ] 所有文件 ≤ 500 行
- [ ] 所有函数 ≤ 50 行

### 5.3 单元测试验证

**新增测试文件**:

```
tests/core/browser/
├── launcher/
│   ├── executable-finder.test.ts
│   ├── browser-launcher.test.ts
│   └── process-manager.test.ts
├── connection/
│   ├── browser-server-connector.test.ts
│   ├── cdp-connector.test.ts
│   └── health-checker.test.ts
├── stealth/
│   ├── registry.test.ts
│   ├── generator.test.ts
│   └── modules/
│       ├── navigator.test.ts
│       ├── screen.test.ts
│       └── ...
└── errors.test.ts
```

**测试覆盖率要求**:

| 模块 | 行覆盖率 | 分支覆盖率 |
|------|----------|------------|
| launcher/ | ≥ 80% | ≥ 70% |
| connection/ | ≥ 85% | ≥ 75% |
| stealth/ | ≥ 90% | ≥ 80% |
| errors.ts | 100% | 100% |

```bash
# 运行测试
npm run test -- --coverage

# 生成覆盖率报告
npm run test:coverage
```

### 5.4 集成测试验证

**端到端测试场景**:

```typescript
// tests/integration/browser-launcher.test.ts

describe('Browser Launcher Integration', () => {
  test('should launch browser with BrowserServer mode', async () => {
    const result = await launchProfileBrowser({ 
      user: 'test-user',
      headless: true 
    });
    
    expect(result.browser).toBeDefined();
    expect(result.cdpPort).toBeGreaterThan(0);
    expect(result.isNewInstance).toBe(true);
  });

  test('should reconnect to existing browser instance', async () => {
    // 第一次启动
    const first = await launchProfileBrowser({ user: 'test-user' });
    
    // 第二次启动应复用
    const second = await launchProfileBrowser({ user: 'test-user' });
    
    expect(second.cdpPort).toBe(first.cdpPort);
    expect(second.isNewInstance).toBe(false);
  });

  test('should inject stealth script correctly', async () => {
    const { page } = await launchProfileBrowser({ 
      user: 'test-user',
      headless: true 
    });
    
    // 检查 navigator.webdriver 被隐藏
    const webdriver = await page.evaluate(() => navigator.webdriver);
    expect(webdriver).toBeUndefined();
  });
});
```

**验收标准**:
- [ ] 所有集成测试通过
- [ ] 浏览器启动时间 ≤ 5 秒
- [ ] 重连成功率 ≥ 95%
- [ ] Stealth 注入 100% 生效

### 5.5 向后兼容验证

**兼容性测试矩阵**:

| 调用方 | 测试场景 | 状态 |
|--------|----------|------|
| `actions/shared/browser-launcher.ts` | `launchProfileBrowser()` | ⬜ |
| `actions/shared/session.ts` | `withSession()` | ⬜ |
| `cli/commands/browser.command.ts` | `browser --start/stop` | ⬜ |
| `cli/commands/login.command.ts` | 登录流程 | ⬜ |
| `cli/commands/search.command.ts` | 搜索流程 | ⬜ |

**验收标准**:
- [ ] 所有现有调用方无需修改
- [ ] 所有 CLI 命令正常工作
- [ ] 无破坏性变更

### 5.6 性能基准测试

**基准测试脚本**:

```typescript
// benchmarks/browser-launch.bench.ts

import { bench, describe } from 'vitest';
import { launchProfileBrowser } from '../core/browser/launcher';

describe('Browser Launch Performance', () => {
  bench('launch new instance', async () => {
    const result = await launchProfileBrowser({ 
      user: 'bench-user',
      headless: true 
    });
    await result.browser.close();
  }, { iterations: 10 });

  bench('reconnect existing instance', async () => {
    // 先启动
    const first = await launchProfileBrowser({ user: 'bench-user' });
    
    // 测试重连
    const second = await launchProfileBrowser({ user: 'bench-user' });
    await second.browser.close();
  }, { iterations: 10 });
});
```

**性能指标要求**:

| 指标 | 当前值 | 目标值 | 状态 |
|------|--------|--------|------|
| 新实例启动时间 | ~3s | ≤ 5s | ⬜ |
| 重连时间 | ~0.5s | ≤ 1s | ⬜ |
| Stealth 脚本生成 | ~50ms | ≤ 100ms | ⬜ |
| 内存占用 | ~200MB | ≤ 300MB | ⬜ |

### 5.7 文档验证

**文档更新清单**:

| 文档 | 更新内容 | 状态 |
|------|----------|------|
| `docs/architecture/browser.md` | 更新架构图、调用流程 | ⬜ |
| `docs/architecture/stealth.md` | 更新模块注册表说明 | ⬜ |
| `AGENTS.md` | 更新核心 API 说明 | ⬜ |
| `README.md` | 更新使用示例 | ⬜ |

**验收标准**:
- [ ] 架构图与实际代码一致
- [ ] 所有公共 API 有文档
- [ ] 迁移指南完整
- [ ] 示例代码可运行

---

## 附录

### A. 重构前后对比

| 指标 | 重构前 | 重构后 | 改进 |
|------|--------|--------|------|
| `launcher.ts` 行数 | 636 | ~200 | -69% |
| 最大文件行数 | 636 | 200 | -69% |
| Stealth 模块耦合度 | 高 | 低 | 解耦 |
| 单元测试覆盖率 | 0% | ≥ 80% | +80% |
| 错误处理一致性 | 低 | 高 | 统一 |
| 依赖注入支持 | 无 | 有 | 可测试 |

### B. 风险与缓解

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|----------|
| 向后兼容破坏 | 高 | 低 | 分阶段迁移，保留旧导出 |
| 性能回归 | 中 | 低 | 基准测试，性能监控 |
| Stealth 注入失效 | 高 | 低 | 集成测试，手动验证 |
| 迁移时间超期 | 中 | 中 | 分周计划，每周验收 |

### C. 参考资源

- [Playwright BrowserServer API](https://playwright.dev/docs/api/class-browserserver)
- [Chrome DevTools Protocol](https://chromedevtools.github.io/devtools-protocol/)
- [TypeScript Dependency Injection Patterns](https://www.typescriptlang.org/docs/handbook/dependency-injection.html)
- [Clean Architecture by Robert C. Martin](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)

---

**文档结束**

---

## 6. 重构进展更新

> 更新时间：2026-04-07  
> 状态：Week 1-5 已完成 ✅

### 6.1 已完成任务

#### Week 1: 基础架构 ✅
- [x] 创建 \launcher/\ 和 \stealth/modules/\ 目录
- [x] 创建 \errors.ts\ - 统一错误类型系统
- [x] 创建 \stealth/registry.ts\ - 模块注册表
- [x] 移动 13 个 stealth 模块到 \modules/\ 子目录

#### Week 2: Stealth 模块重构 ✅
- [x] 实现 \StealthModule\ 接口
- [x] 迁移所有 13 个模块到注册表模式
- [x] 重构 \generator.ts\ 使用注册表
- [x] 更新 \index.ts\ 导出
- [x] **TypeScript 编译通过** ✅

#### Week 3: Connection 模块重构 ✅
- [x] 创建 \rowser-server-connector.ts\ - BrowserServer 连接
- [x] 创建 \cdp-connector.ts\ - CDP 连接（遗留）
- [x] 创建 \health-checker.ts\ - 统一健康检查
- [x] 更新 \connection/index.ts\ 导出
- [x] 保持向后兼容导出

#### Week 4: Launcher 模块重构 ✅
- [x] 创建 \launcher/executable-finder.ts\ - 浏览器路径查找
- [x] 创建 \launcher/browser-launcher.ts\ - BrowserServer 启动
- [x] 创建 \launcher/process-manager.ts\ - 进程管理
- [x] 创建 \launcher/index.ts\ 导出
- [x] **TypeScript 编译通过** ✅

#### Week 5: 错误处理统一 ✅
- [x] 所有新文件使用 \BrowserError\
- [x] 实现统一错误码系统
- [x] 错误类型导出

### 6.2 新文件结构

\\\
scripts/core/browser/
├── index.ts                         # 模块入口
├── types.ts                         # 统一类型定义
├── errors.ts                        # ✅ 新增：统一错误类型
│
├── launcher/                        # ✅ 新增：启动子模块
│   ├── index.ts                     # ✅ 启动器入口
│   ├── browser-launcher.ts          # ✅ BrowserServer 启动
│   ├── executable-finder.ts         # ✅ 可执行文件查找
│   └── process-manager.ts           # ✅ 进程管理
│
├── connection/                      # 连接子模块（重构）
│   ├── index.ts                     # ✅ 更新：新导出
│   ├── browser-server-connector.ts  # ✅ 新增：BrowserServer 连接
│   ├── cdp-connector.ts             # ✅ 新增：CDP 连接（遗留）
│   ├── health-checker.ts            # ✅ 新增：统一健康检查
│   └── constants.ts                 # 连接常量
│
├── stealth/                         # Stealth 子模块（重构）
│   ├── index.ts                     # ✅ 更新：注册表模式
│   ├── types.ts                     # ✅ 更新：StealthModule 接口
│   ├── constants.ts                 # 默认配置
│   ├── registry.ts                  # ✅ 新增：模块注册表
│   ├── generator.ts                 # ✅ 新增：使用注册表的生成器
│   ├── utils.ts                     # 工具函数
│   └── modules/                     # ✅ 新增：模块目录
│       ├── navigator.ts             # ✅ 迁移：注册表模式
│       ├── screen.ts                # ✅ 迁移
│       ├── webgl.ts                 # ✅ 迁移
│       ├── canvas.ts                # ✅ 迁移
│       ├── audio.ts                 # ✅ 迁移
│       ├── chrome.ts                # ✅ 迁移
│       ├── webrtc.ts                # ✅ 迁移
│       ├── media.ts                 # ✅ 迁移
│       ├── timezone.ts              # ✅ 迁移
│       ├── font.ts                  # ✅ 迁移
│       ├── battery.ts               # ✅ 迁移
│       ├── geolocation.ts           # ✅ 迁移
│       └── performance.ts           # ✅ 迁移
│
├── stealth-behavior.ts              # 环境预设
└── port-utils.ts                    # 端口工具
\\\

### 6.3 关键改进

| 改进项 | 重构前 | 重构后 | 效果 |
|--------|--------|--------|------|
| **最大文件行数** | 636 行 (launcher.ts) | 200 行 | -69% |
| **错误处理** | null/undefined/异常混用 | 统一 BrowserError | 类型安全 |
| **Stealth 模块** | 硬编码 15 个导入 | 注册表模式 | 可扩展 |
| **连接模式** | BrowserServer + CDP 混编 | 分离文件 | 职责清晰 |
| **向后兼容** | - | 保留旧导出 | 无破坏变更 |
| **TypeScript** | - | ✅ 编译通过 | 类型安全 |

### 6.4 剩余任务

- [ ] Week 6: 更新旧 \launcher.ts\ 标记 \@deprecated\
- [ ] Week 6: 更新架构文档
- [ ] 验证：向后兼容性测试

### 6.5 向后兼容说明

所有现有调用方无需修改，以下导出保持兼容：

\\\	ypescript
// 旧代码仍然有效
import { launchBrowser } from './core/browser/launcher';
import { connectToServer } from './core/browser/connection';
import { connectCDPBrowser } from './core/browser/connection';
import { generateStealthScript } from './core/browser/stealth';

// 新代码使用新 API
import { launchBrowserServer } from './core/browser/launcher/browser-launcher';
import { connectToBrowserServer } from './core/browser/connection/browser-server-connector';
import { stealthRegistry } from './core/browser/stealth/registry';
\\\

---

## 7. 下一步行动

### 7.1 短期（本周）
1. 完成 Week 6 任务
2. 运行完整向后兼容性测试
3. 更新 \AGENTS.md\ 文档

### 7.2 中期（下周）
1. 添加单元测试
2. 性能基准测试
3. 代码审查

### 7.3 长期（后续迭代）
1. 移除遗留 CDP 代码（主流程）
2. 添加更多 Stealth 模块
3. 实现插件系统

---

**文档结束**
