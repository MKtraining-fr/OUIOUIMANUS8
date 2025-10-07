import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Role } from '../../types';

interface RoleListProps {
  roles: Role[];
  isFetching: boolean;
  onCreateRole: () => void;
  onSelectRole: (role: Role) => void;
  onDeleteRole: (roleId: string) => void;
  selectedRoleId?: string;
  isEditing: boolean;
  deletingRoleId: string | null;
  getPermissionLabel: (key: string) => string;
}

const RoleList: React.FC<RoleListProps> = ({
  roles,
  isFetching,
  onCreateRole,
  onSelectRole,
  onDeleteRole,
  selectedRoleId,
  isEditing,
  deletingRoleId,
  getPermissionLabel,
}) => {
  const isEmpty = !isFetching && roles.length === 0;

  return (
    <div className="flex h-full flex-col">
      <div className="mb-4 flex items-center justify-between">
        <h4 className="text-lg font-semibold text-gray-900">Rôles existants</h4>
        <button
          type="button"
          onClick={onCreateRole}
          className="inline-flex items-center rounded-md border border-brand-primary px-2 py-1 text-sm font-medium text-brand-primary transition-colors hover:bg-brand-primary/10"
        >
          <Plus className="mr-1.5 h-4 w-4" />
          Nouveau rôle
        </button>
      </div>
      <div className="flex-1 overflow-y-auto rounded-md border border-gray-200 p-3">
        {isFetching ? (
          <p className="text-sm text-gray-900">Chargement des rôles...</p>
        ) : isEmpty ? (
          <p className="text-sm text-gray-900">Aucun rôle configuré pour le moment.</p>
        ) : (
          <div className="space-y-3">
            {roles.map(role => {
              const isSelected = isEditing && selectedRoleId === role.id;
              return (
                <div
                  key={role.id}
                  className={`flex items-center justify-between rounded-md border px-3 py-2 transition-colors ${
                    isSelected ? 'border-brand-primary bg-brand-primary/10' : 'border-gray-200'
                  }`}
                >
                  <div className="space-y-1">
                    <p className="font-semibold text-gray-900">{role.name}</p>
                    <p className="text-xs font-medium text-gray-900">PIN : {role.pin ?? '—'}</p>
                    {role.homePage && (
                      <p className="text-xs font-medium text-gray-900">Accueil : {getPermissionLabel(role.homePage)}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onSelectRole(role)}
                      className="rounded-md border border-gray-300 px-2 py-1 text-xs font-semibold text-gray-900 transition-colors hover:bg-gray-100"
                    >
                      Modifier
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteRole(role.id)}
                      disabled={deletingRoleId === role.id}
                      className="inline-flex items-center rounded-md border border-red-300 px-2 py-1 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Trash2 className="mr-1 h-3 w-3" />
                      Supprimer
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default RoleList;
