import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { NAV_LINKS, ROLE_HOME_PAGE_META_KEY, ROLES, SITE_CUSTOMIZER_PERMISSION_KEY } from '../../constants';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';
import { Role } from '../../types';

export type PermissionLevel = Role['permissions'][string];

export interface RoleFormState {
  id?: string;
  name: string;
  pin: string;
  homePage: string;
  permissions: Role['permissions'];
  customPermissions: Record<string, string>;
}

interface UseRoleManagerArgs {
  isOpen: boolean;
  onClose: () => void;
}

const DEFAULT_HOME_PAGE = NAV_LINKS[0]?.permissionKey ?? '/dashboard';

const isAdminRoleName = (name?: string | null): boolean => {
  if (!name) {
    return false;
  }

  const normalized = name.trim().toLowerCase();
  return normalized === ROLES.ADMIN || normalized === 'administrateur';
};

const ensureNavPermissions = (
  permissions?: Role['permissions'],
  roleName?: string | null,
  customPermissions: Record<string, string> = {},
): Role['permissions'] => {
  const base: Record<string, PermissionLevel> = { ...(permissions || {}) };
  delete base[ROLE_HOME_PAGE_META_KEY];

  NAV_LINKS.forEach(link => {
    if (!(link.permissionKey in base)) {
      if (link.permissionKey === SITE_CUSTOMIZER_PERMISSION_KEY && isAdminRoleName(roleName)) {
        base[link.permissionKey] = 'editor';
      } else {
        base[link.permissionKey] = 'none';
      }
    }
  });

  Object.keys(customPermissions).forEach(key => {
    if (!(key in base)) {
      base[key] = 'none';
    }
  });

  return base;
};

const getDefaultHomePage = (permissions: Role['permissions']): string => {
  const accessibleLink = NAV_LINKS.find(link => isPermissionGranted(permissions[link.permissionKey]));
  return accessibleLink?.permissionKey ?? DEFAULT_HOME_PAGE;
};

const createEmptyFormState = (customPermissions: Record<string, string>): RoleFormState => {
  const permissions = ensureNavPermissions(undefined, undefined, customPermissions);
  return {
    name: '',
    pin: '',
    permissions,
    homePage: getDefaultHomePage(permissions),
    customPermissions: { ...customPermissions },
  };
};

export const isPermissionGranted = (permission?: PermissionLevel) => permission === 'editor' || permission === 'readonly';

