import { LayoutDashboard, Package, Armchair, Soup, UtensilsCrossed, ShoppingBag, AreaChart, Brush, Percent } from 'lucide-react';

export const SITE_CUSTOMIZER_PERMISSION_KEY = '/site-customizer';

export const NAV_LINKS = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, permissionKey: '/dashboard' },
  { name: 'À Emporter', href: '/para-llevar', icon: ShoppingBag, permissionKey: '/para-llevar' },
  { name: 'Plan de Salle', href: '/ventes', icon: Armchair, permissionKey: '/ventes' },
  { name: 'Cuisine', href: '/cocina', icon: Soup, permissionKey: '/cocina' },
  {
    name: 'Personnalisation',
    href: SITE_CUSTOMIZER_PERMISSION_KEY,
    icon: Brush,
    permissionKey: SITE_CUSTOMIZER_PERMISSION_KEY,
  },
  { name: 'Produits', href: '/produits', icon: UtensilsCrossed, permissionKey: '/produits' },
  { name: 'Ingrédients', href: '/ingredients', icon: Package, permissionKey: '/ingredients' },
  { name: 'Promotions', href: '/promotions', icon: Percent, permissionKey: '/promotions' },
  { name: 'Résumé Ventes', href: '/resume-ventes', icon: AreaChart, permissionKey: '/resume-ventes' },
];

export const ROLES = {
    ADMIN: 'admin',
    COCINA: 'cocina',
    MESERO: 'mesero'
};

export const ROLE_HOME_PAGE_META_KEY = '__home_page';
