export interface Role {
  id: string;
  name: string;
  pin?: string;
  homePage?: string;
  permissions: {
    [key: string]: 'editor' | 'readonly' | 'none';
  };
}

export interface SectionBackgroundStyle {
  type: 'color' | 'image';
  color: string;
  image: string | null;
}

export interface SectionStyle {
  background: SectionBackgroundStyle;
  fontFamily: string;
  fontSize: string;
  textColor: string;
}

export const INSTAGRAM_REVIEW_IDS = [
  'review1',
  'review2',
  'review3',
  'review4',
  'review5',
  'review6',
  'review7',
] as const;

export type InstagramReviewId = (typeof INSTAGRAM_REVIEW_IDS)[number];

export const INSTAGRAM_REVIEW_TEXT_FIELDS = [
  'name',
  'handle',
  'timeAgo',
  'message',
  'highlight',
  'highlightCaption',
  'location',
  'badgeLabel',
  'postImageAlt',
] as const;

export const INSTAGRAM_REVIEW_IMAGE_FIELDS = ['avatarUrl', 'highlightImageUrl', 'postImageUrl'] as const;

export type InstagramReviewTextField = (typeof INSTAGRAM_REVIEW_TEXT_FIELDS)[number];
export type InstagramReviewImageField = (typeof INSTAGRAM_REVIEW_IMAGE_FIELDS)[number];
export type InstagramReviewField = InstagramReviewTextField | InstagramReviewImageField;

export type InstagramReviewElementKey<
  Field extends InstagramReviewField = InstagramReviewField,
> = `instagramReviews.reviews.${InstagramReviewId}.${Field}`;

export const EDITABLE_ZONE_KEYS = ['navigation', 'hero', 'about', 'menu', 'instagramReviews', 'findUs', 'footer'] as const;

export type EditableZoneKey = (typeof EDITABLE_ZONE_KEYS)[number];

const BASE_EDITABLE_ELEMENT_KEYS = [
  'navigation.brand',
  'navigation.brandLogo',
  'navigation.staffLogo',
  'navigation.links.home',
  'navigation.links.about',
  'navigation.links.menu',
  'navigation.links.contact',
  'navigation.links.loginCta',
  'navigation.style.background',
  'hero.title',
  'hero.subtitle',
  'hero.ctaLabel',
  'hero.historyTitle',
  'hero.reorderCtaLabel',
  'hero.backgroundImage',
  'about.title',
  'about.description',
  'about.image',
  'about.style.background',
  'menu.title',
  'menu.ctaLabel',
  'menu.loadingLabel',
  'menu.image',
  'menu.style.background',
  'instagramReviews.title',
  'instagramReviews.subtitle',
  'instagramReviews.image',
  'instagramReviews.style.background',
  'findUs.title',
  'findUs.addressLabel',
  'findUs.address',
  'findUs.cityLabel',
  'findUs.city',
  'findUs.hoursLabel',
  'findUs.hours',
  'findUs.mapLabel',
  'findUs.style.background',
  'footer.text',
  'footer.style.background',
] as const;

const INSTAGRAM_REVIEW_FIELDS = [
  ...INSTAGRAM_REVIEW_TEXT_FIELDS,
  ...INSTAGRAM_REVIEW_IMAGE_FIELDS,
] as readonly InstagramReviewField[];

const INSTAGRAM_REVIEW_ELEMENT_KEYS = INSTAGRAM_REVIEW_IDS.flatMap(id =>
  INSTAGRAM_REVIEW_FIELDS.map(
    field => `instagramReviews.reviews.${id}.${field}` as InstagramReviewElementKey,
  ),
) as readonly InstagramReviewElementKey[];

export const EDITABLE_ELEMENT_KEYS = [
  ...BASE_EDITABLE_ELEMENT_KEYS,
  ...INSTAGRAM_REVIEW_ELEMENT_KEYS,
] as const;

export type EditableElementKey = (typeof EDITABLE_ELEMENT_KEYS)[number];

