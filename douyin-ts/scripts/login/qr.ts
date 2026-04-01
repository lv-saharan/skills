/**
 * QR Code login implementation
 *
 * @module login/qr
 * @description QR code authentication flow for Douyin
 */

import type { Page, Browser, BrowserContext, Locator } from 'playwright';
import { DouyinError, DouyinErrorCode } from '../shared';
import type { UserName } from '../user';

/**
 * Simple session object for login flow
 * Only needs page, browser, and context
 */
interface LoginSession {
  page: Page;
  browser: Browser;
  context: BrowserContext;
}
import { saveCookies, extractCookies, hasRequiredCookies } from '../cookie';
import { DY_URLS, getTmpFilePath } from '../config';
import { debugLog, delay, randomDelay, waitForCondition } from '../utils/helpers';
import { checkCaptcha } from '../utils/anti-detect';
import { outputQrCode } from '../utils/output';
import { writeFile } from 'fs/promises';
import type { LoginResult } from './types';

const QR_EXPIRED_PATTERNS = /二维码.*过期|已失效|请刷新|二维码已失效|二维码过期|刷新二维码/;
const LOGIN_BUTTON_SELECTORS = ['button:has-text("登录")', 'a:has-text("登录")'];

/**
 * 使用 JavaScript 在页面中查找二维码图片
 */
async function findQrImageWithJs(page: Page): Promise<string | null> {
  return await page.evaluate(() => {
    const imgs = Array.from(document.querySelectorAll('img'));
    const candidates: { selector: string; priority: number }[] = [];
    
    for (const img of imgs) {
      const rect = img.getBoundingClientRect();
      const isSquare = Math.abs(rect.width - rect.height) < 30;
      const isLarge = rect.width >= 150 && rect.width <= 300;
      const isVisible = rect.width > 0 && rect.height > 0;
      
      if (!isSquare || !isLarge || !isVisible) continue;
      
      const inLoginArea = img.closest('[class*="login"], [class*="Login"], [class*="modal"], [class*="Modal"], [class*="dialog"], [class*="Dialog"]');
      
      if (inLoginArea) {
        let selector = '';
        if (img.id) selector = '#' + img.id;
        else if (img.className) {
          const firstClass = img.className.split(' ').filter(c => c)[0];
          if (firstClass) selector = 'img.' + firstClass;
          else selector = 'img';
        } else selector = 'img';
        candidates.push({ selector, priority: 100 });
      }
    }
    
    if (candidates.length > 0) {
      candidates.sort((a, b) => b.priority - a.priority);
      return candidates[0].selector;
    }
    return null;
  });
}

/**
 * 检测二维码是否可见（不点击标签，避免重新加载）
 */
async function checkQrVisible(page: Page): Promise<boolean> {
  try {
    const qrSelector = await findQrImageWithJs(page);
    if (qrSelector) {
      const locator = page.locator(qrSelector).first();
      if (await locator.isVisible({ timeout: 500 }).catch(() => false)) {
        return true;
      }
    }
    
    // 备用检测：登录弹窗内的图片
    const modalSelectors = [
      '[class*="loginModal"]', '[class*="LoginModal"]', '[class*="login-modal"]',
    ];
    
    for (const selector of modalSelectors) {
      const modal = page.locator(selector).first();
      if (await modal.isVisible({ timeout: 300 }).catch(() => false)) {
        const img = modal.locator('img').first();
        if (await img.isVisible({ timeout: 300 }).catch(() => false)) {
          return true;
        }
      }
    }
  } catch {}
  
  return false;
}

/**
 * 查找二维码容器元素（用于初始截图，会点击标签）
 */
