
import React from 'react';
import { Link } from 'react-router-dom';

const NotFound: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-100 text-center">
      <h1 className="text-9xl font-extrabold text-brand-primary tracking-widest">404</h1>
      <div className="bg-brand-accent px-2 text-sm rounded rotate-12 absolute">
        Page Non Trouvée
      </div>
      <p className="text-2xl md:text-3xl font-light text-gray-700 mt-4">
        Désolé, la page que vous recherchez n'existe pas.
      </p>
      <Link
        to="/"
        className="mt-8 px-8 py-3 bg-brand-primary text-brand-secondary font-semibold rounded-lg hover:bg-yellow-400 transition"
      >
        Retour à l'accueil
      </Link>
    </div>
  );
};

export default NotFound;