export const STYLE_EDITABLE_ELEMENT_KEYS = EDITABLE_ELEMENT_KEYS.filter(
  key =>
    !key.endsWith('.style.background') &&
    !key.endsWith('.image') &&
    !key.endsWith('.avatarUrl') &&
    !key.endsWith('.highlightImageUrl') &&
    !key.endsWith('.postImageUrl') &&
    key !== 'hero.backgroundImage' &&
    key !== 'navigation.brandLogo' &&
    key !== 'navigation.staffLogo',
) as EditableElementKey[];

export interface ElementStyle {
  fontFamily?: string;
  fontSize?: string;
  textColor?: string;
  backgroundColor?: string;
}

export type ElementStyles = Partial<Record<EditableElementKey, ElementStyle>>;

export type RichTextMark = 'bold' | 'italic' | 'strikethrough';

export interface RichTextValue {
  html: string;
  plainText: string;
}

export type ElementRichText = Partial<Record<EditableElementKey, RichTextValue>>;

export type CustomizationAssetType = 'image' | 'video' | 'audio' | 'font' | 'raw';

export interface CustomizationAsset {
  id: string;
  name: string;
  url: string;
  format: string;
  bytes: number;
  type: CustomizationAssetType;
  createdAt: string;
}

export interface SiteAssets {
  library: CustomizationAsset[];
}

export interface SiteContent {
  navigation: {
    brand: string;
    brandLogo: string | null;
    staffLogo: string | null;
    links: {
      home: string;
      about: string;
      menu: string;
      contact: string;
      loginCta: string;
    };
    style: SectionStyle;
  };
  hero: {
    title: string;
    subtitle: string;
    ctaLabel: string;
    backgroundImage: string | null;
    historyTitle: string;
    reorderCtaLabel: string;
    style: SectionStyle;
  };
  about: {
    title: string;
    description: string;
    image: string | null;
    style: SectionStyle;
  };
  menu: {
    title: string;
    ctaLabel: string;
    loadingLabel: string;
    image: string | null;
    style: SectionStyle;
  };
  instagramReviews: {
    title: string;
    subtitle: string;
    image: string | null;
    style: SectionStyle;
    reviews: Record<InstagramReviewId, InstagramReview>;
  };
  findUs: {
    title: string;
    addressLabel: string;
    address: string;
    cityLabel: string;
    city: string;
    hoursLabel: string;
    hours: string;
    mapLabel: string;
    mapUrl: string;
    style: SectionStyle;
  };
  footer: {
    text: string;
    style: SectionStyle;
  };
  whatsappNumber?: string;
  elementStyles: ElementStyles;
  elementRichText: ElementRichText;
  assets: SiteAssets;
}

export interface InstagramReview {
  name: string;
  handle: string;
  timeAgo: string;
  message: string;
  highlight: string;
  highlightCaption: string;
  location: string;
  badgeLabel: string;
  postImageAlt: string;
  avatarUrl: string | null;
  highlightImageUrl: string | null;
  postImageUrl: string | null;
}

export interface Ingredient {
  id: string;
  nom: string;
  unite: 'kg' | 'g' | 'L' | 'ml' | 'unite';
  stock_minimum: number;
  stock_actuel: number;
  prix_unitaire: number; // Prix moyen pondéré
}

export interface RecipeItem {
  ingredient_id: string;
  qte_utilisee: number; // en 'g', 'ml', ou 'unite' selon l'ingrédient
}

export interface Product {
  id: string;
  nom_produit: string;
  description?: string;
  prix_vente: number;
  categoria_id: string;
  estado: 'disponible' | 'agotado_temporal' | 'agotado_indefinido' | 'archive';
  image: string; // URL from Cloud Storage
  recipe: RecipeItem[];
  cout_revient?: number;
  is_best_seller: boolean;
  best_seller_rank: number | null;
}

export interface Category {
  id: string;
  nom: string;
}

export type TableStatus = 'libre' | 'en_cuisine' | 'para_entregar' | 'para_pagar';

export interface Table {
  id: string;
  nom: string;
  capacite: number;
  statut: 'libre' | 'en_cuisine' | 'para_entregar' | 'para_pagar';
  commandeId?: string;
  couverts?: number;
  estado_cocina?: Order['estado_cocina'];
  date_envoi_cuisine?: number;
  readyOrdersCount?: number;
}

