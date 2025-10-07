# Plan de test pour la version 3 du système de promotions

Ce document décrit les tests à effectuer pour valider la version 3 du système de promotions, qui concerne l'intégration dans l'interface client.

## 1. Tests des badges promotionnels sur les cartes produits

### 1.1 Affichage des badges
- [ ] Vérifier que les badges promotionnels s'affichent correctement sur les cartes produits concernés par une promotion
- [ ] Vérifier que le texte du badge est correct en fonction du type de promotion (pourcentage, montant fixe, etc.)
- [ ] Vérifier que le style du badge est conforme à la maquette (couleur, taille, position)

### 1.2 Comportement des badges
- [ ] Vérifier que les badges ne s'affichent que sur les produits concernés par une promotion active
- [ ] Vérifier que les badges se mettent à jour lorsqu'une promotion est activée ou désactivée

## 2. Tests des bannières promotionnelles sur la page d'accueil

### 2.1 Affichage des bannières
- [ ] Vérifier que le carrousel de bannières promotionnelles s'affiche correctement en haut de la page
- [ ] Vérifier que les bannières affichent correctement le texte, l'image et le bouton d'appel à l'action
- [ ] Vérifier que le style des bannières est conforme à la maquette

### 2.2 Comportement du carrousel
- [ ] Vérifier que le carrousel défile automatiquement toutes les 5 secondes
- [ ] Vérifier que le défilement s'arrête lorsque la souris survole le carrousel
- [ ] Vérifier que les boutons de navigation permettent de passer à la bannière suivante ou précédente
- [ ] Vérifier que les indicateurs de position permettent de naviguer directement vers une bannière spécifique

## 3. Tests du champ de code promo dans le panier

### 3.1 Affichage du champ
- [ ] Vérifier que le champ de code promo s'affiche correctement dans le panier
- [ ] Vérifier que le champ de code promo ne s'affiche que lorsque le panier contient des articles

### 3.2 Validation des codes promo
- [ ] Vérifier qu'un code promo valide est accepté et applique la réduction correspondante
- [ ] Vérifier qu'un code promo invalide est rejeté avec un message d'erreur approprié
- [ ] Vérifier qu'un code promo expiré est rejeté avec un message d'erreur approprié
- [ ] Vérifier qu'un code promo déjà utilisé (si limité) est rejeté avec un message d'erreur approprié

### 3.3 Affichage des codes promo appliqués
- [ ] Vérifier que le code promo appliqué s'affiche correctement avec un bouton pour le supprimer
- [ ] Vérifier que la suppression d'un code promo fonctionne correctement

## 4. Tests du calcul et de l'affichage des réductions

### 4.1 Calcul des réductions
- [ ] Vérifier que la réduction est correctement calculée pour les promotions de type pourcentage
- [ ] Vérifier que la réduction est correctement calculée pour les promotions de type montant fixe
- [ ] Vérifier que la réduction ne dépasse pas le montant total du panier

### 4.2 Affichage des réductions
- [ ] Vérifier que le composant de détails de la réduction s'affiche correctement lorsqu'une réduction est appliquée
- [ ] Vérifier que le montant de la réduction est correctement affiché
- [ ] Vérifier que le pourcentage de réduction est correctement calculé et affiché
- [ ] Vérifier que le nouveau total après réduction est correctement affiché

## 5. Tests d'intégration

### 5.1 Flux complet
- [ ] Vérifier que l'ajout d'un produit avec promotion au panier fonctionne correctement
- [ ] Vérifier que l'application d'un code promo fonctionne correctement
- [ ] Vérifier que la commande est correctement soumise avec les informations de promotion
- [ ] Vérifier que l'utilisation de la promotion est correctement enregistrée dans la base de données

### 5.2 Compatibilité
- [ ] Vérifier que le système de promotions fonctionne correctement sur différents navigateurs (Chrome, Firefox, Safari)
- [ ] Vérifier que le système de promotions fonctionne correctement sur différents appareils (desktop, tablette, mobile)

## 6. Tests de performance

### 6.1 Temps de chargement
- [ ] Vérifier que l'ajout du système de promotions n'affecte pas significativement le temps de chargement de la page
- [ ] Vérifier que le carrousel de bannières promotionnelles se charge rapidement

### 6.2 Réactivité
- [ ] Vérifier que l'application d'un code promo est rapide et ne bloque pas l'interface utilisateur
- [ ] Vérifier que la navigation dans le carrousel de bannières est fluide
