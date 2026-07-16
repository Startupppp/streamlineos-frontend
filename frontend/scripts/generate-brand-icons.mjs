import { createWriteStream, mkdirSync, existsSync } from "fs";
import { get } from "https";
import { tmpdir } from "os";
import { join } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import sharp from "sharp";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const FRONTEND_ROOT = join(__dirname, "..");

const LOGO_URL =
  "https://pub-891e5f8831c54f9295d7dda0eac7ed65.r2.dev/email-assets/logo-v2.png";
const TMP_PNG = join(tmpdir(), "streamlineos-logo-source.png");

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = createWriteStream(dest);
    get(url, (res) => {
      res.pipe(file);
      file.on("finish", () => file.close(resolve));
    }).on("error", reject);
  });
}

async function main() {
  console.log("Downloading source logo from R2...");
  await downloadFile(LOGO_URL, TMP_PNG);

  const meta = await sharp(TMP_PNG).metadata();
  console.log(`Source dimensions: ${meta.width}×${meta.height}`);
  if ((meta.width ?? 0) < 256) {
    console.warn(
      "WARNING: Source PNG is smaller than 256px — upscaled outputs may be blurry. Supply a higher-res master when available."
    );
  }

  const iconsDir = join(FRONTEND_ROOT, "public", "icons");
  if (!existsSync(iconsDir)) mkdirSync(iconsDir, { recursive: true });

  const INK = "#0b1220";
  const WHITE = "#ffffff";

  const logoBuffer = await sharp(TMP_PNG)
    .resize(400, 400, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  await sharp({
    create: { width: 512, height: 512, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: logoBuffer, gravity: "center" }])
    .png()
    .toFile(join(FRONTEND_ROOT, "app", "icon.png"));
  console.log("Written: app/icon.png (512×512, transparent)");

  const logoForApple = await sharp(TMP_PNG)
    .resize(140, 140, { fit: "contain", background: { r: 11, g: 18, b: 32, alpha: 255 } })
    .toBuffer();

  await sharp({
    create: { width: 180, height: 180, channels: 3, background: { r: 11, g: 18, b: 32 } },
  })
    .composite([{ input: logoForApple, gravity: "center" }])
    .png()
    .toFile(join(FRONTEND_ROOT, "app", "apple-icon.png"));
  console.log("Written: app/apple-icon.png (180×180, #0b1220 background)");

  const logo192 = await sharp(TMP_PNG)
    .resize(152, 152, { fit: "contain", background: { r: 11, g: 18, b: 32, alpha: 255 } })
    .toBuffer();

  await sharp({
    create: { width: 192, height: 192, channels: 3, background: { r: 11, g: 18, b: 32 } },
  })
    .composite([{ input: logo192, gravity: "center" }])
    .png()
    .toFile(join(iconsDir, "icon-192.png"));
  console.log("Written: public/icons/icon-192.png");

  const logo512 = await sharp(TMP_PNG)
    .resize(400, 400, { fit: "contain", background: { r: 11, g: 18, b: 32, alpha: 255 } })
    .toBuffer();

  await sharp({
    create: { width: 512, height: 512, channels: 3, background: { r: 11, g: 18, b: 32 } },
  })
    .composite([{ input: logo512, gravity: "center" }])
    .png()
    .toFile(join(iconsDir, "icon-512.png"));
  console.log("Written: public/icons/icon-512.png");

  const [iconPngMeta, appleMeta, i192Meta, i512Meta] = await Promise.all([
    sharp(join(FRONTEND_ROOT, "app", "icon.png")).metadata(),
    sharp(join(FRONTEND_ROOT, "app", "apple-icon.png")).metadata(),
    sharp(join(iconsDir, "icon-192.png")).metadata(),
    sharp(join(iconsDir, "icon-512.png")).metadata(),
  ]);
  console.log(`\nVerification:`);
  console.log(`  app/icon.png          ${iconPngMeta.width}×${iconPngMeta.height}`);
  console.log(`  app/apple-icon.png    ${appleMeta.width}×${appleMeta.height}`);
  console.log(`  public/icons/icon-192 ${i192Meta.width}×${i192Meta.height}`);
  console.log(`  public/icons/icon-512 ${i512Meta.width}×${i512Meta.height}`);
  console.log("\nDone.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
