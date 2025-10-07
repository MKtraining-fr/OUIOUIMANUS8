import { NAV_LINKS } from '../constants';
import { Role } from '../types';

type PermissionValue = Role['permissions'][string] | undefined;

export const isPermissionGranted = (permission?: PermissionValue): boolean =>
  permission === 'editor' || permission === 'readonly';

export const getHomeRedirectPath = (role: Role | null): string | null => {
  if (!role) {
    return null;
  }

  const { homePage, permissions } = role;

  if (homePage && isPermissionGranted(permissions?.[homePage])) {
    return homePage;
  }

  const fallbackLink = NAV_LINKS.find(link =>
    isPermissionGranted(permissions?.[link.permissionKey]),
  );

  if (fallbackLink) {
    return fallbackLink.href;
  }

  return null;
};
