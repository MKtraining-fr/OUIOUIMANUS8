# Documentation du Système de Promotions - OUIOUITACOS

## Vue d'ensemble

Le système de promotions de OUIOUITACOS permet de créer et gérer des promotions flexibles et puissantes pour augmenter les ventes et fidéliser les clients. Le système est entièrement intégré avec Supabase et s'affiche automatiquement sur les cartes produits de la page de commande client.

---

## Architecture du Système

### Structure de la Base de Données

La table `promotions` dans Supabase contient les champs suivants :

| Champ | Type | Description |
|-------|------|-------------|
| `id` | UUID | Identifiant unique de la promotion |
| `name` | VARCHAR(255) | Nom de la promotion |
| `description` | TEXT | Description détaillée (optionnel) |
| `active` | BOOLEAN | Indique si la promotion est active |
| `start_date` | TIMESTAMPTZ | Date de début de la promotion |
| `end_date` | TIMESTAMPTZ | Date de fin (optionnel) |
| `conditions` | JSONB | Tableau de conditions d'application |
| `config` | JSONB | Configuration de la promotion |
| `priority` | INTEGER | Priorité (plus élevé = plus prioritaire) |
| `stackable` | BOOLEAN | Peut être combinée avec d'autres promotions |
| `usage_limit` | INTEGER | Limite d'utilisation totale (optionnel) |
| `usage_count` | INTEGER | Nombre d'utilisations actuelles |
| `created_at` | TIMESTAMPTZ | Date de création |
| `updated_at` | TIMESTAMPTZ | Date de dernière modification |

---

## Types de Promotions Supportés

### 1. Réduction en Pourcentage (`percentage`)
- Applique un pourcentage de réduction sur le total ou sur des produits spécifiques
- Exemple : -20% sur toute la commande

### 2. Réduction en Montant Fixe (`fixed_amount`)
- Applique une réduction d'un montant fixe
- Exemple : -10 000 pesos de réduction

### 3. Code Promotionnel (`promo_code`)
- Nécessite la saisie d'un code pour activer la promotion
- Exemple : Code "BIENVENUE20" pour -20%

### 4. Achetez X, Obtenez Y (`buy_x_get_y`)
- Offre gratuite basée sur la quantité
- Exemple : 2x1 (Achetez 2, obtenez 1 gratuit)

### 5. Produit Gratuit (`free_product`)
- Offre un produit gratuit avec la commande
- Exemple : Boisson gratuite

### 6. Livraison Gratuite (`free_shipping`)
- Annule les frais de livraison
- Exemple : Livraison gratuite dès 80 000 pesos

### 7. Combo (`combo`)
- Prix spécial pour un ensemble de produits
- Exemple : Menu combo à prix réduit

### 8. Réduction par Palier (`threshold`)
- Réduction progressive selon le montant
- Exemple : -5% à partir de 30k, -10% à partir de 50k

### 9. Happy Hour (`happy_hour`)
- Promotion temporelle (heures spécifiques)
- Exemple : -30% entre 14h et 16h

---

## Configuration d'une Promotion

### Structure du Champ `config` (JSONB)

```json
{
  "discount_type": "percentage",
  "discount_value": 20,
  "max_discount_amount": 50000,
  "applies_to": "total",
  "visuals": {
    "badge_text": "-20%",
    "badge_color": "#FFFFFF",
    "badge_bg_color": "#FF6B35",
    "badge_position": "top-right",
    "description": "20% de réduction sur votre commande",
    "icon": "percent"
  },
  "days_of_week": [1, 2, 3, 4, 5],
  "hours_of_day": {
    "start": "14:00",
    "end": "16:00"
  },
  "product_ids": ["id1", "id2"],
  "category_ids": ["cat1", "cat2"],
  "promo_code": "BIENVENUE20",
  "buy_quantity": 2,
  "get_quantity": 1,
  "min_order_amount": 80000,
  "min_items_count": 3,
  "max_uses_per_customer": 1,
  "first_order_only": false
}
```

### Paramètres de Configuration

#### Réduction
- **`discount_type`** : Type de réduction (`"percentage"` ou `"fixed_amount"`)
- **`discount_value`** : Valeur de la réduction (pourcentage ou montant)
- **`max_discount_amount`** : Plafond de réduction (pour les pourcentages)
- **`applies_to`** : Cible de la réduction (`"total"`, `"products"`, `"category"`, `"shipping"`)

