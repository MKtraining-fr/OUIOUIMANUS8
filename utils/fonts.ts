import { CustomizationAsset } from '../types';

const MIME_TO_FORMAT: Record<string, string> = {
  'font/woff2': 'woff2',
  'application/font-woff2': 'woff2',
  'application/x-font-woff2': 'woff2',
  'font/woff': 'woff',
  'application/font-woff': 'woff',
  'application/x-font-woff': 'woff',
  'application/x-font-ttf': 'truetype',
  'font/ttf': 'truetype',
  'application/x-font-otf': 'opentype',
  'font/otf': 'opentype',
  'application/vnd.ms-fontobject': 'embedded-opentype',
  'application/x-font-eot': 'embedded-opentype',
  'image/svg+xml': 'svg',
};

const EXTENSION_TO_FORMAT: Record<string, string> = {
  woff2: 'woff2',
  woff: 'woff',
  ttf: 'truetype',
  otf: 'opentype',
  eot: 'embedded-opentype',
  svg: 'svg',
};

export const sanitizeFontFamilyName = (name: string): string => {
  const trimmed = name.trim();
  const safe = trimmed.length > 0 ? trimmed : 'Custom Font';
  return safe.replace(/"|'/g, '');
};

const inferFormatFromMime = (mime: string | undefined): string | null => {
  if (!mime) {
    return null;
  }
  const lower = mime.toLowerCase();
  for (const [key, format] of Object.entries(MIME_TO_FORMAT)) {
    if (lower.includes(key)) {
      return format;
    }
  }
  return null;
};

const inferFormatFromUrl = (url: string): string | null => {
  const lower = url.toLowerCase();
  const match = lower.match(/\.([a-z0-9]+)(?:\?|#|$)/);
  if (!match) {
    return null;
  }
  const extension = match[1];
  return EXTENSION_TO_FORMAT[extension] ?? null;
};

export const inferFontFormat = (asset: CustomizationAsset): string | null => {
  const fromMime = inferFormatFromMime(asset.format);
  if (fromMime) {
    return fromMime;
  }
  return inferFormatFromUrl(asset.url);
};

export const createFontFaceDeclaration = (asset: CustomizationAsset): string => {
  const family = sanitizeFontFamilyName(asset.name);
  const format = inferFontFormat(asset);
  const formatSuffix = format ? ` format("${format}")` : '';
  const src = `url("${asset.url}")${formatSuffix}`;
  return `@font-face {\n  font-family: "${family}";\n  src: ${src};\n  font-style: normal;\n  font-weight: 400;\n  font-display: swap;\n}`;
};
