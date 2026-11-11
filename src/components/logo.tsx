import { useId } from "react";

/**
 * The Recoverly mark: a rounded "R" on the app's emerald-to-sky gradient, with
 * a small amber dot for a new dawn. The same drawing as `public/icon.svg` (the
 * favicon and app icons are rendered from it), kept inline here so it costs no
 * request and follows the size of whatever it sits in.
 *
 * Decorative: it is always next to the word "Recoverly".
 */
export function Logo({ className }: { className?: string }) {
  // The gradient needs an id, and an id must be unique if the mark appears
  // twice on a page. useId's colons are not safe inside url(#…).
  const gradient = `rv-${useId().replace(/:/g, "")}`;
  return (
    <svg viewBox="0 0 512 512" className={className} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={gradient} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#10b981" />
          <stop offset="1" stopColor="#0284c7" />
        </linearGradient>
      </defs>
      <rect width="512" height="512" rx="116" fill={`url(#${gradient})`} />
      <g transform="translate(256 256) scale(1.08) translate(-256 -256)">
        <g fill="none" stroke="#ffffff" strokeWidth="54" strokeLinecap="round" strokeLinejoin="round">
          <path d="M178 394V134h88a76 76 0 0 1 0 152h-88" />
          <path d="M254 286l92 108" />
        </g>
        <circle cx="392" cy="132" r="30" fill="#fde68a" />
      </g>
    </svg>
  );
}
