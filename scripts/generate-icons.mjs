import sharp from 'sharp';
import { mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const LOGO = join(ROOT, 'public', 'logo-transparent.png');
const ICONS_DIR = join(ROOT, 'public', 'icons');
const ANDROID_RES = join(ROOT, 'android', 'app', 'src', 'main', 'res');
const IOS_ASSETS = join(ROOT, 'ios', 'App', 'App', 'Assets.xcassets', 'AppIcon.appiconset');

mkdirSync(ICONS_DIR, { recursive: true });

const LOGO_ASPECT = 1217 / 586; // landscape logo

async function makeIconBuffer(size, bgColor = { r: 255, g: 255, b: 255, alpha: 1 }, paddingRatio = 0.12) {
  const padding = Math.floor(size * paddingRatio);
  const innerSize = size - padding * 2;

  // Fit landscape logo into inner square
  const logoWidth = innerSize;
  const logoHeight = Math.min(innerSize, Math.round(innerSize / LOGO_ASPECT));
  const resizedLogo = await sharp(LOGO)
    .resize(logoWidth, logoHeight, { fit: 'contain', background: { ...bgColor, alpha: 0 } })
    .ensureAlpha()
    .toBuffer();

  const left = Math.round((size - logoWidth) / 2);
  const top = Math.round((size - logoHeight) / 2);

  return sharp({
    create: { width: size, height: size, channels: 4, background: bgColor },
  })
    .composite([{ input: resizedLogo, left, top }])
    .png()
    .toBuffer();
}

async function save(buffer, dest) {
  mkdirSync(dirname(dest), { recursive: true });
  await sharp(buffer).toFile(dest);
  console.log(`  ✓ ${dest.replace(ROOT + '/', '')}`);
}

// --- PWA icons ---
const PWA_SIZES = [48, 72, 96, 144, 152, 192, 384, 512];
console.log('\n📱 Generating PWA icons…');
for (const size of PWA_SIZES) {
  const buf = await makeIconBuffer(size);
  await save(buf, join(ICONS_DIR, `icon-${size}x${size}.png`));
}

// Maskable icon (safe zone = 80% → paddingRatio 20%)
const maskable = await makeIconBuffer(512, { r: 255, g: 255, b: 255, alpha: 1 }, 0.2);
await save(maskable, join(ICONS_DIR, 'icon-maskable-512x512.png'));

// 1024 for iOS
const icon1024 = await makeIconBuffer(1024);
await save(icon1024, join(ICONS_DIR, 'icon-1024x1024.png'));

// --- Android adaptive icons ---
const ANDROID_DENSITIES = [
  { name: 'mipmap-mdpi',    size: 48 },
  { name: 'mipmap-hdpi',    size: 72 },
  { name: 'mipmap-xhdpi',   size: 96 },
  { name: 'mipmap-xxhdpi',  size: 144 },
  { name: 'mipmap-xxxhdpi', size: 192 },
];

console.log('\n🤖 Generating Android icons…');
for (const { name, size } of ANDROID_DENSITIES) {
  const buf = await makeIconBuffer(size);
  await save(buf, join(ANDROID_RES, name, 'ic_launcher.png'));
  await save(buf, join(ANDROID_RES, name, 'ic_launcher_round.png'));

  const fg = await makeIconBuffer(Math.round(size * 1.5), { r: 255, g: 255, b: 255, alpha: 0 }, 0.1);
  await save(fg, join(ANDROID_RES, name, 'ic_launcher_foreground.png'));
}

// Android splash (1280x1920 portrait)
console.log('\n🖼  Generating Android splash…');
const splashBuf = await sharp({
  create: { width: 1280, height: 1920, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } },
})
  .composite([{
    input: await sharp(LOGO).resize(700, null, { fit: 'inside' }).toBuffer(),
    gravity: 'center',
  }])
  .png()
  .toBuffer();

const splashDensities = [
  { name: 'drawable', size: 1280 },
  { name: 'drawable-port-hdpi', size: 1280 },
];
for (const { name } of splashDensities) {
  await save(splashBuf, join(ANDROID_RES, name, 'splash.png'));
}

// --- iOS icons ---
console.log('\n🍎 Generating iOS icons…');
const IOS_SIZES = [20, 29, 40, 58, 60, 76, 80, 87, 120, 152, 167, 180, 1024];
for (const size of IOS_SIZES) {
  const buf = await makeIconBuffer(size);
  await save(buf, join(IOS_ASSETS, `AppIcon-${size}.png`));
}

console.log('\n✅ All icons generated!\n');
