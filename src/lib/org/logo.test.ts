import { describe, expect, it } from "vitest";

import { LOGO_LIMITS, checkLogo, jpegSize, logoBytes, parseLogo, pngSize } from "@/lib/org/logo";
import { b64, jpeg, png } from "@/lib/org/test-images";


describe("reading a picture's real size", () => {
  it("reads a PNG and a JPEG from their own bytes", () => {
    expect(pngSize(new Uint8Array(png(120, 64)))).toEqual({ width: 120, height: 64 });
    expect(jpegSize(new Uint8Array(jpeg(200, 100)))).toEqual({ width: 200, height: 100 });
  });

  it("says nothing for anything that does not begin like one", () => {
    expect(pngSize(new Uint8Array(jpeg(50, 50)))).toBeNull();
    expect(jpegSize(new Uint8Array(png(50, 50)))).toBeNull();
    expect(pngSize(new Uint8Array(Buffer.from("<svg xmlns='http://www.w3.org/2000/svg' width='50' height='50'></svg>")))).toBeNull();
    expect(jpegSize(new Uint8Array([0xff, 0xd8, 0xff]))).toBeNull();
    expect(pngSize(new Uint8Array(0))).toBeNull();
  });
});

describe("checking an uploaded logo", () => {
  it("accepts a real small PNG or JPEG and stores exactly what was checked", () => {
    const sent = png(128, 128);
    const result = checkLogo({ type: "png", data: b64(sent) });
    expect(result.error).toBeUndefined();
    expect(result.logo).toMatchObject({ type: "png", width: 128, height: 128 });
    expect(logoBytes(result.logo!).equals(sent)).toBe(true);
    expect(checkLogo({ type: "jpeg", data: b64(jpeg(200, 100)) }).logo).toMatchObject({ type: "jpeg", width: 200, height: 100 });
  });

  it("refuses a file that says it is one thing and is another, so a renamed script or SVG cannot get in", () => {
    expect(checkLogo({ type: "png", data: b64(jpeg(100, 100)) }).error).toMatch(/not a real PNG or JPEG/);
    expect(checkLogo({ type: "jpeg", data: b64(png(100, 100)) }).error).toMatch(/not a real PNG or JPEG/);
    expect(checkLogo({ type: "png", data: b64(Buffer.from("<svg><script>alert(1)</script></svg>")) }).error).toMatch(/not a real PNG or JPEG/);
    expect(checkLogo({ type: "png", data: b64(Buffer.from("GIF89a" + "x".repeat(40))) }).error).toMatch(/not a real PNG or JPEG/);
  });

  it("refuses any other type, and anything that is not base64 text", () => {
    for (const type of ["svg", "gif", "webp", "image/png", "", null, undefined, 5]) expect(checkLogo({ type, data: b64(png(100, 100)) }).error, String(type)).toMatch(/PNG or a JPEG/);
    for (const data of ["", "not base64!!", "abc", "a".repeat(100) + "!", null, 5, undefined]) expect(checkLogo({ type: "png", data }).error, String(data)).toBeTruthy();
    expect(checkLogo(null).error).toMatch(/No logo/);
    expect(checkLogo("png").error).toMatch(/No logo/);
  });

  it("refuses a picture that is too big in bytes or in pixels, or too small to read", () => {
    const heavy = Buffer.concat([png(200, 200), Buffer.alloc(LOGO_LIMITS.bytesMax)]);
    expect(checkLogo({ type: "png", data: b64(heavy) }).error).toMatch(/too large/);
    expect(checkLogo({ type: "png", data: b64(png(600, 100)) }).error).toMatch(/between 16 and 512 pixels/);
    expect(checkLogo({ type: "png", data: b64(png(8, 8)) }).error).toMatch(/between 16 and 512 pixels/);
    expect(checkLogo({ type: "jpeg", data: b64(jpeg(1000, 1000)) }).error).toMatch(/between 16 and 512 pixels/);
  });
});

describe("what a record may hold", () => {
  it("keeps a well-formed stored logo and drops everything else", () => {
    const good = { type: "png", data: b64(png(64, 64)), width: 64, height: 64 };
    expect(parseLogo(good)).toEqual(good);
    for (const bad of [null, undefined, {}, { ...good, type: "svg" }, { ...good, data: "<svg>" }, { ...good, width: "64" }, { ...good, data: "a".repeat(LOGO_LIMITS.charsMax + 1) }]) {
      expect(parseLogo(bad)).toBeUndefined();
    }
  });
});
