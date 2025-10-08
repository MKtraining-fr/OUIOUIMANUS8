import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useLayoutEffect,
  useId,
} from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, CheckCircle2, Loader2, Upload, X } from 'lucide-react';
import SitePreviewCanvas, { resolveZoneFromElement } from '../components/SitePreviewCanvas';
import useSiteContent from '../hooks/useSiteContent';
import RichTextEditor from '../components/RichTextEditor';
import {
  CustomizationAsset,
  CustomizationAssetType,
  EditableElementKey,
  EditableZoneKey,
  ElementStyle,
  Product,
  RichTextValue,
  SectionStyle,
  SiteContent,
  STYLE_EDITABLE_ELEMENT_KEYS,
} from '../types';
import { api } from '../services/api';
import { normalizeCloudinaryImageUrl, uploadCustomizationAsset } from '../services/cloudinary';
import { sanitizeFontFamilyName } from '../utils/fonts';

const FONT_FAMILY_SUGGESTIONS = [
  'Inter',
  'Poppins',
  'Roboto',
  'Montserrat',
  'Playfair Display',
  'Lora',
  'Open Sans',
  'Georgia, serif',
  'Arial, sans-serif',
] as const;

const FONT_SIZE_SUGGESTIONS = [
  '14px',
  '16px',
  '18px',
  '20px',
  '24px',
  'clamp(1rem, 2vw, 1.5rem)',
] as const;

const COLOR_SUGGESTIONS = [
  '#0f172a',
  '#111827',
  '#f8fafc',
  '#ffffff',
  '#e2e8f0',
  '#f97316',
  'transparent',
  'currentColor',
] as const;

const TEXT_ELEMENT_KEYS = new Set<EditableElementKey>(STYLE_EDITABLE_ELEMENT_KEYS);

const BACKGROUND_ELEMENT_KEYS = new Set<EditableElementKey>([
  'navigation.style.background',
  'hero.style.background',
  'about.style.background',
  'menu.style.background',
  'findUs.style.background',
  'footer.style.background',
]);

const IMAGE_ELEMENT_KEYS = new Set<EditableElementKey>([
  'hero.backgroundImage',
  'about.image',
  'menu.image',
  'navigation.brandLogo',
  'navigation.staffLogo',
]);

const BASE_ELEMENT_LABELS: Partial<Record<EditableElementKey, string>> = {
  'navigation.brand': 'Nom de la marque',
  'navigation.brandLogo': 'Logo principal',
  'navigation.staffLogo': "Logo d'accès équipe",
  'navigation.links.home': 'Lien Accueil',
  'navigation.links.about': 'Lien À propos',
  'navigation.links.menu': 'Lien Menu',
  'navigation.links.contact': 'Lien Contact',
  'navigation.links.loginCta': "Bouton d'accès staff",
  'navigation.style.background': 'Fond de la navigation',
  'hero.title': 'Titre du hero',
  'hero.subtitle': 'Sous-titre du hero',
  'hero.ctaLabel': 'Bouton principal du hero',
  'hero.historyTitle': "Titre de l'historique",
  'hero.reorderCtaLabel': 'Bouton de réassort',
  'hero.backgroundImage': 'Image du hero',
  'hero.style.background': 'Fond du hero',
  'about.title': 'Titre À propos',
  'about.description': 'Texte À propos',
  'about.image': 'Image À propos',
  'about.style.background': 'Fond À propos',
  'menu.title': 'Titre du menu',
  'menu.ctaLabel': 'Bouton du menu',
  'menu.loadingLabel': 'Texte de chargement du menu',
  'menu.image': 'Image du menu',
  'menu.style.background': 'Fond du menu',
  'findUs.title': 'Titre Encuéntranos',
  'findUs.addressLabel': "Libellé de l'adresse (Encuéntranos)",
  'findUs.address': 'Adresse (Encuéntranos)',
  'findUs.cityLabel': "Libellé de contact",
  'findUs.city': 'Email (Encuéntranos)',
  'findUs.hoursLabel': 'Libellé des horaires',
  'findUs.hours': 'Horaires',
  'findUs.mapLabel': 'Libellé du lien carte',
  'findUs.style.background': 'Fond Encuéntranos',
  'footer.text': 'Texte du pied de page',
  'footer.style.background': 'Fond du pied de page',
};

const ELEMENT_LABELS: Partial<Record<EditableElementKey, string>> = {
  ...BASE_ELEMENT_LABELS,
};

const TABS = [
  { id: 'preview', label: 'Aperçu' },
  { id: 'custom', label: 'Personnalisation' },
] as const;

type TabId = (typeof TABS)[number]['id'];

type DraftUpdater = (current: SiteContent) => SiteContent;