async function findQrContainer(page: Page): Promise<Locator | null> {
  debugLog('查找二维码容器...');
  
  // 点击"扫码登录"标签切换到二维码
  try {
    const qrTab = page.locator('text=扫码登录').first();
    if (await qrTab.isVisible({ timeout: 2000 })) {
      await qrTab.click();
      debugLog('点击了"扫码登录"标签');
      await delay(1500);
    }
  } catch {
    debugLog('未找到"扫码登录"标签');
  }
  
  const qrSelector = await findQrImageWithJs(page);
  if (qrSelector) {
    debugLog('JavaScript 找到二维码图片: ' + qrSelector);
    try {
      const locator = page.locator(qrSelector).first();
      if (await locator.isVisible({ timeout: 2000 })) {
        return locator;
      }
    } catch {}
  }
  
  const modalSelectors = [
    '[class*="loginModal"]', '[class*="LoginModal"]', '[class*="login-modal"]',
    '[class*="Login"]', '[class*="dialog"]', '[class*="Dialog"]',
    '[class*="modal"]', '[class*="Modal"]',
  ];
  
  for (const selector of modalSelectors) {
    try {
      const locator = page.locator(selector).first();
      if (await locator.isVisible({ timeout: 1000 })) {
        debugLog('找到弹窗容器: ' + selector);
        const imgLocator = locator.locator('img').first();
        if (await imgLocator.isVisible({ timeout: 1000 })) {
          debugLog('在弹窗内找到图片');
          return imgLocator;
        }
      }
    } catch {}
  }
  
  return null;
}

/**
 * 检测并处理"保存登录信息"弹窗
 */
async function handleSaveLoginDialog(page: Page): Promise<boolean> {
  try {
    const saveDialog = page.locator('text=保存登录信息').first();
    if (await saveDialog.isVisible({ timeout: 1000 })) {
      debugLog('检测到"保存登录信息"弹窗，点击保存...');
      const saveBtn = page.locator('button:has-text("保存")').first();
      if (await saveBtn.isVisible({ timeout: 1000 })) {
        await saveBtn.click();
        debugLog('已点击"保存"按钮');
        await delay(2000);
        return true;
      }
      const cancelBtn = page.locator('button:has-text("取消")').first();
      if (await cancelBtn.isVisible({ timeout: 1000 })) {
        await cancelBtn.click();
        debugLog('已点击"取消"按钮');
        await delay(2000);
        return true;
      }
    }
  } catch {}
  return false;
}

/**
 * 等待二维码图片加载完成
 */
async function waitForQrImageLoad(page: Page, container: Locator, maxWait: number = 10000): Promise<boolean> {
  debugLog('等待二维码图片加载...');
  const startTime = Date.now();
  
  while (Date.now() - startTime < maxWait) {
    const isLoaded = await container.evaluate((el) => {
      if (el.tagName === 'IMG') {
        const img = el as HTMLImageElement;
        if (img.complete && img.naturalWidth > 0) {
          const src = img.src.toLowerCase();
          const isPlaceholder = src.includes('logo') || src.includes('placeholder') || src.includes('default');
          const isSquare = Math.abs(img.naturalWidth - img.naturalHeight) < 20;
          const isReasonableSize = img.naturalWidth >= 100 && img.naturalWidth <= 400;
          return !isPlaceholder && isSquare && isReasonableSize;
        }
        return false;
      }
      const img = el.querySelector('img') as HTMLImageElement;
      if (img && img.complete && img.naturalWidth > 0) {
        const src = img.src.toLowerCase();
        const isPlaceholder = src.includes('logo') || src.includes('placeholder') || src.includes('default');
        const isSquare = Math.abs(img.naturalWidth - img.naturalHeight) < 20;
        const isReasonableSize = img.naturalWidth >= 100 && img.naturalWidth <= 400;
        return !isPlaceholder && isSquare && isReasonableSize;
      }
      return false;
    });
    
    if (isLoaded) {
      debugLog('二维码图片已加载');
      return true;
    }
    await delay(500);
  }
  
  debugLog('二维码图片加载超时，尝试直接截图');
  return false;
}

/**
 * 截取二维码图片
 */
async function captureQrImage(container: Locator, filePath: string): Promise<boolean> {
  try {
    debugLog('截取二维码图片...');
    const buffer = await container.screenshot({ type: 'png' });
    await writeFile(filePath, buffer);
    debugLog('二维码已保存: ' + filePath);
    return true;
  } catch (error) {
    debugLog('截取二维码失败:', error);
    return false;
  }
}

