# Documentation du Système de Promotions v2

## Introduction

Ce document détaille la réimplémentation complète du système de promotions pour l'application OUIOUITACOS. L'objectif de cette refonte est de fournir un système de promotions plus robuste, flexible et maintenable, capable de gérer une variété de types de promotions avec une logique de calcul claire et correcte.

Les principaux objectifs de cette nouvelle version sont :

- **Flexibilité :** Supporter divers types de promotions (pourcentage, montant fixe, 2x1, code promo, livraison gratuite, etc.).
- **Robustesse :** Assurer des calculs de réduction précis et un empilement de promotions prévisible.
- **Maintenabilité :** Fournir une base de code claire et bien documentée pour faciliter les évolutions futures.
- **Interface d'administration complète :** Permettre une gestion facile et complète des promotions depuis l'interface d'administration.

## Modèle de Données

Le système de promotions repose sur un schéma de base de données PostgreSQL et des types TypeScript correspondants pour assurer la cohérence des données à travers l'application.

### Schéma de la Base de Données (SQL)

Le schéma de la base de données est défini dans le fichier `migrations/promotions_v1.sql`. Il introduit la table `promotions` et `promotion_usages`.

**Table `promotions`**

| Colonne | Type | Description |
|---|---|---|
| `id` | `UUID` | Identifiant unique de la promotion. |
| `name` | `TEXT` | Nom de la promotion. |
| `type` | `TEXT` | Type de promotion (ex: 'percentage', 'fixed_amount', 'buy_x_get_y', 'free_shipping'). |
| `status` | `TEXT` | Statut de la promotion ('active', 'inactive', 'scheduled', 'expired'). |
| `priority` | `INTEGER` | Priorité d'application de la promotion (plus le nombre est élevé, plus la priorité est haute). |
| `conditions` | `JSONB` | Conditions d'application de la promotion (montant minimum, dates, etc.). |
| `discount` | `JSONB` | Configuration de la réduction (valeur, type de réduction, etc.). |
| `visuals` | `JSONB` | Informations pour l'affichage de la promotion (bannières, badges). |
| `created_at` | `TIMESTAMPTZ` | Date de création de la promotion. |
| `updated_at` | `TIMESTAMPTZ` | Date de la dernière mise à jour. |
| `usage_count` | `INTEGER` | Nombre de fois où la promotion a été utilisée. |

**Table `promotion_usages`**

| Colonne | Type | Description |
|---|---|---|
| `id` | `UUID` | Identifiant unique de l'utilisation. |
| `promotion_id` | `UUID` | Référence à la promotion utilisée. |
| `order_id` | `UUID` | Référence à la commande sur laquelle la promotion a été appliquée. |
| `customer_phone` | `TEXT` | Numéro de téléphone du client. |
| `discount_amount` | `NUMERIC(10, 2)` | Montant de la réduction appliquée. |
| `applied_at` | `TIMESTAMPTZ` | Date d'application de la promotion. |

### Types TypeScript

Les types TypeScript, définis dans `types/promotions.ts`, sont le reflet direct du schéma de la base de données.

```typescript
// Structure complète d'une promotion (correspond à la table `promotions`)
export interface Promotion {
  id: string;
  name: string;
  type: PromotionType;
  status: PromotionStatus;
  priority: number;
  conditions: PromotionConditions;
  discount: PromotionDiscount;
  visuals?: PromotionVisuals;
  created_at: string;
  updated_at: string;
  usage_count: number;
}

// Configuration de la réduction (champ `discount` JSONB)
export interface PromotionDiscount {
  discount_type: 'percentage' | 'fixed_amount' | 'buy_x_get_y';
  discount_value: number;
  applies_to: 'total' | 'products' | 'categories' | 'shipping';
  product_ids?: string[];
  category_ids?: string[];
  buy_x_get_y_config?: BuyXGetYConfig;
  promo_code?: string;
  max_discount_amount?: number;
}

// Conditions d'applicabilité (champ `conditions` JSONB)
export interface PromotionConditions {
  min_order_amount?: number;
  max_order_amount?: number;
  // ... autres conditions
}

// ... autres types
```

## Logique de Calcul des Promotions (`services/promotionsApi.ts`)

Le fichier `services/promotionsApi.ts` centralise toute la logique de calcul et d'application des promotions. La fonction principale est `applyPromotionsToOrder`.

### `applyPromotionsToOrder(order: Order): Promise<Order>`

Cette fonction prend une commande en entrée et retourne une nouvelle commande avec les promotions appliquées. Le processus est le suivant :

