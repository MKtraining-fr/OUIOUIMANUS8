export type ActiveCustomerOrder = {
  orderId: string;
  expiresAt?: number;
};

const STORAGE_KEY = 'active-customer-order';
const LEGACY_KEY = 'active-customer-order-id';
export const ONE_DAY_IN_MS = 24 * 60 * 60 * 1000;

const parseStoredOrder = (raw: string | null): ActiveCustomerOrder | null => {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as ActiveCustomerOrder;
    if (parsed && typeof parsed.orderId === 'string' && parsed.orderId.trim().length > 0) {
      return parsed;
    }
  } catch (error) {
    console.error('Failed to parse stored active order', error);
  }

  return null;
};

const persistActiveOrder = (payload: ActiveCustomerOrder | null) => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    if (!payload) {
      window.localStorage.removeItem(STORAGE_KEY);
      window.localStorage.removeItem(LEGACY_KEY);
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    window.localStorage.removeItem(LEGACY_KEY);
  } catch (error) {
    console.error('Failed to persist active order', error);
  }
};

export const getActiveCustomerOrder = (): ActiveCustomerOrder | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  const stored = parseStoredOrder(window.localStorage.getItem(STORAGE_KEY));
  if (stored) {
    if (stored.expiresAt && stored.expiresAt <= Date.now()) {
      persistActiveOrder(null);
      return null;
    }
    return stored;
  }

  const legacyId = window.localStorage.getItem(LEGACY_KEY);
  if (legacyId && legacyId.trim().length > 0) {
    const payload: ActiveCustomerOrder = { orderId: legacyId };
    persistActiveOrder(payload);
    return payload;
  }

  return null;
};

export const storeActiveCustomerOrder = (orderId: string, expiresAt?: number) => {
  if (!orderId) {
    persistActiveOrder(null);
    return;
  }

  const payload: ActiveCustomerOrder = expiresAt
    ? { orderId, expiresAt }
    : { orderId };

  persistActiveOrder(payload);
};

export const clearActiveCustomerOrder = () => {
  persistActiveOrder(null);
};

export const extendActiveCustomerOrder = (durationMs: number) => {
  if (typeof window === 'undefined') {
    return;
  }

  const current = getActiveCustomerOrder();
  if (!current) {
    return;
  }

  storeActiveCustomerOrder(current.orderId, Date.now() + durationMs);
};
