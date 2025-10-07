import { describe, expect, it } from 'vitest';

import {
  DEFAULT_SITE_CONTENT,
  resolveSiteContent,
  sanitizeSiteContentInput,
} from './siteContent';
import {
  EDITABLE_ELEMENT_KEYS,
  STYLE_EDITABLE_ELEMENT_KEYS,
} from '../types';

const REVIEW6_MESSAGE_KEY = 'instagramReviews.reviews.review6.message' as const;
const REVIEW7_MESSAGE_KEY = 'instagramReviews.reviews.review7.message' as const;
const REVIEW6_POST_IMAGE_KEY = 'instagramReviews.reviews.review6.postImageUrl' as const;

const createRichTextValue = (html: string, plainText: string) => ({
  html,
  plainText,
});

describe('siteContent instagram review element maps', () => {
  it('includes review6 and review7 keys in editable collections', () => {
    expect(EDITABLE_ELEMENT_KEYS).toContain(REVIEW6_MESSAGE_KEY);
    expect(EDITABLE_ELEMENT_KEYS).toContain(REVIEW7_MESSAGE_KEY);
    expect(EDITABLE_ELEMENT_KEYS).toContain(REVIEW6_POST_IMAGE_KEY);
    expect(STYLE_EDITABLE_ELEMENT_KEYS).toContain(REVIEW6_MESSAGE_KEY);
    expect(STYLE_EDITABLE_ELEMENT_KEYS).toContain(REVIEW7_MESSAGE_KEY);
  });

  it('sanitizes element maps while preserving review6 and review7 entries', () => {
    const dirtyContent = {
      ...DEFAULT_SITE_CONTENT,
      elementStyles: {
        ...DEFAULT_SITE_CONTENT.elementStyles,
        [REVIEW6_MESSAGE_KEY]: { textColor: '  #ff00aa  ' },
        [REVIEW7_MESSAGE_KEY]: { fontFamily: '  Custom Font  ' },
      },
      elementRichText: {
        ...DEFAULT_SITE_CONTENT.elementRichText,
        [REVIEW6_MESSAGE_KEY]: createRichTextValue('<p>Review 6</p>', 'Review 6'),
        [REVIEW7_MESSAGE_KEY]: createRichTextValue('<strong>Review 7</strong>', 'Review 7'),
      },
    };

    const sanitized = sanitizeSiteContentInput(dirtyContent);

    expect(sanitized.elementStyles[REVIEW6_MESSAGE_KEY]).toEqual({ textColor: '#ff00aa' });
    expect(sanitized.elementStyles[REVIEW7_MESSAGE_KEY]).toEqual({ fontFamily: 'Custom Font' });
    expect(sanitized.elementRichText[REVIEW6_MESSAGE_KEY]).toMatchObject({
      plainText: 'Review 6',
    });
    expect(sanitized.elementRichText[REVIEW7_MESSAGE_KEY]).toMatchObject({
      plainText: 'Review 7',
    });
  });

  it('resolves element maps while preserving review6 and review7 entries', () => {
    const resolved = resolveSiteContent({
      elementStyles: {
        [REVIEW6_MESSAGE_KEY]: { textColor: '#00ffaa' },
        [REVIEW7_MESSAGE_KEY]: { fontSize: ' 18px ' },
      },
      elementRichText: {
        [REVIEW6_MESSAGE_KEY]: { html: '<p>Resolved 6</p>', plainText: '' },
        [REVIEW7_MESSAGE_KEY]: { html: '<em>Resolved 7</em>', plainText: '' },
      },
    });

    expect(resolved.elementStyles[REVIEW6_MESSAGE_KEY]).toEqual({ textColor: '#00ffaa' });
    expect(resolved.elementStyles[REVIEW7_MESSAGE_KEY]).toEqual({ fontSize: '18px' });
    expect(resolved.elementRichText[REVIEW6_MESSAGE_KEY]).toMatchObject({
      plainText: 'Resolved 6',
    });
    expect(resolved.elementRichText[REVIEW7_MESSAGE_KEY]).toMatchObject({
      plainText: 'Resolved 7',
    });
  });
});
