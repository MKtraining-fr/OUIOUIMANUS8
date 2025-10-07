const env = import.meta.env as Record<string, string | undefined>;

const CLOUDINARY_API_BASE = 'https://api.cloudinary.com/v1_1';
const CLOUDINARY_HOST_SUFFIX = 'cloudinary.com';

const removeDiacritics = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .normalize('NFC');

const slugify = (value: string): string =>
  removeDiacritics(value)
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '');

const generateSuffix = (): string =>
  Math.random().toString(36).slice(2, 10);

const sanitizeSegment = (value: string | undefined, fallback: string): string => {
  if (!value) {
    return fallback;
  }
  const slug = slugify(value);
  return slug || fallback;
};

const getEnv = (key: string): string | undefined => {
  const raw = env[key];
  if (typeof raw !== 'string') {
    return undefined;
  }

  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};


const ensureEnv = (key: string, context: string): string => {
  const value = getEnv(key);
  if (!value) {
    throw new Error(
      `Configuration Cloudinary manquante: définissez la variable d'environnement ${key} pour ${context}.`,
    );
  }
  return value;
};

type CloudinaryUploadOptions = {
  folder?: string;
  uploadPreset?: string;
  publicId?: string;
  tags?: string[];
};

type CloudinaryUploadResponse = {
  secure_url?: string;
  url?: string;
  error?: { message: string };
};

const uploadToCloudinary = async (
  file: File | Blob,
  { folder, uploadPreset, publicId, tags }: CloudinaryUploadOptions,
): Promise<string> => {
  const cloudName = ensureEnv('VITE_CLOUDINARY_CLOUD_NAME', 'les téléversements de médias');
  const preset = uploadPreset ?? ensureEnv('VITE_CLOUDINARY_UPLOAD_PRESET', 'les téléversements de médias');
  const presetName = preset;

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', preset);

  if (folder) {
    formData.append('folder', folder);
  }

  if (publicId) {
    formData.append('public_id', publicId);
  }

  if (tags?.length) {
    formData.append('tags', tags.join(','));
  }

  const response = await fetch(`${CLOUDINARY_API_BASE}/${cloudName}/auto/upload`, {
    method: 'POST',
    body: formData,
  });

  const payload = (await response.json()) as CloudinaryUploadResponse;

  if (!response.ok || payload.error) {
    const cloudinaryMessage = payload.error?.message;

    if (cloudinaryMessage && /upload preset/i.test(cloudinaryMessage)) {
      throw new Error(
        `Le preset Cloudinary "${presetName}" est introuvable ou ne permet pas les téléversements non signés. ` +
          'Vérifiez sa configuration dans votre console Cloudinary (Settings → Upload → Upload presets).',
      );
    }

    throw new Error(cloudinaryMessage ?? `Échec du téléversement Cloudinary (statut ${response.status}).`);
  }

  if (!payload.secure_url && !payload.url) {
    throw new Error("Cloudinary n'a pas renvoyé d'URL sécurisée pour le fichier téléversé.");
  }

  return payload.secure_url ?? payload.url!;
};

export const normalizeCloudinaryImageUrl = (image?: string | null): string | null => {
  const trimmed = image?.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const url = new URL(trimmed);
    if (url.protocol !== 'https:') {
      return null;
    }

    if (!url.hostname.endsWith(CLOUDINARY_HOST_SUFFIX)) {
      return null;
    }

    return trimmed;
  } catch {
    return null;
  }
};

const defaultProductImage = getEnv('VITE_CLOUDINARY_DEFAULT_PRODUCT_IMAGE') ?? '';

export const DEFAULT_PRODUCT_IMAGE = defaultProductImage;

export const resolveProductImageUrl = (image?: string | null): string => {
  const normalized = normalizeCloudinaryImageUrl(image);
  if (normalized) {
    return normalized;
  }
  if (DEFAULT_PRODUCT_IMAGE) {
    return DEFAULT_PRODUCT_IMAGE;
  }
  return '';
};

export const uploadProductImage = async (
  file: File | Blob,
  productName?: string,
): Promise<string> => {
  const folder = getEnv('VITE_CLOUDINARY_PRODUCTS_FOLDER') ?? 'products';
  const preset =
    getEnv('VITE_CLOUDINARY_UPLOAD_PRESET_PRODUCTS') ??
    getEnv('VITE_CLOUDINARY_UPLOAD_PRESET');
  const publicIdBase = productName ? slugify(productName) : undefined;
  const publicId = publicIdBase ? `${publicIdBase}-${generateSuffix()}` : undefined;

  return uploadToCloudinary(file, {
    folder: sanitizeSegment(folder, 'products'),
    uploadPreset: preset,
    publicId,
    tags: ['product'],
  });
};

const resolveCustomizationFolder = (): string =>
  sanitizeSegment(getEnv('VITE_CLOUDINARY_CUSTOM_FOLDER') ?? 'Custom', 'Custom');

type CustomizationAssetOptions = {
  tags?: string[];
  publicId?: string;
};

export const uploadCustomizationAsset = async (
  file: File | Blob,
  options?: CustomizationAssetOptions,
): Promise<string> => {
  const folder = resolveCustomizationFolder();
  const preset = getEnv('VITE_CLOUDINARY_UPLOAD_PRESET_CUSTOM') ?? getEnv('VITE_CLOUDINARY_UPLOAD_PRESET');
  const baseName =
    options?.publicId ?? (file instanceof File && file.name ? slugify(file.name.replace(/\.[^/.]+$/, '')) : undefined);
  const publicId = baseName ? `${baseName}-${generateSuffix()}` : undefined;
  const tags = Array.from(new Set(['customization', 'custom-folder', ...(options?.tags ?? [])]));

  return uploadToCloudinary(file, {
    folder,
    uploadPreset: preset,
    publicId,
    tags,
  });
};

export type ReceiptUploadOptions = {
  orderId?: string;
  customerReference?: string;
};

export const uploadPaymentReceipt = async (
  file: File | Blob,
  options?: ReceiptUploadOptions,
): Promise<string> => {
  const folder = getEnv('VITE_CLOUDINARY_RECEIPTS_FOLDER') ?? 'receipts';
  const preset =
    getEnv('VITE_CLOUDINARY_UPLOAD_PRESET_RECEIPTS') ??
    getEnv('VITE_CLOUDINARY_UPLOAD_PRESET');

  const segments: string[] = [sanitizeSegment(folder, 'receipts')];
  if (options?.orderId) {
    segments.push(`order-${sanitizeSegment(options.orderId, 'commande')}`);
  } else if (options?.customerReference) {
    segments.push(`customer-${sanitizeSegment(options.customerReference, 'client')}`);
  }

  return uploadToCloudinary(file, {
    folder: segments.join('/'),
    uploadPreset: preset,
    tags: ['payment', 'receipt'],
  });
};
