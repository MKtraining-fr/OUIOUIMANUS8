import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Armchair,
  DollarSign,
  Utensils,
  HandPlatter,
  MoreVertical,
  Pencil,
  Trash2,
  Plus,
} from 'lucide-react';
import { api } from '../services/api';
import { Table } from '../types';
import OrderTimer from '../components/OrderTimer';
import TableModal, { TableFormValues } from '../components/TableModal';
import { useAuth } from '../contexts/AuthContext';

type StatusDescriptor = { text: string; statusClass: string; Icon: React.ComponentType<{ size?: number }> };

const STATUS_DESCRIPTORS: Record<Table['statut'], StatusDescriptor> = {
  libre: { text: 'Libre', statusClass: 'status--free', Icon: Armchair },
  en_cuisine: { text: 'En cuisine', statusClass: 'status--preparing', Icon: Utensils },
  para_entregar: { text: 'Para entregar', statusClass: 'status--ready', Icon: HandPlatter },
  para_pagar: { text: 'Para pagar', statusClass: 'status--payment', Icon: DollarSign },
};

const formatTableName = (name: string): string => {
  const trimmed = name.trim();
  if (!trimmed) {
    return name;
  }

  const parts = trimmed.split(/\s+/);
  if (parts.length < 2) {
    return trimmed;
  }

  const [firstWord, ...rest] = parts;
  let index = 0;

  while (index < rest.length && rest[index].toLowerCase() === firstWord.toLowerCase()) {
    index += 1;
  }

  return [firstWord, ...rest.slice(index)].join(' ');
};

const getTableStatus = (table: Table): StatusDescriptor => {
  switch (table.statut) {
    case 'libre':
      return STATUS_DESCRIPTORS.libre;
    case 'en_cuisine':
      return STATUS_DESCRIPTORS.en_cuisine;
    case 'para_entregar':
      return STATUS_DESCRIPTORS.para_entregar;
    case 'para_pagar':
      return STATUS_DESCRIPTORS.para_pagar;
    default:
      if (table.estado_cocina === 'servido' || table.estado_cocina === 'entregada') {
        return STATUS_DESCRIPTORS.para_pagar;
      }

      if (table.estado_cocina === 'listo') {
        return STATUS_DESCRIPTORS.para_entregar;
      }

      if (table.commandeId) {
        return STATUS_DESCRIPTORS.en_cuisine;
      }

      return STATUS_DESCRIPTORS.libre;
  }
};

