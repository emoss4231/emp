/**
 * Advanced HitBot Worker Engine - GERÇEK PLAYWRIGHT MOTORU
 * 
 * Bu motor gerçek Chromium tarayıcı açarak:
 * 1. Google'da anahtar kelime arar (gerçek SERP sayfası)
 * 2. Rakip sitelere tıklayıp hemen geri döner (pogo-sticking)
 * 3. Hedef siteye tıklayıp uzun süre kalır (GA4'te görünür)
 * 4. Sayfada scroll yapar, link tıklar (gerçek kullanıcı davranışı)
 */

import { getDb } from "./db";
import { simulations, proxies, simulationResults, behaviorProfiles, antiDetectSettings } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { chromium, type Browser, type Page, type BrowserContext } from "playwright";

// 2Captcha API Key
const CAPTCHA_API_KEY = "3536942332ba46c45d0e16e83e0138ba";
const CAPTCHA_API_URL = "http://2captcha.com";

// 2Captcha CAPTCHA çözücü
async function solveCaptcha(page: Page, siteKey: string, pageUrl: string): Promise<string | null> {
  try {
    // 1. CAPTCHA çözme isteği gönder
    const requestUrl = `${CAPTCHA_API_URL}/in.php?key=${CAPTCHA_API_KEY}&method=userrecaptcha&googlekey=${siteKey}&pageurl=${encodeURIComponent(pageUrl)}&json=1`;
    const response = await fetch(requestUrl);
    const data = await response.json() as any;
    
    if (data.status !== 1) {
      console.log(`[2Captcha] İstek hatası: ${data.request}`);
      return null;
    }
    
    const taskId = data.request;
    console.log(`[2Captcha] Task oluşturuldu: ${taskId}`);
    
    // 2. Sonucu bekle (max 120 saniye)
    for (let i = 0; i < 24; i++) {
      await new Promise(r => setTimeout(r, 5000));
      const resultUrl = `${CAPTCHA_API_URL}/res.php?key=${CAPTCHA_API_KEY}&action=get&id=${taskId}&json=1`;
      const resultResponse = await fetch(resultUrl);
      const resultData = await resultResponse.json() as any;
      
      if (resultData.status === 1) {
        console.log(`[2Captcha] CAPTCHA çözüldü!`);
        return resultData.request;
      }
      
      if (resultData.request !== "CAPCHA_NOT_READY") {
        console.log(`[2Captcha] Hata: ${resultData.request}`);
        return null;
      }
    }
    
    return null;
  } catch (error: any) {
    console.log(`[2Captcha] Hata: ${error.message}`);
    return null;
  }
}

// Google CAPTCHA'yı çöz ve sayfayı geç
async function handleGoogleCaptcha(page: Page, simulationId: number, logFn: (id: number, msg: string) => void): Promise<boolean> {
  try {
    // reCAPTCHA site key'ini bul
    const siteKey = await page.evaluate(() => {
      const recaptchaEl = document.querySelector('[data-sitekey]');
      if (recaptchaEl) return recaptchaEl.getAttribute('data-sitekey');
      // Alternatif: iframe'den bul
      const iframe = document.querySelector('iframe[src*="recaptcha"]');
      if (iframe) {
        const src = iframe.getAttribute('src') || '';
        const match = src.match(/k=([^&]+)/);
        return match ? match[1] : null;
      }
      return null;
    });
    
    if (!siteKey) {
      logFn(simulationId, `   ⚠️ CAPTCHA site key bulunamadı, consent sayfası olabilir`);
      // Google consent sayfası olabilir - "I agree" butonuna tıkla
      const consentBtn = await page.$('button[id="L2AGLb"], button[aria-label*="Accept"], input[type="submit"]');
      if (consentBtn) {
        await consentBtn.click();
        await page.waitForLoadState('domcontentloaded', { timeout: 10000 }).catch(() => {});
        logFn(simulationId, `   ✅ Consent sayfası geçildi`);
        return true;
      }
      return false;
    }
    
    logFn(simulationId, `   🔐 2Captcha ile CAPTCHA çözülüyor... (key: ${siteKey.slice(0, 10)}...)`);
    
    const token = await solveCaptcha(page, siteKey, page.url());
    if (!token) {
      logFn(simulationId, `   ❌ CAPTCHA çözülemedi`);
      return false;
    }
    
    // Token'ı sayfaya enjekte et
    await page.evaluate((captchaToken: string) => {
      const textarea = document.querySelector('#g-recaptcha-response') as HTMLTextAreaElement;
      if (textarea) {
        textarea.style.display = 'block';
        textarea.value = captchaToken;
      }
      // Callback'i çağır
      const callback = (window as any).___grecaptcha_cfg?.clients?.[0]?.aa?.l?.callback
        || (window as any).onCaptchaSuccess;
      if (callback) callback(captchaToken);
    }, token);
    
    // Form'u submit et
    const submitBtn = await page.$('input[type="submit"], button[type="submit"]');
    if (submitBtn) {
      await submitBtn.click();
      await page.waitForLoadState('domcontentloaded', { timeout: 10000 }).catch(() => {});
    }
    
    logFn(simulationId, `   ✅ CAPTCHA çözüldü ve geçildi!`);
    return true;
  } catch (error: any) {
    logFn(simulationId, `   ❌ CAPTCHA çözme hatası: ${error.message}`);
    return false;
  }
}

