import React from 'react';
import { useNavigate } from 'react-router-dom';

interface NoAccessProps {
  onLogout?: () => void;
}

const NoAccess: React.FC<NoAccessProps> = ({ onLogout }) => {
  const navigate = useNavigate();

  const handleReturnToLogin = React.useCallback(() => {
    if (onLogout) {
      onLogout();
    }

    navigate('/login', { replace: true });
  }, [navigate, onLogout]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="space-y-4">
        <h1 className="text-3xl font-semibold text-gray-900">Accès non autorisé</h1>
        <p className="text-base text-gray-600">
          Votre rôle ne dispose actuellement d'aucune page accessible. Veuillez contacter un administrateur
          ou revenir à l'écran de connexion.
        </p>
      </div>
      <button
        type="button"
        onClick={handleReturnToLogin}
        className="rounded-md bg-brand-primary px-6 py-3 text-white transition hover:bg-brand-primary/90 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2"
      >
        Retour à la connexion
      </button>
    </div>
  );
};

export default NoAccess;
