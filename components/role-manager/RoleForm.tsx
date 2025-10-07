import React, { ChangeEvent, FormEvent, useState } from 'react';
import { Save } from 'lucide-react';
import { NAV_LINKS } from '../../constants';
import PermissionMatrix from './PermissionMatrix';
import { PermissionLevel, RoleFormState } from './useRoleManager';

interface RoleFormProps {
  mode: 'create' | 'edit';
  formState: RoleFormState;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onInputChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onHomePageChange: (value: string) => void;
  onPermissionChange: (key: string, value: PermissionLevel) => void;
  onAddCustomPermission: (key: string, label: string) => void;
  onRemoveCustomPermission: (key: string) => void;
  onCancel: () => void;
  isSubmitting: boolean;
  hasAccessibleHomePage: boolean;
  permissionKeys: string[];
  getPermissionLabel: (key: string) => string;
  isPermissionGranted: (permission?: PermissionLevel) => boolean;
}

const RoleForm: React.FC<RoleFormProps> = ({
  mode,
  formState,
  onSubmit,
  onInputChange,
  onHomePageChange,
  onPermissionChange,
  onAddCustomPermission,
  onRemoveCustomPermission,
  onCancel,
  isSubmitting,
  hasAccessibleHomePage,
  permissionKeys,
  getPermissionLabel,
  isPermissionGranted,
}) => {
  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const [customKeyInput, setCustomKeyInput] = useState('');
  const [customLabelInput, setCustomLabelInput] = useState('');
  const [customPermissionError, setCustomPermissionError] = useState<string | null>(null);

  const resetCustomPermissionForm = () => {
    setIsAddingCustom(false);
    setCustomKeyInput('');
    setCustomLabelInput('');
    setCustomPermissionError(null);
  };

  const handleConfirmAddCustomPermission = () => {
    const rawKey = customKeyInput.trim();
    const rawLabel = customLabelInput.trim();

    if (!rawKey || !rawLabel) {
      setCustomPermissionError('La clé technique et le nom affiché sont obligatoires.');
      return;
    }

    if (permissionKeys.includes(rawKey)) {
      setCustomPermissionError('Cette clé de permission existe déjà.');
      return;
    }

    onAddCustomPermission(rawKey, rawLabel);
    resetCustomPermissionForm();
  };

  return (
    <div>
      <h4 className="mb-4 text-lg font-semibold text-gray-900">
        {mode === 'edit' ? 'Modifier le rôle sélectionné' : 'Créer un nouveau rôle'}
      </h4>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label htmlFor="role-name" className="mb-1 block text-sm font-medium text-gray-900">
            Nom du rôle
          </label>
          <input
            id="role-name"
            name="name"
            value={formState.name}
            onChange={onInputChange}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
            placeholder="Ex. Manager"
          />
        </div>
        <div>
          <label htmlFor="role-pin" className="mb-1 block text-sm font-medium text-gray-900">
            Code PIN d'accès
          </label>
          <input
            id="role-pin"
            name="pin"
            value={formState.pin}
            onChange={onInputChange}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
            placeholder="Ex. 1234"
          />
        </div>
        <div>
          <label htmlFor="role-home-page" className="mb-1 block text-sm font-medium text-gray-900">
            Page d'accueil par défaut
          </label>
          <select
            id="role-home-page"
            name="homePage"
            value={formState.homePage}
            onChange={event => onHomePageChange(event.target.value)}
            disabled={!hasAccessibleHomePage}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary disabled:cursor-not-allowed disabled:bg-gray-100"
          >
            {NAV_LINKS.map(link => {
              const canAccess = isPermissionGranted(formState.permissions[link.permissionKey]);
              return (
                <option key={link.permissionKey} value={link.permissionKey} disabled={!canAccess}>
                  {getPermissionLabel(link.permissionKey)}
                  {!canAccess ? ' (accès requis)' : ''}
                </option>
              );
            })}
          </select>
          {hasAccessibleHomePage ? (
            <p className="mt-1 text-xs text-gray-900">Les pages sans permission sont désactivées.</p>
          ) : (
            <p className="mt-1 text-xs font-medium text-red-700">Accordez au moins une permission pour choisir une page d'accueil.</p>
          )}
        </div>
        <div>
          <p className="mb-2 text-sm font-semibold text-gray-900">Permissions par page</p>
          <PermissionMatrix
            permissionKeys={permissionKeys}
            permissions={formState.permissions}
            onChange={onPermissionChange}
            getPermissionLabel={getPermissionLabel}
            customPermissions={formState.customPermissions}
            onRemoveCustomPermission={onRemoveCustomPermission}
          />
          <div className="mt-4 space-y-3">
            {isAddingCustom ? (
              <div className="rounded-md border border-dashed border-brand-primary/50 bg-brand-primary/5 p-4">
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase text-gray-900">Clé technique</label>
                    <input
                      type="text"
                      value={customKeyInput}
                      onChange={event => {
                        setCustomKeyInput(event.target.value);
                        setCustomPermissionError(null);
                      }}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
                      placeholder="ex. /rapports"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase text-gray-900">Nom affiché</label>
                    <input
                      type="text"
                      value={customLabelInput}
                      onChange={event => {
                        setCustomLabelInput(event.target.value);
                        setCustomPermissionError(null);
                      }}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
                      placeholder="ex. Rapports"
                    />
                  </div>
                </div>
                {customPermissionError && (
                  <p className="mt-2 text-xs font-medium text-red-700">{customPermissionError}</p>
                )}
                <div className="mt-3 flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={resetCustomPermissionForm}
                    className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-900 hover:bg-gray-100"
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmAddCustomPermission}
                    className="rounded-md bg-brand-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-primary/90"
                  >
                    Ajouter
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setIsAddingCustom(true);
                  setCustomPermissionError(null);
                }}
                className="text-sm font-semibold text-brand-primary hover:underline"
              >
                Ajouter une permission
              </button>
            )}
          </div>
        </div>
        <div className="flex justify-end space-x-2">
          {mode === 'edit' && (
            <button
              type="button"
              onClick={onCancel}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-100"
            >
              Annuler
            </button>
          )}
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center rounded-md bg-brand-primary px-4 py-2 text-sm font-semibold text-white shadow hover:bg-brand-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Save className="mr-2 h-4 w-4" />
            {isSubmitting ? 'Enregistrement...' : mode === 'edit' ? 'Mettre à jour' : 'Créer'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default RoleForm;