/**
 * 检查二维码是否过期
 */
async function isQrCodeExpired(page: Page): Promise<boolean> {
  try {
    const content = await page.content();
    return QR_EXPIRED_PATTERNS.test(content);
  } catch {
    return false;
  }
}

function setupBrowserDisconnectListener(browser: Browser, browserClosedRef: { closed: boolean }): () => void {
  const onDisconnect = () => {
    debugLog('浏览器被用户断开连接');
    browserClosedRef.closed = true;
  };
  browser.on('disconnected', onDisconnect);
  return () => browser.off('disconnected', onDisconnect);
}

/**
 * 等待扫码完成
 */
export async function waitForQrScan(page: Page, timeout: number, browserClosedRef: { closed: boolean }): Promise<void> {
  debugLog('等待扫码...');
  const startTime = Date.now();

  await waitForCondition(
    async () => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);

      if (browserClosedRef.closed) throw new DouyinError('用户关闭了浏览器窗口，登录已取消。', DouyinErrorCode.LOGIN_FAILED);
      if (page.isClosed()) throw new DouyinError('页面已关闭，登录已取消。', DouyinErrorCode.LOGIN_FAILED);

      try {
        if (await checkCaptcha(page)) throw new DouyinError('检测到验证码，请手动完成验证。', DouyinErrorCode.CAPTCHA_REQUIRED);
        if (await isQrCodeExpired(page)) throw new DouyinError('二维码已过期，请刷新重试。', DouyinErrorCode.LOGIN_FAILED);
      } catch (e) {
        const errorMsg = String(e);
        if (errorMsg.includes('Execution context was destroyed') || errorMsg.includes('navigation')) {
          debugLog('检测到页面导航，可能是扫码成功...');
          await delay(2000);
          await handleSaveLoginDialog(page);
          const avatarVisible = await page.locator('[class*="avatar"]').first().isVisible().catch(() => false);
          if (avatarVisible) {
            debugLog('页面导航后检测到用户头像 → 登录成功！');
            return true;
          }
          return false;
        }
        throw e;
      }

      const qrVisible = await checkQrVisible(page);
      
      if (!qrVisible) {
        debugLog('二维码消失！可能扫码成功，等待页面稳定...');
        await delay(1500);
        
        const dialogHandled = await handleSaveLoginDialog(page);
        if (dialogHandled) {
          debugLog('已处理保存登录弹窗');
          await delay(1000);
        }
        
        await page.waitForLoadState('domcontentloaded').catch(() => {});
        
        const avatarSelectors = [
          'header [class*="avatar"]',
          'nav [class*="avatar"]',
          '[data-e2e="user-avatar"]',
          '[class*="userAvatar"]',
          '[class*="UserAvatar"]',
          '[class*="avatar-img"]',
        ];
        
        for (const sel of avatarSelectors) {
          if (await page.locator(sel).first().isVisible().catch(() => false)) {
            debugLog('用户头像出现 → 登录成功！');
            return true;
          }
        }
        
        const modalSelectors = [
          '[class*="loginModal"]',
          '[class*="login-modal"]',
          '[class*="LoginModal"]',
          '[class*="loginDialog"]',
        ];
        
        let modalVisible = false;
        for (const sel of modalSelectors) {
          if (await page.locator(sel).first().isVisible().catch(() => false)) {
            modalVisible = true;
            break;
          }
        }
        
        if (!modalVisible) {
          debugLog('登录弹窗也消失了 → 登录成功！');
          return true;
        }
        
        debugLog('二维码消失但弹窗仍在，继续等待...');
      }

      if (elapsed > 0 && elapsed % 5 === 0) {
        debugLog('[' + elapsed + 's] 等待扫码... 二维码可见=' + qrVisible);
      }

      return false;
    },
    {
      timeout,
      interval: 1000,
      timeoutMessage: '扫码超时，请重试。',
      onProgress: (elapsed) => { if (elapsed % 10 === 0) debugLog('[' + elapsed + 's] 等待扫码...'); },
    }
  );
}

