import {
  CustomizationAsset,
  CustomizationAssetType,
  EditableElementKey,
  ElementRichText,
  ElementStyle,
  ElementStyles,
  InstagramReview,
  InstagramReviewId,
  SectionStyle,
  SiteAssets,
  SiteContent,
  EDITABLE_ELEMENT_KEYS,
  INSTAGRAM_REVIEW_IDS,
} from '../types';
import { normalizeCloudinaryImageUrl } from '../services/cloudinary';
import { sanitizeRichTextValue } from './richText';

const DEFAULT_INSTAGRAM_REVIEW_ITEMS: Record<InstagramReviewId, InstagramReview> = {
  review1: {
    name: 'Laura Méndez',
    handle: '@laurita.eats',
    timeAgo: 'hace 2 días',
    message:
      'No puedo con la originalidad de estos tacos al pastor: cada mordisco tiene un giro gourmet brutal. La salsa cheddar queda cremosa sin empalagar y el toque crujiente lo es todo.',
    highlight: 'Story « Taco Tuesday »',
    highlightCaption: 'Guardado en Destacadas',
    location: 'Bogotá · Servicio nocturno',
    badgeLabel: 'Instagram',
    postImageAlt: "Assiette de tacos colorés garnis d'herbes fraîches.",
    avatarUrl:
      'https://images.unsplash.com/photo-1544723795-3fb6469f5b39?auto=format&fit=crop&w=320&q=80',
    highlightImageUrl: 'https://images.unsplash.com/photo-1521305916504-4a1121188589?auto=format&fit=crop&w=320&q=80',
    postImageUrl: 'https://images.unsplash.com/photo-1521305916504-4a1121188589?auto=format&fit=crop&w=640&q=80',
  },
  review2: {
    name: 'Camila Torres',
    handle: '@camigoesout',
    timeAgo: 'hace 5 días',
    message:
      'Estas arepas son lo más: combinan ingredientes súper frescos con un toque gourmet creativo. La mezcla dulce-salado y esa salsa cheddar para remojar me tuvieron feliz todo el brunch.',
    highlight: 'Reel « Brunch entre amigas »',
    highlightCaption: 'Comentarios llenos de antojos',
    location: 'Medellín · Brunch de domingo',
    badgeLabel: 'Instagram',
    postImageAlt: 'Gros plan sur des arepas dorées et une sauce maison.',
    avatarUrl:
      'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=320&q=80',
    highlightImageUrl: 'https://images.unsplash.com/photo-1478145046317-39f10e56b5e9?auto=format&fit=crop&w=320&q=80',
    postImageUrl: 'https://images.unsplash.com/photo-1478145046317-39f10e56b5e9?auto=format&fit=crop&w=640&q=80',
  },
  review3: {
    name: 'Sebastián Ruiz',
    handle: '@ruizhungry',
    timeAgo: 'hace 1 semana',
    message:
      'Armamos un afterwork aquí y fue un hit: combos originales, porciones generosas y un crunch brutal en cada bocado. La salsa cheddar se volvió tema de conversación.',
    highlight: 'Post « Team Afterwork »',
    highlightCaption: 'Reacciones de la oficina',
    location: 'Barranquilla · Terraza privada',
    badgeLabel: 'Instagram',
    postImageAlt:
      'Table conviviale avec plusieurs plats mexicains et des boissons fraîches.',
    avatarUrl:
      'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=320&q=80',
    highlightImageUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=320&q=80',
    postImageUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=640&q=80',
  },
  review4: {
    name: 'Valentina Ríos',
    handle: '@valen.foodnotes',
    timeAgo: 'hace 2 semanas',
    message:
      'El menú tiene un mood gourmet sin perder lo reconfortante: masa crocante, cheddar fundido y combinaciones de ingredientes que se sienten pensadas con cariño. Increíble experiencia.',
    highlight: 'Carousel « Night Out »',
    highlightCaption: 'Comentarios fijados',
    location: 'Cali · Cena casual',
    badgeLabel: 'Instagram',
    postImageAlt: 'Pizza gourmande avec fromage coulant et herbes fraîches.',
    avatarUrl:
      'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=320&q=80',
    highlightImageUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=320&q=80',
    postImageUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=640&q=80',
  },
  review5: {
    name: 'Alejandro Pérez',
    handle: '@alexlovesfood',
    timeAgo: 'hace 3 semanas',
    message:
      'Vine por curiosidad y me quedé por la originalidad del menú: el cheddar baña la burger justo como me gusta y el pan crujiente aguanta toda la salsa. Asociaciones de sabores top.',
    highlight: 'Live « Burger Night »',
    highlightCaption: 'Chat lleno de elogios',
    location: 'Bogotá · Servicio takeout',
    badgeLabel: 'Instagram',
    postImageAlt: 'Burger gourmet avec sauce et frites croustillantes.',
    avatarUrl:
      'https://images.unsplash.com/photo-1529665253569-6d01c0eaf7b6?auto=format&fit=crop&w=320&q=80',
    highlightImageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=320&q=80',
    postImageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=640&q=80',
  },
  review6: {
    name: 'Juliana Gómez',
    handle: '@julie.foodstories',
    timeAgo: 'hace 1 mes',
    message:
      'Pedimos catering para un cumpleaños y fue éxito total: tacos mini, dips calientes y una mesa que se veía divina para fotos. Todo llegó puntual y con instrucciones claras.',
    highlight: 'Story « Fiesta privada »',
    highlightCaption: 'Reseñas con confeti',
    location: 'Cartagena · Evento privado',
    badgeLabel: 'Instagram',
    postImageAlt: 'Buffet coloré avec tacos, dips et accompagnements.',
    avatarUrl:
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=320&q=80',
    highlightImageUrl: 'https://images.unsplash.com/photo-1528715471579-d1bcf0ba5e83?auto=format&fit=crop&w=320&q=80',
    postImageUrl: 'https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?auto=format&fit=crop&w=640&q=80',
  },
  review7: {
    name: 'Manuela Herrera',
    handle: '@manuelatryit',
    timeAgo: 'hace 6 semanas',
    message:
      'Amo que tengan opciones veggies sin perder el toque cheddar: las quesadillas con hongos y maíz dulce son mi nueva obsesión. Además, la atención es rapidísima.',
    highlight: 'Reel « Veggie Lovers »',
    highlightCaption: 'Comentarios verdes y felices',
    location: 'Bogotá · Servicio para llevar',
    badgeLabel: 'Instagram',
    postImageAlt: 'Quesadillas dorées servies avec salsa verde.',
    avatarUrl:
      'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=320&q=80',
    highlightImageUrl: 'https://images.unsplash.com/photo-1528712306091-ed0763094c98?auto=format&fit=crop&w=320&q=80',
    postImageUrl: 'https://images.unsplash.com/photo-1528712306091-ed0763094c98?auto=format&fit=crop&w=640&q=80',
  },
};

