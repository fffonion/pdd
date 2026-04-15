import QRCode from "qrcode";

export type ChartShareQrRenderStyle = "badge-overlay" | "plain";

export interface ChartShareQrDataUrlResult {
  src: string;
  renderStyle: ChartShareQrRenderStyle;
  errorCorrectionLevel: "H" | "L";
}

const QR_COLOR = {
  dark: "#111111",
  light: "#FFFFFF",
} as const;

async function buildQrCodeDataUrl(
  shareUrl: string,
  width: number,
  errorCorrectionLevel: "L" | "M" | "Q" | "H",
  margin: number,
) {
  return QRCode.toDataURL(shareUrl, {
    errorCorrectionLevel,
    margin,
    width,
    color: QR_COLOR,
  });
}

export async function createChartShareQrDataUrl(
  shareUrl: string,
  width: number,
): Promise<ChartShareQrDataUrlResult> {
  try {
    return {
      src: await buildQrCodeDataUrl(shareUrl, width, "H", 0),
      renderStyle: "badge-overlay",
      errorCorrectionLevel: "H",
    };
  } catch {
    return {
      src: await buildQrCodeDataUrl(shareUrl, width, "L", 0),
      renderStyle: "plain",
      errorCorrectionLevel: "L",
    };
  }
}

export async function createEmbeddedChartQrDataUrl(
  shareUrl: string,
  width: number,
) {
  return buildQrCodeDataUrl(shareUrl, width, "L", 3);
}
