import React from 'react';
import Modal from '../Modal';
import RoleForm from './RoleForm';
import RoleList from './RoleList';
import { useRoleManager } from './useRoleManager';

interface RoleManagerDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const RoleManagerDialog: React.FC<RoleManagerDialogProps> = ({ isOpen, onClose }) => {
  const {
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
  } = useRoleManager({ isOpen, onClose });

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Gestion des rôles" size="xl">
      <div className="flex flex-col gap-6">
        {statusMessage && (
          <div className="rounded-md bg-green-100 px-4 py-2 text-sm font-medium text-green-900">{statusMessage}</div>
        )}
        {errorMessage && (
          <div className="rounded-md bg-red-100 px-4 py-2 text-sm font-medium text-red-900">{errorMessage}</div>
        )}

        <div className="flex flex-col gap-6 md:flex-row md:items-start md:gap-8">
          <div className="md:w-[38%] md:flex-shrink-0 lg:w-[35%]">
            <RoleList
              roles={roles}
              isFetching={isFetching}
              onCreateRole={resetForm}
              onSelectRole={handleSelectRole}
              onDeleteRole={handleDeleteRole}
              selectedRoleId={formState.id}
              isEditing={mode === 'edit'}
              deletingRoleId={deletingRoleId}
              getPermissionLabel={getPermissionLabel}
            />
          </div>

          <div className="flex-1">
            <RoleForm
              mode={mode}
              formState={formState}
              onSubmit={handleSubmit}
              onInputChange={handleInputChange}
              onHomePageChange={handleHomePageChange}
              onPermissionChange={handlePermissionChange}
              onAddCustomPermission={handleAddCustomPermission}
              onRemoveCustomPermission={handleRemoveCustomPermission}
              onCancel={resetForm}
              isSubmitting={isSubmitting}
              hasAccessibleHomePage={hasAccessibleHomePage}
              permissionKeys={permissionKeys}
              getPermissionLabel={getPermissionLabel}
              isPermissionGranted={isPermissionGranted}
            />
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default RoleManagerDialog;
