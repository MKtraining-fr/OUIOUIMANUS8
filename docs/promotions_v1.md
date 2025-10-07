# Système de Promotions - Version 1 (Backend)

Ce document décrit la première version du système de promotions pour OUIOUITACOS, qui se concentre sur la mise en place de la structure de données et du backend.

## Structure de Données

### Tables Supabase

#### Table `promotions`

Cette table stocke les informations sur les promotions disponibles.

| Colonne | Type | Description |
|---------|------|-------------|
| id | UUID | Identifiant unique de la promotion |
| name | TEXT | Nom de la promotion |
| type | TEXT | Type de promotion (percentage, fixed_amount, promo_code, buy_x_get_y, free_product, free_shipping, combo, threshold, happy_hour) |
| status | TEXT | Statut de la promotion (active, inactive, scheduled, expired) |
| priority | INTEGER | Priorité d'application (plus le nombre est élevé, plus la priorité est haute) |
| conditions | JSONB | Conditions d'application de la promotion (JSON) |
| discount | JSONB | Valeur de la réduction (JSON) |
| visuals | JSONB | Éléments visuels de la promotion (JSON) |
| created_at | TIMESTAMPTZ | Date de création |
| updated_at | TIMESTAMPTZ | Date de dernière mise à jour |
| usage_count | INTEGER | Nombre d'utilisations |

#### Table `promotion_usages`

Cette table enregistre chaque utilisation d'une promotion.

| Colonne | Type | Description |
|---------|------|-------------|
| id | UUID | Identifiant unique de l'utilisation |
| promotion_id | UUID | Référence à la promotion utilisée |
| order_id | UUID | Référence à la commande concernée |
| customer_phone | TEXT | Numéro de téléphone du client (pour suivre l'utilisation par client) |
| discount_amount | NUMERIC | Montant de la réduction appliquée |
| applied_at | TIMESTAMPTZ | Date d'application |

### Modifications de la table `orders`

La table `orders` a été modifiée pour supporter les promotions :

| Colonne | Type | Description |
|---------|------|-------------|
| subtotal | NUMERIC | Montant avant réduction |
| total_discount | NUMERIC | Montant total des réductions |
| promo_code | TEXT | Code promo utilisé |
| applied_promotions | JSONB | Liste des promotions appliquées |

## Types TypeScript

Les types suivants ont été ajoutés pour supporter les promotions :

- `PromotionType` : Énumération des types de promotions disponibles
- `PromotionStatus` : Énumération des statuts possibles pour une promotion
- `PromotionConditions` : Interface pour les conditions d'application d'une promotion
- `PromotionDiscount` : Interface pour la valeur de la réduction
- `PromotionVisuals` : Interface pour les éléments visuels de la promotion
- `Promotion` : Interface principale pour une promotion
- `PromotionUsage` : Interface pour l'utilisation d'une promotion

L'interface `Order` a été étendue pour inclure les champs liés aux promotions.

## API Services

Le fichier `services/promotionsApi.ts` contient les fonctions suivantes :

### Gestion des promotions

- `fetchPromotions()` : Récupère toutes les promotions
- `fetchPromotionById(id)` : Récupère une promotion par son ID
- `fetchActivePromotions()` : Récupère les promotions actives
- `createPromotion(promotion)` : Crée une nouvelle promotion
- `updatePromotion(id, promotion)` : Met à jour une promotion existante
- `deletePromotion(id)` : Supprime une promotion
- `updatePromotionStatus(id, status)` : Change le statut d'une promotion

### Gestion des codes promo

- `fetchPromotionByCode(code)` : Récupère un code promo par son code

### Gestion des utilisations

- `recordPromotionUsage(usage)` : Enregistre l'utilisation d'une promotion
- `fetchPromotionUsages(promotionId)` : Récupère les utilisations d'une promotion
- `fetchPromotionUsagesByCustomer(promotionId, customerPhone)` : Récupère les utilisations d'une promotion par un client
- `canCustomerUsePromotion(promotionId, customerPhone)` : Vérifie si un client peut utiliser une promotion
- `canPromotionBeUsed(promotionId)` : Vérifie si une promotion peut encore être utilisée

### Application des promotions

- `isPromotionApplicableToOrder(promotion, order)` : Vérifie si une promotion est applicable à une commande
- `calculatePromotionDiscount(promotion, order)` : Calcule le montant de réduction pour une promotion
- `applyPromotionsToOrder(order)` : Applique les promotions à une commande
- `recordPromotionUsagesForOrder(order)` : Enregistre les utilisations de promotions pour une commande finalisée

## Migration SQL

Le fichier `migrations/promotions_v1.sql` contient les instructions SQL pour :

1. Créer la table `promotions`
2. Créer la table `promotion_usages`
3. Modifier la table `orders` pour supporter les promotions
4. Ajouter des triggers pour la mise à jour automatique des timestamps et le calcul du total après réduction
5. Configurer les politiques de sécurité pour les nouvelles tables

## Comment déployer

1. Exécuter le script SQL de migration sur la base de données Supabase
2. Déployer les nouveaux fichiers TypeScript sur Netlify

## Prochaines étapes

La version 2 se concentrera sur l'interface d'administration des promotions, permettant aux administrateurs de créer et gérer les promotions via une interface utilisateur.