const TableCard: React.FC<{
  table: Table;
  onServe: (orderId: string) => void;
  canEdit: boolean;
  onEdit?: (table: Table) => void;
  onDelete?: (table: Table) => Promise<void> | void;
  isDeleting?: boolean;
}> = ({ table, onServe, canEdit, onEdit, onDelete, isDeleting }) => {
  const navigate = useNavigate();
  const { text, statusClass, Icon } = getTableStatus(table);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const handleCardClick = () => {
    navigate(`/commande/${table.id}`);
  };

  const handleCardKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleCardClick();
    }
  };

  const handleServeClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (table.commandeId) {
      onServe(table.commandeId);
    }
  };

  const handleMenuToggle = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setIsMenuOpen(prev => !prev);
  };

  useEffect(() => {
    if (!isMenuOpen) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  const handleEditClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setIsMenuOpen(false);
    onEdit?.(table);
  };

  const handleDeleteClick = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setIsMenuOpen(false);
    if (!onDelete) {
      return;
    }

    try {
      await onDelete(table);
    } catch (error) {
      console.error('Failed to delete table from card:', error);
    }
  };

  const displayName = formatTableName(table.nom);

  return (
    <div
      onClick={handleCardClick}
      onKeyDown={handleCardKeyDown}
      className={`ui-card status-card ${statusClass} relative`}
      role="button"
      tabIndex={0}
    >
      {table.statut === 'para_entregar' && table.readyOrdersCount && table.readyOrdersCount > 0 && (
        <div className="absolute left-3 top-3 z-10">
          <span className="table-notification-badge">
            {table.readyOrdersCount}
          </span>
        </div>
      )}
      {canEdit && (
        <div className="absolute right-3 top-3" ref={menuRef}>
          <button
            type="button"
            onClick={handleMenuToggle}
            className="flex h-9 w-9 items-center justify-center rounded-full text-gray-500 transition hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:cursor-not-allowed disabled:opacity-60"
            aria-haspopup="menu"
            aria-expanded={isMenuOpen}
            aria-label="Options de la table"
            disabled={isDeleting}
          >
            <MoreVertical size={18} />
          </button>
          {isMenuOpen && (
            <div className="absolute right-0 mt-2 w-44 rounded-md border border-gray-200 bg-white py-1 text-sm shadow-lg">
              <button
                type="button"
                onClick={handleEditClick}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-gray-700 transition hover:bg-gray-100"
              >
                <Pencil size={16} />
                Modifier
              </button>
              <button
                type="button"
                onClick={handleDeleteClick}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isDeleting}
              >
                <Trash2 size={16} />
                {isDeleting ? 'Suppression…' : 'Supprimer'}
              </button>
            </div>
          )}
        </div>
      )}

      <div className="status-card__header">
        <h3 className="status-card__title">{displayName}</h3>
        {table.date_envoi_cuisine && table.statut !== 'libre' && (
          <div className="status-card__timer">
            <OrderTimer startTime={table.date_envoi_cuisine} className="w-full justify-center" />
          </div>
        )}
      </div>

      <div className="status-card__body">
        <Icon size={56} className="status-card__icon" />
        <p className="status-card__state">{text}</p>
      </div>

      <div className="status-card__footer">
        {table.statut !== 'libre' ? (
          <p className="status-card__meta">Couverts : {table.couverts}</p>
        ) : (
          <p className="status-card__meta">Capacité : {table.capacite}</p>
        )}

        {(table.estado_cocina === 'listo' || table.statut === 'para_entregar') && (
          <button type="button" onClick={handleServeClick} className="ui-btn ui-btn-accent status-card__cta">
            ENTREGADA
          </button>
        )}
      </div>
    </div>
  );
};

