import { existsSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const CHROME_PATH =
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const rootDir = join(import.meta.dir, "..");
const assetsDir = join(rootDir, "extension", "store-assets");
const iconsDir = join(rootDir, "extension", "src", "icons");

async function renderHtml(
  htmlContent: string,
  width: number,
  height: number,
  outputPath: string,
) {
  const tmpFile = join(
    rootDir,
    `tmp-render-${Date.now()}-${Math.random().toString(36).slice(2)}.html`,
  );
  writeFileSync(tmpFile, htmlContent);

  const proc = Bun.spawn(
    [
      CHROME_PATH,
      "--headless",
      `--screenshot=${outputPath}`,
      `--window-size=${width},${height}`,
      "--hide-scrollbars",
      "--default-background-color=00000000",
      tmpFile,
    ],
    {
      stdout: "ignore",
      stderr: "ignore",
    },
  );

  await proc.exited;
  try {
    unlinkSync(tmpFile);
  } catch {}
}

// 1. Icon HTML (scalable SVG)
function getIconHtml(size: number) {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: ${size}px;
    height: ${size}px;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    background: transparent;
  }
</style>
</head>
<body>
<svg width="${size}" height="${size}" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Background Gradient -->
    <linearGradient id="bgGrad" x1="0" y1="0" x2="512" y2="512" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#0057B7" />
      <stop offset="50%" stop-color="#003D82" />
      <stop offset="100%" stop-color="#0F172A" />
    </linearGradient>

    <!-- Gold Accent Gradient -->
    <linearGradient id="goldGrad" x1="120" y1="80" x2="400" y2="440" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#FFE600" />
      <stop offset="60%" stop-color="#FFB800" />
      <stop offset="100%" stop-color="#FF8A00" />
    </linearGradient>

    <!-- Glow Filter -->
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="16" stdDeviation="24" flood-color="#000000" flood-opacity="0.45" />
    </filter>

    <filter id="goldGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="8" stdDeviation="16" flood-color="#FFB800" flood-opacity="0.4" />
    </filter>
  </defs>

  <!-- Squircle Base with Soft Shadow -->
  <rect x="24" y="24" width="464" height="464" rx="112" fill="url(#bgGrad)" filter="url(#shadow)" />
  <rect x="24" y="24" width="464" height="464" rx="112" stroke="rgba(255,255,255,0.18)" stroke-width="6" />

  <!-- Ukrainian Diagonal Color Slash (Blue & Yellow) -->
  <path d="M 24 340 Q 256 300 488 200 L 488 424 Q 488 488 424 488 L 136 488 Q 24 488 24 376 Z" fill="url(#goldGrad)" opacity="0.95" />

  <!-- Diacritic Accent Crown (symbolizing Latin transliteration with diacritics: č, š, ž, ľ, ń) -->
  <g filter="url(#goldGlow)">
    <path d="M 200 110 L 256 160 L 312 110 L 330 128 L 256 195 L 182 128 Z" fill="#FFFFFF" />
  </g>

  <!-- Main Lettermark: Stylized 'U' -->
  <g filter="url(#goldGlow)">
    <path d="M 160 170 
             L 204 170 
             L 204 290 
             C 204 345, 230 365, 256 365 
             C 282 365, 308 345, 308 290 
             L 308 170 
             L 352 170 
             L 352 290 
             C 352 375, 305 408, 256 408 
             C 207 408, 160 375, 160 290 
             Z" 
          fill="#FFFFFF" />
  </g>

  <!-- Latin Sub-badge 'LAT' -->
  <rect x="186" y="420" width="140" height="34" rx="17" fill="#0F172A" opacity="0.85" />
  <text x="256" y="443" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="20" font-weight="800" fill="#FFE600" text-anchor="middle" letter-spacing="3">LAT</text>
</svg>
</body>
</html>`;
}

// 2. Screenshot 1: 1280x800 Transliteration Demo Showcase
function getScreenshot1Html() {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: 1280px;
    height: 800px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif;
    background: linear-gradient(135deg, #0b132b 0%, #1c2541 50%, #0d1b2a 100%);
    color: #ffffff;
    display: flex;
    flex-direction: column;
    padding: 48px 64px;
    position: relative;
    overflow: hidden;
  }

  /* Decorative glow circles */
  .glow-blue {
    position: absolute;
    width: 500px;
    height: 500px;
    background: radial-gradient(circle, rgba(0, 87, 183, 0.35) 0%, rgba(0, 87, 183, 0) 70%);
    top: -100px;
    left: -100px;
    filter: blur(50px);
  }
  .glow-gold {
    position: absolute;
    width: 500px;
    height: 500px;
    background: radial-gradient(circle, rgba(255, 215, 0, 0.25) 0%, rgba(255, 215, 0, 0) 70%);
    bottom: -150px;
    right: -100px;
    filter: blur(50px);
  }

  /* Header */
  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 40px;
    z-index: 10;
  }
  .logo-box {
    display: flex;
    align-items: center;
    gap: 18px;
  }
  .logo-icon {
    width: 56px;
    height: 56px;
    border-radius: 14px;
    background: linear-gradient(135deg, #0057B7, #FFD700);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 28px;
    font-weight: 900;
    color: #fff;
    box-shadow: 0 8px 24px rgba(0, 87, 183, 0.4);
  }
  .title-group h1 {
    font-size: 32px;
    font-weight: 800;
    letter-spacing: -0.5px;
    background: linear-gradient(90deg, #FFFFFF 0%, #E2E8F0 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
  .title-group p {
    font-size: 15px;
    color: #94A3B8;
    margin-top: 2px;
  }

  .badge-tag {
    background: rgba(255, 215, 0, 0.15);
    border: 1px solid rgba(255, 215, 0, 0.4);
    color: #FFD700;
    padding: 8px 18px;
    border-radius: 999px;
    font-size: 14px;
    font-weight: 700;
    letter-spacing: 0.5px;
  }

  /* Main Comparison Cards Container */
  .cards-row {
    display: grid;
    grid-template-columns: 1fr 64px 1fr;
    align-items: center;
    gap: 20px;
    flex: 1;
    z-index: 10;
  }

  .card {
    background: rgba(30, 41, 59, 0.7);
    backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 24px;
    padding: 32px;
    height: 100%;
    display: flex;
    flex-direction: column;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.35);
  }

  .card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 20px;
    padding-bottom: 16px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  }
  .card-label {
    font-size: 14px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1px;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .card-label.cyr { color: #38BDF8; }
  .card-label.lat { color: #FACC15; }

  .lang-pill {
    background: rgba(255, 255, 255, 0.08);
    padding: 4px 10px;
    border-radius: 6px;
    font-size: 12px;
    color: #CBD5E1;
  }

  .text-content {
    font-size: 21px;
    line-height: 1.6;
    color: #F1F5F9;
    flex: 1;
  }
  .text-content mark {
    background: rgba(250, 204, 21, 0.25);
    color: #FEF08A;
    padding: 2px 6px;
    border-radius: 4px;
  }

  .arrow-connector {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }
  .arrow-circle {
    width: 56px;
    height: 56px;
    border-radius: 50%;
    background: linear-gradient(135deg, #0057B7, #FFD700);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 10px 25px rgba(0, 87, 183, 0.5);
  }
  .arrow-circle svg {
    width: 26px;
    height: 26px;
    fill: #FFFFFF;
  }

  /* Bottom Feature Pills */
  .features-bar {
    display: flex;
    gap: 16px;
    margin-top: 32px;
    z-index: 10;
  }
  .feature-item {
    flex: 1;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 16px;
    padding: 14px 20px;
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 15px;
    font-weight: 600;
    color: #E2E8F0;
  }
  .feature-item .icon {
    font-size: 20px;
  }
</style>
</head>
<body>
  <div class="glow-blue"></div>
  <div class="glow-gold"></div>

  <!-- Header -->
  <div class="header">
    <div class="logo-box">
      <div class="logo-icon">U</div>
      <div class="title-group">
        <h1>UkrLat — Українська латинка</h1>
        <p>Миттєва та точна транслітерація на будь-якому сайті</p>
      </div>
    </div>
    <div class="badge-tag">ОФІЦІЙНЕ РОЗШИРЕННЯ</div>
  </div>

  <!-- Comparison Cards -->
  <div class="cards-row">
    <!-- Input Card -->
    <div class="card">
      <div class="card-header">
        <div class="card-label cyr">● Тарас Шевченко (Кирилиця)</div>
        <div class="lang-pill">UA-CYR</div>
      </div>
      <div class="text-content">
        Реве та стогне Дніпр широкий,<br>
        Сердитий вітер завива,<br>
        Додолу верби гне високі,<br>
        Горами хвилю підійма.<br><br>
        Ще треті півні не співали,<br>
        Ніхто ніде не гомонів...
      </div>
    </div>

    <!-- Arrow -->
    <div class="arrow-connector">
      <div class="arrow-circle">
        <svg viewBox="0 0 24 24"><path d="M5 13h11.86l-5.43 5.43 1.42 1.42L21.14 12l-8.29-8.29-1.42 1.42L16.86 11H5v2z"/></svg>
      </div>
    </div>

    <!-- Output Card -->
    <div class="card">
      <div class="card-header">
        <div class="card-label lat">● UkrLat (Латинка)</div>
        <div class="lang-pill">UA-LAT</div>
      </div>
      <div class="text-content">
        <mark>Reve ta stogne Dnipr šyrokyj,</mark><br>
        Serdytyj viter zavyva,<br>
        Dodolu verby gne vysoki,<br>
        Goramy hvylû pidijma.<br><br>
        Šče treti pivni ne spivaly,<br>
        Nihto nide ne gomoniv...
      </div>
    </div>
  </div>

  <!-- Features Footer -->
  <div class="features-bar">
    <div class="feature-item"><span class="icon">⚡</span> Миттєва обробка в браузері</div>
    <div class="feature-item"><span class="icon">🖱️</span> Контекстне меню (правий клік)</div>
    <div class="feature-item"><span class="icon">🔒</span> 100% офлайн і конфіденційно</div>
    <div class="feature-item"><span class="icon">⌨️</span> Зручні гарячі клавіші</div>
  </div>
</body>
</html>`;
}

