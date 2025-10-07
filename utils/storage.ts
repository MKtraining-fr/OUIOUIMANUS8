/**
 * Clé utilisée pour stocker l'ID de la commande active du client dans le localStorage
 */
const ACTIVE_CUSTOMER_ORDER_KEY = 'ouiouitacos_active_order';

/**
 * Stocke l'ID de la commande active du client dans le localStorage
 * @param orderId ID de la commande à stocker
 */
export const storeActiveCustomerOrder = (orderId: string): void => {
  try {
    localStorage.setItem(ACTIVE_CUSTOMER_ORDER_KEY, orderId);
  } catch (error) {
    console.error('Erreur lors du stockage de la commande active:', error);
  }
};

/**
 * Récupère l'ID de la commande active du client depuis le localStorage
 * @returns ID de la commande active ou null si aucune commande n'est active
 */
export const getActiveCustomerOrder = (): string | null => {
  try {
    return localStorage.getItem(ACTIVE_CUSTOMER_ORDER_KEY);
  } catch (error) {
    console.error('Erreur lors de la récupération de la commande active:', error);
    return null;
  }
};

/**
 * Supprime l'ID de la commande active du client du localStorage
 */
export const clearActiveCustomerOrder = (): void => {
  try {
    localStorage.removeItem(ACTIVE_CUSTOMER_ORDER_KEY);
  } catch (error) {
    console.error('Erreur lors de la suppression de la commande active:', error);
  }
};