1.  **Récupération des promotions actives :** La fonction récupère toutes les promotions avec le statut `active` depuis la base de données.
2.  **Filtrage des promotions applicables :** Chaque promotion est évaluée par rapport à la commande en cours pour vérifier si elle est applicable. Cette vérification se base sur les `conditions` de la promotion (montant de la commande, dates, etc.).
3.  **Tri par priorité :** Les promotions applicables sont triées par ordre de `priority` décroissante.
4.  **Calcul des réductions :** Les réductions sont calculées et appliquées séquentiellement sur le sous-total de la commande. L'ordre d'application est crucial pour la cohérence des calculs.
5.  **Gestion des codes promo :** Si un code promo est présent dans la commande, il est appliqué après les promotions automatiques.
6.  **Retour de la commande mise à jour :** La fonction retourne la commande avec le `total_discount`, le `total` mis à jour et la liste des `applied_promotions`.

### Types de Promotions Gérés

-   **`percentage` :** Applique une réduction en pourcentage sur le total de la commande ou sur des produits/catégories spécifiques.
-   **`fixed_amount` :** Applique une réduction d'un montant fixe.
-   **`buy_x_get_y` :** Offre un ou plusieurs produits gratuits pour un certain nombre de produits achetés (ex: 2x1).
-   **`free_shipping` :** Offre la livraison gratuite. Cette promotion est gérée en déduisant les frais de livraison du total de la commande.
-   **`promo_code` :** Promotion déclenchée par un code spécifique entré par l'utilisateur. Peut être de type `percentage` ou `fixed_amount`.

## Interface d'Administration (`pages/Promotions.tsx`)

L'interface d'administration a été mise à jour pour utiliser la nouvelle API de promotions. Elle permet aux administrateurs de :

-   **Lister les promotions :** Afficher toutes les promotions avec leur statut, type, priorité, etc.
-   **Créer de nouvelles promotions :** Un formulaire modal (`components/promotions/PromotionModal.tsx`) permet de configurer tous les aspects d'une nouvelle promotion.
-   **Modifier les promotions existantes :** Le même formulaire modal est utilisé pour modifier les promotions.
-   **Changer le statut d'une promotion :** Activer ou désactiver une promotion rapidement.
-   **Supprimer des promotions.**

Le formulaire de création/modification de promotion est divisé en plusieurs onglets pour une meilleure organisation :

-   **Général :** Nom, type, statut, priorité.
-   **Conditions :** Montant minimum/maximum de commande, dates de validité, etc.
-   **Réduction :** Type de réduction, valeur, sur quoi elle s'applique.
-   **Affichage :** Configuration des bannières et badges.

## Application Côté Client (`pages/CommandeClient.tsx`)

La page de commande client a été modifiée pour intégrer le nouveau système de promotions.

-   **Calcul dynamique des totaux :** À chaque modification du panier, la fonction `applyPromotionsToOrder` est appelée pour recalculer les totaux en temps réel.
-   **Affichage des promotions appliquées :** Les promotions appliquées sont affichées dans le résumé de la commande, avec le montant de la réduction pour chacune.
-   **Gestion des codes promo :** Un champ permet aux clients d'entrer un code promo, qui est ensuite validé et appliqué par `applyPromotionsToOrder`.
-   **Réinitialisation du panier :** Après la soumission d'une commande, le panier et tous les états liés aux promotions sont correctement réinitialisés pour la prochaine commande.

## Gestion de la Promotion "DOMICILIO GRATIS"

La promotion de livraison gratuite est gérée comme une promotion de type `free_shipping`. Voici comment elle fonctionne :

1.  **Création de la promotion :** Une promotion nommée "DOMICILIO GRATIS" doit être créée dans l'interface d'administration avec le type `free_shipping`.
2.  **Conditions d'application :** Des conditions peuvent être ajoutées, par exemple un montant minimum de commande pour que la livraison gratuite s'applique.
3.  **Application de la promotion :** Lorsque `applyPromotionsToOrder` est exécutée, si la promotion "DOMICILIO GRATIS" est applicable, elle ajoute une réduction équivalente aux frais de livraison (`DOMICILIO_FEE`).
4.  **Affichage côté client :** Dans `CommandeClient.tsx`, l'état `isFreeShipping` est mis à jour en fonction de la présence de la promotion `free_shipping` dans les promotions appliquées. Si `isFreeShipping` est `true`, les frais de livraison sont affichés comme étant de 0.


