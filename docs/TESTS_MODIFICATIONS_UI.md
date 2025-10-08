# Plan de Tests - Modifications UI Commande en Ligne

## 🎯 Objectif
Valider que toutes les modifications UI fonctionnent correctement et n'introduisent pas de régressions.

---

## ✅ Test 1: Modal de Confirmation (Sans Redirection)

### Scénario
Vérifier que le modal de confirmation ne redirige plus automatiquement.

### Étapes
1. Accéder à `/commande-client`
2. Ajouter des produits au panier
3. Remplir les informations client
4. Soumettre la commande
5. Observer le modal de confirmation

### Résultats Attendus
- ✅ Le modal s'affiche avec le message de confirmation
- ✅ Aucune redirection automatique après 3 secondes
- ✅ Le message "Haz clic para enviar tu pedido por WhatsApp y ver el seguimiento" est visible
- ✅ Le bouton "Enviar por WhatsApp" est présent
- ✅ Cliquer sur le bouton ouvre WhatsApp ET redirige vers le suivi

### Critères de Validation
- [ ] Pas de redirection automatique
- [ ] Message correct affiché
- [ ] Bouton WhatsApp fonctionnel
- [ ] Redirection manuelle fonctionne

---

## ✅ Test 2: Affichage Commande Précédente (Section Hero)

### Scénario
Vérifier que la commande précédente s'affiche correctement dans la section Hero.

### Étapes
1. Passer une commande (Test 1)
2. Cliquer sur "Passer une nouvelle commande" dans le tracker
3. Observer la section Hero (en haut de la page)

### Résultats Attendus
- ✅ La commande précédente apparaît sous le bouton "Volver"
- ✅ La date est affichée au format DD/MM/YYYY (ex: 08/10/2025)
- ✅ Le montant total est visible
- ✅ Le bouton "Reordenar" est présent et compact
- ✅ L'affichage est compact (pas trop grand)
- ✅ La largeur est limitée (max-w-md)

### Critères de Validation
- [ ] Position correcte (Hero, après "Volver")
- [ ] Date affichée (pas de numéro de commande)
- [ ] Taille réduite et compacte
- [ ] Bouton "Reordenar" fonctionnel

---

## ✅ Test 3: Fonctionnalité Reordenar

### Scénario
Vérifier que le bouton "Reordenar" remplit correctement le panier.

### Étapes
1. Avoir une commande précédente affichée (Test 2)
2. Cliquer sur "Reordenar"
3. Observer le panier

### Résultats Attendus
- ✅ Le panier se remplit avec les produits de la commande précédente
- ✅ Les quantités sont correctes
- ✅ Les commentaires sont préservés
- ✅ Les ingrédients exclus sont préservés
- ✅ Le total est recalculé correctement

### Critères de Validation
- [ ] Panier rempli correctement
- [ ] Quantités exactes
- [ ] Personnalisations préservées
- [ ] Total correct

---

## ✅ Test 4: Suivi de Commande (CustomerOrderTracker)

### Scénario
Vérifier que le suivi de commande s'affiche et fonctionne correctement.

### Étapes
1. Passer une commande
2. Cliquer sur "Enviar por WhatsApp" dans le modal
3. Observer la page de suivi

### Résultats Attendus
- ✅ La page de suivi (CustomerOrderTracker) s'affiche
- ✅ Les étapes sont visibles: Enviado, Validado, En preparación, Listo
- ✅ L'étape actuelle est mise en évidence
- ✅ Les informations de la commande sont affichées
- ✅ Le bouton "Passer une nouvelle commande" est présent

### Critères de Validation
- [ ] Tracker s'affiche automatiquement
- [ ] Étapes visibles et correctes
- [ ] Informations complètes
- [ ] Bouton nouvelle commande fonctionnel

---

## ✅ Test 5: Persistance de la Commande Active

### Scénario
Vérifier que la commande active persiste dans le localStorage.

### Étapes
1. Passer une commande
2. Fermer l'onglet du navigateur
3. Rouvrir `/commande-client`
4. Observer ce qui s'affiche

### Résultats Attendus
- ✅ Le tracker de commande s'affiche automatiquement
- ✅ La commande affichée est la bonne
- ✅ Toutes les informations sont présentes

### Critères de Validation
- [ ] Persistance fonctionne
- [ ] Bonne commande affichée
- [ ] Pas de perte de données

---

## ✅ Test 6: Nouvelle Commande (Nettoyage)

### Scénario
Vérifier que le nettoyage du localStorage fonctionne.

### Étapes
1. Être sur la page de suivi (Test 4)
2. Cliquer sur "Passer une nouvelle commande"
3. Observer la page

### Résultats Attendus
- ✅ Retour au menu de commande (OrderMenuView)
- ✅ Le panier est vide
- ✅ La commande précédente apparaît dans la section Hero
- ✅ Le localStorage est nettoyé (plus de commande active)