#### Éléments Visuels
- **`badge_text`** : Texte affiché sur le badge (ex: "-20%", "2x1", "PROMO")
- **`badge_color`** : Couleur du texte (hex)
- **`badge_bg_color`** : Couleur de fond du badge (hex)
- **`badge_position`** : Position du badge (`"top-left"`, `"top-right"`, `"bottom-left"`, `"bottom-right"`)
- **`description`** : Description affichée au survol
- **`icon`** : Icône à afficher (optionnel)

#### Conditions Temporelles
- **`days_of_week`** : Jours de la semaine (0-6, 0 = dimanche)
- **`hours_of_day`** : Plage horaire (format "HH:MM")

#### Conditions de Produits/Catégories
- **`product_ids`** : Liste des IDs de produits concernés
- **`category_ids`** : Liste des IDs de catégories concernées

#### Conditions de Commande
- **`min_order_amount`** : Montant minimum de commande
- **`min_items_count`** : Nombre minimum d'articles

#### Conditions Spécifiques
- **`promo_code`** : Code promotionnel à saisir
- **`buy_quantity`** : Quantité à acheter (pour buy_x_get_y)
- **`get_quantity`** : Quantité offerte (pour buy_x_get_y)
- **`max_uses_per_customer`** : Limite d'utilisation par client
- **`first_order_only`** : Réservé à la première commande

---

## Structure du Champ `conditions` (JSONB)

Le champ `conditions` est un tableau de conditions qui doivent être remplies pour que la promotion s'applique.

```json
[
  {
    "type": "min_order_amount",
    "value": 80000
  },
  {
    "type": "specific_category",
    "value": ["cat_id_1", "cat_id_2"]
  },
  {
    "type": "specific_product",
    "value": ["prod_id_1", "prod_id_2"]
  }
]
```

### Types de Conditions