export interface OrderItem {
  id: string;
  produitRef: string; // Product ID
  nom_produit: string; // Denormalized for display
  prix_unitaire: number; // Denormalized for display
  quantite: number;
  excluded_ingredients: string[]; // Ingredient IDs
  commentaire: string;
  estado: 'en_attente' | 'enviado' | 'annule';
  date_envoi?: number; // timestamp
}

export interface Order {
  id: string;
  type: 'sur_place' | 'a_emporter' | 'pedir_en_linea';
  table_id?: string;
  table_nom?: string;
  couverts: number;
  statut: 'en_cours' | 'finalisee' | 'pendiente_validacion';
  estado_cocina: 'no_enviado' | 'recibido' | 'listo' | 'servido' | 'entregada';
  date_creation: number; // timestamp
  date_envoi_cuisine?: number; // timestamp
  date_listo_cuisine?: number; // timestamp
  date_servido?: number; // timestamp
  payment_status: 'paid' | 'unpaid';
  items: OrderItem[];
  total: number;
  profit?: number;
  payment_method?: 'efectivo' | 'transferencia' | 'tarjeta';
  payment_receipt_url?: string;
  // Champs client aplatis pour correspondre à la DB
  client_name?: string;
  client_phone?: string;
  client_address?: string;
  receipt_url?: string;
  // Champs pour les promotions
  subtotal?: number; // Montant avant réduction
  total_discount?: number; // Montant total des réductions
  promo_code?: string; // Code promo utilisé
  applied_promotions?: {
    promotion_id: string;
    name: string;
    discount_amount: number;
  }[];
  shipping_cost?: number; // Coût de la livraison, utilisé pour les promotions de livraison gratuite
}

export interface KitchenTicket extends Order {
  ticketKey: string;
}

export interface Purchase {
  id: string;
  ingredient_id: string;
  quantite_achetee: number;
  prix_total: number;
  date_achat: number; // timestamp
}

// New types for Dashboard
export interface SalesDataPoint {
    name: string;
    value: number;
}

export type DashboardPeriod = 'week' | 'month';

export interface PeriodSalesChartPoint {
    name: string;
    ventes: number;
    ventesPeriodePrecedente: number;
}

export interface DashboardStats {
    period: DashboardPeriod;
    periodLabel: string;
    periodStart: string;
    periodEnd: string;
    ventesPeriode: number;
    beneficePeriode: number;
    clientsPeriode: number;
    panierMoyen: number;
    tablesOccupees: number;
    clientsActuels: number;
    commandesEnCuisine: number;
    ingredientsStockBas: Ingredient[];
    ventesPeriodeSeries: PeriodSalesChartPoint[];
    ventesParCategorie: SalesDataPoint[];
    recentOrders: Order[];
    bestSellerProducts: Product[];
}

export interface NotificationCounts {
    pendingTakeaway: number;
    readyTakeaway: number;
    kitchenOrders: number;
    lowStockIngredients: number;
    readyForService: number;
}

// New types for Report
export interface SoldProduct {
    id: string;
    name: string;
    quantity: number;
    totalSales: number;
}

export interface SoldProductsByCategory {
    categoryName: string;
    products: SoldProduct[];
}

export interface DailyReport {
    generatedAt: string;
    startDate: string;
    clientsDuJour: number;
    panierMoyen: number;
    ventesDuJour: number;
    soldProducts: SoldProductsByCategory[];
    lowStockIngredients: Ingredient[];
    roleLogins: RoleLogin[];
    roleLoginsUnavailable?: boolean;
}

export interface Sale {
  id: string;
  orderId: string;
  productId: string;
  productName: string;
  categoryId: string;
  categoryName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  unitCost: number;
  totalCost: number;
  profit: number;
  paymentMethod?: Order['payment_method'];
  saleDate: number; // timestamp
}

export interface RoleLogin {
  roleId: string;
  roleName: string;
  loginAt: string;
}

// Export des types de promotions
export * from './promotions';
