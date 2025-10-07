import { ElementRichText, EditableElementKey, RichTextValue } from '../types';

const ALLOWED_TAGS = new Set([
  'STRONG',
  'EM',
  'S',
  'STRIKE',
  'SPAN',
  'BR',
  'DIV',
  'P',
  'B',
  'I',
]);

const HEX_COLOR_PATTERN = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
const RGB_COLOR_PATTERN = /^rgba?\((\s*\d{1,3}\s*,){2}\s*\d{1,3}\s*(,\s*(0|1|0?\.\d+))?\s*\)$/;

const hasDOM = typeof window !== 'undefined' && typeof document !== 'undefined';

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const sanitizeColor = (value: string): string | null => {
  const trimmed = value.trim().replace(/"|'/g, '');
  if (HEX_COLOR_PATTERN.test(trimmed)) {
    return trimmed.toLowerCase();
  }
  if (RGB_COLOR_PATTERN.test(trimmed)) {
    return trimmed.replace(/\s+/g, '');
  }
  return null;
};

const unwrapElement = (element: Element) => {
  const parent = element.parentNode;
  if (!parent) {
    element.remove();
    return;
  }
  while (element.firstChild) {
    parent.insertBefore(element.firstChild, element);
  }
  parent.removeChild(element);
};

const normalizeElementTag = (element: HTMLElement): HTMLElement => {
  const tagMap: Record<string, string> = {
    B: 'strong',
    I: 'em',
    STRIKE: 's',
  };

  const replacementTag = tagMap[element.tagName];

  if (!replacementTag) {
    return element;
  }

  const replacement = document.createElement(replacementTag);
  while (element.firstChild) {
    replacement.appendChild(element.firstChild);
  }
  element.replaceWith(replacement);
  return replacement;
};

const sanitizeElement = (element: HTMLElement) => {
  if (!ALLOWED_TAGS.has(element.tagName)) {
    unwrapElement(element);
    return;
  }

  const normalized = normalizeElementTag(element);

  Array.from(normalized.attributes).forEach(attr => {
    if (attr.name !== 'style') {
      normalized.removeAttribute(attr.name);
    }
  });

  if (normalized.hasAttribute('style')) {
    const style = normalized.getAttribute('style') ?? '';
    const declarations = style
      .split(';')
      .map(item => item.trim())
      .filter(Boolean);
    const colorDeclaration = declarations.find(decl => decl.toLowerCase().startsWith('color'));

    if (colorDeclaration) {
      const [, rawValue] = colorDeclaration.split(':');
      const sanitized = rawValue ? sanitizeColor(rawValue) : null;
      if (sanitized) {
        normalized.setAttribute('style', `color: ${sanitized}`);
      } else {
        normalized.removeAttribute('style');
      }
    } else {
      normalized.removeAttribute('style');
    }
  }

  Array.from(normalized.childNodes).forEach(child => {
    if (child.nodeType === Node.COMMENT_NODE) {
      child.parentNode?.removeChild(child);
      return;
    }
    if (child.nodeType === Node.ELEMENT_NODE) {
      sanitizeElement(child as HTMLElement);
    }
  });
};

const fallbackSanitize = (html: string): string =>
  html
    .replace(/<\/?(?!br\b)[^>]+>/gi, '')
    .replace(/\r\n|\r|\n/g, '<br>')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');

export const sanitizeRichTextHtml = (html: string): string => {
  const input = html ?? '';
  if (input.trim().length === 0) {
    return '';
  }

  if (!hasDOM) {
    return fallbackSanitize(input).trim();
  }

  const template = document.createElement('template');
  template.innerHTML = input;

  Array.from(template.content.childNodes).forEach(node => {
    if (node.nodeType === Node.COMMENT_NODE) {
      node.parentNode?.removeChild(node);
      return;
    }
    if (node.nodeType === Node.ELEMENT_NODE) {
      sanitizeElement(node as HTMLElement);
    }
  });

  return template.innerHTML.trim();
};

const stripHtml = (html: string): string => {
  if (!hasDOM) {
    return html.replace(/<[^>]+>/g, '');
  }
  const template = document.createElement('template');
  template.innerHTML = html;
  return template.content.textContent ?? '';
};

const normalizePlainText = (value: string): string =>
  value
    .replace(/[\u200B\u200C\u200D\uFEFF]/g, '')
    .replace(/\r\n/g, '\n');

export const sanitizeRichTextValue = (
  value: RichTextValue | null | undefined,
): RichTextValue | null => {
  if (!value) {
    return null;
  }

  const sanitizedHtml = sanitizeRichTextHtml(value.html ?? '');
  const providedPlainText = normalizePlainText(value.plainText ?? '');
  const htmlPlainText = normalizePlainText(stripHtml(sanitizedHtml));
  const effectivePlainText = providedPlainText.trim().length > 0 ? providedPlainText : htmlPlainText;

  if (sanitizedHtml.trim().length === 0 && effectivePlainText.trim().length === 0) {
    return null;
  }

  return {
    html: sanitizedHtml,
    plainText: effectivePlainText,
  };
};

export const updateElementRichTextMap = (
  map: ElementRichText,
  key: EditableElementKey,
  value: RichTextValue | null | undefined,
): ElementRichText => {
  if (value === undefined) {
    return map;
  }
  const sanitized = sanitizeRichTextValue(value);
  if (!sanitized) {
    if (!(key in map)) {
      return map;
    }
    const next = { ...map };
    delete next[key];
    return next;
  }
  return {
    ...map,
    [key]: sanitized,
  };
};

export const plainTextToHtml = (plainText: string): string => {
  if (plainText.trim().length === 0) {
    return '';
  }
  return escapeHtml(plainText).replace(/\r\n|\r|\n/g, '<br>');
};

export const createPlainTextRichTextValue = (plainText: string): RichTextValue => ({
  plainText: normalizePlainText(plainText),
  html: plainTextToHtml(plainText),
});