// 3. Screenshot 2: Features & Popup View (1280x800)
function getScreenshot2Html() {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: 1280px;
    height: 800px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif;
    background: radial-gradient(circle at 70% 30%, #1e3a8a 0%, #0f172a 60%, #020617 100%);
    color: #ffffff;
    display: flex;
    flex-direction: column;
    padding: 56px 64px;
    position: relative;
    overflow: hidden;
  }

  .content-grid {
    display: grid;
    grid-template-columns: 1.1fr 0.9fr;
    gap: 56px;
    align-items: center;
    flex: 1;
  }

  .left-col h2 {
    font-size: 42px;
    font-weight: 800;
    line-height: 1.2;
    margin-bottom: 20px;
    background: linear-gradient(90deg, #FFFFFF, #93C5FD);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
  .left-col p {
    font-size: 18px;
    color: #94A3B8;
    line-height: 1.6;
    margin-bottom: 36px;
  }

  .features-list {
    display: flex;
    flex-direction: column;
    gap: 18px;
  }
  .feature-row {
    display: flex;
    align-items: flex-start;
    gap: 16px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 16px;
    padding: 16px 20px;
  }
  .feature-icon-box {
    width: 42px;
    height: 42px;
    border-radius: 10px;
    background: rgba(250, 204, 21, 0.15);
    border: 1px solid rgba(250, 204, 21, 0.3);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    flex-shrink: 0;
  }
  .feature-text h4 {
    font-size: 16px;
    font-weight: 700;
    color: #F8FAFC;
    margin-bottom: 4px;
  }
  .feature-text p {
    font-size: 14px;
    color: #94A3B8;
    margin: 0;
    line-height: 1.4;
  }

  /* Right column: Interactive popup mockup */
  .popup-mockup {
    background: #0F172A;
    border: 1px solid rgba(255, 255, 255, 0.18);
    border-radius: 24px;
    box-shadow: 0 30px 60px rgba(0, 0, 0, 0.6), 0 0 40px rgba(59, 130, 246, 0.2);
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }
  .popup-header {
    background: #1E293B;
    padding: 20px 24px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  }
  .popup-logo {
    display: flex;
    align-items: center;
    gap: 12px;
    font-weight: 800;
    font-size: 18px;
  }
  .popup-logo span {
    color: #FACC15;
  }
  .popup-body {
    padding: 24px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .input-label {
    font-size: 13px;
    font-weight: 700;
    text-transform: uppercase;
    color: #64748B;
    letter-spacing: 0.5px;
  }
  .textarea-box {
    background: #1E293B;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    padding: 14px 16px;
    font-size: 15px;
    color: #E2E8F0;
    line-height: 1.5;
  }
  .textarea-box.result {
    border-color: rgba(250, 204, 21, 0.4);
    background: rgba(250, 204, 21, 0.05);
    color: #FEF08A;
  }
  .btn-action {
    background: linear-gradient(135deg, #0057B7, #2563EB);
    color: #FFFFFF;
    border: none;
    border-radius: 12px;
    padding: 14px;
    font-size: 16px;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    box-shadow: 0 8px 20px rgba(37, 99, 235, 0.35);
  }
</style>
</head>
<body>
  <div class="content-grid">
    <div class="left-col">
      <h2>Гнучкі режими та налаштування</h2>
      <p>Транслітеруйте текст у два кліки безпосередньо зі спливаючого вікна розширення або виділивши потрібний абзац на сторінці.</p>

      <div class="features-list">
        <div class="feature-row">
          <div class="feature-icon-box">🎯</div>
          <div class="feature-text">
            <h4>Виділення на льоту</h4>
            <p>Виділіть будь-який український текст на сайті й натисніть комбінацію клавіш або виберіть пункт у меню.</p>
          </div>
        </div>

        <div class="feature-row">
          <div class="feature-icon-box">🛡️</div>
          <div class="feature-text">
            <h4>Жодних серверних запитів</h4>
            <p>Усі перетворення виконуються локально рушієм розширення. Ваші дані ніколи не залишають браузер.</p>
          </div>
        </div>

        <div class="feature-row">
          <div class="feature-icon-box">✨</div>
          <div class="feature-text">
            <h4>Сучасна орфографія</h4>
            <p>Підтримка стандартних діакритичних літер (č, š, ž, ľ, ń, d́, t́) для безпомилкової передачі вимови.</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Right: Popup Mockup -->
    <div class="popup-mockup">
      <div class="popup-header">
        <div class="popup-logo">
          UkrLat <span>●</span> PRO
        </div>
        <div style="font-size: 13px; color: #94A3B8;">v1.0.1</div>
      </div>
      <div class="popup-body">
        <div class="input-label">Введіть текст (Тарас Шевченко):</div>
        <div class="textarea-box" style="line-height: 1.5;">
          Садок вишневий коло хати,<br>
          Хрущі над вишнями гудуть,<br>
          Плугатарі з плугами йдуть...
        </div>
        <div class="btn-action">
          <span>⚡</span> Транслітерувати
        </div>
        <div class="input-label" style="color: #FACC15;">Результат латинкою:</div>
        <div class="textarea-box result" style="line-height: 1.5;">
          Sadok vyšnevyj kolo haty,<br>
          Hrušči nad vyšnâmy guduť,<br>
          Plugatari z plugamy jduť...
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

// 4. Promo Small Tile: 440x280 px
function getPromoSmallHtml() {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: 440px;
    height: 280px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    background: linear-gradient(135deg, #0b132b 0%, #1e3a8a 60%, #0f172a 100%);
    color: #ffffff;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 28px;
    position: relative;
    overflow: hidden;
  }
  .glow {
    position: absolute;
    width: 250px;
    height: 250px;
    background: radial-gradient(circle, rgba(250, 204, 21, 0.25) 0%, transparent 70%);
    bottom: -60px;
    right: -40px;
    filter: blur(30px);
  }
  .top-row {
    display: flex;
    align-items: center;
    gap: 14px;
    z-index: 10;
  }
  .logo-box {
    width: 52px;
    height: 52px;
    border-radius: 14px;
    background: linear-gradient(135deg, #0057B7, #FFD700);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 26px;
    font-weight: 900;
    box-shadow: 0 8px 20px rgba(0, 87, 183, 0.5);
  }
  .title-box h1 {
    font-size: 24px;
    font-weight: 800;
    line-height: 1.1;
  }
  .title-box p {
    font-size: 13px;
    color: #94A3B8;
  }
  .center-content {
    z-index: 10;
  }
  .headline {
    font-size: 17px;
    font-weight: 700;
    line-height: 1.35;
    color: #F8FAFC;
    margin-bottom: 8px;
  }
  .sample-box {
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 10px;
    padding: 10px 14px;
    font-size: 13px;
    color: #FEF08A;
    font-weight: 600;
  }
  .footer-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 12px;
    color: #94A3B8;
    z-index: 10;
  }
  .badge {
    background: rgba(255, 215, 0, 0.15);
    border: 1px solid rgba(255, 215, 0, 0.35);
    color: #FACC15;
    padding: 4px 10px;
    border-radius: 6px;
    font-weight: 700;
    font-size: 11px;
  }
</style>
</head>
<body>
  <div class="glow"></div>
  <div class="top-row">
    <div class="logo-box">U</div>
    <div class="title-box">
      <h1>UkrLat</h1>
      <p>Українська латинка</p>
    </div>
  </div>

  <div class="center-content">
    <div class="headline">Швидка та точна транслітерація у браузері</div>
    <div class="sample-box">
      Україна → Ukrajina &nbsp;|&nbsp; Добрий день → Dobryj deń
    </div>
  </div>

  <div class="footer-row">
    <div>⚡ Швидко • 🔒 Конфіденційно</div>
    <div class="badge">CHROME EXTENSION</div>
  </div>
</body>
</html>`;
}

// 5. Promo Marquee Tile: 1400x560 px
function getPromoMarqueeHtml() {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: 1400px;
    height: 560px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    background: radial-gradient(circle at 80% 40%, #1e3a8a 0%, #0f172a 55%, #020617 100%);
    color: #ffffff;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 60px 90px;
    position: relative;
    overflow: hidden;
  }
  .glow-left {
    position: absolute;
    width: 600px;
    height: 600px;
    background: radial-gradient(circle, rgba(0, 87, 183, 0.35) 0%, transparent 70%);
    top: -150px;
    left: -150px;
    filter: blur(60px);
  }
  .glow-right {
    position: absolute;
    width: 600px;
    height: 600px;
    background: radial-gradient(circle, rgba(250, 204, 21, 0.25) 0%, transparent 70%);
    bottom: -150px;
    right: -100px;
    filter: blur(60px);
  }
  .left-content {
    max-width: 680px;
    z-index: 10;
  }
  .badge-store {
    display: inline-block;
    background: rgba(255, 215, 0, 0.15);
    border: 1px solid rgba(255, 215, 0, 0.4);
    color: #FACC15;
    padding: 8px 18px;
    border-radius: 999px;
    font-size: 14px;
    font-weight: 700;
    letter-spacing: 0.5px;
    margin-bottom: 24px;
  }
  .hero-title {
    font-size: 54px;
    font-weight: 900;
    line-height: 1.15;
    margin-bottom: 20px;
    background: linear-gradient(90deg, #FFFFFF 0%, #93C5FD 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
  .hero-sub {
    font-size: 20px;
    color: #94A3B8;
    line-height: 1.5;
    margin-bottom: 32px;
  }
  .features-strip {
    display: flex;
    gap: 24px;
    font-size: 15px;
    font-weight: 600;
    color: #E2E8F0;
  }

  /* Right Card Graphic */
  .right-graphic {
    background: rgba(30, 41, 59, 0.85);
    backdrop-filter: blur(24px);
    border: 1px solid rgba(255, 255, 255, 0.16);
    border-radius: 28px;
    padding: 36px 40px;
    width: 480px;
    box-shadow: 0 30px 60px rgba(0, 0, 0, 0.5), 0 0 40px rgba(0, 87, 183, 0.3);
    z-index: 10;
  }
  .card-top {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 24px;
  }
  .mini-logo {
    width: 50px;
    height: 50px;
    border-radius: 12px;
    background: linear-gradient(135deg, #0057B7, #FFD700);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 26px;
    font-weight: 900;
  }
  .card-box {
    background: #0F172A;
    border-radius: 14px;
    padding: 16px 20px;
    margin-bottom: 14px;
    border: 1px solid rgba(255, 255, 255, 0.08);
  }
  .card-box-label {
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    color: #64748B;
    margin-bottom: 6px;
  }
  .card-box-text {
    font-size: 16px;
    color: #FEF08A;
    font-weight: 600;
  }
</style>
</head>
<body>
  <div class="glow-left"></div>
  <div class="glow-right"></div>

  <div class="left-content">
    <div class="badge-store">CHROME WEB STORE FEATURED EXTENSION</div>
    <h1 class="hero-title">UkrLat — Українська латинка у браузері</h1>
    <p class="hero-sub">Миттєва та точна транслітерація тексту українською латинкою. Виділяйте текст на будь-якому сайті або використовуйте зручне спливаюче вікно.</p>
    <div class="features-strip">
      <div>✓ Швидкі клавіші</div>
      <div>✓ Контекстне меню</div>
      <div>✓ 100% офлайн</div>
    </div>
  </div>

  <div class="right-graphic">
    <div class="card-top">
      <div class="mini-logo">U</div>
      <div>
        <div style="font-weight: 800; font-size: 20px;">UkrLat Extension</div>
        <div style="font-size: 13px; color: #94A3B8;">Офіційна українська латинка</div>
      </div>
    </div>
    <div class="card-box">
      <div class="card-box-label">Кирилиця (Шевченко)</div>
      <div class="card-box-text" style="color: #38BDF8;">Реве та стогне Дніпр широкий...</div>
    </div>
    <div class="card-box">
      <div class="card-box-label" style="color: #FACC15;">Latynka</div>
      <div class="card-box-text">Reve ta stogne Dnipr šyrokyj...</div>
    </div>
  </div>
</body>
</html>`;
}

async function main() {
  console.log("🎨 Generating high-resolution graphics for Chrome Web Store...");

  // 1. Icons for extension (16, 32, 48, 128)
  for (const size of [16, 32, 48, 128]) {
    console.log(`  Rendering icon${size}.png...`);
    await renderHtml(
      getIconHtml(size),
      size,
      size,
      join(iconsDir, `icon${size}.png`),
    );
    // Also save 128 into store-assets
    if (size === 128) {
      await renderHtml(
        getIconHtml(128),
        128,
        128,
        join(assetsDir, `store-icon-128x128.png`),
      );
    }
  }

  // 2. Screenshot 1 (1280x800)
  console.log("  Rendering screenshot1-translit-demo-1280x800.png...");
  await renderHtml(
    getScreenshot1Html(),
    1280,
    800,
    join(assetsDir, "screenshot1-translit-demo-1280x800.png"),
  );

  // 3. Screenshot 2 (1280x800)
  console.log("  Rendering screenshot2-features-1280x800.png...");
  await renderHtml(
    getScreenshot2Html(),
    1280,
    800,
    join(assetsDir, "screenshot2-features-1280x800.png"),
  );

  // 4. Promo Small Tile (440x280)
  console.log("  Rendering promo-small-tile-440x280.png...");
  await renderHtml(
    getPromoSmallHtml(),
    440,
    280,
    join(assetsDir, "promo-small-tile-440x280.png"),
  );

  // 5. Promo Marquee Tile (1400x560)
  console.log("  Rendering promo-marquee-1400x560.png...");
  await renderHtml(
    getPromoMarqueeHtml(),
    1400,
    560,
    join(assetsDir, "promo-marquee-1400x560.png"),
  );

  // 6. Apple App Store / Mac App Store icons
  const appIconDir = join(
    rootDir,
    "extension",
    "dist",
    "safari-xcode",
    "UkrLat",
    "Shared (App)",
    "Assets.xcassets",
    "AppIcon.appiconset",
  );
  if (existsSync(appIconDir)) {
    console.log("  Rendering Apple AppIcon assets...");
    await renderHtml(
      getIconHtml(1024),
      1024,
      1024,
      join(appIconDir, "universal-icon-1024@1x.png"),
    );
    await renderHtml(
      getIconHtml(1024),
      1024,
      1024,
      join(appIconDir, "mac-icon-512@2x.png"),
    );
    await renderHtml(
      getIconHtml(512),
      512,
      512,
      join(appIconDir, "mac-icon-512@1x.png"),
    );
    await renderHtml(
      getIconHtml(512),
      512,
      512,
      join(appIconDir, "mac-icon-256@2x.png"),
    );
    await renderHtml(
      getIconHtml(256),
      256,
      256,
      join(appIconDir, "mac-icon-256@1x.png"),
    );
    await renderHtml(
      getIconHtml(256),
      256,
      256,
      join(appIconDir, "mac-icon-128@2x.png"),
    );
    await renderHtml(
      getIconHtml(128),
      128,
      128,
      join(appIconDir, "mac-icon-128@1x.png"),
    );
    await renderHtml(
      getIconHtml(64),
      64,
      64,
      join(appIconDir, "mac-icon-32@2x.png"),
    );
    await renderHtml(
      getIconHtml(32),
      32,
      32,
      join(appIconDir, "mac-icon-32@1x.png"),
    );
    await renderHtml(
      getIconHtml(32),
      32,
      32,
      join(appIconDir, "mac-icon-16@2x.png"),
    );
    await renderHtml(
      getIconHtml(16),
      16,
      16,
      join(appIconDir, "mac-icon-16@1x.png"),
    );
  }

  console.log(
    "\n✅ All store assets generated successfully in extension/store-assets/!",
  );
}

main().catch((err) => {
  console.error("Error generating assets:", err);
  process.exit(1);
});