// ============================================
// QR Login Flow
// ============================================

export async function qrLogin(
  session: LoginSession,
  timeout: number,
  browserClosedRef: { closed: boolean },
  isHeadless: boolean,
  user?: UserName
): Promise<LoginResult> {
  const { page, browser } = session;

  debugLog('开始 QR 登录流程...');
  debugLog('无头模式: ' + isHeadless + ', 超时: ' + timeout + 'ms');

  const removeDisconnectListener = setupBrowserDisconnectListener(browser, browserClosedRef);

  // 监听 check_qrconnect API 响应
  page.on('response', async (res) => {
    const url = res.url();
    if (url.includes('check_qrconnect')) {
      try {
        const body = await res.json();
        debugLog('[QR-CHECK]', JSON.stringify(body));
      } catch {
        debugLog('[QR-CHECK] status:', res.status());
      }
    }
  });

  try {
    // Step 0: 预访问安全 SDK 域名，建立跨域 cookie（解决 CORS 问题）
    debugLog('预访问安全 SDK 域名...');
    try {
      const mssdkPage = await page.context().newPage();
      await mssdkPage.goto('https://mssdk.bytedance.com/', { waitUntil: 'domcontentloaded', timeout: 10000 }).catch(() => {});
      await mssdkPage.close();
      debugLog('安全 SDK 域名访问完成');
    } catch (e) {
      debugLog('安全 SDK 域名访问失败（可忽略）:', e);
    }
    
    debugLog('导航到首页: ' + DY_URLS.home);
    await page.goto(DY_URLS.home, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await randomDelay(3000, 4000);

    let qrContainer = await findQrContainer(page);

    if (!qrContainer) {
      debugLog('尝试点击登录按钮...');
      for (const selector of LOGIN_BUTTON_SELECTORS) {
        try {
          const loginBtn = page.locator(selector).first();
          if (await loginBtn.isVisible({ timeout: 2000 })) {
            await loginBtn.click();
            debugLog('点击了登录按钮: ' + selector);
            await delay(3000);
            qrContainer = await findQrContainer(page);
            if (qrContainer) break;
          }
        } catch {}
      }
    }

    if (!qrContainer) {
      await delay(2000);
      qrContainer = await findQrContainer(page);
    }

    if (!qrContainer) {
      const screenshotPath = getTmpFilePath('login_debug', 'png', user);
      await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => {});
      debugLog('调试截图保存到: ' + screenshotPath);
      throw new DouyinError('无法找到登录二维码。请检查网络连接或稍后重试。', DouyinErrorCode.LOGIN_FAILED);
    }

    await waitForQrImageLoad(page, qrContainer, 10000);

    const filePath = getTmpFilePath('qr_login', 'png', user);
    const captured = await captureQrImage(qrContainer, filePath);
    
    if (!captured) {
      const screenshotPath = getTmpFilePath('login_debug', 'png', user);
      await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => {});
      throw new DouyinError('无法截取二维码图片。', DouyinErrorCode.LOGIN_FAILED);
    }
    
    debugLog('二维码已保存到: ' + filePath);
    outputQrCode(filePath);
    
    if (!isHeadless) {
      console.error('请使用抖音 App 扫描二维码登录。');
      console.error('二维码已保存到: ' + filePath);
    }

    await waitForQrScan(page, timeout, browserClosedRef);

    debugLog('导航到首页确认登录...');
    await page.goto(DY_URLS.home, { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {});
    await delay(1000);

    const cookies = await extractCookies(session.context);
    debugLog('提取到 ' + cookies.length + ' 个 cookies');

    if (cookies.length === 0) {
      throw new DouyinError('登录成功但未能获取 Cookie，请重试。', DouyinErrorCode.LOGIN_FAILED);
    }

    if (!hasRequiredCookies(cookies)) {
      debugLog('警告: 未找到必需的 cookies');
    }

    await saveCookies(cookies, user);

    return {
      success: true,
      message: '登录成功，Cookie 已保存。',
      cookieSaved: true,
      user,
    };
  } finally {
    removeDisconnectListener();
  }
}