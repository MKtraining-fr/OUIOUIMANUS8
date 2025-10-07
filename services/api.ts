import { supabase } from './supabaseClient';
import { normalizeCloudinaryImageUrl, resolveProductImageUrl } from './cloudinary';
import { clearRoleLoginsBefore, fetchRoleLoginsSince, logRoleLogin } from './roleLogins';

import {
  Role,
  Table,
  Order,
  KitchenTicket,
  TableStatus,
  Product,
  Category,
  Ingredient,
  OrderItem,
  RecipeItem,
  DashboardStats,
  DashboardPeriod,
  SalesDataPoint,
  NotificationCounts,
  DailyReport,
  SoldProduct,
  Sale,
  RoleLogin,
  SiteContent,
} from '../types';
import { ROLE_HOME_PAGE_META_KEY, ROLES, SITE_CUSTOMIZER_PERMISSION_KEY } from '../constants';
import { resolveSiteContent, sanitizeSiteContentInput } from '../utils/siteContent';

type SupabasePermissions = Role['permissions'] & {
  [key in typeof ROLE_HOME_PAGE_META_KEY]?: string;
};

type SupabaseRoleRow = {
  id: string;
  name: string;
  pin?: string | null;
  permissions: SupabasePermissions | null;

};

type SupabaseTableRow = {
  id: string;
  nom: string;
  capacite: number;
  statut: Table['statut'];
  commande_id: string | null;
  couverts: number | null;
};

type SupabaseOrderMetaRow = {
  id: string;
  estado_cocina: Order['estado_cocina'];
  date_envoi_cuisine: string | null;
};

type SupabaseRecipeRow = {
  ingredient_id: string;
  qte_utilisee: number;
};

type SupabaseProductRow = {
  id: string;
  nom_produit: string;
  description: string | null;
  prix_vente: number;
  categoria_id: string;
  estado: Product['estado'];
  image: string | null;
  is_best_seller: boolean | null | undefined;
  best_seller_rank: number | null | undefined;
  product_recipes: SupabaseRecipeRow[] | null;
};

type SupabaseIngredientRow = {
  id: string;
  nom: string;
  unite: Ingredient['unite'];
  stock_minimum: number;
  stock_actuel: number;
  prix_unitaire: number;
};

type SupabaseCategoryRow = {
  id: string;
  nom: string;
};

type SupabaseOrderItemRow = {
  id: string;
  order_id: string;
  produit_id: string;
  nom_produit: string;
  prix_unitaire: number;
  quantite: number;
  excluded_ingredients: string[] | null;
  commentaire: string | null;
  estado: OrderItem['estado'];
  date_envoi: string | null;
};

type SupabaseOrderRow = {
  id: string;
  type: Order['type'];
  table_id: string | null;
  table_nom: string | null;
  couverts: number | null;
  statut: Order['statut'];
  estado_cocina: Order['estado_cocina'];
  date_creation: string;
  date_envoi_cuisine: string | null;
  date_listo_cuisine: string | null;
  date_servido: string | null;
  payment_status: Order['payment_status'];
  total: number | null;
  profit: number | null;
  payment_method: Order['payment_method'] | null;
  payment_receipt_url: string | null;
  client_nom: string | null;
  client_telephone: string | null;
  client_adresse: string | null;
  receipt_url: string | null;
  order_items: SupabaseOrderItemRow[] | null;
};

type SupabaseSaleRow = {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  category_id: string;
  category_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  unit_cost: number;
  total_cost: number;
  profit: number;
  payment_method: Order['payment_method'] | null;
  sale_date: string;
};

type SupabaseSiteContentRow = {
  id: string;
  content: Partial<SiteContent> | null;
  updated_at: string | null;
};

type SalesPeriod = {
  start?: Date | string;
  end?: Date | string;
};

type SupabaseResponse<T> = {
  data: T;
  error: { message: string } | null;
  status?: number;
};

type TablePayload = {
  nom: string;
  capacite: number;
  couverts?: number | null;
};

type TableUpdatePayload = Partial<TablePayload>;

type EventCallback = () => void;

const eventListeners: Record<string, EventCallback[]> = {};

const publishEvent = (event: string) => {
  if (eventListeners[event]) {
    eventListeners[event].forEach(callback => callback());
  }
};

let ordersRealtimeChannel: ReturnType<typeof supabase.channel> | null = null;

const SITE_CONTENT_TABLE = 'site_content';
const SITE_CONTENT_SINGLETON_ID = 'default';

const ensureOrdersRealtimeSubscription = () => {
  if (ordersRealtimeChannel || typeof (supabase as { channel?: unknown }).channel !== 'function') {
    return;
  }

  try {
    ordersRealtimeChannel = supabase
      .channel('orders-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => publishEvent('orders_updated'))
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'order_items' },
        () => publishEvent('orders_updated'),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'restaurant_tables' },
        () => publishEvent('orders_updated'),
      )
      .subscribe(status => {
        if (status === 'CHANNEL_ERROR' || status === 'CLOSED' || status === 'TIMED_OUT') {
          ordersRealtimeChannel = null;
        }
      });
  } catch (error) {
    console.warn('Failed to subscribe to real-time order updates', error);
  }
};

const unwrap = <T>(response: SupabaseResponse<T>): T => {
  if (response.error) {
    throw new Error(response.error.message);
  }
  return response.data;
};

const unwrapMaybe = <T>(response: SupabaseResponse<T | null>): T | null => {
  if (response.error && response.status !== 406) {
    throw new Error(response.error.message);
  }
  return response.data ?? null;
};

const toTimestamp = (value?: string | null): number | undefined => {
  if (!value) {
    return undefined;
  }
  return new Date(value).getTime();
};

