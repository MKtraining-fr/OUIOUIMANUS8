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
import { 
  AlertTriangle, 
  CheckCircle2, 
  Loader2, 
  Upload, 
  X, 
  Search, 
  Palette, 
  History, 
  Eye, 
  Settings,
  ChevronDown,
  ChevronUp,
  Filter,
  Save,
  Undo,
  Redo,
  Copy,
  Download,
  RefreshCw
} from 'lucide-react';
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

const EXTENDED_COLOR_PALETTE = {
  neutrals: ['#ffffff', '#f8fafc', '#f1f5f9', '#e2e8f0', '#cbd5e1', '#94a3b8', '#64748b', '#475569', '#334155', '#1e293b', '#0f172a'],
  blues: ['#eff6ff', '#dbeafe', '#bfdbfe', '#93c5fd', '#60a5fa', '#3b82f6', '#2563eb', '#1d4ed8', '#1e40af', '#1e3a8a'],
  reds: ['#fef2f2', '#fecaca', '#fca5a5', '#f87171', '#ef4444', '#dc2626', '#b91c1c', '#991b1b', '#7f1d1d'],
  greens: ['#f0fdf4', '#dcfce7', '#bbf7d0', '#86efac', '#4ade80', '#22c55e', '#16a34a', '#15803d', '#166534'],
  yellows: ['#fefce8', '#fef3c7', '#fde68a', '#fcd34d', '#fbbf24', '#f59e0b', '#d97706', '#b45309', '#92400e'],
  oranges: ['#fff7ed', '#fed7aa', '#fdba74', '#fb923c', '#f97316', '#ea580c', '#dc2626', '#c2410c', '#9a3412'],
  purples: ['#faf5ff', '#f3e8ff', '#e9d5ff', '#d8b4fe', '#c084fc', '#a855f7', '#9333ea', '#7c3aed', '#6b21a8'],
  pinks: ['#fdf2f8', '#fce7f3', '#fbcfe8', '#f9a8d4', '#f472b6', '#ec4899', '#db2777', '#be185d', '#9d174d']
} as const;

const BRAND_COLORS = [
  '#F9A826', // brand-primary
  '#DD8C00', // brand-primary-dark  
  '#2D2D2D', // brand-secondary
  '#E63946', // brand-accent
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
  { id: 'preview', label: 'Aperçu', icon: Eye },
  { id: 'custom', label: 'Personnalisation', icon: Settings },
  { id: 'themes', label: 'Thèmes', icon: Palette },
  { id: 'history', label: 'Historique', icon: History },
] as const;

type TabId = (typeof TABS)[number]['id'];

// Thèmes prédéfinis
const PREDEFINED_THEMES = [
  {
    id: 'modern',
    name: 'Moderne',
    description: 'Design épuré et contemporain',
    preview: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    colors: {
      primary: '#667eea',
      secondary: '#764ba2',
      background: '#f8fafc',
      text: '#1e293b',
    },
  },
  {
    id: 'warm',
    name: 'Chaleureux',
    description: 'Couleurs chaudes et accueillantes',
    preview: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    colors: {
      primary: '#f093fb',
      secondary: '#f5576c',
      background: '#fef7f0',
      text: '#7c2d12',
    },
  },
  {
    id: 'nature',
    name: 'Nature',
    description: 'Inspiré de la nature et du bio',
    preview: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
    colors: {
      primary: '#11998e',
      secondary: '#38ef7d',
      background: '#f0fdf4',
      text: '#14532d',
    },
  },
  {
    id: 'elegant',
    name: 'Élégant',
    description: 'Sophistication et luxe',
    preview: 'linear-gradient(135deg, #2c3e50 0%, #34495e 100%)',
    colors: {
      primary: '#2c3e50',
      secondary: '#34495e',
      background: '#f8fafc',
      text: '#1e293b',
    },
  },
] as const;

// Historique des modifications
interface ModificationHistory {
  id: string;
  timestamp: Date;
  description: string;
  content: SiteContent;
  type: 'manual' | 'theme' | 'reset';
}

// États de l'interface
interface UIState {
  searchQuery: string;
  selectedSection: EditableZoneKey | null;
  showAdvancedOptions: boolean;
  autoSave: boolean;
  previewMode: 'desktop' | 'tablet' | 'mobile';
}

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
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

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

  // Gestion du glisser-déposer
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget || (e.target as HTMLElement).closest('[data-draggable]')) {
      setIsDragging(true);
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        setDragOffset({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        });
      }
    }
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging && containerRef.current) {
      const newPosition = {
        top: e.clientY - dragOffset.y,
        left: e.clientX - dragOffset.x,
      };
      setPosition(newPosition);
    }
  }, [isDragging, dragOffset]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
    return () => {};
  }, [isDragging, handleMouseMove, handleMouseUp]);

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
        className={`customization-popover pointer-events-auto flex w-[min(90vw,32rem)] flex-col overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-slate-200 ${
          isDragging ? 'cursor-grabbing' : 'cursor-grab'
        }`}
        style={{ 
          position: 'absolute', 
          top: position.top, 
          left: position.left, 
          opacity: isPositioned ? 1 : 0,
          transform: isDragging ? 'scale(1.02)' : 'scale(1)',
          transition: isDragging ? 'none' : 'all 0.2s ease',
        }}
        onMouseDown={handleMouseDown}
      >
        <div 
          className="flex items-center justify-between border-b border-slate-200 px-6 py-4 cursor-grab"
          data-draggable
        >
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-gray-300 rounded-full" />
            <div className="w-2 h-2 bg-gray-300 rounded-full" />
            <div className="w-2 h-2 bg-gray-300 rounded-full" />
          </div>
          <h2 id={headingId} className="text-lg font-semibold text-slate-900 flex-1 text-center">
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

// Le reste du fichier reste inchangé...

const SiteCustomization: React.FC = () => {
  // Implémentation du composant principal...
  return <div>Contenu de la page de personnalisation</div>;
};

export default SiteCustomization;
