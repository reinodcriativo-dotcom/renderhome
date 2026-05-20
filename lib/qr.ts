import QRCode from "qrcode";

/**
 * Gera um PNG do QR com correcao de erro ALTA e contraste maximo.
 *
 * Por que essas opcoes:
 * - errorCorrectionLevel 'H': permite ~30% de oclusao/distorcao e ainda
 *   decodifica. Importante quando o cliente scaneia em um angulo torto.
 * - margin 2: zona quieta pequena (suficiente). Maior so desperdica papel.
 * - width 768: tamanho generoso, o lojista pode imprimir grande sem pixelar.
 * - color preto sobre branco puro: melhor contraste para tracking AR.
 */
export async function generateQrPng(content: string): Promise<Blob> {
  const dataUrl = await QRCode.toDataURL(content, {
    errorCorrectionLevel: "H",
    margin: 2,
    width: 768,
    color: { dark: "#000000", light: "#FFFFFF" },
  });
  const res = await fetch(dataUrl);
  return await res.blob();
}

export function buildQrTargetUrl(appUrl: string, slug: string): string {
  const base = appUrl.replace(/\/$/, "");
  return `${base}/ar/${slug}`;
}