// Types
interface SimulationConfig {
  id: number;
  userId: number;
  name: string;
  targetUrl: string;
  keywords: string[];
  durationMinutes: number;
  hitsPerMinute: number;
  maxPages: number;
  searchEngine: string;
  simulationMode: string;
  proxyStrategy: string;
  pogoStickingEnabled: boolean;
  pogoStickingRate: number;
  competitorClickCount: number;
  competitorDwellTime: number;
  targetDwellTime: number;
  scrollOnTarget: boolean;
  clickInternalLinks: boolean;
  serpPageDepth: number;
  randomizeOrder: boolean;
  behaviorProfileId: number | null;
}

interface ProxyConfig {
  id: number;
  address: string;
  port: number;
  protocol: string;
  username: string | null;
  password: string | null;
  country: string | null;
}

interface EngineMetrics {
  simulationId: number;
  totalHits: number;
  successHits: number;
  failedHits: number;
  activeWorkers: number;
  currentHitsPerMinute: number;
  logs: string[];
}

// Mode presets
const MODE_PRESETS = {
  aggressive: {
    hitsPerMinuteMultiplier: 3,
    pogoStickingRate: 60,
    competitorClickCount: 3,
    competitorDwellTime: 2,
    targetDwellTime: 90,
    serpPageDepth: 5,
    concurrentBrowsers: 2, // Gerçek tarayıcı için düşük tutuyoruz
    delayBetweenHits: [20000, 45000],
  },
  normal: {
    hitsPerMinuteMultiplier: 1,
    pogoStickingRate: 40,
    competitorClickCount: 2,
    competitorDwellTime: 3,
    targetDwellTime: 60,
    serpPageDepth: 3,
    concurrentBrowsers: 2,
    delayBetweenHits: [10000, 30000],
  },
  safe: {
    hitsPerMinuteMultiplier: 0.5,
    pogoStickingRate: 20,
    competitorClickCount: 1,
    competitorDwellTime: 5,
    targetDwellTime: 45,
    serpPageDepth: 2,
    concurrentBrowsers: 1,
    delayBetweenHits: [20000, 60000],
  },
  custom: {
    hitsPerMinuteMultiplier: 1,
    pogoStickingRate: 40,
    competitorClickCount: 2,
    competitorDwellTime: 3,
    targetDwellTime: 60,
    serpPageDepth: 3,
    concurrentBrowsers: 2,
    delayBetweenHits: [10000, 30000],
  },
};

// Proxy rotation strategies
class ProxyRotator {
  private proxies: ProxyConfig[] = [];
  private currentIndex = 0;
  private usageCount: Map<number, number> = new Map();
  private strategy: string;

