-- Script de migration pour le système de promotions (v1)
-- Ce script crée les tables nécessaires pour le système de promotions
-- et modifie la table des commandes pour supporter les promotions

-- Table des promotions
CREATE TABLE IF NOT EXISTS promotions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('percentage', 'fixed_amount', 'promo_code', 'buy_x_get_y', 'free_product', 'free_shipping', 'combo', 'threshold', 'happy_hour')),
  status TEXT NOT NULL CHECK (status IN ('active', 'inactive', 'scheduled', 'expired')),
  priority INTEGER NOT NULL DEFAULT 0,
  conditions JSONB NOT NULL DEFAULT '{}',
  discount JSONB NOT NULL,
  visuals JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  usage_count INTEGER NOT NULL DEFAULT 0
);

-- Fonction pour mettre à jour le timestamp updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour mettre à jour le timestamp updated_at
DROP TRIGGER IF EXISTS update_promotions_updated_at ON promotions;
CREATE TRIGGER update_promotions_updated_at
BEFORE UPDATE ON promotions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Table des utilisations de promotions
CREATE TABLE IF NOT EXISTS promotion_usages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  promotion_id UUID NOT NULL REFERENCES promotions(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  customer_phone TEXT,
  discount_amount NUMERIC(10, 2) NOT NULL,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index pour accélérer les recherches
CREATE INDEX IF NOT EXISTS idx_promotion_usages_promotion_id ON promotion_usages(promotion_id);
CREATE INDEX IF NOT EXISTS idx_promotion_usages_order_id ON promotion_usages(order_id);
CREATE INDEX IF NOT EXISTS idx_promotion_usages_customer_phone ON promotion_usages(customer_phone);

-- Fonction pour incrémenter un compteur
CREATE OR REPLACE FUNCTION increment(x INTEGER)
RETURNS INTEGER AS $$
BEGIN
  RETURN x + 1;
END;
$$ LANGUAGE plpgsql;

-- Modification de la table orders pour supporter les promotions
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS subtotal NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS total_discount NUMERIC(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS promo_code TEXT,
ADD COLUMN IF NOT EXISTS applied_promotions JSONB;

-- Fonction pour calculer le total après réduction
CREATE OR REPLACE FUNCTION calculate_order_total_with_discount()
RETURNS TRIGGER AS $$
BEGIN
  -- Si subtotal est défini mais pas total_discount, initialiser total_discount à 0
  IF NEW.subtotal IS NOT NULL AND NEW.total_discount IS NULL THEN
    NEW.total_discount := 0;
  END IF;
  
  -- Si subtotal et total_discount sont définis, calculer le total
  IF NEW.subtotal IS NOT NULL AND NEW.total_discount IS NOT NULL THEN
    NEW.total := NEW.subtotal - NEW.total_discount;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour calculer le total après réduction
DROP TRIGGER IF EXISTS calculate_order_total_with_discount_trigger ON orders;
CREATE TRIGGER calculate_order_total_with_discount_trigger
BEFORE INSERT OR UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION calculate_order_total_with_discount();
