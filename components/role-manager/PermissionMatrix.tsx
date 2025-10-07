import React, { useMemo } from 'react';
import { Trash2 } from 'lucide-react';
import { NAV_LINKS } from '../../constants';
import { Role } from '../../types';
import { PermissionLevel } from './useRoleManager';

interface PermissionMatrixProps {
  permissionKeys: string[];
  permissions: Role['permissions'];
  onChange: (key: string, value: PermissionLevel) => void;
  getPermissionLabel: (key: string) => string;
  customPermissions: Record<string, string>;
  onRemoveCustomPermission?: (key: string) => void;
}

interface PermissionSection {
  id: string;
  title: string;
  keys: string[];
}

const PERMISSION_LEVELS: Array<{
  value: PermissionLevel;
  label: string;
  headerDescription: string;
  helper: string;
  tooltip: string;
}> = [
  {
    value: 'editor',
    label: 'Éditeur',
    headerDescription: 'Gestion complète',
    helper: 'Créer, modifier et valider le contenu.',
    tooltip: 'Autorise toutes les actions, y compris la modification et la validation des données.',
  },
  {
    value: 'readonly',
    label: 'Lecture seule',
    headerDescription: 'Consultation',
    helper: 'Visualiser les informations sans modifier.',
    tooltip: 'Permet uniquement de consulter les informations sans pouvoir les modifier.',
  },
  {
    value: 'none',
    label: 'Aucun',
    headerDescription: 'Accès bloqué',
    helper: 'Masquer totalement la section.',
    tooltip: 'Bloque complètement l’accès à la section ou à la fonctionnalité.',
  },
];

const PermissionMatrix: React.FC<PermissionMatrixProps> = ({
  permissionKeys,
  permissions,
  onChange,
  getPermissionLabel,
  customPermissions,
  onRemoveCustomPermission,
}) => {
  const sections = useMemo<PermissionSection[]>(() => {
    if (permissionKeys.length === 0) {
      return [];
    }

    const navOrder = NAV_LINKS.map(link => link.permissionKey);
    const navSet = new Set(navOrder);
    const navKeys = navOrder.filter(key => permissionKeys.includes(key));
    const customKeys = permissionKeys
      .filter(key => !navSet.has(key))
      .sort((a, b) => getPermissionLabel(a).localeCompare(getPermissionLabel(b), 'fr'));

    const computedSections: PermissionSection[] = [];

    if (navKeys.length > 0) {
      computedSections.push({
        id: 'navigation',
        title: 'Navigation principale',
        keys: navKeys,
      });
    }

    if (customKeys.length > 0) {
      computedSections.push({
        id: 'custom',
        title: 'Permissions personnalisées',
        keys: customKeys,
      });
    }

    return computedSections;
  }, [getPermissionLabel, permissionKeys]);

  const applyBulkChange = (level: PermissionLevel) => {
    permissionKeys.forEach(key => {
      const currentLevel = permissions[key] ?? 'none';
      if (currentLevel !== level) {
        onChange(key, level);
      }
    });
  };

  if (permissionKeys.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-center text-sm font-medium text-gray-900">
        Aucune permission disponible pour ce rôle pour le moment.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="permission-action-button"
          onClick={() => applyBulkChange('editor')}
          title="Autoriser toutes les sections en mode édition."
        >
          Tout autoriser
        </button>
        <button
          type="button"
          className="permission-action-button"
          onClick={() => applyBulkChange('readonly')}
          title="Basculer toutes les sections en lecture seule."
        >
          Lecture seule partout
        </button>
        <button
          type="button"
          className="permission-action-button is-danger"
          onClick={() => applyBulkChange('none')}
          title="Révoquer toutes les permissions."
        >
          Tout bloquer
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="max-h-96 overflow-auto">
          <div className="min-w-full">
            <div className="grid grid-cols-[minmax(220px,2fr)_repeat(3,minmax(140px,1fr))]">
              <div className="border-b border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-900">
                Section / permission
              </div>
              {PERMISSION_LEVELS.map(level => (
                <div
                  key={level.value}
                  className="border-b border-l border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-900"
                >
                  <div>{level.label}</div>
                  <p className="mt-1 text-xs font-medium text-gray-900">{level.headerDescription}</p>
                </div>
              ))}

              {sections.map(section => (
                <React.Fragment key={section.id}>
                  <div className="col-span-4 border-t border-gray-200 bg-gray-100 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-gray-900">
                    {section.title}
                  </div>
                  {section.keys.map(key => {
                    const currentValue = permissions[key] ?? 'none';
                    const inputName = `permission-${key.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
                    const isCustom = key in customPermissions;

                    return (
                      <React.Fragment key={key}>
                        <div className="border-t border-gray-100 px-4 py-3">
                          <div className="flex items-center justify-between gap-2">
                            <div className="text-sm font-semibold text-gray-900">{getPermissionLabel(key)}</div>
                            {isCustom && onRemoveCustomPermission && (
                              <button
                                type="button"
                                onClick={() => onRemoveCustomPermission(key)}
                                className="text-gray-700 transition-colors hover:text-red-600"
                                title="Supprimer cette permission personnalisée"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </div>
                        {PERMISSION_LEVELS.map(level => {
                          const isActive = currentValue === level.value;

                          return (
                            <div
                              key={level.value}
                              className="border-t border-l border-gray-100 px-4 py-3"
                            >
                              <label
                                className={`permission-choice${isActive ? ' is-active' : ''}`}
                                title={level.tooltip}
                              >
                                <input
                                  type="radio"
                                  className="sr-only"
                                  name={inputName}
                                  value={level.value}
                                  checked={isActive}
                                  onChange={() => onChange(key, level.value)}
                                />
                                <span className="permission-choice__label">{level.label}</span>
                                <span className="permission-choice__helper">{level.helper}</span>
                              </label>
                            </div>
                          );
                        })}
                      </React.Fragment>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PermissionMatrix;