const toNumber = (value: number | string | null | undefined): number | undefined => {
  if (value === null || value === undefined) {
    return undefined;
  }

  if (typeof value === 'number') {
    return value;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const toIsoString = (value: number | undefined | null): string | null | undefined => {
  if (value === undefined) {
    return undefined;
  }
  if (value === null) {
    return null;
  }
  return new Date(value).toISOString();
};

const calculateCost = (recipe: RecipeItem[], ingredientMap: Map<string, Ingredient>): number => {
  return recipe.reduce((total, item) => {
    const ingredient = ingredientMap.get(item.ingredient_id);
    if (!ingredient) {
      return total;
    }

    let unitPrice = ingredient.prix_unitaire;
    if (ingredient.unite === 'kg' || ingredient.unite === 'L') {
      unitPrice = unitPrice / 1000;
    }

    return total + unitPrice * item.qte_utilisee;
  }, 0);
};

const extractPermissions = (
  permissions: SupabaseRoleRow['permissions'],
): { permissions: Role['permissions']; homePage?: string } => {
  if (!permissions) {
    return { permissions: {}, homePage: undefined };
  }

  const { [ROLE_HOME_PAGE_META_KEY]: homePage, ...permissionLevels } = permissions;

  return {
    permissions: permissionLevels as Role['permissions'],
    homePage: typeof homePage === 'string' ? homePage : undefined,
  };
};

const mergeHomePageIntoPermissions = (
  permissions: Role['permissions'],
  homePage?: string,
): SupabasePermissions => {
  const payload: SupabasePermissions = { ...permissions };

  if (homePage) {
    payload[ROLE_HOME_PAGE_META_KEY] = homePage;
  } else {
    delete payload[ROLE_HOME_PAGE_META_KEY];
  }

  return payload;
};

const isAdminRoleName = (name?: string | null): boolean => {
  if (!name) {
    return false;
  }

  const normalized = name.trim().toLowerCase();
  return normalized === ROLES.ADMIN || normalized === 'administrateur';
};

const withSiteCustomizerPermission = (
  permissions: Role['permissions'],
  roleName?: string | null,
): Role['permissions'] => {
  const normalized: Role['permissions'] = { ...permissions };
  if (!(SITE_CUSTOMIZER_PERMISSION_KEY in normalized)) {
    normalized[SITE_CUSTOMIZER_PERMISSION_KEY] = isAdminRoleName(roleName) ? 'editor' : 'none';
  }

  return normalized;
};

const mapRoleRow = (row: SupabaseRoleRow, includePin: boolean): Role => {
  const { permissions, homePage } = extractPermissions(row.permissions);
  const normalizedPermissions = withSiteCustomizerPermission(permissions, row.name);
  const role: Role = {
    id: row.id,
    name: row.name,
    homePage,
    permissions: normalizedPermissions,

  };

  if (includePin && row.pin) {
    role.pin = row.pin;
  }

  return role;
};

const mapSiteContentRow = (row: SupabaseSiteContentRow | null): SiteContent | null => {
  if (!row?.content) {
    return null;
  }

  return resolveSiteContent(row.content);
};

const mapIngredientRow = (row: SupabaseIngredientRow): Ingredient => ({
  id: row.id,
  nom: row.nom,
  unite: row.unite,
  stock_minimum: row.stock_minimum,
  stock_actuel: row.stock_actuel,
  prix_unitaire: row.prix_unitaire,
});

const mapCategoryRow = (row: SupabaseCategoryRow): Category => ({
  id: row.id,
  nom: row.nom,
});

const mapRecipeRow = (row: SupabaseRecipeRow): RecipeItem => ({
  ingredient_id: row.ingredient_id,
  qte_utilisee: row.qte_utilisee,
});

const mapProductRow = (row: SupabaseProductRow, ingredientMap?: Map<string, Ingredient>): Product => {
  const recipe = (row.product_recipes ?? []).map(mapRecipeRow);
  const product: Product = {
    id: row.id,
    nom_produit: row.nom_produit,
    description: row.description ?? undefined,
    prix_vente: row.prix_vente,
    categoria_id: row.categoria_id,
    estado: row.estado,
    image: resolveProductImageUrl(row.image),
    recipe,
    is_best_seller: row.is_best_seller ?? false,
    best_seller_rank: row.best_seller_rank ?? null,
  };

  if (ingredientMap) {
    product.cout_revient = calculateCost(recipe, ingredientMap);
  }

  return product;
};

const isUuid = (value?: string | null): value is string =>
  !!value && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

const mapOrderItemRow = (row: SupabaseOrderItemRow): OrderItem => ({
  id: row.id,
  produitRef: row.produit_id,
  nom_produit: row.nom_produit,
  prix_unitaire: toNumber(row.prix_unitaire) ?? 0,
  quantite: row.quantite,
  excluded_ingredients: row.excluded_ingredients ?? [],
  commentaire: row.commentaire ?? '',
  estado: row.estado,
  date_envoi: toTimestamp(row.date_envoi),
});

const areArraysEqual = (a: string[], b: string[]): boolean => {
  if (a.length !== b.length) {
    return false;
  }

  return a.every((value, index) => value === b[index]);
};

const areOrderItemsEquivalent = (a: OrderItem, b: OrderItem): boolean => {
  if (
    a.produitRef !== b.produitRef ||
    a.nom_produit !== b.nom_produit ||
    a.prix_unitaire !== b.prix_unitaire ||
    a.quantite !== b.quantite ||
    a.commentaire !== b.commentaire ||
    a.estado !== b.estado
  ) {
    return false;
  }

  const excludedIngredientsA = [...a.excluded_ingredients].sort();
  const excludedIngredientsB = [...b.excluded_ingredients].sort();

  return areArraysEqual(excludedIngredientsA, excludedIngredientsB);
};

const reorderOrderItems = (referenceItems: OrderItem[], itemsToReorder: OrderItem[]): OrderItem[] => {
  const remaining = [...itemsToReorder];
  const ordered: OrderItem[] = [];

  referenceItems.forEach(referenceItem => {
    const matchIndex = remaining.findIndex(item => areOrderItemsEquivalent(item, referenceItem));
    if (matchIndex !== -1) {
      ordered.push(remaining.splice(matchIndex, 1)[0]);
    }
  });

  return [...ordered, ...remaining];
};

const mapOrderRow = (row: SupabaseOrderRow): Order => {
  const items = (row.order_items ?? []).map(mapOrderItemRow);
  const total = toNumber(row.total);
  const profit = toNumber(row.profit);
  const order: Order = {
    id: row.id,
    type: row.type,
    table_id: row.table_id ?? undefined,
    table_nom: row.table_nom ?? undefined,
    couverts: row.couverts ?? 0,
    statut: row.statut,
    estado_cocina: row.estado_cocina,
    date_creation: toTimestamp(row.date_creation) ?? Date.now(),
    date_envoi_cuisine: toTimestamp(row.date_envoi_cuisine),
    date_listo_cuisine: toTimestamp(row.date_listo_cuisine),
    date_servido: toTimestamp(row.date_servido),
    payment_status: row.payment_status,
    items,
    total: total ?? items.reduce((sum, item) => sum + item.prix_unitaire * item.quantite, 0),
    profit: profit,
    payment_method: row.payment_method ?? undefined,
    payment_receipt_url: row.payment_receipt_url ?? undefined,
    receipt_url: row.receipt_url ?? undefined,
  };

  if (row.client_nom || row.client_telephone || row.client_adresse) {
    order.clientInfo = {
      nom: row.client_nom ?? '',
      telephone: row.client_telephone ?? '',
      adresse: row.client_adresse ?? undefined,
    };
  }

  return order;
};

const mapSaleRow = (row: SupabaseSaleRow): Sale => ({
  id: row.id,
  orderId: row.order_id,
  productId: row.product_id,
  productName: row.product_name,
  categoryId: row.category_id,
  categoryName: row.category_name,
  quantity: row.quantity,
  unitPrice: row.unit_price,
  totalPrice: row.total_price,
  unitCost: row.unit_cost,
  totalCost: row.total_cost,
  profit: row.profit,
  paymentMethod: row.payment_method ?? undefined,
  saleDate: toTimestamp(row.sale_date) ?? Date.now(),
});

const resolveTableStatut = (
  row: SupabaseTableRow,
  meta?: { estado_cocina?: Order['estado_cocina'] },
): Table['statut'] => {
  if (!row.commande_id) {
    return 'libre';
  }

  const estadoCocina = meta?.estado_cocina;

  if (!estadoCocina || estadoCocina === 'no_enviado') {
    return 'libre';
  }

  if (estadoCocina === 'listo') {
    return 'para_entregar';
  }

  if (estadoCocina === 'servido' || estadoCocina === 'entregada') {
    return 'para_pagar';
  }

  if (row.statut === 'para_entregar' || row.statut === 'para_pagar') {
    return row.statut;
  }

  return 'en_cuisine';
};

const mapTableRow = (
  row: SupabaseTableRow,
  orderMeta: Map<string, { estado_cocina?: Order['estado_cocina']; date_envoi_cuisine?: number }>,
): Table => {
  const meta = row.commande_id ? orderMeta.get(row.commande_id) : undefined;

  const table: Table = {
    id: row.id,
    nom: row.nom,
    capacite: row.capacite,
    statut: resolveTableStatut(row, meta),
    commandeId: row.commande_id ?? undefined,
    couverts: row.commande_id ? row.couverts ?? undefined : undefined,
  };

  if (table.commandeId && meta) {
    table.estado_cocina = meta.estado_cocina;
    table.date_envoi_cuisine = meta.date_envoi_cuisine;
  }

  return table;
};

const mapTableRowWithMeta = async (row: SupabaseTableRow): Promise<Table> => {
  if (!row.commande_id) {
    return mapTableRow(row, new Map());
  }

  const orderResponse = await supabase
    .from('orders')
    .select('id, estado_cocina, date_envoi_cuisine')
    .eq('id', row.commande_id)
    .maybeSingle();
  const orderMetaRow = unwrapMaybe<SupabaseOrderMetaRow>(
    orderResponse as SupabaseResponse<SupabaseOrderMetaRow | null>,
  );

  const orderMeta = orderMetaRow
    ? new Map([
        [
          orderMetaRow.id,
          {
            estado_cocina: orderMetaRow.estado_cocina,
            date_envoi_cuisine: toTimestamp(orderMetaRow.date_envoi_cuisine),
          },
        ],
      ])
    : new Map();

  return mapTableRow(row, orderMeta);
};

const selectOrdersQuery = () =>
  supabase
    .from('orders')
    .select(
      `
        id,
        type,
        table_id,
        table_nom,
        couverts,
        statut,
        estado_cocina,
        date_creation,
        date_envoi_cuisine,
        date_listo_cuisine,
        date_servido,
        payment_status,
        total,
        profit,
        payment_method,
        payment_receipt_url,
        client_nom,
        client_telephone,
        client_adresse,
        receipt_url,
        order_items (
          id,
          order_id,
          produit_id,
          nom_produit,
          prix_unitaire,
          quantite,
          excluded_ingredients,
          commentaire,
          estado,
          date_envoi
        )
      `,
    )
    .order('date_creation', { ascending: false });

type SelectProductsQueryOptions = {
  orderBy?: { column: string; ascending?: boolean; nullsFirst?: boolean };
  includeBestSellerColumns?: boolean;
  includeRecipes?: boolean;
};

const buildProductSelectColumns = (includeBestSellerColumns: boolean, includeRecipes: boolean): string => {
  const bestSellerColumns = includeBestSellerColumns
    ? `,
        is_best_seller,
        best_seller_rank`
    : '';

  const recipeColumns = includeRecipes
    ? `,
        product_recipes (
          ingredient_id,
          qte_utilisee
        )`
    : '';

  return `
        id,
        nom_produit,
        description,
        prix_vente,
        categoria_id,
        estado,
        image${bestSellerColumns}${recipeColumns}
      `;
};

const selectProductsQuery = (options?: SelectProductsQueryOptions) => {
  const includeBestSellerColumns = options?.includeBestSellerColumns !== false;
  const includeRecipes = options?.includeRecipes !== false;
  let query = supabase
    .from('products')
    .select(buildProductSelectColumns(includeBestSellerColumns, includeRecipes));

  if (options?.orderBy) {
    query = query.order(options.orderBy.column, {
      ascending: options.orderBy.ascending ?? true,
      nullsFirst: options.orderBy.nullsFirst,
    });
  } else {
    query = query.order('nom_produit');
  }

  return query;
};

const isMissingBestSellerColumnError = (error: { message?: string } | null): boolean => {
  if (!error?.message) {
    return false;
  }

  const normalizedMessage = error.message.toLowerCase();
  return (
    normalizedMessage.includes('does not exist') &&
    normalizedMessage.includes('column') &&
    (normalizedMessage.includes('is_best_seller') || normalizedMessage.includes('best_seller_rank'))
  );
};

const runProductsQueryWithFallback = async <T>(
  executor: (
    query: ReturnType<typeof selectProductsQuery>,
    includeBestSellerColumns: boolean,
  ) => Promise<SupabaseResponse<T>>,
  options?: Omit<SelectProductsQueryOptions, 'includeBestSellerColumns'>,
): Promise<SupabaseResponse<T>> => {
  const includeBestSellerColumns = true;
  let response = await executor(selectProductsQuery({ ...options, includeBestSellerColumns }), includeBestSellerColumns);

  if (isMissingBestSellerColumnError(response.error)) {
    const fallbackIncludeBestSellerColumns = false;
    response = await executor(
      selectProductsQuery({ ...options, includeBestSellerColumns: fallbackIncludeBestSellerColumns }),
      fallbackIncludeBestSellerColumns,
    );
  }

  return response;
};

const fetchOrderById = async (orderId: string): Promise<Order | null> => {
  const response = await selectOrdersQuery().eq('id', orderId).maybeSingle();
  const row = unwrapMaybe<SupabaseOrderRow>(response as SupabaseResponse<SupabaseOrderRow | null>);
  return row ? mapOrderRow(row) : null;
};

const fetchOrderItemsByOrderId = async (orderId: string): Promise<OrderItem[]> => {
  const response = await supabase
    .from('order_items')
    .select(
      `
        id,
        order_id,
        produit_id,
        nom_produit,
        prix_unitaire,
        quantite,
        excluded_ingredients,
        commentaire,
        estado,
        date_envoi
      `,
    )
    .eq('order_id', orderId);

  const rows = unwrap<SupabaseOrderItemRow[]>(response as SupabaseResponse<SupabaseOrderItemRow[]>);
  return rows.map(mapOrderItemRow);
};

const ensureOrderHasItems = async (order: Order): Promise<Order> => {
  if (order.items.length > 0) {
    return order;
  }

  // Always try to fetch items directly from order_items table as a fallback
  // This ensures items are retrieved even if the Supabase relation is not configured
  const fallbackItems = await fetchOrderItemsByOrderId(order.id);
  
  if (fallbackItems.length === 0) {
    // If still no items found, try enriched order as last resort
    const enrichedOrder = await fetchOrderById(order.id);
    return enrichedOrder ?? order;
  }

  const computedTotal = fallbackItems.reduce(
    (sum, item) => sum + item.prix_unitaire * item.quantite,
    0,
  );

  return {
    ...order,
    items: fallbackItems,
    total: order.total > 0 ? order.total : computedTotal,
  };
};

const TAKEAWAY_ORDER_TYPES: Order['type'][] = ['a_emporter', 'pedir_en_linea'];

const isTakeawayLikeOrder = (order: Order): boolean => TAKEAWAY_ORDER_TYPES.includes(order.type);

const isKitchenEligibleOrder = (order: Order): boolean => {
  if (isTakeawayLikeOrder(order)) {
    const isValidated = order.statut === 'en_cours';
    const awaitingKitchen = order.estado_cocina === 'recibido' || order.estado_cocina === 'no_enviado';
    return isValidated && awaitingKitchen && order.items.length > 0;
  }

  if (order.estado_cocina !== 'recibido') {
    return false;
  }

  return order.items.some(item => item.estado === 'enviado');
};

const fetchIngredients = async (): Promise<Ingredient[]> => {
  const response = await supabase
    .from('ingredients')
    .select('id, nom, unite, stock_minimum, stock_actuel, prix_unitaire')
    .order('nom');
  const rows = unwrap<SupabaseIngredientRow[]>(response as SupabaseResponse<SupabaseIngredientRow[]>);
  return rows.map(mapIngredientRow);
};

const isPermissionError = (error: unknown): boolean => {
  if (!error) {
    return false;
  }

  if (typeof error === 'string') {
    return error.toLowerCase().includes('permission');
  }

  if (error instanceof Error) {
    return error.message.toLowerCase().includes('permission');
  }

  if (typeof error === 'object' && 'message' in error) {
    const message = String((error as { message?: unknown }).message ?? '');
    return message.toLowerCase().includes('permission');
  }

  return false;
};

const fetchIngredientsOrWarn = async (context: string): Promise<Ingredient[]> => {
  try {
    return await fetchIngredients();
  } catch (error) {
    if (isPermissionError(error)) {
      console.warn(
        `[api.${context}] Impossible de récupérer les ingrédients (permissions insuffisantes). Poursuite avec une liste vide.`,
        error,
      );
      return [];
    }

    throw error;
  }
};

const fetchCategories = async (): Promise<Category[]> => {
  const response = await supabase
    .from('categories')
    .select('id, nom')
    .order('nom');
  const rows = unwrap<SupabaseCategoryRow[]>(response as SupabaseResponse<SupabaseCategoryRow[]>);
  return rows.map(mapCategoryRow);
};

const fetchTablesWithMeta = async (): Promise<Table[]> => {
  const response = await supabase
    .from('restaurant_tables')
    .select('id, nom, capacite, statut, commande_id, couverts')
    .order('nom');

  const tableRows = unwrap<SupabaseTableRow[]>(response as SupabaseResponse<SupabaseTableRow[]>);
  const activeOrderIds = tableRows
    .map(row => row.commande_id)
    .filter((value): value is string => Boolean(value));

  let orderMeta = new Map<string, { estado_cocina?: Order['estado_cocina']; date_envoi_cuisine?: number }>();
  if (activeOrderIds.length > 0) {
    const ordersResponse = await supabase
      .from('orders')
      .select('id, estado_cocina, date_envoi_cuisine')
      .in('id', activeOrderIds);
    const orderRows = unwrap<SupabaseOrderMetaRow[]>(ordersResponse as SupabaseResponse<SupabaseOrderMetaRow[]>);
    orderMeta = new Map(
      orderRows.map(order => [
        order.id,
        {
          estado_cocina: order.estado_cocina,
          date_envoi_cuisine: toTimestamp(order.date_envoi_cuisine),
        },
      ]),
    );
  }

  // Count ready orders (estado_cocina = 'listo') for each table
  const readyOrdersCount = new Map<string, number>();
  const allTableIds = tableRows.map(row => row.id);
  
  if (allTableIds.length > 0) {
    const readyOrdersResponse = await supabase
      .from('orders')
      .select('table_id')
      .in('table_id', allTableIds)
      .eq('estado_cocina', 'listo')
      .in('statut', ['en_cours']);
    
    const readyOrders = unwrap<{ table_id: string }[]>(readyOrdersResponse as SupabaseResponse<{ table_id: string }[]>);
    
    readyOrders.forEach(order => {
      const count = readyOrdersCount.get(order.table_id) || 0;
      readyOrdersCount.set(order.table_id, count + 1);
    });
  }

  return tableRows.map(row => ({
    ...mapTableRow(row, orderMeta),
    readyOrdersCount: readyOrdersCount.get(row.id) || 0,
  }));
};

export const getBusinessDayStart = (now: Date = new Date()): Date => {
  const startTime = new Date(now);
  startTime.setHours(5, 0, 0, 0);

  if (now < startTime) {
    startTime.setDate(startTime.getDate() - 1);
  }

  return startTime;
};

const DASHBOARD_PERIOD_CONFIG: Record<DashboardPeriod, { days: number; label: string }> = {
  week: { days: 7, label: '7 derniers jours' },
  month: { days: 30, label: '30 derniers jours' },
};

const resolveDashboardPeriodBounds = (period: DashboardPeriod) => {
  const config = DASHBOARD_PERIOD_CONFIG[period];
  const end = new Date(getBusinessDayStart());
  end.setDate(end.getDate() + 1);
  const start = new Date(end);
  start.setDate(start.getDate() - config.days);
  return { config, start, end };
};

const updateTableStatusBasedOnOrders = async (tableId: string): Promise<void> => {
  const { data: ordersData } = await supabase
    .from("orders")
    .select("id, estado_cocina, statut")
    .eq("table_id", tableId)
    .in("statut", ["en_cours"]); // Only consider active orders

  if (!ordersData || ordersData.length === 0) {
    // If no active orders, the table should be ready for payment or free
    // This case should ideally be handled by finalizeOrder setting to libre
    // For now, if no active orders, assume it\'s ready for payment if it wasn\'t already libre
    const { data: currentTable } = await supabase
      .from("restaurant_tables")
      .select("statut")
      .eq("id", tableId)
      .single();
    if (currentTable?.statut !== "libre") {
      await supabase
        .from("restaurant_tables")
        .update({ statut: "para_pagar" })
        .eq("id", tableId);
    }
    return;
  }

  // Fetch all items for these orders
  const allOrderIds = ordersData.map(o => o.id);
  const { data: itemsData } = await supabase
    .from("order_items")
    .select("estado")
    .in("order_id", allOrderIds);

  const allItems = itemsData || [];

  const anyItemEnviado = allItems.some(item => item.estado === "enviado");
  const anyItemListo = allItems.some(item => item.estado === "listo");
  const anyItemServido = allItems.some(item => item.estado === "servido");
  const anyItemEnAttente = allItems.some(item => item.estado === "en_attente");
  const allItemsServido = allItems.every(item => item.estado === "servido");

  let newTableStatus: string;
  if (anyItemListo) {
    // If any item is ready, the table is ready for delivery
    newTableStatus = "para_entregar";
  } else if (anyItemEnviado || anyItemEnAttente) {
    // If any item is still in the kitchen (enviado) or pending (en_attente), the table is in cuisine
    newTableStatus = "en_cuisine";
  } else if (allItemsServido) {
    // All items are served, so the table is ready for payment
    newTableStatus = "para_pagar";
  } else {
    // Fallback: if no items are in any relevant state, assume en_cuisine (or libre if no orders at all)
    newTableStatus = "en_cuisine";
  }

  await supabase
    .from("restaurant_tables")
    .update({ statut: newTableStatus })
    .eq("id", tableId);
};

const createSalesEntriesForOrder = async (order: Order): Promise<void> => {
  const { data: ordersData } = await supabase
    .from("orders")
    .select("id, estado_cocina, statut")
    .eq("table_id", tableId)
    .in("statut", ["en_cours"]); // Only consider active orders

  if (!ordersData || ordersData.length === 0) {
    // No active orders, table should be libre (or para_pagar if there were previous orders)
    // For now, let's assume it should go to para_pagar if no active orders are found after serving
    await supabase
      .from("restaurant_tables")
      .update({ statut: "para_pagar" })
      .eq("id", tableId);
    return;
  }

  // Fetch all items for these orders
  const allOrderIds = ordersData.map(o => o.id);
  const { data: itemsData } = await supabase
    .from("order_items")
    .select("estado")
    .in("order_id", allOrderIds);

  const allItems = itemsData || [];

  const allItemsServed = allItems.every(item => item.estado === "servido");
  const allItemsReady = allItems.every(item => item.estado === "listo" || item.estado === "servido");
  const anyItemInKitchen = allItems.some(item => item.estado === "enviado");

  let newTableStatus: Table["statut"];

  if (allItemsServed) {
    newTableStatus = "para_pagar";
  } else if (allItemsReady) {
    newTableStatus = "para_entregar";
  } else if (anyItemInKitchen) {
    newTableStatus = "en_cuisine";
  } else {
    // Fallback, if no items are in kitchen, ready or served, it means they are not sent yet or something is wrong
    newTableStatus = "en_cuisine"; // Or 'libre' if no items at all
  }

  await supabase
    .from("restaurant_tables")
    .update({ statut: newTableStatus })
    .eq("id", tableId);
};

  createSalesEntriesForOrder: async (order: Order): Promise<number> => {
  if (!order.items.length) {
    await supabase.from('sales').delete().eq('order_id', order.id);
    await supabase.from('orders').update({ profit: 0 }).eq('id', order.id);
    return 0;
  }

  const productIds = Array.from(new Set(order.items.map(item => item.produitRef)));
  const productsPromise =
    productIds.length > 0
      ? runProductsQueryWithFallback(query => query.in('id', productIds))
      : runProductsQueryWithFallback(query => query.limit(0));
  const [categories, ingredients, productsResponse] = await Promise.all([
    fetchCategories(),
    fetchIngredients(),
    productsPromise,
  ]);

  const ingredientMap = new Map(ingredients.map(ingredient => [ingredient.id, ingredient]));
  const categoryMap = new Map(categories.map(category => [category.id, category.nom]));

  let productRows: SupabaseProductRow[] = [];
  if (productIds.length > 0) {
    productRows = unwrap<SupabaseProductRow[]>(productsResponse as SupabaseResponse<SupabaseProductRow[]>);
  }

  const productMap = new Map(
    productRows.map(row => {
      const product = mapProductRow(row, ingredientMap);
      return [product.id, product] as const;
    }),
  );

  const saleDateIso = toIsoString(order.date_servido) ?? new Date().toISOString();
  const salesEntries = order.items.map(item => {
    const product = productMap.get(item.produitRef);
    const cost = product ? calculateCost(product.recipe, ingredientMap) : 0;
    const categoryId = product?.categoria_id ?? 'unknown';
    const categoryName = product ? categoryMap.get(categoryId) ?? 'Sans catégorie' : 'Sans catégorie';
    const profit = (item.prix_unitaire - cost) * item.quantite;

    return {
      order_id: order.id,
      product_id: item.produitRef,
      product_name: item.nom_produit,
      category_id: categoryId,
      category_name: categoryName,
      quantity: item.quantite,
      unit_price: item.prix_unitaire,
      total_price: item.prix_unitaire * item.quantite,
      unit_cost: cost,
      total_cost: cost * item.quantite,
      profit,
      payment_method: order.payment_method ?? null,
      sale_date: saleDateIso,
    };
  });

  const totalProfit = salesEntries.reduce((sum, entry) => sum + entry.profit, 0);

  await supabase.from('sales').delete().eq('order_id', order.id);
  await supabase.from('sales').insert(salesEntries);
  await supabase.from('orders').update({ profit: totalProfit }).eq('id', order.id);

  return totalProfit;
};

const notificationsService = {
  subscribe: (event: string, callback: EventCallback): (() => void) => {
    if (!eventListeners[event]) {
      eventListeners[event] = [];
    }
    eventListeners[event].push(callback);

    if (event === 'orders_updated') {
      ensureOrdersRealtimeSubscription();
    }

    return () => {
      eventListeners[event] = (eventListeners[event] ?? []).filter(cb => cb !== callback);

      if (event === 'orders_updated' && eventListeners[event]?.length === 0 && ordersRealtimeChannel) {
        if (typeof (supabase as { removeChannel?: (channel: unknown) => void }).removeChannel === 'function') {
          supabase.removeChannel(ordersRealtimeChannel);
        }
        ordersRealtimeChannel = null;
      }
    };
  },
  publish: (event: string) => {
    publishEvent(event);
  },
};

type PublishOrderChangeOptions = {
  includeNotifications?: boolean;
};

const publishOrderChange = (options?: PublishOrderChangeOptions) => {
  if (options?.includeNotifications !== false) {
    notificationsService.publish('notifications_updated');
  }
  notificationsService.publish('orders_updated');
};

export const api = {
  notifications: notificationsService,

  getSiteContent: async (): Promise<SiteContent | null> => {
    const response = await supabase
      .from(SITE_CONTENT_TABLE)
      .select('id, content, updated_at')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const row = unwrapMaybe<SupabaseSiteContentRow>(
      response as SupabaseResponse<SupabaseSiteContentRow | null>,
    );

    return mapSiteContentRow(row);
  },

  updateSiteContent: async (content: SiteContent): Promise<SiteContent> => {
    const sanitized = sanitizeSiteContentInput(content);

    const response = await supabase
      .from(SITE_CONTENT_TABLE)
      .upsert(
        {
          id: SITE_CONTENT_SINGLETON_ID,
          content: sanitized,
        },
        { onConflict: 'id' },
      )
      .select('id, content, updated_at')
      .single();

    const row = unwrap<SupabaseSiteContentRow>(response as SupabaseResponse<SupabaseSiteContentRow>);
    const mapped = mapSiteContentRow(row);

    if (!mapped) {
      throw new Error('Contenu du site introuvable après la mise à jour.');
    }

    return mapped;
  },

  getRoles: async (): Promise<Role[]> => {
    const response = await supabase.from('roles').select('id, name, pin, permissions').order('name');

    const rows = unwrap<SupabaseRoleRow[]>(response as SupabaseResponse<SupabaseRoleRow[]>);
    return rows.map(row => mapRoleRow(row, true));
  },

  getRoleById: async (roleId: string): Promise<Role | null> => {
    const response = await supabase
      .from('roles')
      .select('id, name, permissions')
      .eq('id', roleId)
      .maybeSingle();
    const row = unwrapMaybe<SupabaseRoleRow>(response as SupabaseResponse<SupabaseRoleRow | null>);
    return row ? mapRoleRow(row, false) : null;
  },

  createRole: async (payload: Omit<Role, 'id'>): Promise<Role> => {
    const response = await supabase
      .from('roles')
      .insert({
        name: payload.name,
        pin: payload.pin,
        permissions: mergeHomePageIntoPermissions(payload.permissions, payload.homePage),

      })
      .select('id, name, pin, permissions')
      .single();
    const row = unwrap<SupabaseRoleRow>(response as SupabaseResponse<SupabaseRoleRow>);
    notificationsService.publish('notifications_updated');
    return mapRoleRow(row, true);
  },

  updateRole: async (roleId: string, updates: Omit<Role, 'id'>): Promise<Role> => {
    const response = await supabase
      .from('roles')
      .update({
        name: updates.name,
        pin: updates.pin,
        permissions: mergeHomePageIntoPermissions(updates.permissions, updates.homePage),

      })
      .eq('id', roleId)
      .select('id, name, pin, permissions')
      .single();
    const row = unwrap<SupabaseRoleRow>(response as SupabaseResponse<SupabaseRoleRow>);
    notificationsService.publish('notifications_updated');
    return mapRoleRow(row, true);
  },

  deleteRole: async (roleId: string): Promise<void> => {
    const response = await supabase.from('roles').delete().eq('id', roleId);
    unwrap(response as SupabaseResponse<unknown>);
    notificationsService.publish('notifications_updated');
  },

  loginWithPin: async (pin: string): Promise<Role | null> => {
    const response = await supabase
      .from('roles')
      .select('id, name, permissions')
      .eq('pin', pin)
      .maybeSingle();
    const row = unwrapMaybe<SupabaseRoleRow>(response as SupabaseResponse<SupabaseRoleRow | null>);
    if (!row) {
      return null;
    }

    const role = mapRoleRow(row, false);

    try {
      await logRoleLogin(role.id, role.name);
    } catch (error) {
      console.warn('Failed to enregistrer la connexion du rôle', error);
    }

    return role;
  },

  getDashboardStats: async (period: DashboardPeriod = 'week'): Promise<DashboardStats> => {
    const { config, start, end } = resolveDashboardPeriodBounds(period);
    const startIso = start.toISOString();
    const endIso = end.toISOString();
    const previousStart = new Date(start);
    previousStart.setDate(previousStart.getDate() - config.days);
    const previousStartIso = previousStart.toISOString();

    const businessDayStart = getBusinessDayStart();
    const businessDayIso = businessDayStart.toISOString();

    const [tables, ingredients, categories, productRowsResponse, todaysOrdersResponse, periodOrdersResponse] =
      await Promise.all([
        fetchTablesWithMeta(),
        fetchIngredients(),
        fetchCategories(),
        runProductsQueryWithFallback(query => query),
        selectOrdersQuery().eq('statut', 'finalisee').gte('date_creation', businessDayIso),
        selectOrdersQuery().eq('statut', 'finalisee').gte('date_creation', previousStartIso).lt('date_creation', endIso),
      ]);

    const todaysOrderRows = unwrap<SupabaseOrderRow[]>(todaysOrdersResponse as SupabaseResponse<SupabaseOrderRow[]>);
    const todaysOrders = todaysOrderRows.map(mapOrderRow);

    const periodOrderRows = unwrap<SupabaseOrderRow[]>(periodOrdersResponse as SupabaseResponse<SupabaseOrderRow[]>);
    const mappedPeriodOrders = periodOrderRows.map(mapOrderRow);

    const currentPeriodOrders = mappedPeriodOrders.filter(order => order.date_creation >= start.getTime());
    const previousPeriodOrders = mappedPeriodOrders.filter(order => order.date_creation < start.getTime());

    const ingredientMap = new Map(ingredients.map(ing => [ing.id, ing]));
    const productRows = unwrap<SupabaseProductRow[]>(productRowsResponse as SupabaseResponse<SupabaseProductRow[]>);
    const productMap = new Map(
      productRows.map(row => {
        const product = mapProductRow(row, ingredientMap);
        return [product.id, product] as const;
      }),
    );

    const ventesPeriode = currentPeriodOrders.reduce((sum, order) => sum + (order.total ?? 0), 0);
    const beneficePeriode = currentPeriodOrders.reduce((profit, order) => {
      return (
        profit +
        order.items.reduce((acc, item) => {
          const product = productMap.get(item.produitRef);
          const cost = product ? calculateCost(product.recipe, ingredientMap) : 0;
          return acc + (item.prix_unitaire - cost) * item.quantite;
        }, 0)
      );
    }, 0);

    const clientsPeriode = currentPeriodOrders.reduce((sum, order) => sum + (order.couverts ?? 0), 0);
    const panierMoyen = currentPeriodOrders.length > 0 ? ventesPeriode / currentPeriodOrders.length : 0;

    const categoryMap = new Map(categories.map(category => [category.id, category.nom]));

    const ventesParCategorieMap = new Map<string, number>();
    currentPeriodOrders.forEach(order => {
      order.items.forEach(item => {
        const product = productMap.get(item.produitRef);
        const categoryName = product ? categoryMap.get(product.categoria_id) ?? 'Sans catégorie' : 'Sans catégorie';
        ventesParCategorieMap.set(
          categoryName,
          (ventesParCategorieMap.get(categoryName) ?? 0) + item.prix_unitaire * item.quantite,
        );
      });
    });

    const ventesParCategorie: SalesDataPoint[] = Array.from(ventesParCategorieMap.entries()).map(([name, value]) => ({
      name,
      value,
    }));

    const recentOrders = [...currentPeriodOrders]
      .sort((a, b) => b.date_creation - a.date_creation)
      .slice(0, 5);

    const bestSellerProducts = Array.from(productMap.values())
      .filter(product => product.is_best_seller)
      .sort((a, b) => {
        const rankA = a.best_seller_rank ?? Number.POSITIVE_INFINITY;
        const rankB = b.best_seller_rank ?? Number.POSITIVE_INFINITY;
        if (rankA === rankB) {
          return a.nom_produit.localeCompare(b.nom_produit);
        }
        return rankA - rankB;
      })
      .slice(0, 6);

    const tablesOccupees = tables.filter(table => table.statut !== 'libre').length;
    const clientsActuels = tables.reduce((sum, table) => sum + (table.couverts ?? 0), 0);
    const commandesEnCuisine = todaysOrders.filter(order => order.estado_cocina === 'recibido').length;
    const ingredientsStockBas = ingredients.filter(ingredient => ingredient.stock_actuel <= ingredient.stock_minimum);

    const sumOrdersBetween = (orders: Order[], rangeStart: Date, rangeEnd: Date) => {
      const startTimestamp = rangeStart.getTime();
      const endTimestamp = rangeEnd.getTime();
      return orders.reduce((sum, order) => {
        if (order.date_creation >= startTimestamp && order.date_creation < endTimestamp) {
          return sum + (order.total ?? 0);
        }
        return sum;
      }, 0);
    };

    const ventesPeriodeSeries = Array.from({ length: config.days }).map((_, index) => {
      const dayStart = new Date(start);
      dayStart.setDate(dayStart.getDate() + index);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const previousDayStart = new Date(previousStart);
      previousDayStart.setDate(previousDayStart.getDate() + index);
      const previousDayEnd = new Date(previousDayStart);
      previousDayEnd.setDate(previousDayEnd.getDate() + 1);

      const name =
        config.days === 7
          ? index === config.days - 1
            ? 'Auj'
            : `J-${config.days - 1 - index}`
          : dayStart.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });

      return {
        name,
        ventes: sumOrdersBetween(currentPeriodOrders, dayStart, dayEnd),
        ventesPeriodePrecedente: sumOrdersBetween(previousPeriodOrders, previousDayStart, previousDayEnd),
      };
    });

    return {
      period,
      periodLabel: config.label,
      periodStart: startIso,
      periodEnd: endIso,
      ventesPeriode,
      beneficePeriode,
      clientsPeriode,
      panierMoyen,
      tablesOccupees,
      clientsActuels,
      commandesEnCuisine,
      ingredientsStockBas,
      ventesPeriodeSeries,
      ventesParCategorie,
      recentOrders,
      bestSellerProducts,
    };
  },

  getSalesByProduct: async (period?: SalesPeriod): Promise<SalesDataPoint[]> => {
    const resolveIso = (value?: Date | string): string | undefined => {
      if (!value) {
        return undefined;
      }
      return typeof value === 'string' ? value : value.toISOString();
    };

    const startIso = resolveIso(period?.start) ?? getBusinessDayStart().toISOString();
    const endIso = resolveIso(period?.end);

    let query = supabase
      .from('sales')
      .select('product_id, product_name, total_price')
      .gte('sale_date', startIso);

    if (endIso) {
      query = query.lt('sale_date', endIso);
    }

    const response = await query;
    const rows = unwrap<{ product_id: string; product_name: string; total_price: number }[]>(
      response as SupabaseResponse<{ product_id: string; product_name: string; total_price: number }[]>,
    );

    const totals = new Map<string, { name: string; value: number }>();
    rows.forEach(row => {
      const current = totals.get(row.product_id) ?? { name: row.product_name, value: 0 };
      current.value += row.total_price;
      totals.set(row.product_id, current);
    });

    const sorted = Array.from(totals.values()).sort((a, b) => b.value - a.value);
    if (sorted.length > 6) {
      const top6 = sorted.slice(0, 6);
      const others = sorted.slice(6).reduce((sum, item) => sum + item.value, 0);
      return [...top6, { name: 'Autres', value: others }];
    }
    return sorted;
  },

  getTables: async (): Promise<Table[]> => {
    return fetchTablesWithMeta();
  },

  createTable: async (payload: TablePayload): Promise<Table> => {
    const response = await supabase
      .from('restaurant_tables')
      .insert({
        nom: payload.nom,
        capacite: payload.capacite,
        couverts: payload.couverts ?? null,
      })
      .select('id, nom, capacite, statut, commande_id, couverts')
      .single();

    const row = unwrap<SupabaseTableRow>(response as SupabaseResponse<SupabaseTableRow>);
    publishOrderChange();
    return mapTableRowWithMeta(row);
  },

  updateTable: async (tableId: string, updates: TableUpdatePayload): Promise<Table> => {
    const payload: Record<string, unknown> = {};

    if (updates.nom !== undefined) {
      payload.nom = updates.nom;
    }
    if (updates.capacite !== undefined) {
      payload.capacite = updates.capacite;
    }
    if (updates.couverts !== undefined) {
      payload.couverts = updates.couverts ?? null;
    }

    const response = await supabase
      .from('restaurant_tables')
      .update(payload)
      .eq('id', tableId)
      .select('id, nom, capacite, statut, commande_id, couverts')
      .single();

    const row = unwrap<SupabaseTableRow>(response as SupabaseResponse<SupabaseTableRow>);
    publishOrderChange();
    return mapTableRowWithMeta(row);
  },

  deleteTable: async (tableId: string): Promise<void> => {
    const response = await supabase.from('restaurant_tables').delete().eq('id', tableId);
    unwrap(response as SupabaseResponse<unknown>);
    publishOrderChange();
  },

  getIngredients: async (): Promise<Ingredient[]> => {
    return fetchIngredients();
  },

  getProducts: async (): Promise<Product[]> => {
    const [productRows, ingredients] = await Promise.all([
      runProductsQueryWithFallback(query => query.neq('estado', 'archive')),
      fetchIngredientsOrWarn('getProducts'),
    ]);
    const rows = unwrap<SupabaseProductRow[]>(productRows as SupabaseResponse<SupabaseProductRow[]>);
    const ingredientMap = ingredients.length > 0
      ? new Map(ingredients.map(ingredient => [ingredient.id, ingredient]))
      : undefined;
    return rows.map(row => mapProductRow(row, ingredientMap));
  },

  getBestSellerProducts: async (): Promise<Product[]> => {
    const [productsResponse, ingredients] = await Promise.all([
      runProductsQueryWithFallback((query, includeBestSellerColumns) => {
        if (!includeBestSellerColumns) {
          return query.limit(0);
        }

        return query.eq('is_best_seller', true).order('best_seller_rank', { ascending: true, nullsFirst: false }).limit(6);
      }, { includeRecipes: false }),
      fetchIngredientsOrWarn('getBestSellerProducts'),
    ]);

    const productRows = unwrap<SupabaseProductRow[]>(productsResponse as SupabaseResponse<SupabaseProductRow[]>);
    const ingredientMap = ingredients.length > 0
      ? new Map(ingredients.map(ingredient => [ingredient.id, ingredient]))
      : undefined;

    return productRows
      .filter(row => row.estado !== 'archive')
      .sort((a, b) => {
        const rankA = a.best_seller_rank ?? Number.POSITIVE_INFINITY;
        const rankB = b.best_seller_rank ?? Number.POSITIVE_INFINITY;
        return rankA - rankB;
      })
      .map(row => mapProductRow(row, ingredientMap))
      .filter(product => product.is_best_seller)
      .slice(0, 6);
  },

  getCategories: async (): Promise<Category[]> => {
    return fetchCategories();
  },

  getKitchenOrders: async (): Promise<KitchenTicket[]> => {
    const response = await selectOrdersQuery()
      .in('estado_cocina', ['recibido', 'no_enviado'])
      .neq('statut', 'finalisee');
    const rows = unwrap<SupabaseOrderRow[]>(response as SupabaseResponse<SupabaseOrderRow[]>);
    const orders = await Promise.all(rows.map(row => ensureOrderHasItems(mapOrderRow(row))));

    const tickets: KitchenTicket[] = [];

    const eligibleOrders = orders.filter(isKitchenEligibleOrder);

    eligibleOrders.forEach(order => {
      const sentItems = order.items.filter(item => item.estado === 'enviado');
      const itemsForTicket =
        sentItems.length > 0
          ? sentItems
          : isTakeawayLikeOrder(order)
            ? order.items
            : [];

      if (itemsForTicket.length === 0) {
        return;
      }

      const groups = itemsForTicket.reduce((acc, item) => {
        const key = item.date_envoi ?? order.date_envoi_cuisine ?? order.date_creation;
        const group = acc.get(key) ?? [];
        group.push(item);
        acc.set(key, group);
        return acc;
      }, new Map<number, OrderItem[]>());

      groups.forEach((items, key) => {
        tickets.push({
          ...order,
          items,
          date_envoi_cuisine: key,
          ticketKey: `${order.id}-${key}`,
        });
      });
    });

    return tickets.sort((a, b) => {
      const aTime = a.date_envoi_cuisine ?? a.date_creation;
      const bTime = b.date_envoi_cuisine ?? b.date_creation;
      return aTime - bTime;
    });
  },

  getTakeawayOrders: async (): Promise<{ pending: Order[]; ready: Order[] }> => {
    const response = await selectOrdersQuery().in('type', TAKEAWAY_ORDER_TYPES);
    const rows = unwrap<SupabaseOrderRow[]>(response as SupabaseResponse<SupabaseOrderRow[]>);
    const orders = await Promise.all(rows.map(row => ensureOrderHasItems(mapOrderRow(row))));
    return {
      pending: orders.filter(order => order.statut === 'pendiente_validacion'),
      ready: orders.filter(order => order.estado_cocina === 'listo'),
    };
  },

  getOrderById: async (orderId: string): Promise<Order | undefined> => {
    const order = await fetchOrderById(orderId);
    return order ?? undefined;
  },

  createOrGetOrderByTableId: async (tableId: string): Promise<Order> => {
    const tableResponse = await supabase
      .from('restaurant_tables')
      .select('id, nom, capacite, statut, commande_id, couverts')
      .eq('id', tableId)
      .maybeSingle();
    const tableRow = unwrapMaybe<SupabaseTableRow>(tableResponse as SupabaseResponse<SupabaseTableRow | null>);

    if (!tableRow) {
      throw new Error('Table not found');
    }

    if (tableRow.commande_id) {
      const existingOrder = await fetchOrderById(tableRow.commande_id);
      if (existingOrder) {
        return existingOrder;
      }
    }

    const nowIso = new Date().toISOString();
    const insertResponse = await supabase
      .from('orders')
      .insert({
        type: 'sur_place',
        table_id: tableRow.id,
        table_nom: tableRow.nom,
        couverts: tableRow.couverts ?? tableRow.capacite,
        statut: 'en_cours',
        estado_cocina: 'no_enviado',
        date_creation: nowIso,
        payment_status: 'unpaid',
        total: 0,
      })
      .select('*')
      .single();
    const insertedRow = unwrap<SupabaseOrderRow>(insertResponse as SupabaseResponse<SupabaseOrderRow>);

    await supabase
      .from('restaurant_tables')
      .update({
        statut: 'en_cuisine',
        commande_id: insertedRow.id,
        couverts: tableRow.couverts ?? tableRow.capacite,
      })
      .eq('id', tableId);

    publishOrderChange();
    return mapOrderRow(insertedRow);
  },

  cancelUnsentTableOrder: async (orderId: string): Promise<void> => {
    const existingOrder = await fetchOrderById(orderId);
    if (!existingOrder) {
      return;
    }

    const hasBeenSent = existingOrder.estado_cocina !== 'no_enviado'
      || existingOrder.items.some(item => item.estado !== 'en_attente');

    if (hasBeenSent) {
      return;
    }

    await supabase.from('order_items').delete().eq('order_id', orderId);
    await supabase.from('orders').delete().eq('id', orderId);

    if (existingOrder.table_id) {
      await supabase
        .from('restaurant_tables')
        .update({ statut: 'libre', commande_id: null, couverts: null })
        .eq('id', existingOrder.table_id);
    }

    publishOrderChange();
  },

  updateOrder: async (
    orderId: string,
    updates: Partial<Order> & { removedItemIds?: string[] },
    options?: PublishOrderChangeOptions,
  ): Promise<Order> => {
    const existingOrder = await fetchOrderById(orderId);
    if (!existingOrder) {
      throw new Error('Order not found');
    }

    let items = existingOrder.items;
    if (updates.items) {
      const payload = updates.items.map(item => {
        const payloadItem: Record<string, unknown> = {
          order_id: orderId,
          produit_id: item.produitRef,
          nom_produit: item.nom_produit,
          prix_unitaire: item.prix_unitaire,
          quantite: item.quantite,
          excluded_ingredients: item.excluded_ingredients,
          commentaire: item.commentaire,
          estado: item.estado,
          date_envoi: toIsoString(item.date_envoi) ?? null,
        };

        if (isUuid(item.id)) {
          payloadItem.id = item.id;
        }

        return payloadItem;
      });

      if (payload.length > 0) {
        await supabase.from('order_items').upsert(payload, { defaultToNull: false });
      }
      items = updates.items;
    }

    const { items: _, clientInfo, removedItemIds = [], ...rest } = updates;
    const payload: Record<string, unknown> = {};

    if (rest.type) payload.type = rest.type;
    if (rest.table_id !== undefined) payload.table_id = rest.table_id;
    if (rest.table_nom !== undefined) payload.table_nom = rest.table_nom;
    if (rest.couverts !== undefined) payload.couverts = rest.couverts;
    if (rest.statut) payload.statut = rest.statut;
    if (rest.estado_cocina) payload.estado_cocina = rest.estado_cocina;
    if (rest.payment_status) payload.payment_status = rest.payment_status;
    if (rest.payment_method !== undefined) payload.payment_method = rest.payment_method;
    if (rest.payment_receipt_url !== undefined) payload.payment_receipt_url = rest.payment_receipt_url;
    if (rest.receipt_url !== undefined) payload.receipt_url = rest.receipt_url;
    if (rest.total !== undefined) payload.total = rest.total;
    if (rest.profit !== undefined) payload.profit = rest.profit;

    if (rest.date_creation !== undefined) payload.date_creation = toIsoString(rest.date_creation);
    if (rest.date_envoi_cuisine !== undefined) payload.date_envoi_cuisine = toIsoString(rest.date_envoi_cuisine);
    if (rest.date_listo_cuisine !== undefined) payload.date_listo_cuisine = toIsoString(rest.date_listo_cuisine);
    if (rest.date_servido !== undefined) payload.date_servido = toIsoString(rest.date_servido);

    if (updates.items) {
      payload.total = updates.items.reduce((sum, item) => sum + item.prix_unitaire * item.quantite, 0);
    }

    const persistedIdsToDelete = removedItemIds.filter(id => isUuid(id));
    if (persistedIdsToDelete.length > 0) {
      await supabase.from('order_items').delete().in('id', persistedIdsToDelete);
    }

    if (clientInfo) {
      payload.client_nom = clientInfo?.nom ?? null;
      payload.client_telephone = clientInfo?.telephone ?? null;
      payload.client_adresse = clientInfo?.adresse ?? null;
    }

    if (Object.keys(payload).length > 0) {
      await supabase.from('orders').update(payload).eq('id', orderId);
    }

    publishOrderChange({ includeNotifications: options?.includeNotifications ?? true });
    const updatedOrder = await fetchOrderById(orderId);
    if (!updatedOrder) {
      throw new Error('Order not found after update');
    }

    if (updates.items) {
      return {
        ...updatedOrder,
        items: reorderOrderItems(updates.items, updatedOrder.items),
      };
    }

    return updatedOrder;
  },

  sendOrderToKitchen: async (orderId: string, itemIds?: string[]): Promise<Order> => {
    const order = await fetchOrderById(orderId);
    if (!order) {
      throw new Error('Order not found');
    }

    const pendingItems = order.items.filter(item => item.estado === 'en_attente');

    const itemsToSend = (() => {
      if (!itemIds || itemIds.length === 0) {
        return pendingItems;
      }

      const idsToSend = new Set(itemIds);
      return pendingItems.filter(item => idsToSend.has(item.id));
    })();

    if (itemsToSend.length === 0) {
      return order;
    }

    const persistedIds = itemsToSend.filter(item => isUuid(item.id)).map(item => item.id);
    if (persistedIds.length === 0) {
      return order;
    }

    const nowIso = new Date().toISOString();
    await supabase
      .from('order_items')
      .update({ estado: 'enviado', date_envoi: nowIso })
      .in('id', persistedIds);

    await supabase
      .from('orders')
      .update({ estado_cocina: 'recibido', date_envoi_cuisine: nowIso })
      .eq('id', orderId);

    if (order.table_id) {
      await supabase
        .from('restaurant_tables')
        .update({ statut: 'en_cuisine' })
        .eq('id', order.table_id);
    }

    publishOrderChange();
    const updatedOrder = await fetchOrderById(orderId);
    if (!updatedOrder) {
      throw new Error('Order not found after sending to kitchen');
    }
    return updatedOrder;
  },

  markOrderAsReady: async (orderId: string, ticketTimestamp?: number): Promise<Order> => {
    const nowIso = new Date().toISOString();
    const order = await fetchOrderById(orderId);
    
    if (!order) {
      throw new Error('Order not found');
    }

    // If ticketTimestamp is provided, only mark items from that specific ticket as ready
    if (ticketTimestamp !== undefined) {
      // Get all items for this order
      const itemsToUpdate = order.items.filter(item => {
        const itemTimestamp = item.date_envoi ?? order.date_envoi_cuisine ?? order.date_creation;
        return itemTimestamp === ticketTimestamp;
      });

      // Update each item's estado to 'listo'
      for (const item of itemsToUpdate) {
        await supabase
          .from('order_items')
          .update({ estado: 'listo' })
          .eq('id', item.id);
      }

      // Check if ALL items in the order are now ready
      const allItemsReady = order.items.every(item => {
        const itemTimestamp = item.date_envoi ?? order.date_envoi_cuisine ?? order.date_creation;
        return itemTimestamp === ticketTimestamp || item.estado === 'listo' || item.estado === 'servido';
      });

      if (allItemsReady) {
        await supabase
          .from("orders")
          .update({ estado_cocina: "listo", date_listo_cuisine: nowIso })
          .eq("id", orderId);
      }

      if (order.table_id) {
        await updateTableStatusBasedOnOrders(order.table_id);
      }

      publishOrderChange();
      const updatedOrder = await fetchOrderById(orderId);
      if (!updatedOrder) {
        throw new Error('Order not found after ready update');
      }
      return updatedOrder;
    }

    publishOrderChange();
    const updatedOrder = await fetchOrderById(orderId);
    if (!updatedOrder) {
      throw new Error('Order not found after ready update');
    }
    return updatedOrder;
  },

  markOrderAsServed: async (orderId: string): Promise<Order> => {
    const existingOrder = await fetchOrderById(orderId);
    if (!existingOrder) {
      throw new Error("Order not found");
    }

    const nowIso = new Date().toISOString();
    await supabase
      .from("orders")
      .update({ estado_cocina: "servido", date_servido: nowIso })
      .eq("id", orderId);

    // Update individual order items to 'servido'
    await supabase
      .from("order_items")
      .update({ estado: "servido" })
      .eq("order_id", orderId)
      .eq("estado", "listo"); // Only mark items that were 'listo'

    if (existingOrder.table_id) {
      await updateTableStatusBasedOnOrders(existingOrder.table_id);
    }

    publishOrderChange();
    const updatedOrder = await fetchOrderById(orderId);
    if (!updatedOrder) {
      throw new Error("Order not found after serve update");
    }
    return updatedOrder;
  },

  finalizeOrder: async (orderId: string, paymentMethod: Order['payment_method'], receiptUrl?: string): Promise<Order> => {
    const order = await fetchOrderById(orderId);
    if (!order) {
      throw new Error('Order not found');
    }

    const nowIso = new Date().toISOString();
    await supabase
      .from('orders')
      .update({
        statut: 'finalisee',
        payment_status: 'paid',
        payment_method: paymentMethod,
        payment_receipt_url: receiptUrl ?? null,
        date_servido: nowIso,
      })
      .eq('id', orderId);

    if (order.table_id) {
      await updateTableStatusBasedOnOrders(order.table_id);
    }

    publishOrderChange();
    const updatedOrder = await fetchOrderById(orderId);
    if (!updatedOrder) {
      throw new Error('Order not found after finalization');
    }
    const totalProfit = await createSalesEntriesForOrder(updatedOrder);
    return { ...updatedOrder, profit: totalProfit };
  },

  submitCustomerOrder: async (orderData: {
    items: OrderItem[];
    clientInfo: Order['clientInfo'];
    receipt_url?: string;
    payment_method?: Order['payment_method'];
  }): Promise<Order> => {
    const now = new Date();
    const nowIso = now.toISOString();

    const insertResponse = await supabase
      .from('orders')
      .insert({
        type: 'pedir_en_linea',
        couverts: 1,
        statut: 'pendiente_validacion',
        estado_cocina: 'no_enviado',
        date_creation: nowIso,
        payment_status: 'unpaid',
        payment_method: orderData.payment_method ?? null,
        total: orderData.items.reduce((sum, item) => sum + item.prix_unitaire * item.quantite, 0),
        client_nom: orderData.clientInfo?.nom ?? null,
        client_telephone: orderData.clientInfo?.telephone ?? null,
        client_adresse: orderData.clientInfo?.adresse ?? null,
        receipt_url: orderData.receipt_url ?? null,
      })
      .select('*')
      .single();
    const orderRow = unwrap<SupabaseOrderRow>(insertResponse as SupabaseResponse<SupabaseOrderRow>);

    if (orderData.items.length > 0) {
      const itemsPayload = orderData.items.map(item => {
        const payloadItem: Record<string, unknown> = {
          order_id: orderRow.id,
          // Convert empty string or invalid UUID to null for special items (e.g., delivery fee)
          produit_id: item.produitRef && isUuid(item.produitRef) ? item.produitRef : null,
          nom_produit: item.nom_produit,
          prix_unitaire: item.prix_unitaire,
          quantite: item.quantite,
          excluded_ingredients: item.excluded_ingredients,
          commentaire: item.commentaire,
          estado: item.estado,
          date_envoi: item.date_envoi ? new Date(item.date_envoi).toISOString() : null,
        };

        if (isUuid(item.id)) {
          payloadItem.id = item.id;
        }

        return payloadItem;
      });

      const insertItemsResponse = await supabase
        .from('order_items')
        .insert(itemsPayload, { defaultToNull: false });

      if (insertItemsResponse.error) {
        console.error('Failed to insert order items:', insertItemsResponse.error);
        throw new Error(`Failed to insert order items: ${insertItemsResponse.error.message}`);
      }
    }

    publishOrderChange();
    const enrichedOrder = await fetchOrderById(orderRow.id);
    if (!enrichedOrder) {
      throw new Error('Order not found after creation');
    }
    return enrichedOrder;
  },

  getCustomerOrderStatus: async (orderId: string): Promise<Order | null> => {
    return fetchOrderById(orderId);
  },

  validateTakeawayOrder: async (orderId: string): Promise<Order> => {
    const nowIso = new Date().toISOString();
    await supabase
      .from('orders')
      .update({
        statut: 'en_cours',
        estado_cocina: 'recibido',
        payment_status: 'paid',
        date_envoi_cuisine: nowIso,
      })
      .eq('id', orderId);

    await supabase
      .from('order_items')
      .update({ estado: 'enviado', date_envoi: nowIso })
      .eq('order_id', orderId);

    publishOrderChange();
    const updatedOrder = await fetchOrderById(orderId);
    if (!updatedOrder) {
      throw new Error('Order not found after validation');
    }
    return updatedOrder;
  },

  markTakeawayAsDelivered: async (orderId: string): Promise<Order> => {
    await supabase
      .from('orders')
      .update({
        statut: 'finalisee',
        estado_cocina: 'entregada',
        payment_method: 'transferencia',
      })
      .eq('id', orderId);

    publishOrderChange();
    const updatedOrder = await fetchOrderById(orderId);
    if (!updatedOrder) {
      throw new Error('Order not found after delivery');
    }
    const totalProfit = await createSalesEntriesForOrder(updatedOrder);
    return { ...updatedOrder, profit: totalProfit };
  },

  getNotificationCounts: async (): Promise<NotificationCounts> => {
    const response = await selectOrdersQuery();
    const rows = unwrap<SupabaseOrderRow[]>(response as SupabaseResponse<SupabaseOrderRow[]>);
    const orders = rows.map(mapOrderRow);

    return {
      pendingTakeaway: orders.filter(order => isTakeawayLikeOrder(order) && order.statut === 'pendiente_validacion').length,
      readyTakeaway: orders.filter(order => isTakeawayLikeOrder(order) && order.estado_cocina === 'listo').length,
      kitchenOrders: (await api.getKitchenOrders()).length,
      lowStockIngredients: (await fetchIngredients()).filter(
        ingredient => ingredient.stock_actuel <= ingredient.stock_minimum,
      ).length,
      readyForService: orders.filter(order => order.type === 'sur_place' && order.estado_cocina === 'listo').length,
    };
  },

  generateDailyReport: async (): Promise<DailyReport> => {
    const now = new Date();
    const start = getBusinessDayStart(now);
    const startIso = start.toISOString();

    clearRoleLoginsBefore(startIso);

    const [ordersResponse, categories, ingredients, productRowsResponse] = await Promise.all([
      selectOrdersQuery().eq('statut', 'finalisee'),
      fetchCategories(),
      fetchIngredients(),
      runProductsQueryWithFallback(query => query),
    ]);
    let roleLoginsResult: RoleLogin[] = [];
    let roleLoginsUnavailable = false;
    try {
      roleLoginsResult = await fetchRoleLoginsSince(startIso);
    } catch (error) {
      console.warn('Failed to fetch role logins for daily report', error);
      roleLoginsUnavailable = true;
    }
    const rows = unwrap<SupabaseOrderRow[]>(ordersResponse as SupabaseResponse<SupabaseOrderRow[]>);
    const allOrders = rows.map(mapOrderRow);
    const startTime = start.getTime();
    const endTime = now.getTime();
    const orders = allOrders.filter(order => {
      const referenceDate = order.date_servido ?? order.date_listo_cuisine ?? order.date_creation;
      return referenceDate >= startTime && referenceDate <= endTime;
    });

    const ventesDuJour = orders.reduce((sum, order) => sum + order.total, 0);
    const clientsDuJour = orders.reduce((sum, order) => sum + order.couverts, 0);
    const panierMoyen = orders.length > 0 ? ventesDuJour / orders.length : 0;

    const ingredientMap = new Map(ingredients.map(ingredient => [ingredient.id, ingredient]));
    const productRows = unwrap<SupabaseProductRow[]>(productRowsResponse as SupabaseResponse<SupabaseProductRow[]>);
    const productMap = new Map(
      productRows.map(row => {
        const product = mapProductRow(row, ingredientMap);
        return [product.id, product] as const;
      }),
    );

    const categoryMap = new Map(categories.map(category => [category.id, category.nom]));

    const soldProductsByCategory = new Map<string, { categoryName: string; products: SoldProduct[] }>();
    orders.forEach(order => {
      order.items.forEach(item => {
        const product = productMap.get(item.produitRef);
        const categoryName = product ? categoryMap.get(product.categoria_id) ?? 'Sans catégorie' : 'Sans catégorie';
        const categoryId = product ? product.categoria_id : 'unknown';
        const entry = soldProductsByCategory.get(categoryId) ?? { categoryName, products: [] };
        const existingProduct = entry.products.find(productItem => productItem.id === item.produitRef);
        if (existingProduct) {
          existingProduct.quantity += item.quantite;
          existingProduct.totalSales += item.prix_unitaire * item.quantite;
        } else {
          entry.products.push({
            id: item.produitRef,
            name: item.nom_produit,
            quantity: item.quantite,
            totalSales: item.prix_unitaire * item.quantite,
          });
        }
        soldProductsByCategory.set(categoryId, entry);
      });
    });

    soldProductsByCategory.forEach(category => {
      category.products.sort((a, b) => b.quantity - a.quantity);
    });

    const ingredientsStockBas = ingredients.filter(
      ingredient => ingredient.stock_actuel <= ingredient.stock_minimum,
    );

    return {
      generatedAt: now.toISOString(),
      startDate: start.toISOString(),
      clientsDuJour,
      panierMoyen,
      ventesDuJour,
      soldProducts: Array.from(soldProductsByCategory.values()),
      lowStockIngredients: ingredientsStockBas,
      roleLogins: roleLoginsResult,
      roleLoginsUnavailable,
    };
  },

  getSalesHistory: async (): Promise<Sale[]> => {
    const response = await supabase.from('sales').select('*').order('sale_date', { ascending: false });
    const rows = unwrap<SupabaseSaleRow[]>(response as SupabaseResponse<SupabaseSaleRow[]>);
    return rows.map(mapSaleRow);
  },

  getFinalizedOrders: async (): Promise<Order[]> => {
    const response = await selectOrdersQuery().eq('statut', 'finalisee');
    const rows = unwrap<SupabaseOrderRow[]>(response as SupabaseResponse<SupabaseOrderRow[]>);
    return rows.map(mapOrderRow);
  },

  addIngredient: async (
    newIngredientData: Omit<Ingredient, 'id' | 'stock_actuel' | 'prix_unitaire'>,
  ): Promise<Ingredient> => {
    const response = await supabase
      .from('ingredients')
      .insert({
        nom: newIngredientData.nom,
        unite: newIngredientData.unite,
        stock_minimum: newIngredientData.stock_minimum,
        stock_actuel: 0,
        prix_unitaire: 0,
      })
      .select('id, nom, unite, stock_minimum, stock_actuel, prix_unitaire')
      .single();
    const row = unwrap<SupabaseIngredientRow>(response as SupabaseResponse<SupabaseIngredientRow>);
    notificationsService.publish('notifications_updated');
    return mapIngredientRow(row);
  },

  updateIngredient: async (
    ingredientId: string,
    updates: Partial<Omit<Ingredient, 'id'>>,
  ): Promise<Ingredient> => {
    const response = await supabase
      .from('ingredients')
      .update(updates)
      .eq('id', ingredientId)
      .select('id, nom, unite, stock_minimum, stock_actuel, prix_unitaire')
      .single();
    const row = unwrap<SupabaseIngredientRow>(response as SupabaseResponse<SupabaseIngredientRow>);
    notificationsService.publish('notifications_updated');
    return mapIngredientRow(row);
  },

  deleteIngredient: async (ingredientId: string): Promise<{ success: boolean }> => {
    const relatedRecipesResponse = await supabase
      .from('product_recipes')
      .select('ingredient_id, product_id, qte_utilisee')
      .eq('ingredient_id', ingredientId)
      .limit(1);

    const relatedRecipes = unwrap<SupabaseRecipeRow[]>(
      relatedRecipesResponse as SupabaseResponse<SupabaseRecipeRow[]>,
    );

    if (relatedRecipes.length > 0) {
      throw new Error("Impossible de supprimer l'ingrédient car il est utilisé dans une recette.");
    }

    await supabase.from('ingredients').delete().eq('id', ingredientId);
    notificationsService.publish('notifications_updated');
    return { success: true };
  },

  resupplyIngredient: async (ingredientId: string, quantity: number, unitPrice: number): Promise<Ingredient> => {
    const ingredientResponse = await supabase
      .from('ingredients')
      .select('id, nom, unite, stock_minimum, stock_actuel, prix_unitaire')
      .eq('id', ingredientId)
      .maybeSingle();
    const ingredientRow = unwrapMaybe<SupabaseIngredientRow>(
      ingredientResponse as SupabaseResponse<SupabaseIngredientRow | null>,
    );
    if (!ingredientRow) {
      throw new Error('Ingredient not found');
    }

    const currentStockValue = ingredientRow.prix_unitaire * ingredientRow.stock_actuel;
    const totalCost = quantity * unitPrice;
    const newStock = ingredientRow.stock_actuel + quantity;
    const newWeightedPrice = newStock > 0 ? (currentStockValue + totalCost) / newStock : 0;

    await supabase
      .from('ingredients')
      .update({
        stock_actuel: newStock,
        prix_unitaire: Number.isFinite(newWeightedPrice) ? newWeightedPrice : 0,
      })
      .eq('id', ingredientId);

    await supabase.from('purchases').insert({
      ingredient_id: ingredientId,
      quantite_achetee: quantity,
      prix_total: totalCost,
      date_achat: new Date().toISOString(),
    });

    notificationsService.publish('notifications_updated');
    const refreshedIngredient = await supabase
      .from('ingredients')
      .select('id, nom, unite, stock_minimum, stock_actuel, prix_unitaire')
      .eq('id', ingredientId)
      .single();
    const refreshedRow = unwrap<SupabaseIngredientRow>(refreshedIngredient as SupabaseResponse<SupabaseIngredientRow>);
    return mapIngredientRow(refreshedRow);
  },

  addProduct: async (product: Omit<Product, 'id'>): Promise<Product> => {
    const insertResponse = await supabase
      .from('products')
      .insert({
        nom_produit: product.nom_produit,
        description: product.description ?? null,
        prix_vente: product.prix_vente,
        categoria_id: product.categoria_id,
        estado: product.estado,
        image: normalizeCloudinaryImageUrl(product.image),
        is_best_seller: product.is_best_seller,
        best_seller_rank: product.is_best_seller ? product.best_seller_rank : null,
      })
      .select('id')
      .single();
    const insertedRow = unwrap<{ id: string }>(insertResponse as SupabaseResponse<{ id: string }>);

    if (product.recipe.length > 0) {
      await supabase.from('product_recipes').insert(
        product.recipe.map(item => ({
          product_id: insertedRow.id,
          ingredient_id: item.ingredient_id,
          qte_utilisee: item.qte_utilisee,
        })),
      );
    }

    notificationsService.publish('notifications_updated');
    const productsResponse = await runProductsQueryWithFallback(
      query => query.eq('id', insertedRow.id).single(),
    );
    const productRow = unwrap<SupabaseProductRow>(productsResponse as SupabaseResponse<SupabaseProductRow>);
    const ingredients = await fetchIngredients();
    const ingredientMap = new Map(ingredients.map(ingredient => [ingredient.id, ingredient]));
    return mapProductRow(productRow, ingredientMap);
  },

  updateProduct: async (productId: string, updates: Partial<Product>): Promise<Product> => {
    const { recipe, ...rest } = updates;

    const updatePayload: Record<string, unknown> = {};

    if (rest.nom_produit !== undefined) {
      updatePayload.nom_produit = rest.nom_produit;
    }

    if (rest.description !== undefined) {
      updatePayload.description = rest.description ?? null;
    }

    if (rest.prix_vente !== undefined) {
      updatePayload.prix_vente = rest.prix_vente;
    }

    if (rest.categoria_id !== undefined) {
      updatePayload.categoria_id = rest.categoria_id;
    }

    if (rest.estado !== undefined) {
      updatePayload.estado = rest.estado;
    }

    if (rest.image !== undefined) {
      updatePayload.image = normalizeCloudinaryImageUrl(rest.image);
    }

    if (rest.best_seller_rank !== undefined) {
      updatePayload.best_seller_rank = rest.best_seller_rank;
    }

    if (rest.is_best_seller !== undefined) {
      updatePayload.is_best_seller = rest.is_best_seller;
      if (!rest.is_best_seller) {
        updatePayload.best_seller_rank = null;
      }
    }

    if (Object.keys(updatePayload).length > 0) {
      const updateResponse = await supabase.from('products').update(updatePayload).eq('id', productId);
      unwrap(updateResponse as SupabaseResponse<unknown>);
    }

    if (recipe) {
      const deleteRecipeResponse = await supabase.from('product_recipes').delete().eq('product_id', productId);
      unwrap(deleteRecipeResponse as SupabaseResponse<unknown>);
      if (recipe.length > 0) {
        const insertRecipeResponse = await supabase.from('product_recipes').insert(
          recipe.map(item => ({
            product_id: productId,
            ingredient_id: item.ingredient_id,
            qte_utilisee: item.qte_utilisee,
          })),
        );
        unwrap(insertRecipeResponse as SupabaseResponse<unknown>);
      }
    }

    notificationsService.publish('notifications_updated');
    const productsResponse = await runProductsQueryWithFallback(
      query => query.eq('id', productId).single(),
    );
    const productRow = unwrap<SupabaseProductRow>(productsResponse as SupabaseResponse<SupabaseProductRow>);
    const ingredients = await fetchIngredients();
    const ingredientMap = new Map(ingredients.map(ingredient => [ingredient.id, ingredient]));
    return mapProductRow(productRow, ingredientMap);
  },

  deleteProduct: async (productId: string): Promise<void> => {
    await supabase.from('product_recipes').delete().eq('product_id', productId);
    await supabase.from('products').delete().eq('id', productId);
    notificationsService.publish('notifications_updated');
  },

  addCategory: async (name: string): Promise<Category> => {
    const response = await supabase
      .from('categories')
      .insert({ nom: name })
      .select('id, nom')
      .single();
    const row = unwrap<SupabaseCategoryRow>(response as SupabaseResponse<SupabaseCategoryRow>);
    notificationsService.publish('notifications_updated');
    return mapCategoryRow(row);
  },

  deleteCategory: async (categoryId: string): Promise<void> => {
    await supabase.from('categories').delete().eq('id', categoryId);
    notificationsService.publish('notifications_updated');
  },
};