const createAssetId = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `asset-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const guessAssetType = (file: File): CustomizationAssetType => {
  const { type, name } = file;
  if (type.startsWith('image/')) {
    return 'image';
  }
  if (type.startsWith('video/')) {
    return 'video';
  }
  if (type.startsWith('audio/')) {
    return 'audio';
  }
  if (type.includes('font')) {
    return 'font';
  }
  const extension = name.split('.').pop()?.toLowerCase();
  if (extension && ['ttf', 'otf', 'woff', 'woff2'].includes(extension)) {
    return 'font';
  }
  return 'raw';
};

const cloneSiteContent = (content: SiteContent): SiteContent => {
  if (typeof globalThis.structuredClone === 'function') {
    return globalThis.structuredClone(content);
  }
  return JSON.parse(JSON.stringify(content)) as SiteContent;
};

const setNestedValue = (content: SiteContent, key: EditableElementKey, value: string | null): void => {
  const segments = key.split('.');
  const last = segments.pop();
  if (!last) {
    return;
  }

  let cursor: unknown = content;
  segments.forEach(segment => {
    if (cursor && typeof cursor === 'object') {
      const target = (cursor as Record<string, unknown>)[segment];
      if (target && typeof target === 'object') {
        (cursor as Record<string, unknown>)[segment] = Array.isArray(target)
          ? [...target]
          : { ...target };
      } else {
        (cursor as Record<string, unknown>)[segment] = {};
      }
      cursor = (cursor as Record<string, unknown>)[segment];
    }
  });

  if (cursor && typeof cursor === 'object') {
    (cursor as Record<string, unknown>)[last] = value;
  }
};

const applyElementStyleOverrides = (
  content: SiteContent,
  element: EditableElementKey,
  overrides: Partial<ElementStyle>,
): void => {
  const sanitized: ElementStyle = {};

  if (overrides.fontFamily && overrides.fontFamily.trim().length > 0) {
    sanitized.fontFamily = overrides.fontFamily.trim();
  }
  if (overrides.fontSize && overrides.fontSize.trim().length > 0) {
    sanitized.fontSize = overrides.fontSize.trim();
  }
  if (overrides.textColor && overrides.textColor.trim().length > 0) {
    sanitized.textColor = overrides.textColor.trim();
  }
  if (overrides.backgroundColor && overrides.backgroundColor.trim().length > 0) {
    sanitized.backgroundColor = overrides.backgroundColor.trim();
  }

  const nextStyles = { ...content.elementStyles };
  if (Object.keys(sanitized).length === 0) {
    delete nextStyles[element];
  } else {
    nextStyles[element] = sanitized;
  }
  content.elementStyles = nextStyles;
};

const applyElementRichText = (
  content: SiteContent,
  element: EditableElementKey,
  value: RichTextValue | null,
): void => {
  const next = { ...content.elementRichText };
  if (value && value.html.trim().length > 0) {
    next[element] = value;
  } else {
    delete next[element];
  }
  content.elementRichText = next;
};

const applySectionBackground = (
  content: SiteContent,
  element: EditableElementKey,
  background: SectionStyle['background'],
): void => {
  const zone = resolveZoneFromElement(element);
  const zoneContent = { ...content[zone] } as typeof content[EditableZoneKey];
  const style = { ...zoneContent.style, background: { ...background } };
  zoneContent.style = style;
  (content as Record<EditableZoneKey, typeof zoneContent>)[zone] = zoneContent;
};

const appendAsset = (content: SiteContent, asset: CustomizationAsset): void => {
  const library = content.assets?.library ?? [];
  const existingIndex = library.findIndex(item => item.url === asset.url || item.id === asset.id);
  const nextLibrary = existingIndex >= 0
    ? library.map((item, index) => (index === existingIndex ? asset : item))
    : [...library, asset];
  content.assets = { ...content.assets, library: nextLibrary };
};

const getPlainTextValue = (content: SiteContent, key: EditableElementKey): string => {
  const segments = key.split('.');
  let cursor: unknown = content;
  for (const segment of segments) {
    if (!cursor || typeof cursor !== 'object') {
      return '';
    }
    cursor = (cursor as Record<string, unknown>)[segment];
  }
  return typeof cursor === 'string' ? cursor : '';
};

const getImageValue = (content: SiteContent, key: EditableElementKey): string | null => {
  const value = getPlainTextValue(content, key);
  return value.trim().length > 0 ? value : null;
};

const getElementStyle = (content: SiteContent, key: EditableElementKey): ElementStyle =>
  content.elementStyles[key] ?? {};

const getElementRichTextValue = (content: SiteContent, key: EditableElementKey): RichTextValue | null =>
  content.elementRichText[key] ?? null;

const getSectionBackground = (content: SiteContent, key: EditableElementKey): SectionStyle['background'] => {
  const zone = resolveZoneFromElement(key);
  return content[zone].style.background;
};

const createAssetFromFile = (file: File, url: string): CustomizationAsset => {
  const baseName = file.name.replace(/\.[^/.]+$/, '').trim() || 'media';
  const type = guessAssetType(file);
  const name = type === 'font' ? sanitizeFontFamilyName(baseName) : baseName;
  return {
    id: createAssetId(),
    name,
    url,
    format: file.type || 'application/octet-stream',
    bytes: file.size,
    type,
    createdAt: new Date().toISOString(),
  };
};

type AnchorRect = Pick<DOMRectReadOnly, 'x' | 'y' | 'top' | 'left' | 'bottom' | 'right' | 'width' | 'height'>;

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

const escapeAttributeValue = (value: string): string => {
  if (typeof window !== 'undefined' && window.CSS && typeof window.CSS.escape === 'function') {
    return window.CSS.escape(value);
  }
  return value.replace(/"/g, '\\"');
};

const cloneAnchorRect = (rect: DOMRect | DOMRectReadOnly | AnchorRect | null): AnchorRect | null => {
  if (!rect) {
    return null;
  }
  const { x, y, top, left, bottom, right, width, height } = rect;
  return { x, y, top, left, bottom, right, width, height };
};

interface EditorPopoverProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer: React.ReactNode;
  anchor: AnchorRect | null;
  elementId: EditableElementKey;
}

const EditorPopover: React.FC<EditorPopoverProps> = ({
  title,
  onClose,
  children,
  footer,
  anchor,
  elementId,
}) => {
  const headingId = useId();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const [placement, setPlacement] = useState<'top' | 'bottom'>('top');
  const [isMounted, setIsMounted] = useState(false);
  const [isPositioned, setIsPositioned] = useState(false);
  const [arrowPosition, setArrowPosition] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const updatePosition = useCallback(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const node = containerRef.current;
    if (!node) {
      return;
    }

    const anchorSelector = `[data-element-id="${escapeAttributeValue(elementId)}"]`;
    const anchorElement = document.querySelector(anchorSelector) as HTMLElement | null;
    const rect = anchorElement?.getBoundingClientRect() ?? anchor;

    const { width: dialogWidth, height: dialogHeight } = node.getBoundingClientRect();
    const viewportWidth = document.documentElement.clientWidth;
    const viewportHeight = window.innerHeight;
    const gutter = 16;
    const offset = 12;

    if (!rect) {
      const fallbackLeft = Math.max(gutter, (viewportWidth - dialogWidth) / 2);
      const fallbackTop = Math.max(gutter, (viewportHeight - dialogHeight) / 2);
      setPosition({ top: fallbackTop, left: fallbackLeft });
      setPlacement('top');
      setIsPositioned(true);
      setArrowPosition(null);
      return;
    }

    let top = rect.top - dialogHeight - offset;
    let currentPlacement: 'top' | 'bottom' = 'top';
    if (top < gutter) {
      top = rect.bottom + offset;
      currentPlacement = 'bottom';
    }

    if (top + dialogHeight > viewportHeight - gutter) {
      const availableAbove = rect.top - gutter;
      const availableBelow = viewportHeight - rect.bottom - gutter;
      if (availableAbove > availableBelow) {
        top = Math.max(gutter, rect.top - dialogHeight - offset);
        currentPlacement = 'top';
      } else {
        top = Math.min(viewportHeight - dialogHeight - gutter, rect.bottom + offset);
        currentPlacement = 'bottom';
      }
    }

    const desiredLeft = rect.left + rect.width / 2 - dialogWidth / 2;
    const maxLeft = viewportWidth - dialogWidth - gutter;
    const clampedLeft = Math.max(gutter, Math.min(desiredLeft, maxLeft));

    setPosition({ top, left: clampedLeft });
    setPlacement(currentPlacement);
    setIsPositioned(true);

    const arrowCenter = Math.max(
      clampedLeft + 12,
      Math.min(rect.left + rect.width / 2, clampedLeft + dialogWidth - 12),
    );
    const arrowTop = currentPlacement === 'top' ? top + dialogHeight - 6 : top - 6;
    setArrowPosition({ top: arrowTop, left: arrowCenter - 6 });
  }, [anchor, elementId]);

  useIsomorphicLayoutEffect(() => {
    if (!isMounted) {
      return;
    }
    updatePosition();
  }, [updatePosition, isMounted]);

  useEffect(() => {
    if (!isMounted) {
      return;
    }
    const handleScroll = () => updatePosition();
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleScroll);

    const anchorSelector = `[data-element-id="${escapeAttributeValue(elementId)}"]`;
    const anchorElement = document.querySelector(anchorSelector) as HTMLElement | null;
    const observers: ResizeObserver[] = [];
    if (typeof ResizeObserver !== 'undefined') {
      const resizeObserver = new ResizeObserver(() => updatePosition());
      if (anchorElement) {
        resizeObserver.observe(anchorElement);
      }
      const node = containerRef.current;
      if (node) {
        resizeObserver.observe(node);
      }
      observers.push(resizeObserver);
    }

    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleScroll);
      observers.forEach(observer => observer.disconnect());
    };
  }, [updatePosition, elementId, isMounted]);

  useEffect(() => {
    if (!isMounted) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key === 'Tab') {
        const node = containerRef.current;
        if (!node) {
          return;
        }
        const focusable = Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(element =>
          element.tabIndex !== -1 && !element.hasAttribute('disabled') && !element.getAttribute('aria-hidden'),
        );
        if (focusable.length === 0) {
          event.preventDefault();
          node.focus();
          return;
        }
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey) {
          if (document.activeElement === first || !node.contains(document.activeElement)) {
            event.preventDefault();
            last.focus();
          }
          return;
        }
        if (document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose, isMounted]);

  useEffect(() => {
    if (!isMounted) {
      return;
    }
    const handlePointerDown = (event: MouseEvent) => {
      const node = containerRef.current;
      if (!node) {
        return;
      }
      if (!node.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [onClose, isMounted]);

  useEffect(() => {
    if (!isMounted) {
      return;
    }
    const node = containerRef.current;
    if (!node) {
      return;
    }
    const focusable = node.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
    const target = focusable[0] ?? node;
    target.focus({ preventScroll: true });
  }, [isMounted]);

  if (typeof document === 'undefined' || !isMounted) {
    return null;
  }

  const content = (
    <div className="fixed inset-0 z-[60] pointer-events-none">
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        tabIndex={-1}
        className="pointer-events-auto flex w-[min(90vw,32rem)] flex-col overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-slate-200"
        style={{ position: 'absolute', top: position.top, left: position.left, opacity: isPositioned ? 1 : 0 }}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 id={headingId} className="text-lg font-semibold text-slate-900">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-slate-500 transition hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
          >
            <X className="h-5 w-5" aria-hidden="true" />
            <span className="sr-only">Fermer</span>
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-6 py-5">{children}</div>
        <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">{footer}</div>
      </div>
      {arrowPosition ? (
        <span
          aria-hidden="true"
          className={`pointer-events-none absolute h-3 w-3 rotate-45 rounded-sm bg-white shadow-[0_0_0_1px_rgba(148,163,184,0.35)] ${
            placement === 'top' ? 'translate-y-[-4px]' : 'translate-y-[4px]'
          }`}
          style={{ top: arrowPosition.top, left: arrowPosition.left, opacity: isPositioned ? 1 : 0 }}
        />
      ) : null}
    </div>
  );

  return createPortal(content, document.body);
};

interface TextElementEditorProps {
  element: EditableElementKey;
  label: string;
  draft: SiteContent;
  onApply: (updater: DraftUpdater) => void;
  onClose: () => void;
  fontOptions: readonly string[];
  onAssetAdded: (asset: CustomizationAsset) => void;
  anchor: AnchorRect | null;
}

const TextElementEditor: React.FC<TextElementEditorProps> = ({
  element,
  label,
  draft,
  onApply,
  onClose,
  fontOptions,
  onAssetAdded,
  anchor,
}) => {
  const formId = `${element.replace(/\./g, '-')}-text-form`;
  const initialPlain = getPlainTextValue(draft, element);
  const initialRichText = getElementRichTextValue(draft, element);
  const elementStyle = getElementStyle(draft, element);

  const [plainText, setPlainText] = useState<string>(initialPlain);
  const [richText, setRichText] = useState<RichTextValue | null>(initialRichText);
  const [fontFamily, setFontFamily] = useState<string>(elementStyle.fontFamily ?? '');
  const [fontSize, setFontSize] = useState<string>(elementStyle.fontSize ?? '');
  const [textColor, setTextColor] = useState<string>(elementStyle.textColor ?? '');
  const [backgroundColor, setBackgroundColor] = useState<string>(elementStyle.backgroundColor ?? '');
  const [fontUploadError, setFontUploadError] = useState<string | null>(null);
  const [uploadingFont, setUploadingFont] = useState<boolean>(false);

  useEffect(() => {
    setPlainText(initialPlain);
    setRichText(initialRichText);
    setFontFamily(elementStyle.fontFamily ?? '');
    setFontSize(elementStyle.fontSize ?? '');
    setTextColor(elementStyle.textColor ?? '');
    setBackgroundColor(elementStyle.backgroundColor ?? '');
  }, [initialPlain, initialRichText, elementStyle.fontFamily, elementStyle.fontSize, elementStyle.textColor, elementStyle.backgroundColor]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const sanitizedPlain = plainText;

    onApply(current => {
      setNestedValue(current, element, sanitizedPlain);
      applyElementRichText(current, element, richText);
      applyElementStyleOverrides(current, element, {
        fontFamily,
        fontSize,
        textColor,
        backgroundColor,
      });
      return current;
    });
    onClose();
  };

  const handleFontUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    setFontUploadError(null);
    setUploadingFont(true);
    try {
      const url = await uploadCustomizationAsset(file, { tags: [guessAssetType(file)] });
      const asset = createAssetFromFile(file, url);
      onAssetAdded(asset);
      setFontFamily(asset.name);
    } catch (err) {
      setFontUploadError(
        err instanceof Error ? err.message : 'Impossible de téléverser la police. Réessayez plus tard.',
      );
    } finally {
      setUploadingFont(false);
      event.target.value = '';
    }
  };

  const footer = (
    <>
      <button type="button" onClick={onClose} className="ui-btn-secondary">Annuler</button>
      <button type="submit" form={formId} className="ui-btn-primary">Enregistrer</button>
    </>
  );

  return (
    <EditorPopover
      title={`Personnaliser ${label}`}
      onClose={onClose}
      footer={footer}
      anchor={anchor}
      elementId={element}
    >
      <form id={formId} onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor={`${formId}-plain`} className="block text-sm font-medium text-slate-700">
            Texte de base
          </label>
          <textarea
            id={`${formId}-plain`}
            className="ui-textarea mt-2 w-full"
            value={plainText}
            onChange={event => {
              setPlainText(event.target.value);
              setRichText(null);
            }}
            rows={3}
          />
        </div>
        <div>
          <p className="text-sm font-medium text-slate-700">Mise en forme avancée</p>
          <RichTextEditor
            id={`${formId}-rich`}
            value={richText}
            fallback={plainText}
            onChange={value => {
              setRichText(value);
              if (value) {
                setPlainText(value.plainText);
              }
            }}
            className="mt-2"
            placeholder="Saisissez votre texte..."
          />
          <button
            type="button"
            className="mt-2 text-sm font-medium text-brand-primary hover:text-brand-primary/80"
            onClick={() => setRichText(null)}
          >
            Supprimer la mise en forme personnalisée
          </button>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label htmlFor={`${formId}-font`} className="block text-sm font-medium text-slate-700">
              Police
            </label>
            <input
              id={`${formId}-font`}
              className="ui-input mt-2 w-full"
              value={fontFamily}
              onChange={event => setFontFamily(event.target.value)}
              list={`${formId}-font-options`}
              placeholder="Ex: Poppins"
            />
            <datalist id={`${formId}-font-options`}>
              {fontOptions.map(option => (
                <option key={option} value={option} />
              ))}
            </datalist>
            <div className="mt-2 flex items-center gap-3">
              <label className="ui-btn-secondary relative cursor-pointer">
                <input
                  type="file"
                  accept=".woff,.woff2,.ttf,.otf"
                  className="absolute inset-0 cursor-pointer opacity-0"
                  onChange={handleFontUpload}
                  disabled={uploadingFont}
                />
                <Upload className="mr-2 h-4 w-4" aria-hidden="true" />
                Importer une police
              </label>
              {uploadingFont && <Loader2 className="h-4 w-4 animate-spin text-brand-primary" aria-hidden="true" />}
            </div>
            {fontUploadError && <p className="mt-2 text-sm text-amber-600">{fontUploadError}</p>}
          </div>
          <div>
            <label htmlFor={`${formId}-size`} className="block text-sm font-medium text-slate-700">
              Taille du texte
            </label>
            <input
              id={`${formId}-size`}
              className="ui-input mt-2 w-full"
              value={fontSize}
              onChange={event => setFontSize(event.target.value)}
              list={`${formId}-size-options`}
              placeholder="Ex: 18px"
            />
            <datalist id={`${formId}-size-options`}>
              {FONT_SIZE_SUGGESTIONS.map(size => (
                <option key={size} value={size} />
              ))}
            </datalist>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label htmlFor={`${formId}-text-color`} className="block text-sm font-medium text-slate-700">
              Couleur du texte
            </label>
            <div className="mt-2 flex items-center gap-3">
              <input
                id={`${formId}-text-color`}
                className="ui-input w-full"
                value={textColor}
                onChange={event => setTextColor(event.target.value)}
                placeholder="Ex: #0f172a"
              />
              <input
                type="color"
                className="h-10 w-10 rounded border border-slate-200"
                value={textColor || '#000000'}
                onChange={event => setTextColor(event.target.value)}
                aria-label="Choisir la couleur du texte"
              />
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {COLOR_SUGGESTIONS.map(color => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setTextColor(color)}
                  className="h-8 w-8 rounded-full border border-slate-200"
                  style={{ backgroundColor: color === 'transparent' ? '#ffffff' : color }}
                  title={color}
                />
              ))}
            </div>
          </div>
          <div>
            <label htmlFor={`${formId}-bg-color`} className="block text-sm font-medium text-slate-700">
              Couleur de fond
            </label>
            <div className="mt-2 flex items-center gap-3">
              <input
                id={`${formId}-bg-color`}
                className="ui-input w-full"
                value={backgroundColor}
                onChange={event => setBackgroundColor(event.target.value)}
                placeholder="Ex: rgba(255,255,255,0.8)"
              />
              <input
                type="color"
                className="h-10 w-10 rounded border border-slate-200"
                value={backgroundColor || '#ffffff'}
                onChange={event => setBackgroundColor(event.target.value)}
                aria-label="Choisir la couleur d'arrière-plan"
              />
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between border-t border-slate-200 pt-4">
          <p className="text-sm text-slate-500">Laissez un champ vide pour hériter du style par défaut.</p>
          <button
            type="button"
            className="text-sm font-medium text-brand-primary hover:text-brand-primary/80"
            onClick={() => {
              setFontFamily('');
              setFontSize('');
              setTextColor('');
              setBackgroundColor('');
            }}
          >
            Réinitialiser le style
          </button>
        </div>
      </form>
    </EditorPopover>
  );
};

interface ImageElementEditorProps {
  element: EditableElementKey;
  label: string;
  draft: SiteContent;
  onApply: (updater: DraftUpdater) => void;
  onClose: () => void;
  onAssetAdded: (asset: CustomizationAsset) => void;
  anchor: AnchorRect | null;
}

const ImageElementEditor: React.FC<ImageElementEditorProps> = ({
  element,
  label,
  draft,
  onApply,
  onClose,
  onAssetAdded,
  anchor,
}) => {
  const formId = `${element.replace(/\./g, '-')}-image-form`;
  const initialImage = getImageValue(draft, element) ?? '';
  const [imageUrl, setImageUrl] = useState<string>(initialImage);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);

  useEffect(() => {
    setImageUrl(initialImage);
  }, [initialImage]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = imageUrl.trim();
    const normalized = normalizeCloudinaryImageUrl(trimmed) ?? (trimmed.length > 0 ? trimmed : null);

    onApply(current => {
      setNestedValue(current, element, normalized);
      return current;
    });
    onClose();
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    setError(null);
    setUploading(true);
    try {
      const url = await uploadCustomizationAsset(file, { tags: [guessAssetType(file)] });
      const asset = createAssetFromFile(file, url);
      onAssetAdded(asset);
      setImageUrl(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Téléversement impossible. Vérifiez votre connexion.");
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const footer = (
    <>
      <button type="button" onClick={onClose} className="ui-btn-secondary">Annuler</button>
      <button type="submit" form={formId} className="ui-btn-primary">Enregistrer</button>
    </>
  );

  const previewUrl = imageUrl.trim();

  return (
    <EditorPopover
      title={`Personnaliser ${label}`}
      onClose={onClose}
      footer={footer}
      anchor={anchor}
      elementId={element}
    >
      <form id={formId} onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor={`${formId}-input`} className="block text-sm font-medium text-slate-700">
            URL de l'image
          </label>
          <input
            id={`${formId}-input`}
            className="ui-input mt-2 w-full"
            value={imageUrl}
            onChange={event => setImageUrl(event.target.value)}
            placeholder="https://..."
          />
          <p className="mt-2 text-xs text-slate-500">
            Fournissez une URL Cloudinary ou téléversez un fichier pour l'ajouter automatiquement.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="ui-btn-secondary relative cursor-pointer">
            <input
              type="file"
              accept="image/*,video/*,audio/*,.ttf,.otf,.woff,.woff2"
              className="absolute inset-0 cursor-pointer opacity-0"
              onChange={handleUpload}
              disabled={uploading}
            />
            <Upload className="mr-2 h-4 w-4" aria-hidden="true" />
            Importer un média
          </label>
          {uploading && <Loader2 className="h-4 w-4 animate-spin text-brand-primary" aria-hidden="true" />}
          <button
            type="button"
            onClick={() => setImageUrl('')}
            className="text-sm font-medium text-brand-primary hover:text-brand-primary/80"
          >
            Supprimer le média
          </button>
        </div>
        {error && (
          <div className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
            <AlertTriangle className="mt-0.5 h-4 w-4" aria-hidden="true" />
            <p>{error}</p>
          </div>
        )}
        {previewUrl && (
          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <img src={previewUrl} alt="Aperçu" className="h-56 w-full object-cover" />
          </div>
        )}
      </form>
    </EditorPopover>
  );
};

interface BackgroundElementEditorProps {
  element: EditableElementKey;
  label: string;
  draft: SiteContent;
  onApply: (updater: DraftUpdater) => void;
  onClose: () => void;
  onAssetAdded: (asset: CustomizationAsset) => void;
  anchor: AnchorRect | null;
}

const BackgroundElementEditor: React.FC<BackgroundElementEditorProps> = ({
  element,
  label,
  draft,
  onApply,
  onClose,
  onAssetAdded,
  anchor,
}) => {
  const formId = `${element.replace(/\./g, '-')}-background-form`;
  const background = getSectionBackground(draft, element);
  const [backgroundType, setBackgroundType] = useState<SectionStyle['background']['type']>(background.type);
  const [color, setColor] = useState<string>(background.color);
  const [imageUrl, setImageUrl] = useState<string>(background.image ?? '');
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);

  useEffect(() => {
    setBackgroundType(background.type);
    setColor(background.color);
    setImageUrl(background.image ?? '');
  }, [background.type, background.color, background.image]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedColor = color.trim() || 'transparent';
    const trimmedImage = imageUrl.trim();
    const normalizedImage = normalizeCloudinaryImageUrl(trimmedImage) ?? (trimmedImage.length > 0 ? trimmedImage : null);

    onApply(current => {
      applySectionBackground(current, element, {
        type: backgroundType,
        color: trimmedColor,
        image: backgroundType === 'image' ? normalizedImage : null,
      });
      return current;
    });
    onClose();
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    setError(null);
    setUploading(true);
    try {
      const url = await uploadCustomizationAsset(file, { tags: [guessAssetType(file)] });
      const asset = createAssetFromFile(file, url);
      onAssetAdded(asset);
      setImageUrl(url);
      setBackgroundType('image');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Téléversement impossible.');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const footer = (
    <>
      <button type="button" onClick={onClose} className="ui-btn-secondary">Annuler</button>
      <button type="submit" form={formId} className="ui-btn-primary">Enregistrer</button>
    </>
  );

  const previewUrl = imageUrl.trim();

  return (
    <EditorPopover
      title={`Personnaliser ${label}`}
      onClose={onClose}
      footer={footer}
      anchor={anchor}
      elementId={element}
    >
      <form id={formId} onSubmit={handleSubmit} className="space-y-6">
        <div className="flex gap-3">
          <button
            type="button"
            className={`ui-btn-secondary flex-1 ${backgroundType === 'color' ? 'ring-2 ring-brand-primary' : ''}`}
            onClick={() => setBackgroundType('color')}
          >
            Couleur
          </button>
          <button
            type="button"
            className={`ui-btn-secondary flex-1 ${backgroundType === 'image' ? 'ring-2 ring-brand-primary' : ''}`}
            onClick={() => setBackgroundType('image')}
          >
            Image
          </button>
        </div>
        <div>
          <label htmlFor={`${formId}-color`} className="block text-sm font-medium text-slate-700">
            Couleur
          </label>
          <div className="mt-2 flex items-center gap-3">
            <input
              id={`${formId}-color`}
              className="ui-input w-full"
              value={color}
              onChange={event => setColor(event.target.value)}
              placeholder="Ex: rgba(15,23,42,0.75)"
            />
            <input
              type="color"
              className="h-10 w-10 rounded border border-slate-200"
              value={color || '#ffffff'}
              onChange={event => setColor(event.target.value)}
              aria-label="Choisir la couleur d'arrière-plan"
            />
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {COLOR_SUGGESTIONS.map(option => (
              <button
                key={option}
                type="button"
                onClick={() => setColor(option)}
                className="h-8 w-8 rounded-full border border-slate-200"
                style={{ backgroundColor: option === 'transparent' ? '#ffffff' : option }}
                title={option}
              />
            ))}
          </div>
        </div>
        {backgroundType === 'image' && (
          <div className="space-y-4">
            <div>
              <label htmlFor={`${formId}-image`} className="block text-sm font-medium text-slate-700">
                URL de l'image
              </label>
              <input
                id={`${formId}-image`}
                className="ui-input mt-2 w-full"
                value={imageUrl}
                onChange={event => setImageUrl(event.target.value)}
                placeholder="https://..."
              />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <label className="ui-btn-secondary relative cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  className="absolute inset-0 cursor-pointer opacity-0"
                  onChange={handleUpload}
                  disabled={uploading}
                />
                <Upload className="mr-2 h-4 w-4" aria-hidden="true" />
                Importer une image
              </label>
              {uploading && <Loader2 className="h-4 w-4 animate-spin text-brand-primary" aria-hidden="true" />}
              <button
                type="button"
                onClick={() => setImageUrl('')}
                className="text-sm font-medium text-brand-primary hover:text-brand-primary/80"
              >
                Retirer l'image
              </button>
            </div>
            {error && (
              <div className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
                <AlertTriangle className="mt-0.5 h-4 w-4" aria-hidden="true" />
                <p>{error}</p>
              </div>
            )}
            {previewUrl && (
              <div className="overflow-hidden rounded-2xl border border-slate-200">
                <img src={previewUrl} alt="Aperçu" className="h-48 w-full object-cover" />
              </div>
            )}
          </div>
        )}
      </form>
    </EditorPopover>
  );
};

const SiteCustomization: React.FC = () => {
  const { content, loading, error, updateContent } = useSiteContent();
  const [draft, setDraft] = useState<SiteContent | null>(() =>
    content ? cloneSiteContent(content) : null,
  );
  const [activeElement, setActiveElement] = useState<EditableElementKey | null>(null);
  const [activeZone, setActiveZone] = useState<EditableZoneKey | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('custom');
  const [activeAnchor, setActiveAnchor] = useState<AnchorRect | null>(null);
  const [saving, setSaving] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [bestSellerProducts, setBestSellerProducts] = useState<Product[]>([]);
  const [bestSellerLoading, setBestSellerLoading] = useState<boolean>(false);
  const [bestSellerError, setBestSellerError] = useState<string | null>(null);

  useEffect(() => {
    if (content) {
      setDraft(cloneSiteContent(content));
    }
  }, [content]);

  useEffect(() => {
    let mounted = true;
    const fetchBestSellers = async () => {
      setBestSellerLoading(true);
      setBestSellerError(null);
      try {
        const products = await api.getBestSellerProducts();
        if (mounted) {
          setBestSellerProducts(products);
        }
      } catch (err) {
        if (mounted) {
          setBestSellerError(
            err instanceof Error
              ? err.message
              : 'Impossible de charger les produits mis en avant.',
          );
        }
      } finally {
        if (mounted) {
          setBestSellerLoading(false);
        }
      }
    };

    void fetchBestSellers();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!saveSuccess) {
      return;
    }
    const timeout = setTimeout(() => setSaveSuccess(null), 4000);
    return () => clearTimeout(timeout);
  }, [saveSuccess]);

  const applyDraftUpdate = useCallback(
    (updater: DraftUpdater) => {
      setDraft(prev => {
        if (!prev) {
          return prev;
        }
        const clone = cloneSiteContent(prev);
        return updater(clone);
      });
    },
    [],
  );

  const appendAssetToDraft = useCallback((asset: CustomizationAsset) => {
    setDraft(prev => {
      if (!prev) {
        return prev;
      }
      const clone = cloneSiteContent(prev);
      appendAsset(clone, asset);
      return clone;
    });
  }, []);

  const handleEdit = useCallback(
    (
      element: EditableElementKey,
      meta: { zone: EditableZoneKey; anchor: DOMRect | DOMRectReadOnly | null },
    ) => {
      setActiveElement(element);
      setActiveZone(meta.zone);
      setActiveAnchor(cloneAnchorRect(meta.anchor));
    },
    [],
  );

  const closeEditor = useCallback(() => {
    setActiveElement(null);
    setActiveZone(null);
    setActiveAnchor(null);
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(null);
    try {
      if (!draft) {
        throw new Error('Le brouillon est indisponible.');
      }
      const updated = await updateContent(draft);
      setDraft(updated);
      setSaveSuccess('Modifications enregistrées avec succès.');
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : 'Une erreur est survenue lors de la sauvegarde.',
      );
    } finally {
      setSaving(false);
    }
  };

  const fontOptions = useMemo(() => {
    const base = Array.from(FONT_FAMILY_SUGGESTIONS);
    if (!draft) {
      return base;
    }
    const custom = draft.assets.library
      .filter(asset => asset.type === 'font')
      .map(asset => sanitizeFontFamilyName(asset.name));
    return Array.from(new Set([...base, ...custom]));
  }, [draft]);

  const activeLabel = activeElement ? ELEMENT_LABELS[activeElement] ?? activeElement : null;
  const elementType = activeElement
    ? BACKGROUND_ELEMENT_KEYS.has(activeElement)
      ? 'background'
      : IMAGE_ELEMENT_KEYS.has(activeElement)
      ? 'image'
      : TEXT_ELEMENT_KEYS.has(activeElement)
      ? 'text'
      : 'text'
    : null;

  if (loading) {
    return (
      <div className="flex h-full min-h-[60vh] flex-col items-center justify-center gap-3">
        <Loader2 className="h-10 w-10 animate-spin text-brand-primary" aria-hidden="true" />
        <p className="text-sm text-slate-500">Chargement du contenu du site…</p>
      </div>
    );
  }

  if (!content || !draft) {
    return (
      <div className="flex h-full min-h-[60vh] flex-col items-center justify-center gap-3">
        <AlertTriangle className="h-6 w-6 text-amber-500" aria-hidden="true" />
        <p className="text-sm text-slate-500">Le contenu du site est en cours d'initialisation…</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 px-4 sm:px-6 lg:px-0">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Site public</h1>
          <p className="text-sm text-slate-500">
            Cliquez sur l'icône en forme de crayon pour personnaliser chaque bloc de contenu, image ou logo.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {saveSuccess && (
            <div className="flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-sm text-emerald-700">
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              {saveSuccess}
            </div>
          )}
          {saveError && (
            <div className="flex items-center gap-2 rounded-full bg-amber-50 px-4 py-2 text-sm text-amber-700">
              <AlertTriangle className="h-4 w-4" aria-hidden="true" />
              {saveError}
            </div>
          )}
          <button
            type="button"
            onClick={handleSave}
            className="ui-btn-primary"
            disabled={saving}
          >
            {saving ? 'Enregistrement…' : 'Enregistrer les modifications'}
          </button>
        </div>
      </header>

      {error && (
        <div className="flex items-start gap-3 rounded-3xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
          <AlertTriangle className="h-5 w-5" aria-hidden="true" />
          <div>
            <p>{error}</p>
            <p className="mt-1">Les valeurs affichées correspondent à la configuration par défaut.</p>
          </div>
        </div>
      )}

      <nav className="flex w-full items-center gap-2 overflow-x-auto rounded-full bg-slate-100 p-1">
        {TABS.map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 rounded-full px-4 py-2 text-sm font-medium transition ${
              activeTab === tab.id
                ? 'bg-white text-slate-900 shadow'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <div>
        {activeTab === 'preview' ? (
          <div className="mx-auto w-full max-w-6xl">
            <div className="rounded-[2.5rem] border border-slate-200 bg-slate-50 p-6">
              <SitePreviewCanvas
                content={draft}
                bestSellerProducts={bestSellerProducts}
                onEdit={() => undefined}
                activeZone={null}
                showEditButtons={false}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {bestSellerError && (
              <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
                <AlertTriangle className="h-5 w-5" aria-hidden="true" />
                <p>{bestSellerError}</p>
              </div>
            )}
            <div className="mx-auto w-full max-w-6xl">
              <SitePreviewCanvas
                content={draft}
                bestSellerProducts={bestSellerProducts}
                onEdit={(element, meta) => handleEdit(element, meta)}
                activeZone={activeZone}
              />
            </div>
            {bestSellerLoading && (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Chargement des produits populaires…
              </div>
            )}
          </div>
        )}
      </div>

      {activeElement && elementType === 'text' && activeLabel && (
        <TextElementEditor
          element={activeElement}
          label={activeLabel}
          draft={draft}
          onApply={applyDraftUpdate}
          onClose={closeEditor}
          fontOptions={fontOptions}
          onAssetAdded={appendAssetToDraft}
          anchor={activeAnchor}
        />
      )}

      {activeElement && elementType === 'image' && activeLabel && (
        <ImageElementEditor
          element={activeElement}
          label={activeLabel}
          draft={draft}
          onApply={applyDraftUpdate}
          onClose={closeEditor}
          onAssetAdded={appendAssetToDraft}
          anchor={activeAnchor}
        />
      )}

      {activeElement && elementType === 'background' && activeLabel && (
        <BackgroundElementEditor
          element={activeElement}
          label={activeLabel}
          draft={draft}
          onApply={applyDraftUpdate}
          onClose={closeEditor}
          onAssetAdded={appendAssetToDraft}
          anchor={activeAnchor}
        />
      )}
    </div>
  );
};

export default SiteCustomization;
