import { encodeQr, qrSvgPath } from "@/lib/qr";

/**
 * A QR code for `text`, drawn as a single SVG path so it stays sharp at any size
 * and prints cleanly. Always black on white with its own margin, whatever the
 * theme: a scanner needs the contrast and the blank border, and a dark-mode
 * inversion would make the code unreadable. Draws nothing if the text will not fit.
 */
export function QrCode({ text, label, className }: { text: string; label: string; className?: string }) {
  let shape: { d: string; viewBox: number } | null = null;
  try {
    shape = qrSvgPath(encodeQr(text));
  } catch {
    shape = null;
  }
  if (!shape) return null;
  return (
    <svg role="img" aria-label={label} viewBox={`0 0 ${shape.viewBox} ${shape.viewBox}`} className={className} shapeRendering="crispEdges">
      <rect width={shape.viewBox} height={shape.viewBox} fill="#ffffff" />
      <path d={shape.d} fill="#000000" />
    </svg>
  );
}