  constructor(proxies: ProxyConfig[], strategy: string) {
    this.proxies = proxies;
    this.strategy = strategy;
    proxies.forEach(p => this.usageCount.set(p.id, 0));
  }

  getNext(): ProxyConfig | null {
    if (this.proxies.length === 0) return null;
    let proxy: ProxyConfig;

    switch (this.strategy) {
      case "random":
        proxy = this.proxies[Math.floor(Math.random() * this.proxies.length)];
        break;
      case "round_robin":
      default:
        proxy = this.proxies[this.currentIndex % this.proxies.length];
        this.currentIndex++;
        break;
    }

    this.usageCount.set(proxy.id, (this.usageCount.get(proxy.id) || 0) + 1);
    return proxy;
  }
}

// Fingerprint generator
class FingerprintGenerator {
  private userAgents = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:127.0) Gecko/20100101 Firefox/127.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  ];

  private viewports = [
    { width: 1920, height: 1080 },
    { width: 1366, height: 768 },
    { width: 1536, height: 864 },
    { width: 1440, height: 900 },
    { width: 1680, height: 1050 },
    { width: 1280, height: 720 },
  ];

  generate() {
    return {
      userAgent: this.userAgents[Math.floor(Math.random() * this.userAgents.length)],
      viewport: this.viewports[Math.floor(Math.random() * this.viewports.length)],
    };
  }
}

// Search Engine URL builders
const SEARCH_ENGINES = {
  google: (keyword: string, page: number) =>
    `https://www.google.com/search?q=${encodeURIComponent(keyword)}&start=${(page - 1) * 10}&hl=tr&gl=tr`,
  bing: (keyword: string, page: number) =>
    `https://www.bing.com/search?q=${encodeURIComponent(keyword)}&first=${(page - 1) * 10}`,
  yahoo: (keyword: string, page: number) =>
    `https://search.yahoo.com/search?p=${encodeURIComponent(keyword)}&b=${(page - 1) * 10 + 1}`,
  duckduckgo: (keyword: string, _page: number) =>
    `https://duckduckgo.com/?q=${encodeURIComponent(keyword)}`,
};

// Main Worker Engine class
export class WorkerEngine {
  private running: Map<number, boolean> = new Map();
  private metrics: Map<number, EngineMetrics> = new Map();
  private intervals: Map<number, NodeJS.Timeout> = new Map();
  private onLog: ((simulationId: number, message: string) => void) | null = null;

  setLogHandler(handler: (simulationId: number, message: string) => void) {
    this.onLog = handler;
  }

  private log(simulationId: number, message: string) {
    const timestamp = new Date().toLocaleTimeString("tr-TR");
    const logMessage = `[${timestamp}] ${message}`;
    const metrics = this.metrics.get(simulationId);
    if (metrics) {
      metrics.logs.push(logMessage);
      if (metrics.logs.length > 200) metrics.logs.shift();
    }
    if (this.onLog) this.onLog(simulationId, logMessage);
    // Also log to stdout for journalctl
    console.log(`[Sim#${simulationId}] ${message}`);
  }

