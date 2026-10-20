// ===========================================
// Generate PWA Icons - LUXE Store
// الاستخدام: node generate-icons.js
// ===========================================

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const ASSETS_DIR = path.join(__dirname, 'frontend', 'assets');

// تأكد إن المجلد موجود
if (!fs.existsSync(ASSETS_DIR)) {
  fs.mkdirSync(ASSETS_DIR, { recursive: true });
}

// ===========================================
// SVG Icon (تصميم LUXE)
// ===========================================
function createSVG(size, options = {}) {
  const { maskable = false, rounded = true } = options;
  const padding = maskable ? size * 0.15 : 0;
  const bgRadius = rounded && !maskable ? size * 0.22 : 0;

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0a0e17;stop-opacity:1" />
      <stop offset="50%" style="stop-color:#131826;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#1c2233;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#e8d5a3;stop-opacity:1" />
      <stop offset="50%" style="stop-color:#c9a961;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#a8894a;stop-opacity:1" />
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" style="stop-color:#c9a961;stop-opacity:0.15" />
      <stop offset="100%" style="stop-color:#c9a961;stop-opacity:0" />
    </radialGradient>
  </defs>

  <!-- Background -->
  <rect width="${size}" height="${size}" rx="${bgRadius}" fill="url(#bg)"/>

  <!-- Glow -->
  <circle cx="${size/2}" cy="${size/2}" r="${size * 0.45}" fill="url(#glow)"/>

  <!-- Inner border -->
  ${maskable ? '' : `
  <rect x="${size * 0.08}" y="${size * 0.08}" width="${size * 0.84}" height="${size * 0.84}"
    rx="${size * 0.15}" fill="none" stroke="#c9a961" stroke-opacity="0.2" stroke-width="${size * 0.005}"/>
  `}

  <!-- LUXE text -->
  <text x="50%" y="${maskable ? '58%' : '56%'}"
    text-anchor="middle"
    font-family="Georgia, 'Times New Roman', serif"
    font-size="${size * (maskable ? 0.22 : 0.24)}"
    font-weight="900"
    letter-spacing="${size * 0.03}"
    fill="url(#gold)">LUXE</text>

  <!-- Gold dot -->
  <circle cx="${size/2}" cy="${maskable ? '72%' : '74%'}" r="${size * 0.012}" fill="#c9a961"/>

  <!-- Top ornament -->
  <path d="M ${size*0.35} ${size*0.34} L ${size*0.5} ${size*0.28} L ${size*0.65} ${size*0.34}"
    stroke="#c9a961" stroke-width="${size * 0.004}" stroke-opacity="0.4" fill="none"/>

  <!-- Bottom ornament -->
  <path d="M ${size*0.35} ${size*0.68} L ${size*0.5} ${size*0.72} L ${size*0.65} ${size*0.68}"
    stroke="#c9a961" stroke-width="${size * 0.004}" stroke-opacity="0.4" fill="none"/>
</svg>
`;
}

// ===========================================
// توليد الأيقونات
// ===========================================
async function generateIcon(filename, size, options = {}) {
  const svg = createSVG(size, options);
  const outputPath = path.join(ASSETS_DIR, filename);

  await sharp(Buffer.from(svg))
    .png()
    .toFile(outputPath);

  const stats = fs.statSync(outputPath);
  console.log(`✅ ${filename.padEnd(28)} ${size}x${size}  (${(stats.size / 1024).toFixed(1)} KB)`);
}

// ===========================================
// Main
// ===========================================
async function main() {
  console.log('\n🎨 بدء توليد أيقونات PWA...\n');

  const icons = [
    // Standard icons
    { name: 'icon-192.png', size: 192 },
    { name: 'icon-512.png', size: 512 },

    // Maskable (Android adaptive)
    { name: 'icon-maskable-192.png', size: 192, opts: { maskable: true, rounded: false } },
    { name: 'icon-maskable.png', size: 512, opts: { maskable: true, rounded: false } },

    // Apple Touch Icon
    { name: 'apple-touch-icon.png', size: 180, opts: { rounded: false } },

    // Favicons
    { name: 'favicon-16x16.png', size: 16 },
    { name: 'favicon-32x32.png', size: 32 },
    { name: 'favicon-48x48.png', size: 48 },

    // Splash screens
    { name: 'splash-2048x2732.png', size: 2048, opts: { rounded: false } },
    { name: 'splash-1668x2388.png', size: 1668, opts: { rounded: false } },
    { name: 'splash-1536x2048.png', size: 1536, opts: { rounded: false } },
    { name: 'splash-1125x2436.png', size: 1125, opts: { rounded: false } },
    { name: 'splash-1242x2688.png', size: 1242, opts: { rounded: false } },
  ];

  for (const icon of icons) {
    try {
      await generateIcon(icon.name, icon.size, icon.opts || {});
    } catch (err) {
      console.error(`❌ ${icon.name}: ${err.message}`);
    }
  }

  // أضف icon.svg أيضاً
  const svgPath = path.join(ASSETS_DIR, 'icon.svg');
  fs.writeFileSync(svgPath, createSVG(512));
  console.log(`✅ icon.svg                    512x512  (SVG)`);

  // favicon.ico (16/32/48 combined)
  try {
    const faviconSizes = [16, 32, 48];
    const faviconBuffers = await Promise.all(
      faviconSizes.map(size =>
        sharp(Buffer.from(createSVG(size))).png().toBuffer()
      )
    );
    // Just save as 32x32 png for now (ICO requires specific format)
    await sharp(Buffer.from(createSVG(32))).png().toFile(path.join(ASSETS_DIR, 'favicon.ico'));
    console.log(`✅ favicon.ico                 32x32`);
  } catch (err) {
    console.warn('⚠️ favicon.ico skipped:', err.message);
  }

  console.log('\n🎉 ========================================');
  console.log(`   تم توليد ${icons.length + 2} ملف بنجاح!`);
  console.log(`   📁 الموقع: frontend/assets/`);
  console.log('   ========================================\n');
}

main().catch(err => {
  console.error('❌ خطأ:', err);
  process.exit(1);
});
