const URL_REGEX = /https?:\/\/[^\s<>"{}|\\^`[\]]+/gi;

export function extractUrls(text: string): string[] {
  return text.match(URL_REGEX) ?? [];
}

export function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export function isLocationUrl(url: string): boolean {
  const domain = extractDomain(url).toLowerCase();
  return (
    domain.includes('maps.google') ||
    domain.includes('maps.apple') ||
    domain.includes('goo.gl/maps') ||
    domain.includes('waze.com') ||
    url.includes('place') ||
    url.includes('/maps/')
  );
}
