/**
 * Getting a chosen picture ready to be a logo, in the browser: scaled down, flattened and re-encoded as a small PNG (or a JPEG if that
 * is the only way to fit). Drawing it onto a canvas and saving it again keeps only the pixels, so anything hidden in the original
 * (metadata, another file appended, a script in an SVG) does not survive. The server checks whatever arrives anyway
 * (`lib/org/logo.ts`); this only makes the usual case simple.
 */
import { LOGO_LIMITS, type LogoType } from "@/lib/org/logo-model";

export type PreparedLogo = { type: LogoType; data: string } | { error: string };

const SIDES = [256, 192, 128, 96];

function toBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

function render(source: ImageBitmap, width: number, height: number, background?: string): HTMLCanvasElement | null {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return null;
  if (background) {
    context.fillStyle = background;
    context.fillRect(0, 0, width, height);
  }
  context.drawImage(source, 0, 0, width, height);
  return canvas;
}

const blobOf = (canvas: HTMLCanvasElement, mime: string, quality?: number) => new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, mime, quality));

export async function prepareLogo(file: File): Promise<PreparedLogo> {
  // SVG is refused on purpose: it can carry script.
  if (!/^image\/(png|jpeg|webp|gif)$/.test(file.type)) return { error: "Choose a PNG or JPEG picture." };
  if (file.size > 8_000_000) return { error: "That picture is very large. Choose one under 8 MB." };
  let source: ImageBitmap;
  try {
    source = await createImageBitmap(file);
  } catch {
    return { error: "That picture could not be read." };
  }
  try {
    for (const side of SIDES) {
      const scale = Math.min(1, side / Math.max(source.width, source.height));
      const width = Math.min(LOGO_LIMITS.sideMax, Math.max(LOGO_LIMITS.sideMin, Math.round(source.width * scale)));
      const height = Math.min(LOGO_LIMITS.sideMax, Math.max(LOGO_LIMITS.sideMin, Math.round(source.height * scale)));
      const png = render(source, width, height);
      const pngBlob = png ? await blobOf(png, "image/png") : null;
      if (pngBlob && pngBlob.size <= LOGO_LIMITS.bytesMax) return { type: "png", data: await toBase64(pngBlob) };
      // A JPEG cannot be see-through, so it is drawn on white.
      const jpeg = render(source, width, height, "#ffffff");
      const jpegBlob = jpeg ? await blobOf(jpeg, "image/jpeg", 0.85) : null;
      if (jpegBlob && jpegBlob.size <= LOGO_LIMITS.bytesMax) return { type: "jpeg", data: await toBase64(jpegBlob) };
    }
    return { error: "That picture is too detailed to make a small logo. Use a simpler one." };
  } finally {
    source.close();
  }
}
