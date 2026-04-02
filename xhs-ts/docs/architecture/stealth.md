# Stealth Module Architecture

反检测模块采用模块化架构，每个指纹维度独立生成脚本。

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
import { generateStealthScript, generateStealthScriptWithLocation } from './browser/stealth';

// 基本使用
const script = generateStealthScript(fingerprint);

// 自定义地理位置
const script = generateStealthScriptWithLocation(fingerprint, 31.2304, 121.4737);

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
scripts/browser/stealth/
├── index.ts          # 主入口：generateStealthScript
├── types.ts          # StealthModuleConfig, GeolocationConfig
├── utils.ts          # getPolyfillScript, combineScripts
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

## 与 Legacy stealth.ts 的关系

- `browser/stealth.ts` (legacy) - 旧版单文件脚本生成器
- `browser/stealth/` (新) - 模块化架构，推荐使用

新模块提供：
- 可配置的模块开关
- 更细粒度的控制
- 更好的可维护性