const Ventes: React.FC = () => {
  const { role } = useAuth();
  const canEditTables = role?.permissions?.['/ventes'] === 'editor';

  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [deletingTableId, setDeletingTableId] = useState<string | null>(null);
  const fetchIdRef = useRef(0);

  const fetchTables = useCallback(async () => {
    const fetchId = ++fetchIdRef.current;
    try {
      const data = await api.getTables();
      if (fetchId === fetchIdRef.current) {
        setTables(data);
        setFetchError(null);
      }
    } catch (error) {
      console.error('Failed to fetch tables', error);
      if (fetchId === fetchIdRef.current) {
        setFetchError('Impossible de charger le plan de salle. Veuillez réessayer.');
      }
    } finally {
      if (fetchId === fetchIdRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchTables();
    const interval = setInterval(fetchTables, 10000);
    const unsubscribe = api.notifications.subscribe('orders_updated', fetchTables);
    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, [fetchTables]);

  const handleModalClose = useCallback(() => {
    setIsModalOpen(false);
    setSelectedTable(null);
  }, []);

  const openCreateModal = useCallback(() => {
    setModalMode('create');
    setSelectedTable(null);
    setActionError(null);
    setActionSuccess(null);
    setIsModalOpen(true);
  }, []);

  const handleEditTable = useCallback((table: Table) => {
    setModalMode('edit');
    setSelectedTable(table);
    setActionError(null);
    setActionSuccess(null);
    setIsModalOpen(true);
  }, []);

  const handleModalSubmit = useCallback(
    async (values: TableFormValues) => {
      setActionError(null);
      setActionSuccess(null);

      try {
        let successMessage = '';
        if (modalMode === 'create') {
          await api.createTable(values);
          successMessage = 'Table créée avec succès.';
        } else {
          if (!selectedTable) {
            const message = 'Aucune table sélectionnée pour la mise à jour.';
            setActionError(message);
            throw new Error(message);
          }
          await api.updateTable(selectedTable.id, values);
          successMessage = 'Table mise à jour avec succès.';
        }

        await fetchTables();
        handleModalClose();
        setActionSuccess(successMessage);
      } catch (error) {
        console.error('Failed to save table:', error);
        const message =
          modalMode === 'create'
            ? 'Impossible de créer la table. Veuillez réessayer.'
            : 'Impossible de mettre à jour la table. Veuillez réessayer.';
        setActionError(message);
        throw new Error(message);
      }
    },
    [fetchTables, handleModalClose, modalMode, selectedTable],
  );

  const handleDeleteTable = useCallback(
    async (table: Table) => {
      if (!confirm('Supprimer cette table ? Cette action est irréversible.')) {
        return;
      }

      setActionError(null);
      setActionSuccess(null);
      setDeletingTableId(table.id);

      try {
        await api.deleteTable(table.id);
        await fetchTables();
        setActionSuccess('Table supprimée avec succès.');
      } catch (error) {
        console.error('Failed to delete table:', error);
        setActionError('Impossible de supprimer la table. Veuillez réessayer.');
      } finally {
        setDeletingTableId(null);
      }
    },
    [fetchTables],
  );

  const handleServeOrder = useCallback(
    async (orderId: string) => {
      setActionError(null);
      setActionSuccess(null);
      
      // Trouver la table concernée
      const affectedTable = tables.find(t => t.commandeId === orderId);
      if (!affectedTable) return;
      
      // Mise à jour optimiste : mettre à jour uniquement la table concernée
      setTables(prevTables => 
        prevTables.map(table => 
          table.id === affectedTable.id
            ? { ...table, statut: 'para_pagar', estado_cocina: 'servido' }
            : table
        )
      );
      
      try {
        await api.markOrderAsServed(orderId);
        // Rafraîchir pour synchroniser avec le serveur
        await fetchTables();
      } catch (error) {
        console.error('Failed to mark order as served:', error);
        setActionError('Impossible de marquer la commande comme servie. Veuillez réessayer.');
        // Rollback en cas d'erreur
        await fetchTables();
      }
    },
    [fetchTables, tables],
  );

  if (loading) {
    return <p className="section-text section-text--muted">Chargement du plan de salle...</p>;
  }

  const modalInitialValues =
    modalMode === 'edit' && selectedTable
      ? {
          nom: selectedTable.nom,
          capacite: selectedTable.capacite,
          couverts: selectedTable.couverts,
        }
      : undefined;

  const showCouvertsField = modalMode === 'edit' && Boolean(selectedTable?.commandeId);

  return (
    <div>
      <div className="flex flex-col gap-4">
        {canEditTables && (
          <div className="flex justify-end">
            <button type="button" onClick={openCreateModal} className="ui-btn ui-btn-primary flex items-center gap-2">
              <Plus size={18} />
              Ajouter une table
            </button>
          </div>
        )}

        {fetchError && (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">{fetchError}</div>
        )}

        {actionError && (
          <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">{actionError}</div>
        )}

        {actionSuccess && (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">{actionSuccess}</div>
        )}
      </div>

      <div className="mt-6 status-grid">
        {tables.map(table => (
          <TableCard
            key={table.id}
            table={table}
            onServe={handleServeOrder}
            canEdit={Boolean(canEditTables)}
            onEdit={handleEditTable}
            onDelete={handleDeleteTable}
            isDeleting={deletingTableId === table.id}
          />
        ))}
      </div>

      <TableModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        mode={modalMode}
        initialValues={modalInitialValues}
        onSubmit={handleModalSubmit}
        showCouvertsField={showCouvertsField}
      />
    </div>
  );
};

export default Ventes;