export const useRoleManager = ({ isOpen, onClose }: UseRoleManagerArgs) => {
  const { refreshRole, role: currentRole } = useAuth();
  const [roles, setRoles] = useState<Role[]>([]);
  const [customPermissionRegistry, setCustomPermissionRegistry] = useState<Record<string, string>>({});
  const [formState, setFormState] = useState<RoleFormState>(() => createEmptyFormState({}));
  const [mode, setMode] = useState<'create' | 'edit'>('create');
  const [isFetching, setIsFetching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingRoleId, setDeletingRoleId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const permissionKeys = useMemo(() => {
    const navKeys = NAV_LINKS.map(link => link.permissionKey);
    const extraKeys = new Set<string>();

    Object.keys(customPermissionRegistry).forEach(key => {
      if (!navKeys.includes(key)) {
        extraKeys.add(key);
      }
    });

    roles.forEach(role => {
      Object.keys(role.permissions).forEach(key => {
        if (key === ROLE_HOME_PAGE_META_KEY) {
          return;
        }
        if (!navKeys.includes(key)) {
          extraKeys.add(key);
        }
      });
    });

    return [...navKeys, ...Array.from(extraKeys)];
  }, [roles, customPermissionRegistry]);

  const hasAccessibleHomePage = useMemo(
    () => NAV_LINKS.some(link => isPermissionGranted(formState.permissions[link.permissionKey])),
    [formState.permissions],
  );

  const loadRoles = useCallback(async () => {
    setIsFetching(true);
    try {
      const fetchedRoles = await api.getRoles();
      setRoles(fetchedRoles);
      setCustomPermissionRegistry(prev => {
        const next = { ...prev };
        let hasChanged = false;
        const navKeys = new Set(NAV_LINKS.map(link => link.permissionKey));

        fetchedRoles.forEach(role => {
          Object.keys(role.permissions).forEach(key => {
            if (key === ROLE_HOME_PAGE_META_KEY || navKeys.has(key)) {
              return;
            }
            if (!(key in next)) {
              next[key] = key;
              hasChanged = true;
            }
          });
        });

        return hasChanged ? next : prev;
      });
      setErrorMessage(null);
    } catch (error) {
      console.error('Failed to load roles:', error);
      setErrorMessage('Impossible de charger les rôles.');
    } finally {
      setIsFetching(false);
    }
  }, []);

  const resetForm = useCallback(() => {
    setMode('create');
    setFormState(createEmptyFormState(customPermissionRegistry));
  }, [customPermissionRegistry]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setStatusMessage(null);
    setErrorMessage(null);
    resetForm();
    loadRoles();
  }, [isOpen, loadRoles, resetForm]);

  useEffect(() => {
    setFormState(prev => {
      const currentHomePage = prev.homePage;
      if (isPermissionGranted(prev.permissions[currentHomePage])) {
        return prev;
      }

      const fallbackHomePage = getDefaultHomePage(prev.permissions);
      if (fallbackHomePage === currentHomePage) {
        return prev;
      }

      return {
        ...prev,
        homePage: fallbackHomePage,
      };
    });
  }, [formState.permissions]);

  useEffect(() => {
    setFormState(prev => {
      const prevCustom = prev.customPermissions;
      const nextCustom = customPermissionRegistry;

      const prevKeys = Object.keys(prevCustom);
      const nextKeys = Object.keys(nextCustom);

      if (
        prevKeys.length === nextKeys.length &&
        prevKeys.every(key => nextCustom[key] === prevCustom[key])
      ) {
        return prev;
      }

      const nextPermissions = ensureNavPermissions(prev.permissions, prev.name, nextCustom);
      const nextHomePage = isPermissionGranted(nextPermissions[prev.homePage])
        ? prev.homePage
        : getDefaultHomePage(nextPermissions);

      return {
        ...prev,
        customPermissions: { ...nextCustom },
        permissions: nextPermissions,
        homePage: nextHomePage,
      };
    });
  }, [customPermissionRegistry]);

  const getPermissionLabel = useCallback(
    (key: string) => {
      const navLink = NAV_LINKS.find(link => link.permissionKey === key);
      if (navLink) {
        return navLink.name;
      }

      return customPermissionRegistry[key] ?? key;
    },
    [customPermissionRegistry],
  );

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormState(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handlePermissionChange = (key: string, value: PermissionLevel) => {
    setFormState(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [key]: value,
      },
    }));
  };

  const handleHomePageChange = (value: string) => {
    setFormState(prev => ({
      ...prev,
      homePage: value,
    }));
  };

  const handleSelectRole = (role: Role) => {
    const navKeys = new Set(NAV_LINKS.map(link => link.permissionKey));
    const nextCustomPermissions = { ...customPermissionRegistry };
    let hasChanged = false;

    Object.keys(role.permissions).forEach(key => {
      if (key === ROLE_HOME_PAGE_META_KEY || navKeys.has(key)) {
        return;
      }
      if (!(key in nextCustomPermissions)) {
        nextCustomPermissions[key] = key;
        hasChanged = true;
      }
    });

    if (hasChanged) {
      setCustomPermissionRegistry(nextCustomPermissions);
    }

    const permissions = ensureNavPermissions(role.permissions, role.name, hasChanged ? nextCustomPermissions : customPermissionRegistry);
    setMode('edit');
    setFormState({
      id: role.id,
      name: role.name,
      pin: role.pin ?? '',
      permissions,
      homePage: role.homePage ?? getDefaultHomePage(permissions),
      customPermissions: { ...(hasChanged ? nextCustomPermissions : customPermissionRegistry) },
    });
    setStatusMessage(null);
    setErrorMessage(null);
  };

  const handleDeleteRole = async (roleId: string) => {
    if (!confirm('Supprimer ce rôle ? Cette action est irréversible.')) {
      return;
    }

    setDeletingRoleId(roleId);
    setStatusMessage(null);
    setErrorMessage(null);

    try {
      await api.deleteRole(roleId);
      setStatusMessage('Rôle supprimé avec succès.');
      if (mode === 'edit' && formState.id === roleId) {
        resetForm();
      }
      await loadRoles();
      if (currentRole?.id === roleId) {
        await refreshRole();
      }
    } catch (error) {
      console.error('Failed to delete role:', error);
      setErrorMessage("Impossible de supprimer le rôle.");
    } finally {
      setDeletingRoleId(null);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setStatusMessage(null);

    if (!formState.name.trim() || !formState.pin.trim()) {
      setErrorMessage('Le nom et le code PIN sont obligatoires.');
      return;
    }

    setIsSubmitting(true);

    try {
      const permissions = ensureNavPermissions(
        formState.permissions,
        formState.name,
        customPermissionRegistry,
      );
      const resolvedHomePage = isPermissionGranted(permissions[formState.homePage])
        ? formState.homePage
        : getDefaultHomePage(permissions);

      if (mode === 'create') {
        await api.createRole({
          name: formState.name.trim(),
          pin: formState.pin.trim(),
          permissions,
          homePage: resolvedHomePage,
        });
        setStatusMessage('Rôle créé avec succès.');
        await loadRoles();
        await refreshRole();
        resetForm();
      } else if (formState.id) {
        const updatedRole = await api.updateRole(formState.id, {
          name: formState.name.trim(),
          pin: formState.pin.trim(),
          permissions,
          homePage: resolvedHomePage,
        });
        setStatusMessage('Rôle mis à jour avec succès.');
        const nextPermissions = ensureNavPermissions(
          updatedRole.permissions,
          updatedRole.name,
          customPermissionRegistry,
        );
        setFormState({
          id: updatedRole.id,
          name: updatedRole.name,
          pin: updatedRole.pin ?? '',
          permissions: nextPermissions,
          homePage: updatedRole.homePage ?? getDefaultHomePage(nextPermissions),
          customPermissions: { ...customPermissionRegistry },
        });
        await loadRoles();
        if (currentRole?.id === updatedRole.id) {
          await refreshRole();
        }
      }
    } catch (error) {
      console.error('Failed to save role:', error);
      setErrorMessage("Impossible d'enregistrer le rôle.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    resetForm();
    setStatusMessage(null);
    setErrorMessage(null);
    onClose();
  };

  const handleAddCustomPermission = (key: string, label: string) => {
    if (NAV_LINKS.some(link => link.permissionKey === key)) {
      return;
    }

    setCustomPermissionRegistry(prev => {
      if (prev[key] === label) {
        return prev;
      }

      const next = { ...prev, [key]: label };

      setFormState(prevForm => {
        const nextPermissions = ensureNavPermissions(prevForm.permissions, prevForm.name, next);
        if (!(key in nextPermissions)) {
          nextPermissions[key] = 'none';
        }

        return {
          ...prevForm,
          customPermissions: { ...next },
          permissions: nextPermissions,
        };
      });

      return next;
    });
  };

  const handleRemoveCustomPermission = (key: string) => {
    if (NAV_LINKS.some(link => link.permissionKey === key)) {
      return;
    }

    setCustomPermissionRegistry(prev => {
      if (!(key in prev)) {
        return prev;
      }

      const next = { ...prev };
      delete next[key];

      setFormState(prevForm => {
        const { [key]: _removedCustom, ...restCustom } = prevForm.customPermissions;
        const nextPermissionsBase = { ...prevForm.permissions };
        delete nextPermissionsBase[key];
        const nextPermissions = ensureNavPermissions(nextPermissionsBase, prevForm.name, next);
        const nextHomePage = isPermissionGranted(nextPermissions[prevForm.homePage])
          ? prevForm.homePage
          : getDefaultHomePage(nextPermissions);

        return {
          ...prevForm,
          customPermissions: { ...restCustom },
          permissions: nextPermissions,
          homePage: nextHomePage,
        };
      });

      return next;
    });
  };

  return {
    roles,
    formState,
    mode,
    isFetching,
    isSubmitting,
    deletingRoleId,
    statusMessage,
    errorMessage,
    permissionKeys,
    hasAccessibleHomePage,
    handleInputChange,
    handlePermissionChange,
    handleHomePageChange,
    handleSelectRole,
    handleDeleteRole,
    handleSubmit,
    handleClose,
    resetForm,
    getPermissionLabel,
    isPermissionGranted,
    handleAddCustomPermission,
    handleRemoveCustomPermission,
  };
};

export type UseRoleManagerReturn = ReturnType<typeof useRoleManager>;
