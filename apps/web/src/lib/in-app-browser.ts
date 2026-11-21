// Marcadores que os apps acrescentam ao user agent do navegador interno.
const IN_APP_MARKERS = /\b(?:WhatsApp|Instagram|FBAN|FBAV)\b/;

export function isInAppBrowser(userAgent: string): boolean {
  return IN_APP_MARKERS.test(userAgent);
}
