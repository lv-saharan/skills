# Stealth Module Architecture

## Overview

反检测模块采用模块化架构，位于 `scripts/core/browser/stealth/`。13 个独立模块覆盖浏览器指纹的各个维度，通过注册表模式管理，支持动态启用/禁用。平台无关，不依赖业务逻辑。

## Design Decisions

| Decision | Rationale |
|----------|-----------|
| 模块化设计 | 每个指纹维度独立文件，便于维护和测试 |
| 注册表模式 | `stealthRegistry` 统一管理，支持动态启用/禁用 |
| 平台无关 | 位于 `core/` 目录，不依赖业务逻辑 |
| 指纹一致性 | 时区、语言、地理位置等参数与 fingerprint.json 保持一致 |

---

## 模块列表

| 模块 | 功能 | 伪装内容 |
|------|------|----------|
| `navigator.ts` | navigator 伪装 | userAgent, platform, languages |
| `screen.ts` | screen 伪装 | width, height, colorDepth |
| `webgl.ts` | WebGL 指纹 | vendor, renderer |
| `canvas.ts` | Canvas 噪声 | 添加随机噪声防止指纹追踪 |
| `audio.ts` | Audio 噪声 | AudioContext 指纹噪声 |
| `chrome.ts` | Chrome API | window.chrome 对象模拟 |
| `webrtc.ts` | WebRTC 防护 | 阻止 IP 泄露 |
| `media.ts` | Media 伪装 | 摄像头/麦克风设备列表 |
| `timezone.ts` | 时区一致性 | 确保时区与指纹匹配 |
| `font.ts` | 字体防护 | 字体指纹随机化 |
| `battery.ts` | Battery API | 电池状态模拟 |
| `geolocation.ts` | 地理位置 | 可配置的地理位置 mock |
| `performance.ts` | Performance API | 性能指标一致性 |

---

## 使用方式

```typescript
import { generateStealthScript, stealthRegistry } from './core/browser/stealth';

// 基本使用（所有模块启用）
const script = generateStealthScript(fingerprint);

// 自定义地理位置（通过第三参数）
const script = generateStealthScript(fingerprint, undefined, {
  latitude: 31.2304,
  longitude: 121.4737,
  accuracy: 100
});

// 自定义模块配置
const script = generateStealthScript(fingerprint, {
  navigator: true,
  screen: true,
  webgl: true,
  webrtc: false,  // 禁用 WebRTC 防护
  geolocation: { 
    latitude: 31.2304, 
    longitude: 121.4737, 
    accuracy: 100 
  }
});

// 使用注册表查询模块
const modules = stealthRegistry.getAll().map(m => m.name);

// 注入到页面
await context.addInitScript(script);
```

---

## 配置选项

```typescript
interface StealthModuleConfig {
  navigator?: boolean;
  screen?: boolean;
  webgl?: boolean;
  canvas?: boolean;
  audio?: boolean;
  chrome?: boolean;
  webrtc?: boolean;
  media?: boolean;
  timezone?: boolean;
  font?: boolean;
  battery?: boolean;
  geolocation?: GeolocationConfig | boolean;
  performance?: boolean;
}

interface GeolocationConfig {
  latitude: number;
  longitude: number;
  accuracy?: number;
}
```

---

## 目录结构

```
scripts/core/browser/stealth/
├── index.ts              # 主入口：generateStealthScript
├── types.ts              # StealthModule, StealthModuleConfig, GeolocationConfig
├── constants.ts          # DEFAULT_STEALTH_CONFIG, DEFAULT_GEOLOCATION
├── registry.ts           # stealthRegistry 模块注册表
├── generator.ts          # generateStealthScript 实现
├── utils.ts              # combineScripts 等工具函数
└── modules/              # 模块子目录
    ├── navigator.ts      # navigator 伪装
    ├── screen.ts         # screen 伪装
    ├── webgl.ts          # WebGL 指纹
    ├── canvas.ts         # Canvas 指纹噪声
    ├── audio.ts          # Audio 指纹噪声
    ├── chrome.ts         # Chrome API mock
    ├── webrtc.ts         # WebRTC 泄露防护
    ├── media.ts          # Media 伪装
    ├── timezone.ts       # 时区一致性
    ├── font.ts           # 字体指纹防护
    ├── battery.ts        # Battery API mock
    ├── geolocation.ts    # 地理位置 mock
    └── performance.ts    # Performance API 一致性
```

---

## 架构说明

反检测模块位于 `scripts/core/browser/stealth/`，采用模块化架构：

- **13 个独立模块**：每个指纹维度独立生成脚本
- **注册表模式**：使用 `stealthRegistry` 管理模块，支持动态启用/禁用
- **平台无关**：位于 `core/` 目录，不依赖业务逻辑