const trimOrEmpty = (value: string): string => value.trim();

const isNonEmptyString = (value: string | null | undefined): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const resolveFontFamily = (value: string | null | undefined, fallback: string): string =>
  isNonEmptyString(value) ? value.trim() : fallback;

const resolveFontSize = (value: string | null | undefined, fallback: string): string =>
  isNonEmptyString(value) ? value.trim() : fallback;

const resolveColor = (value: string | null | undefined, fallback: string): string =>
  isNonEmptyString(value) ? value.trim() : fallback;

const resolveString = (value: string | null | undefined, fallback: string): string => {
  if (typeof value !== 'string') {
    return fallback;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
};

const resolveImage = (value: string | null | undefined, fallback: string | null): string | null => {
  if (value === undefined) {
    return fallback ?? null;
  }

  if (value === null) {
    return null;
  }

  const normalized = normalizeCloudinaryImageUrl(value);
  return normalized ?? fallback ?? null;
};

const sanitizeImage = (value: string | null | undefined): string | null => {
  const normalized = normalizeCloudinaryImageUrl(value);
  return normalized ?? null;
};

const resolveInstagramReviewRecords = (
  reviews: Partial<Record<InstagramReviewId, Partial<InstagramReview>>> | null | undefined,
  fallback: Record<InstagramReviewId, InstagramReview>,
): Record<InstagramReviewId, InstagramReview> => {
  const resolved: Record<InstagramReviewId, InstagramReview> = {} as Record<
    InstagramReviewId,
    InstagramReview
  >;
  INSTAGRAM_REVIEW_IDS.forEach(id => {
    const base = fallback[id];
    const source = reviews?.[id] ?? {};
    resolved[id] = {
      name: resolveString(source?.name, base.name),
      handle: resolveString(source?.handle, base.handle),
      timeAgo: resolveString(source?.timeAgo, base.timeAgo),
      message: resolveString(source?.message, base.message),
      highlight: resolveString(source?.highlight, base.highlight),
      highlightCaption: resolveString(source?.highlightCaption, base.highlightCaption),
      location: resolveString(source?.location, base.location),
      badgeLabel: resolveString(source?.badgeLabel, base.badgeLabel),
      postImageAlt: resolveString(source?.postImageAlt, base.postImageAlt),
      avatarUrl: resolveImage(source?.avatarUrl, base.avatarUrl),
      highlightImageUrl: resolveImage(source?.highlightImageUrl, base.highlightImageUrl),
      postImageUrl: resolveImage(source?.postImageUrl, base.postImageUrl),
    };
  });
  return resolved;
};

const sanitizeInstagramReviewRecords = (
  reviews: Partial<Record<InstagramReviewId, Partial<InstagramReview>>> | null | undefined,
): Record<InstagramReviewId, InstagramReview> => {
  const sanitized: Record<InstagramReviewId, InstagramReview> = {} as Record<
    InstagramReviewId,
    InstagramReview
  >;
  INSTAGRAM_REVIEW_IDS.forEach(id => {
    const source = reviews?.[id] ?? {};
    sanitized[id] = {
      name: trimOrEmpty(source?.name ?? ''),
      handle: trimOrEmpty(source?.handle ?? ''),
      timeAgo: trimOrEmpty(source?.timeAgo ?? ''),
      message: trimOrEmpty(source?.message ?? ''),
      highlight: trimOrEmpty(source?.highlight ?? ''),
      highlightCaption: trimOrEmpty(source?.highlightCaption ?? ''),
      location: trimOrEmpty(source?.location ?? ''),
      badgeLabel: trimOrEmpty(source?.badgeLabel ?? ''),
      postImageAlt: trimOrEmpty(source?.postImageAlt ?? ''),
      avatarUrl: sanitizeImage(source?.avatarUrl),
      highlightImageUrl: sanitizeImage(source?.highlightImageUrl),
      postImageUrl: sanitizeImage(source?.postImageUrl),
    };
  });
  return sanitized;
};

const sanitizeElementStyleValue = (value: string | null | undefined): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const sanitizeElementStyle = (style: ElementStyle | undefined | null): ElementStyle | null => {
  if (!style) {
    return null;
  }

  const textColor = sanitizeElementStyleValue(style.textColor ?? null);
  const fontFamily = sanitizeElementStyleValue(style.fontFamily ?? null);
  const fontSize = sanitizeElementStyleValue(style.fontSize ?? null);
  const backgroundColor = sanitizeElementStyleValue(style.backgroundColor ?? null);

  const sanitized: ElementStyle = {};

  if (textColor) {
    sanitized.textColor = textColor;
  }
  if (fontFamily) {
    sanitized.fontFamily = fontFamily;
  }
  if (fontSize) {
    sanitized.fontSize = fontSize;
  }
  if (backgroundColor) {
    sanitized.backgroundColor = backgroundColor;
  }

  return Object.keys(sanitized).length > 0 ? sanitized : null;
};

const resolveElementStyles = (
  styles: ElementStyles | null | undefined,
  fallback: ElementStyles,
): ElementStyles => {
  const source = styles ?? fallback;
  const resolved: ElementStyles = {};

  EDITABLE_ELEMENT_KEYS.forEach(key => {
    const sanitized = sanitizeElementStyle(source[key] ?? null);
    if (sanitized) {
      resolved[key as EditableElementKey] = sanitized;
    }
  });

  return resolved;
};

const sanitizeElementStyles = (styles: ElementStyles | undefined, fallback: ElementStyles): ElementStyles => {
  const source = styles ?? fallback;
  const sanitized: ElementStyles = {};

  EDITABLE_ELEMENT_KEYS.forEach(key => {
    const entry = sanitizeElementStyle(source[key] ?? null);
    if (entry) {
      sanitized[key as EditableElementKey] = entry;
    }
  });

  return sanitized;
};

const resolveElementRichText = (
  richText: ElementRichText | null | undefined,
  fallback: ElementRichText,
): ElementRichText => {
  const source: ElementRichText = richText ?? fallback;
  const resolved: ElementRichText = {};

  EDITABLE_ELEMENT_KEYS.forEach(key => {
    const entry = source[key as EditableElementKey];
    const sanitized = sanitizeRichTextValue(entry ?? null);
    if (sanitized) {
      resolved[key as EditableElementKey] = sanitized;
    }
  });

  return resolved;
};

const sanitizeElementRichText = (
  richText: ElementRichText | undefined,
  fallback: ElementRichText,
): ElementRichText => {
  const source: ElementRichText = richText ?? fallback;
  const sanitized: ElementRichText = {};

  EDITABLE_ELEMENT_KEYS.forEach(key => {
    const entry = source[key as EditableElementKey];
    const value = sanitizeRichTextValue(entry ?? null);
    if (value) {
      sanitized[key as EditableElementKey] = value;
    }
  });

  return sanitized;
};

const ASSET_TYPES: CustomizationAssetType[] = ['image', 'video', 'audio', 'font', 'raw'];

const generateAssetId = (): string => `asset-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const resolveAssetType = (type: unknown): CustomizationAssetType =>
  ASSET_TYPES.includes(type as CustomizationAssetType) ? (type as CustomizationAssetType) : 'raw';

const resolveAssetTimestamp = (value: unknown): string => {
  if (typeof value === 'string') {
    const timestamp = Date.parse(value);
    if (!Number.isNaN(timestamp)) {
      return new Date(timestamp).toISOString();
    }
  }
  return new Date().toISOString();
};

const resolveAssetBytes = (value: unknown): number => {
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) {
    return 0;
  }
  return Math.round(numeric);
};

const sanitizeCustomizationAsset = (asset: Partial<CustomizationAsset> | null | undefined): CustomizationAsset | null => {
  if (!asset) {
    return null;
  }

  const normalizedUrl = normalizeCloudinaryImageUrl(asset.url ?? undefined);
  if (!normalizedUrl) {
    return null;
  }

  const id = typeof asset.id === 'string' && asset.id.trim().length > 0 ? asset.id.trim() : generateAssetId();
  const name = typeof asset.name === 'string' && asset.name.trim().length > 0 ? asset.name.trim() : id;
  const format = typeof asset.format === 'string' && asset.format.trim().length > 0 ? asset.format.trim() : 'application/octet-stream';
  const type = resolveAssetType(asset.type);
  const bytes = resolveAssetBytes(asset.bytes);
  const createdAt = resolveAssetTimestamp(asset.createdAt);

  return {
    id,
    name,
    url: normalizedUrl,
    format,
    bytes,
    type,
    createdAt,
  };
};

const resolveSiteAssets = (assets: Partial<SiteAssets> | null | undefined, fallback: SiteAssets): SiteAssets => {
  if (!assets) {
    return fallback;
  }

  const library = Array.isArray(assets.library)
    ? (assets.library
        .map(entry => sanitizeCustomizationAsset(entry))
        .filter(Boolean) as CustomizationAsset[])
    : fallback.library;

  return {
    library,
  };
};

const sanitizeSiteAssets = (assets: SiteAssets | undefined, fallback: SiteAssets): SiteAssets => {
  const source = assets ?? fallback;
  const library = Array.isArray(source.library)
    ? (source.library
        .map(entry => sanitizeCustomizationAsset(entry))
        .filter(Boolean) as CustomizationAsset[])
    : fallback.library;

  return {
    library,
  };
};

const DEFAULT_NAVIGATION_STYLE: SectionStyle = {
  background: {
    type: 'color',
    color: '#0f172a',
    image: null,
  },
  fontFamily: 'Inter',
  fontSize: '16px',
  textColor: '#f1f5f9',
};

const DEFAULT_HERO_STYLE: SectionStyle = {
  background: {
    type: 'image',
    color: '#0f172a',
    image: 'https://picsum.photos/seed/tacosbg/1920/1080',
  },
  fontFamily: 'Inter',
  fontSize: '18px',
  textColor: '#f8fafc',
};

const DEFAULT_ABOUT_STYLE: SectionStyle = {
  background: {
    type: 'color',
    color: '#ffffff',
    image: null,
  },
  fontFamily: 'Inter',
  fontSize: '16px',
  textColor: '#0f172a',
};

const DEFAULT_MENU_STYLE: SectionStyle = {
  background: {
    type: 'color',
    color: '#f8fafc',
    image: null,
  },
  fontFamily: 'Inter',
  fontSize: '16px',
  textColor: '#111827',
};

const DEFAULT_INSTAGRAM_REVIEWS_STYLE: SectionStyle = {
  background: {
    type: 'color',
    color: '#ffffff',
    image: null,
  },
  fontFamily: 'Inter',
  fontSize: '16px',
  textColor: '#111827',
};

export const DEFAULT_FIND_US_STYLE: SectionStyle = {
  background: {
    type: 'color',
    color: '#f8fafc',
    image: null,
  },
  fontFamily: 'Inter',
  fontSize: '16px',
  textColor: '#0f172a',
};

const DEFAULT_FOOTER_STYLE: SectionStyle = {
  background: {
    type: 'color',
    color: '#0f172a',
    image: null,
  },
  fontFamily: 'Inter',
  fontSize: '14px',
  textColor: '#e2e8f0',
};

const DEFAULT_SITE_ASSETS: SiteAssets = {
  library: [],
};

const DEFAULT_ELEMENT_STYLES: ElementStyles = {};
const DEFAULT_ELEMENT_RICH_TEXT: ElementRichText = {};

const resolveSectionStyle = (style: Partial<SectionStyle> | undefined, fallback: SectionStyle): SectionStyle => {
  const backgroundType = style?.background?.type === 'image' ? 'image' : 'color';
  const backgroundColor = resolveColor(style?.background?.color, fallback.background.color);
  const backgroundImage =
    backgroundType === 'image'
      ? resolveImage(style?.background?.image ?? undefined, fallback.background.image)
      : null;

  return {
    background: {
      type: backgroundType,
      color: backgroundType === 'color' ? backgroundColor : resolveColor(style?.background?.color, fallback.background.color),
      image: backgroundType === 'image' ? backgroundImage : null,
    },
    fontFamily: resolveFontFamily(style?.fontFamily ?? null, fallback.fontFamily),
    fontSize: resolveFontSize(style?.fontSize ?? null, fallback.fontSize),
    textColor: resolveColor(style?.textColor ?? null, fallback.textColor),
  };
};

const sanitizeSectionStyle = (style: SectionStyle | undefined, fallback: SectionStyle): SectionStyle => {
  const backgroundType = style?.background?.type === 'image' ? 'image' : 'color';
  const sanitizedColor = resolveColor(style?.background?.color ?? null, fallback.background.color);
  const sanitizedImage = backgroundType === 'image' ? sanitizeImage(style?.background?.image ?? null) : null;

  return {
    background: {
      type: backgroundType,
      color: sanitizedColor,
      image: backgroundType === 'image' ? sanitizedImage : null,
    },
    fontFamily: resolveFontFamily(style?.fontFamily ?? null, fallback.fontFamily),
    fontSize: resolveFontSize(style?.fontSize ?? null, fallback.fontSize),
    textColor: resolveColor(style?.textColor ?? null, fallback.textColor),
  };
};

export const DEFAULT_SITE_CONTENT: SiteContent = {
  navigation: {
    brand: 'OUIOUITACOS',
    brandLogo: '/logo-brand.svg',
    staffLogo: '/logo-staff.svg',
    links: {
      home: 'Accueil',
      about: 'À propos',
      menu: 'Menu',
      contact: 'Contact',
      loginCta: 'Staff Login',
    },
    style: DEFAULT_NAVIGATION_STYLE,
  },
  hero: {
    title: 'Le Goût Authentique du Mexique',
    subtitle:
      "Des tacos préparés avec passion, des ingrédients frais et une touche de tradition pour un voyage gustatif inoubliable.",
    ctaLabel: 'Commander en ligne',
    backgroundImage: 'https://picsum.photos/seed/tacosbg/1920/1080',
    historyTitle: 'Vos dernières commandes',
    reorderCtaLabel: 'Commander à nouveau',
    style: DEFAULT_HERO_STYLE,
  },
  about: {
    title: 'Notre Histoire',
    description:
      "Fondé par des passionnés de la cuisine mexicaine, OUIOUITACOS est né d'un désir simple : partager le goût authentique des tacos faits maison. Chaque recette est un héritage familial, chaque ingrédient est choisi avec soin, et chaque plat est préparé avec le cœur. Venez découvrir une explosion de saveurs qui vous transportera directement dans les rues de Mexico.",
    image: null,
    style: DEFAULT_ABOUT_STYLE,
  },
  menu: {
    title: 'Nos Best-sellers',
    ctaLabel: 'Voir le menu complet & Commander',
    loadingLabel: 'Chargement du menu...',
    image: null,
    style: DEFAULT_MENU_STYLE,
  },
  instagramReviews: {
    title: 'Ils nous adorent sur Instagram',
    subtitle:
      'Des foodies de toute la Colombie partagent leur coup de cœur pour notre cuisine : ambiance solaire, service attentionné et assiettes qui brillent autant que leurs stories.',
    image: 'https://picsum.photos/seed/instagramreviews/600/600',
    style: DEFAULT_INSTAGRAM_REVIEWS_STYLE,
    reviews: INSTAGRAM_REVIEW_IDS.reduce(
      (acc, id) => {
        acc[id] = { ...DEFAULT_INSTAGRAM_REVIEW_ITEMS[id] };
        return acc;
      },
      {} as Record<InstagramReviewId, InstagramReview>,
    ),
  },
  findUs: {
    title: 'Encuéntranos',
    addressLabel: 'Dirección',
    address: 'Cra. 53 #75-98\nBarranquilla, Atlántico\nColombie',
    cityLabel: 'Email',
    city: 'hola@ouiouipos.co',
    hoursLabel: 'Horarios',
    hours: 'Lunes a domingo · 11h00 - 23h00',
    mapLabel: 'Ver en Google Maps',
    mapUrl:
      'https://www.google.com/maps?q=OUIOUITACOS%2C%20Cra%2053%20%2375-98%2C%20Barranquilla%2C%20Atl%C3%A1ntico%2C%20Colombie',
    style: DEFAULT_FIND_US_STYLE,
  },
  footer: {
    text: 'Tous droits réservés.',
    style: DEFAULT_FOOTER_STYLE,
  },
  elementStyles: DEFAULT_ELEMENT_STYLES,
  elementRichText: DEFAULT_ELEMENT_RICH_TEXT,
  assets: DEFAULT_SITE_ASSETS,
};

export const resolveSiteContent = (content?: Partial<SiteContent> | null): SiteContent => {
  const base = DEFAULT_SITE_CONTENT;
  return {
    navigation: {
      brand: resolveString(content?.navigation?.brand, base.navigation.brand),
      brandLogo: resolveImage(content?.navigation?.brandLogo, base.navigation.brandLogo),
      staffLogo: resolveImage(content?.navigation?.staffLogo, base.navigation.staffLogo),
      links: {
        home: resolveString(content?.navigation?.links?.home, base.navigation.links.home),
        about: resolveString(content?.navigation?.links?.about, base.navigation.links.about),
        menu: resolveString(content?.navigation?.links?.menu, base.navigation.links.menu),
        contact: resolveString(content?.navigation?.links?.contact, base.navigation.links.contact),
        loginCta: resolveString(content?.navigation?.links?.loginCta, base.navigation.links.loginCta),
      },
      style: resolveSectionStyle(content?.navigation?.style, base.navigation.style),
    },
    hero: {
      title: resolveString(content?.hero?.title, base.hero.title),
      subtitle: resolveString(content?.hero?.subtitle, base.hero.subtitle),
      ctaLabel: resolveString(content?.hero?.ctaLabel, base.hero.ctaLabel),
      backgroundImage: resolveImage(content?.hero?.backgroundImage, base.hero.backgroundImage),
      historyTitle: resolveString(content?.hero?.historyTitle, base.hero.historyTitle),
      reorderCtaLabel: resolveString(content?.hero?.reorderCtaLabel, base.hero.reorderCtaLabel),
      style: resolveSectionStyle(content?.hero?.style, base.hero.style),
    },
    about: {
      title: resolveString(content?.about?.title, base.about.title),
      description: resolveString(content?.about?.description, base.about.description),
      image: resolveImage(content?.about?.image, base.about.image),
      style: resolveSectionStyle(content?.about?.style, base.about.style),
    },
    menu: {
      title: resolveString(content?.menu?.title, base.menu.title),
      ctaLabel: resolveString(content?.menu?.ctaLabel, base.menu.ctaLabel),
      loadingLabel: resolveString(content?.menu?.loadingLabel, base.menu.loadingLabel),
      image: resolveImage(content?.menu?.image, base.menu.image),
      style: resolveSectionStyle(content?.menu?.style, base.menu.style),
    },
    instagramReviews: {
      title: resolveString(content?.instagramReviews?.title, base.instagramReviews.title),
      subtitle: resolveString(content?.instagramReviews?.subtitle, base.instagramReviews.subtitle),
      image: resolveImage(content?.instagramReviews?.image, base.instagramReviews.image),
      style: resolveSectionStyle(content?.instagramReviews?.style, base.instagramReviews.style),
      reviews: resolveInstagramReviewRecords(
        content?.instagramReviews?.reviews ?? null,
        base.instagramReviews.reviews,
      ),
    },
    findUs: {
      title: resolveString(content?.findUs?.title, base.findUs.title),
      addressLabel: resolveString(content?.findUs?.addressLabel, base.findUs.addressLabel),
      address: resolveString(content?.findUs?.address, base.findUs.address),
      cityLabel: resolveString(content?.findUs?.cityLabel, base.findUs.cityLabel),
      city: resolveString(content?.findUs?.city, base.findUs.city),
      hoursLabel: resolveString(content?.findUs?.hoursLabel, base.findUs.hoursLabel),
      hours: resolveString(content?.findUs?.hours, base.findUs.hours),
      mapLabel: resolveString(content?.findUs?.mapLabel, base.findUs.mapLabel),
      mapUrl: resolveString(content?.findUs?.mapUrl, base.findUs.mapUrl),
      style: resolveSectionStyle(content?.findUs?.style, base.findUs.style),
    },
    footer: {
      text: resolveString(content?.footer?.text, base.footer.text),
      style: resolveSectionStyle(content?.footer?.style, base.footer.style),
    },
    elementStyles: resolveElementStyles(content?.elementStyles ?? null, base.elementStyles),
    elementRichText: resolveElementRichText(content?.elementRichText ?? null, base.elementRichText),
    assets: resolveSiteAssets(content?.assets ?? null, DEFAULT_SITE_ASSETS),
  };
};

export const sanitizeSiteContentInput = (content: SiteContent): SiteContent => ({
  navigation: {
    brand: trimOrEmpty(content.navigation.brand),
    brandLogo: sanitizeImage(content.navigation.brandLogo) ?? null,
    staffLogo: sanitizeImage(content.navigation.staffLogo) ?? null,
    links: {
      home: trimOrEmpty(content.navigation.links.home),
      about: trimOrEmpty(content.navigation.links.about),
      menu: trimOrEmpty(content.navigation.links.menu),
      contact: trimOrEmpty(content.navigation.links.contact),
      loginCta: trimOrEmpty(content.navigation.links.loginCta),
    },
    style: sanitizeSectionStyle(content.navigation.style, DEFAULT_NAVIGATION_STYLE),
  },
  hero: {
    title: trimOrEmpty(content.hero.title),
    subtitle: trimOrEmpty(content.hero.subtitle),
    ctaLabel: trimOrEmpty(content.hero.ctaLabel),
    backgroundImage: sanitizeImage(content.hero.backgroundImage),
    historyTitle: trimOrEmpty(content.hero.historyTitle),
    reorderCtaLabel: trimOrEmpty(content.hero.reorderCtaLabel),
    style: sanitizeSectionStyle(content.hero.style, DEFAULT_HERO_STYLE),
  },
  about: {
    title: trimOrEmpty(content.about.title),
    description: trimOrEmpty(content.about.description),
    image: sanitizeImage(content.about.image),
    style: sanitizeSectionStyle(content.about.style, DEFAULT_ABOUT_STYLE),
  },
  menu: {
    title: trimOrEmpty(content.menu.title),
    ctaLabel: trimOrEmpty(content.menu.ctaLabel),
    loadingLabel: trimOrEmpty(content.menu.loadingLabel),
    image: sanitizeImage(content.menu.image),
    style: sanitizeSectionStyle(content.menu.style, DEFAULT_MENU_STYLE),
  },
  instagramReviews: {
    title: trimOrEmpty(content.instagramReviews.title),
    subtitle: trimOrEmpty(content.instagramReviews.subtitle),
    image: sanitizeImage(content.instagramReviews.image),
    style: sanitizeSectionStyle(content.instagramReviews.style, DEFAULT_INSTAGRAM_REVIEWS_STYLE),
    reviews: sanitizeInstagramReviewRecords(content.instagramReviews.reviews ?? null),
  },
  findUs: {
    title: trimOrEmpty(content.findUs.title),
    addressLabel: trimOrEmpty(content.findUs.addressLabel),
    address: trimOrEmpty(content.findUs.address),
    cityLabel: trimOrEmpty(content.findUs.cityLabel),
    city: trimOrEmpty(content.findUs.city),
    hoursLabel: trimOrEmpty(content.findUs.hoursLabel),
    hours: trimOrEmpty(content.findUs.hours),
    mapLabel: trimOrEmpty(content.findUs.mapLabel),
    mapUrl: trimOrEmpty(content.findUs.mapUrl),
    style: sanitizeSectionStyle(content.findUs.style, DEFAULT_FIND_US_STYLE),
  },
  footer: {
    text: trimOrEmpty(content.footer.text),
    style: sanitizeSectionStyle(content.footer.style, DEFAULT_FOOTER_STYLE),
  },
  elementStyles: sanitizeElementStyles(content.elementStyles, DEFAULT_ELEMENT_STYLES),
  elementRichText: sanitizeElementRichText(content.elementRichText, DEFAULT_ELEMENT_RICH_TEXT),
  assets: sanitizeSiteAssets(content.assets, DEFAULT_SITE_ASSETS),
});
