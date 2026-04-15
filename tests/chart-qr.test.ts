import { expect, test } from "bun:test";
import {
  createChartShareQrDataUrl,
  createEmbeddedChartQrDataUrl,
} from "../src/lib/chart-qr";

test("share QR export keeps the center badge when the payload fits high correction", async () => {
  const result = await createChartShareQrDataUrl("https://example.com/?c=pd123456", 512);

  expect(result.renderStyle).toBe("badge-overlay");
  expect(result.errorCorrectionLevel).toBe("H");
  expect(result.src.startsWith("data:image/png;base64,")).toBe(true);
});

test("share QR export falls back to plain rendering when only low correction fits", async () => {
  const longShareUrl = `https://example.com/?c=${"a".repeat(1600)}`;

  const exported = await createChartShareQrDataUrl(longShareUrl, 512);
  const embedded = await createEmbeddedChartQrDataUrl(longShareUrl, 256);

  expect(exported.renderStyle).toBe("plain");
  expect(exported.errorCorrectionLevel).toBe("L");
  expect(exported.src.startsWith("data:image/png;base64,")).toBe(true);
  expect(embedded.startsWith("data:image/png;base64,")).toBe(true);
});