- **`specific_product`** : Produits spécifiques (valeur = array d'IDs)
- **`specific_category`** : Catégories spécifiques (valeur = array d'IDs)
- **`min_order_amount`** : Montant minimum (valeur = nombre)
- **`min_items_count`** : Nombre minimum d'articles (valeur = nombre)
- **`promo_code`** : Code promo requis (valeur = string)
- **`buy_x_get_y`** : Achetez X obtenez Y (valeur = objet avec buy_quantity et get_quantity)
- **`threshold`** : Paliers de réduction (valeur = array d'objets)
- **`first_order_only`** : Première commande uniquement (valeur = boolean)

---

## Exemples de Promotions

### Exemple 1 : Réduction de 20% sur toute la commande

```sql
INSERT INTO promotions (
  name,
  description,
  active,
  start_date,
  end_date,
  conditions,
  config,
  priority,
  stackable
) VALUES (
  'Réduction de 20%',
  'Profitez de 20% de réduction sur votre commande',
  true,
  NOW(),
  NOW() + INTERVAL '30 days',
  '[]'::jsonb,
  '{
    "discount_type": "percentage",
    "discount_value": 20,
    "applies_to": "total",
    "visuals": {
      "badge_text": "-20%",
      "badge_color": "#FFFFFF",
      "badge_bg_color": "#FF6B35",
      "badge_position": "top-right"
    }
  }'::jsonb,
  5,
  true
);
```

### Exemple 2 : Livraison gratuite dès 80 000 pesos

```sql
INSERT INTO promotions (
  name,
  description,
  active,
  start_date,
  end_date,
  conditions,
  config,
  priority,
  stackable
) VALUES (
  'Livraison gratuite',
  'Livraison gratuite pour les commandes de 80 000 pesos ou plus',
  true,
  NOW(),
  NOW() + INTERVAL '30 days',
  '[{"type": "min_order_amount", "value": 80000}]'::jsonb,
  '{
    "discount_type": "fixed_amount",
    "discount_value": 0,
    "applies_to": "shipping",
    "min_order_amount": 80000,
    "visuals": {
      "badge_text": "ENVÍO GRATIS",
      "badge_color": "#FFFFFF",
      "badge_bg_color": "#4CAF50",
      "badge_position": "top-right"
    }
  }'::jsonb,
  3,
  true
);
```

### Exemple 3 : 2x1 sur les produits de la catégorie "Los OUI"

```sql
INSERT INTO promotions (
  name,
  description,
  active,
  start_date,
  end_date,
  conditions,
  config,
  priority,
  stackable
) VALUES (
  '2x1 sur Los OUI',
  'Achetez 2 produits Los OUI, obtenez le 3ème gratuit',
  true,
  NOW(),
  NOW() + INTERVAL '7 days',
  '[{"type": "specific_category", "value": ["a9c96354-e454-4e20-a601-5f7ccb0efb5c"]}]'::jsonb,
  '{
    "discount_type": "percentage",
    "discount_value": 33.33,
    "applies_to": "category",
    "category_ids": ["a9c96354-e454-4e20-a601-5f7ccb0efb5c"],
    "buy_quantity": 3,
    "get_quantity": 1,
    "visuals": {
      "badge_text": "2x1",
      "badge_color": "#FFFFFF",
      "badge_bg_color": "#E63946",
      "badge_position": "top-right"
    }
  }'::jsonb,
  10,
  false
);
```

### Exemple 4 : Happy Hour (14h-16h)

```sql
INSERT INTO promotions (
  name,
  description,
  active,
  start_date,
  end_date,
  conditions,
  config,
  priority,
  stackable
) VALUES (
  'Happy Hour',
  'Profitez de 30% de réduction entre 14h et 16h',
  true,
  NOW(),
  NOW() + INTERVAL '90 days',
  '[]'::jsonb,
  '{
    "discount_type": "percentage",
    "discount_value": 30,
    "applies_to": "total",
    "hours_of_day": {
      "start": "14:00",
      "end": "16:00"
    },
    "visuals": {
      "badge_text": "HAPPY HOUR",
      "badge_color": "#FFFFFF",
      "badge_bg_color": "#FF2D55",
      "badge_position": "top-right"
    }
  }'::jsonb,
  8,
  false
);
```

### Exemple 5 : Code Promo "BIENVENUE20"

```sql
INSERT INTO promotions (
  name,
  description,
  active,
  start_date,
  end_date,
  conditions,
  config,
  priority,
  stackable,
  usage_limit
) VALUES (
  'Code BIENVENUE20',
  'Utilisez le code BIENVENUE20 pour -20% sur votre première commande',
  true,
  NOW(),
  NOW() + INTERVAL '365 days',
  '[]'::jsonb,
  '{
    "discount_type": "percentage",
    "discount_value": 20,
    "applies_to": "total",
    "promo_code": "BIENVENUE20",
    "first_order_only": true,
    "max_uses_per_customer": 1,
    "visuals": {
      "badge_text": "CODE PROMO",
      "badge_color": "#FFFFFF",
      "badge_bg_color": "#8E8E93",
      "badge_position": "top-right"
    }
  }'::jsonb,
  7,
  false,
  1000
);
```

---

## Gestion des Promotions

### Créer une Promotion

1. Allez dans l'éditeur SQL de Supabase
2. Utilisez un script SQL INSERT comme les exemples ci-dessus
3. Ajustez les paramètres selon vos besoins
4. Exécutez le script

### Activer/Désactiver une Promotion

```sql
-- Désactiver une promotion
UPDATE promotions 
SET active = false 
WHERE id = 'promotion_id';

-- Activer une promotion
UPDATE promotions 
SET active = true 
WHERE id = 'promotion_id';
```

### Modifier une Promotion

```sql
UPDATE promotions 
SET 
  name = 'Nouveau nom',
  description = 'Nouvelle description',
  config = '{...}'::jsonb
WHERE id = 'promotion_id';
```

### Supprimer une Promotion

```sql
DELETE FROM promotions 
WHERE id = 'promotion_id';
```

---

## Priorité et Stackage

### Priorité

La priorité détermine l'ordre d'application des promotions. Plus le nombre est élevé, plus la priorité est haute.

**Exemple :**
- Promotion A : priorité 10
- Promotion B : priorité 5
- Promotion C : priorité 3

Si plusieurs promotions sont applicables, la promotion A sera appliquée en premier.

### Stackage

Le champ `stackable` détermine si une promotion peut être combinée avec d'autres promotions.

- **`stackable: true`** : Peut être combinée avec d'autres promotions
- **`stackable: false`** : Ne peut pas être combinée (promotion exclusive)

**Exemple :**
- Si une promotion non-stackable est appliquée, aucune autre promotion ne sera appliquée
- Si plusieurs promotions stackables sont applicables, elles seront toutes appliquées (dans l'ordre de priorité)

---

## Affichage des Badges

Les badges de promotion s'affichent automatiquement sur les cartes produits de la page de commande client. Le système utilise le composant `PromotionBadge` qui :

1. Récupère les promotions actives depuis Supabase
2. Filtre les promotions applicables au produit
3. Sélectionne la meilleure promotion (priorité la plus élevée)
4. Affiche le badge avec le texte et les couleurs configurés

### Personnalisation des Badges

Vous pouvez personnaliser l'apparence des badges via le champ `visuals` dans `config` :

```json
"visuals": {
  "badge_text": "-20%",
  "badge_color": "#FFFFFF",
  "badge_bg_color": "#FF6B35",
  "badge_position": "top-right",
  "description": "20% de réduction"
}
```

---

## API et Fonctions Disponibles

### Fonctions dans `promotionsApi.ts`

- **`fetchPromotions()`** : Récupère toutes les promotions
- **`fetchActivePromotions()`** : Récupère les promotions actives et valides
- **`fetchPromotionById(id)`** : Récupère une promotion par son ID
- **`createPromotion(promotion)`** : Crée une nouvelle promotion
- **`updatePromotion(id, promotion)`** : Met à jour une promotion
- **`deletePromotion(id)`** : Supprime une promotion
- **`togglePromotionActive(id, active)`** : Active/désactive une promotion
- **`fetchPromotionByCode(code)`** : Récupère une promotion par son code promo
- **`applyPromotionsToOrder(order)`** : Applique les promotions à une commande
- **`recordPromotionUsage(usage)`** : Enregistre l'utilisation d'une promotion

### Hook React

- **`useProductPromotions(product)`** : Hook pour récupérer les promotions applicables à un produit

---

## Suivi des Utilisations

Le système enregistre automatiquement chaque utilisation de promotion dans la table `promotion_usages` :

| Champ | Type | Description |
|-------|------|-------------|
| `id` | UUID | Identifiant unique |
| `promotion_id` | UUID | ID de la promotion utilisée |
| `order_id` | UUID | ID de la commande |
| `customer_phone` | VARCHAR | Téléphone du client |
| `discount_amount` | NUMERIC | Montant de la réduction |
| `applied_at` | TIMESTAMPTZ | Date d'application |

### Consulter les Utilisations

```sql
-- Utilisations d'une promotion spécifique
SELECT * FROM promotion_usages 
WHERE promotion_id = 'promotion_id' 
ORDER BY applied_at DESC;

-- Utilisations par client
SELECT * FROM promotion_usages 
WHERE customer_phone = '+57123456789' 
ORDER BY applied_at DESC;

-- Statistiques d'utilisation
SELECT 
  p.name,
  p.usage_count,
  p.usage_limit,
  COUNT(pu.id) as actual_usages,
  SUM(pu.discount_amount) as total_discount
FROM promotions p
LEFT JOIN promotion_usages pu ON p.id = pu.promotion_id
GROUP BY p.id, p.name, p.usage_count, p.usage_limit;
```

---

## Bonnes Pratiques

### 1. Définir des Dates de Fin
Toujours définir une date de fin pour éviter que les promotions ne restent actives indéfiniment.

### 2. Utiliser des Limites d'Utilisation
Pour les promotions coûteuses, définir `usage_limit` pour limiter le nombre total d'utilisations.

### 3. Tester les Promotions
Avant d'activer une promotion, testez-la en mode inactif pour vérifier qu'elle fonctionne correctement.

### 4. Priorités Cohérentes
Utilisez des priorités cohérentes :
- 10+ : Promotions exceptionnelles
- 5-9 : Promotions régulières
- 1-4 : Promotions de fond

### 5. Surveiller les Utilisations
Consultez régulièrement les statistiques d'utilisation pour évaluer l'efficacité des promotions.

### 6. Badges Clairs
Utilisez des textes de badge courts et clairs (max 15 caractères).

### 7. Couleurs Contrastées
Choisissez des couleurs de badge qui contrastent bien avec les images de produits.

---

## Dépannage

### Les Badges ne S'affichent Pas

1. Vérifiez que la promotion est active (`active = true`)
2. Vérifiez les dates (`start_date` <= maintenant <= `end_date`)
3. Vérifiez que les conditions sont remplies (catégorie, produit, etc.)
4. Vérifiez que la limite d'utilisation n'est pas atteinte
5. Consultez la console du navigateur pour les erreurs

### La Réduction ne S'applique Pas

1. Vérifiez que `applies_to` correspond à votre cas d'usage
2. Vérifiez que les IDs de produits/catégories sont corrects
3. Vérifiez que le montant minimum est atteint
4. Vérifiez que la promotion est stackable si d'autres promotions sont actives

### Erreurs de Compilation

Si vous rencontrez des erreurs TypeScript :
1. Vérifiez que les types dans `types/promotions.ts` sont à jour
2. Vérifiez que les imports sont corrects
3. Relancez le serveur de développement

---

## Support et Maintenance

Pour toute question ou problème avec le système de promotions :

1. Consultez cette documentation
2. Vérifiez les logs de la console du navigateur
3. Consultez les logs de Supabase
4. Contactez l'équipe de développement

---

**Version :** 1.0  
**Dernière mise à jour :** Octobre 2025  
**Auteur :** Système de Promotions OUIOUITACOS