### Critères de Validation
- [ ] Retour au menu
- [ ] Panier vide
- [ ] Commande précédente visible
- [ ] localStorage nettoyé

---

## ✅ Test 7: Affichage Mobile

### Scénario
Vérifier que l'affichage est responsive sur mobile.

### Étapes
1. Ouvrir DevTools (F12)
2. Activer le mode responsive (Ctrl+Shift+M)
3. Tester sur différentes tailles: 375px, 768px, 1024px
4. Naviguer dans toutes les sections

### Résultats Attendus
- ✅ La commande précédente s'affiche correctement sur mobile
- ✅ Le bouton "Reordenar" reste accessible
- ✅ Le modal de confirmation est responsive
- ✅ Le tracker de commande s'adapte à l'écran

### Critères de Validation
- [ ] Responsive sur toutes les tailles
- [ ] Pas de débordement horizontal
- [ ] Boutons accessibles
- [ ] Texte lisible

---

## ✅ Test 8: Compatibilité avec les Promotions

### Scénario
Vérifier que les modifications n'affectent pas le système de promotions.

### Étapes
1. Créer une promotion active dans l'admin
2. Passer une commande avec promotion
3. Vérifier l'affichage dans le tracker
4. Reordenar la commande

### Résultats Attendus
- ✅ Les promotions s'appliquent correctement
- ✅ Les badges promo sont visibles
- ✅ Le tracker affiche les réductions
- ✅ Reordenar préserve les promotions (si toujours actives)

### Critères de Validation
- [ ] Promotions fonctionnent
- [ ] Badges visibles
- [ ] Réductions appliquées
- [ ] Reordenar compatible

---

## ✅ Test 9: Intégration WhatsApp

### Scénario
Vérifier que l'intégration WhatsApp fonctionne toujours.

### Étapes
1. Passer une commande
2. Cliquer sur "Enviar por WhatsApp"
3. Observer l'ouverture de WhatsApp

### Résultats Attendus
- ✅ WhatsApp s'ouvre dans un nouvel onglet
- ✅ Le message est pré-rempli avec les détails de la commande
- ✅ Le numéro de téléphone est correct
- ✅ Après envoi WhatsApp, redirection vers le tracker

### Critères de Validation
- [ ] WhatsApp s'ouvre
- [ ] Message correct
- [ ] Numéro correct
- [ ] Redirection fonctionne

---

## ✅ Test 10: Gestion des Erreurs

### Scénario
Vérifier la gestion des cas d'erreur.

### Étapes
1. Tenter de charger une commande inexistante
2. Tenter de reordenar avec des produits supprimés
3. Tester avec une connexion lente

### Résultats Attendus
- ✅ Message d'erreur clair si commande introuvable
- ✅ Gestion gracieuse des produits manquants
- ✅ Indicateur de chargement visible
- ✅ Pas de crash de l'application

### Critères de Validation
- [ ] Erreurs gérées
- [ ] Messages clairs
- [ ] Pas de crash
- [ ] UX dégradée acceptable

---

## 📊 Récapitulatif des Tests

| Test | Statut | Priorité | Notes |
|------|--------|----------|-------|
| 1. Modal sans redirection | ⏳ | Haute | |
| 2. Commande précédente Hero | ⏳ | Haute | |
| 3. Fonctionnalité Reordenar | ⏳ | Haute | |
| 4. Suivi de commande | ⏳ | Haute | |
| 5. Persistance localStorage | ⏳ | Moyenne | |
| 6. Nouvelle commande | ⏳ | Moyenne | |
| 7. Affichage mobile | ⏳ | Haute | |
| 8. Compatibilité promotions | ⏳ | Moyenne | |
| 9. Intégration WhatsApp | ⏳ | Haute | |
| 10. Gestion erreurs | ⏳ | Basse | |

**Légende**:
- ⏳ En attente
- ✅ Réussi
- ❌ Échoué
- ⚠️ Partiel

---

## 🐛 Bugs Connus / À Surveiller

1. **Date undefined**: Si `created_at` est null, afficher "Fecha no disponible"
2. **Produits supprimés**: Gérer le cas où un produit de la commande précédente n'existe plus
3. **Promotions expirées**: Reordenar ne doit pas appliquer les promotions expirées

---

## ✅ Validation Finale

Avant de marquer les modifications comme terminées:

- [ ] Tous les tests haute priorité passent
- [ ] Au moins 80% des tests moyenne priorité passent
- [ ] Aucun bug bloquant
- [ ] Performance acceptable (< 3s chargement)
- [ ] Pas de régression sur les fonctionnalités existantes

---

**Date de création**: 8 octobre 2025  
**Version**: 1.0  
**Responsable**: Équipe Dev OUIOUITACOS