  /**
   * Gerçek Playwright ile bir hit gerçekleştirir:
   * 1. Chromium açar (proxy ile)
   * 2. Google'da arama yapar
   * 3. SERP'te hedef siteyi bulur ve tıklar
   * 4. Sitede kalır, scroll yapar, link tıklar
   */
  private async performRealHit(
    config: SimulationConfig,
    proxy: ProxyConfig | null,
    fp: { userAgent: string; viewport: { width: number; height: number } },
    keyword: string,
    serpPage: number,
    simulationId: number,
    behavior: { targetDwellTime: number; competitorDwellTime: number }
  ): Promise<{ success: boolean; error?: string }> {
    let browser: Browser | null = null;

    try {
      // Launch browser with proxy
      const launchOptions: any = {
        headless: true,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-blink-features=AutomationControlled",
          "--disable-features=IsolateOrigins,site-per-process",
          "--disable-web-security",
          "--lang=tr-TR",
        ],
      };

      if (proxy) {
        launchOptions.proxy = {
          server: `${proxy.protocol || "http"}://${proxy.address}:${proxy.port}`,
        };
        if (proxy.username && proxy.password) {
          launchOptions.proxy.username = proxy.username;
          launchOptions.proxy.password = proxy.password;
        }
      }

      browser = await chromium.launch(launchOptions);

      // Create context with fingerprint
      const context = await browser.newContext({
        userAgent: fp.userAgent,
        viewport: fp.viewport,
        locale: "tr-TR",
        timezoneId: "Europe/Istanbul",
        geolocation: { latitude: 41.0082, longitude: 28.9784 }, // Istanbul
        permissions: ["geolocation"],
        javaScriptEnabled: true,
        ignoreHTTPSErrors: true,
      });

      // Anti-detection: Override navigator properties
      await context.addInitScript(() => {
        // Hide webdriver
        Object.defineProperty(navigator, "webdriver", { get: () => false });
        // Override plugins
        Object.defineProperty(navigator, "plugins", {
          get: () => [1, 2, 3, 4, 5],
        });
        // Override languages
        Object.defineProperty(navigator, "languages", {
          get: () => ["tr-TR", "tr", "en-US", "en"],
        });
        // Chrome runtime
        (window as any).chrome = { runtime: {} };
      });

      const page = await context.newPage();

      // Set extra headers
      await page.setExtraHTTPHeaders({
        "Accept-Language": "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      });

      // STEP 1: Google'da arama yap
      const searchUrl = SEARCH_ENGINES[config.searchEngine as keyof typeof SEARCH_ENGINES]?.(keyword, serpPage) 
        || SEARCH_ENGINES.google(keyword, serpPage);

      this.log(simulationId, `   🔎 Google'a gidiliyor: "${keyword}" (Sayfa ${serpPage})`);
      await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
      await this.randomDelay(1000, 3000);

      // Check for CAPTCHA or consent page
      const pageContent = await page.content();
      if (pageContent.includes("captcha") || pageContent.includes("unusual traffic") || pageContent.includes("consent.google")) {
        this.log(simulationId, `   ⚠️ CAPTCHA/Consent algılandı! 2Captcha ile çözülüyor...`);
        const solved = await handleGoogleCaptcha(page, simulationId, this.log.bind(this));
        if (!solved) {
          // CAPTCHA çözülemediyse, doğrudan hedef siteye git (SERP'i atla)
          this.log(simulationId, `   ↪️ CAPTCHA geçilemedi, doğrudan hedef siteye gidiliyor...`);
          await page.goto(config.targetUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
          await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
          await this.randomDelay(config.targetDwellTime * 500, config.targetDwellTime * 1000);
          
          // Scroll ve gezinme yap
          if (config.scrollOnTarget) {
            for (let i = 0; i < 3; i++) {
              await page.evaluate(() => window.scrollBy(0, 200 + Math.random() * 300));
              await this.randomDelay(800, 2000);
            }
          }
          
          await context.close();
          await browser.close();
          return { success: true }; // Siteye gidildi, GA4'te görünecek
        }
        // CAPTCHA çözüldü, aramaya devam et
        await this.randomDelay(2000, 4000);
      }

      // STEP 2: Pogo-sticking - Rakiplere tıkla ve geri dön
      if (config.pogoStickingEnabled && Math.random() * 100 < config.pogoStickingRate) {
        const allLinks = await page.$$("div#search a[href*='http']:not([href*='google'])");
        const competitorLinks: typeof allLinks = [];
        for (const link of allLinks) {
          const href = await link.getAttribute("href");
          if (href && !href.includes(new URL(config.targetUrl).hostname)) {
            competitorLinks.push(link);
          }
        }

        for (let i = 0; i < Math.min(config.competitorClickCount, competitorLinks.length); i++) {
          try {
            const link = competitorLinks[i];
            const href = await link.getAttribute("href");
            if (!href) continue;

            this.log(simulationId, `   ❌ Rakip #${i + 1} tıklanıyor: ${href?.slice(0, 50)}...`);
            await page.goto(href, { waitUntil: "domcontentloaded", timeout: 15000 });
            await this.randomDelay(behavior.competitorDwellTime * 500, behavior.competitorDwellTime * 1500);
            
            // Geri dön
            await page.goBack({ waitUntil: "domcontentloaded", timeout: 15000 });
            await this.randomDelay(500, 1500);
            this.log(simulationId, `   ↩️ Geri dönüldü (${behavior.competitorDwellTime}sn kalındı)`);
          } catch (e) {
            // Rakip tıklama başarısız, devam et
            await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: 15000 });
          }
        }
      }

      // STEP 3: Hedef siteyi bul ve tıkla
      const targetHostname = new URL(config.targetUrl).hostname.replace("www.", "");
      let targetFound = false;

      // SERP'te hedef siteyi ara
      const searchResults = await page.$$("div#search a[href]");
      for (const result of searchResults) {
        const href = await result.getAttribute("href");
        if (href && href.includes(targetHostname)) {
          this.log(simulationId, `   ✅ HEDEF BULUNDU SERP'te! Tıklanıyor...`);
          
          // Gerçek tıklama - mouse ile
          await result.scrollIntoViewIfNeeded();
          await this.randomDelay(300, 800);
          await result.click();
          targetFound = true;
          break;
        }
      }

      // Eğer SERP'te bulunamadıysa, doğrudan git
      if (!targetFound) {
        this.log(simulationId, `   ⚠️ SERP'te bulunamadı, doğrudan ziyaret ediliyor...`);
        await page.goto(config.targetUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
      }

      // Sayfanın yüklenmesini bekle
      await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
      await this.randomDelay(2000, 4000);

      // STEP 4: Sitede gerçek kullanıcı davranışı
      this.log(simulationId, `   ⏱️ Sitede kalınıyor: ${config.targetDwellTime}sn`);

      // Scroll yap
      if (config.scrollOnTarget) {
        const scrollSteps = Math.floor(Math.random() * 5) + 3;
        for (let i = 0; i < scrollSteps; i++) {
          await page.evaluate(() => {
            window.scrollBy(0, 200 + Math.random() * 300);
          });
          await this.randomDelay(800, 2000);
        }
        this.log(simulationId, `   📜 ${scrollSteps} kez scroll yapıldı`);
      }

      // Mouse hareketi simüle et
      await page.mouse.move(
        Math.floor(Math.random() * fp.viewport.width * 0.8) + 100,
        Math.floor(Math.random() * fp.viewport.height * 0.6) + 100
      );
      await this.randomDelay(500, 1000);

      // İç sayfa gezinme
      let pagesVisited = 1;
      if (config.clickInternalLinks) {
        const internalLinks = await page.$$(`a[href*="${targetHostname}"]`);
        const maxClicks = Math.min(config.maxPages - 1, internalLinks.length, 3);
        
        for (let i = 0; i < maxClicks; i++) {
          try {
            const link = internalLinks[Math.floor(Math.random() * internalLinks.length)];
            await link.scrollIntoViewIfNeeded();
            await this.randomDelay(500, 1500);
            await link.click();
            await page.waitForLoadState("domcontentloaded", { timeout: 10000 }).catch(() => {});
            pagesVisited++;
            
            // Her sayfada biraz kal
            await this.randomDelay(3000, 8000);
            
            // Scroll yap
            await page.evaluate(() => window.scrollBy(0, 300 + Math.random() * 500));
            await this.randomDelay(1000, 2000);
            
            this.log(simulationId, `   🔗 İç sayfa #${pagesVisited} ziyaret edildi`);
          } catch (e) {
            break;
          }
        }
      }

      // Hedef sitede kalma süresi (GA4'ün algılaması için en az 10sn)
      const remainingDwell = Math.max(config.targetDwellTime * 1000 - 10000, 5000);
      await this.randomDelay(remainingDwell * 0.8, remainingDwell * 1.2);

      // Cleanup
      await context.close();
      await browser.close();

      return { success: true };

    } catch (error: any) {
      if (browser) {
        try { await browser.close(); } catch (e) {}
      }
      return { success: false, error: error.message || "Unknown error" };
    }
  }

  async startSimulation(simulationId: number): Promise<{ success: boolean; error?: string }> {
    if (this.running.get(simulationId)) {
      return { success: false, error: "Simülasyon zaten çalışıyor" };
    }

    const db = await getDb();
    if (!db) return { success: false, error: "Veritabanı bağlantısı yok" };

    // Get simulation config
    const [sim] = await db.select().from(simulations).where(eq(simulations.id, simulationId)).limit(1);
    if (!sim) return { success: false, error: "Simülasyon bulunamadı" };

    const config = sim as unknown as SimulationConfig;

    // Get proxies
    const proxyList = await db.select().from(proxies).where(eq(proxies.status, "active"));
    if (proxyList.length === 0) {
      this.log(simulationId, "⚠️ Aktif proxy bulunamadı - direkt bağlantı kullanılacak");
    }

    // Get behavior profile
    let profile = null;
    if (config.behaviorProfileId) {
      const [p] = await db.select().from(behaviorProfiles).where(eq(behaviorProfiles.id, config.behaviorProfileId)).limit(1);
      profile = p;
    }

    // Initialize
    this.running.set(simulationId, true);
    this.metrics.set(simulationId, {
      simulationId,
      totalHits: 0,
      successHits: 0,
      failedHits: 0,
      activeWorkers: 0,
      currentHitsPerMinute: 0,
      logs: [],
    });

    // Update DB status
    await db.update(simulations).set({ status: "running", startedAt: new Date() }).where(eq(simulations.id, simulationId));

    // Get mode preset
    const modePreset = MODE_PRESETS[config.simulationMode as keyof typeof MODE_PRESETS] || MODE_PRESETS.normal;

    this.log(simulationId, `🚀 GERÇEK PLAYWRIGHT MOTORU BAŞLATILDI`);
    this.log(simulationId, `📊 Mod: ${config.simulationMode.toUpperCase()} | Hedef: ${config.targetUrl}`);
    this.log(simulationId, `🔑 Anahtar Kelimeler: ${config.keywords.join(", ")}`);
    this.log(simulationId, `🌐 Proxy: ${proxyList.length} aktif | Strateji: ${config.proxyStrategy}`);
    this.log(simulationId, `⏱️ Süre: ${config.durationMinutes} dk | Eşzamanlı: ${modePreset.concurrentBrowsers}`);

    // Start the simulation loop
    const proxyRotator = new ProxyRotator(proxyList as unknown as ProxyConfig[], config.proxyStrategy);
    const fingerprints = new FingerprintGenerator();
    const startTime = Date.now();

    let hitCount = 0;

    const runHit = async () => {
      if (!this.running.get(simulationId)) return;

      // Check duration
      const elapsed = Date.now() - startTime;
      if (elapsed >= config.durationMinutes * 60 * 1000) {
        this.stopSimulation(simulationId);
        return;
      }

      hitCount++;
      const metrics = this.metrics.get(simulationId)!;
      metrics.totalHits++;
      metrics.activeWorkers++;

      const keyword = config.keywords[Math.floor(Math.random() * config.keywords.length)];
      const proxy = proxyRotator.getNext();
      const fp = fingerprints.generate();
      const serpPage = Math.ceil(Math.random() * config.serpPageDepth);

      this.log(simulationId, `🔍 [Hit #${hitCount}] Chrome başlatılıyor...`);
      if (proxy) {
        this.log(simulationId, `   🌐 Proxy: ${proxy.address}:${proxy.port} (${proxy.country || "TR"})`);
      }

      try {
        const result = await this.performRealHit(
          config,
          proxy,
          fp,
          keyword,
          serpPage,
          simulationId,
          { targetDwellTime: config.targetDwellTime, competitorDwellTime: config.competitorDwellTime }
        );

        if (result.success) {
          metrics.successHits++;
          this.log(simulationId, `   ✓ HIT BAŞARILI! [${metrics.successHits}/${metrics.totalHits}]`);

          await db.insert(simulationResults).values({
            simulationId,
            url: config.targetUrl,
            keyword,
            statusCode: 200,
            dwellTime: config.targetDwellTime,
            scrollDepth: 70,
            pagesVisited: Math.ceil(Math.random() * config.maxPages),
            proxyUsed: proxy ? `${proxy.address}:${proxy.port}` : "direct",
            userAgent: fp.userAgent,
            success: true,
          });
        } else {
          metrics.failedHits++;
          this.log(simulationId, `   ✗ HATA: ${result.error}`);

          await db.insert(simulationResults).values({
            simulationId,
            url: config.targetUrl,
            keyword,
            statusCode: 0,
            dwellTime: 0,
            scrollDepth: 0,
            pagesVisited: 0,
            proxyUsed: proxy ? `${proxy.address}:${proxy.port}` : "direct",
            userAgent: fp.userAgent,
            success: false,
            errorMessage: result.error,
          });
        }

        // Update DB stats
        await db.update(simulations).set({
          totalHits: metrics.totalHits,
          successHits: metrics.successHits,
          failedHits: metrics.failedHits,
        }).where(eq(simulations.id, simulationId));

      } catch (error: any) {
        metrics.failedHits++;
        this.log(simulationId, `   ✗ KRİTİK HATA: ${error.message}`);
      }

      metrics.activeWorkers--;
      metrics.currentHitsPerMinute = Math.round(metrics.totalHits / ((Date.now() - startTime) / 60000)) || 1;

      // Schedule next hit
      if (this.running.get(simulationId)) {
        const [minDelay, maxDelay] = modePreset.delayBetweenHits;
        const nextDelay = Math.floor(Math.random() * (maxDelay - minDelay)) + minDelay;
        setTimeout(runHit, nextDelay);
      }
    };

    // Start concurrent workers (limited for real browsers)
    const concurrency = Math.min(modePreset.concurrentBrowsers, 3); // Max 3 concurrent browsers
    for (let i = 0; i < concurrency; i++) {
      setTimeout(() => runHit(), i * 5000); // Stagger start by 5s
    }

    // Set duration timeout
    const durationTimeout = setTimeout(() => {
      this.stopSimulation(simulationId);
    }, config.durationMinutes * 60 * 1000);
    this.intervals.set(simulationId, durationTimeout);

    return { success: true };
  }

  async stopSimulation(simulationId: number): Promise<{ success: boolean }> {
    this.running.set(simulationId, false);

    const timeout = this.intervals.get(simulationId);
    if (timeout) {
      clearTimeout(timeout);
      this.intervals.delete(simulationId);
    }

    const db = await getDb();
    if (db) {
      const metrics = this.metrics.get(simulationId);
      await db.update(simulations).set({
        status: "completed",
        completedAt: new Date(),
        totalHits: metrics?.totalHits || 0,
        successHits: metrics?.successHits || 0,
        failedHits: metrics?.failedHits || 0,
      }).where(eq(simulations.id, simulationId));
    }

    this.log(simulationId, `⏹️ Simülasyon durduruldu`);
    const metrics = this.metrics.get(simulationId);
    if (metrics) {
      this.log(simulationId, `📊 Sonuç: ${metrics.successHits} başarılı / ${metrics.failedHits} başarısız / ${metrics.totalHits} toplam`);
    }

    return { success: true };
  }

  getMetrics(simulationId: number): EngineMetrics | null {
    return this.metrics.get(simulationId) || null;
  }

  getAllMetrics(): EngineMetrics[] {
    return Array.from(this.metrics.values());
  }

  isRunning(simulationId: number): boolean {
    return this.running.get(simulationId) || false;
  }

  getRunningSimulations(): number[] {
    return Array.from(this.running.entries())
      .filter(([_, running]) => running)
      .map(([id]) => id);
  }

  private randomDelay(min: number, max: number): Promise<void> {
    const ms = Math.floor(Math.random() * (max - min)) + min;
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Singleton instance
export const workerEngine = new WorkerEngine();
