import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ProtectedLayout from './pages/ProtectedLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Ventes from './pages/Ventes';
import Commande from './pages/Commande';
import Cuisine from './pages/Cuisine';
import ParaLlevar from './pages/ParaLlevar';
import Ingredients from './pages/Ingredients';
import Produits from './pages/Produits';
import CommandeClient from './pages/CommandeClient';
import NotFound from './pages/NotFound';
import ResumeVentes from './pages/ResumeVentes';
import SiteCustomization from './pages/SiteCustomization';
import { SITE_CUSTOMIZER_PERMISSION_KEY } from './constants';
import { getHomeRedirectPath, isPermissionGranted } from './utils/navigation';
import NoAccess from './components/NoAccess';

const LoadingScreen: React.FC = () => (
  <div className="flex items-center justify-center h-screen">
    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-brand-primary" />
  </div>
);

const PrivateRoute: React.FC<{ children: React.ReactElement; permissionKey?: string }> = ({
  children,
  permissionKey,
}) => {
  const { role, loading, logout } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!role) {
    return <Navigate to="/" replace />;
  }

  const permission = permissionKey ? role.permissions?.[permissionKey] : undefined;
  const hasPermission = permissionKey ? isPermissionGranted(permission) : true;

  if (!hasPermission) {
    const redirectPath = getHomeRedirectPath(role);
    if (redirectPath) {
      return <Navigate to={redirectPath} replace />;
    }

    return <NoAccess onLogout={logout} />;
  }

  return children;
};

const RootRoute: React.FC = () => {
  const { role, loading, logout } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!role) {
    return <Login />;
  }

  const redirectPath = getHomeRedirectPath(role);
  if (!redirectPath) {
    return <NoAccess onLogout={logout} />;
  }

  return <Navigate to={redirectPath} replace />;
};

const ProtectedAppShell: React.FC = () => (
  <PrivateRoute>
    <ProtectedLayout />
  </PrivateRoute>
);

const AppRoutes: React.FC = () => (
  <Routes>
    <Route path="/" element={<RootRoute />} />
    <Route path="/login" element={<Navigate to="/" replace />} />
    <Route path="/commande-client" element={<CommandeClient />} />

    <Route element={<ProtectedAppShell />}>
      <Route
        path="/dashboard"
        element={
          <PrivateRoute permissionKey="/dashboard">
            <Dashboard />
          </PrivateRoute>
        }
      />
      <Route
        path="/para-llevar"
        element={
          <PrivateRoute permissionKey="/para-llevar">
            <ParaLlevar />
          </PrivateRoute>
        }
      />
      <Route
        path="/ventes"
        element={
          <PrivateRoute permissionKey="/ventes">
            <Ventes />
          </PrivateRoute>
        }
      />
      <Route
        path="/commande/:tableId"
        element={
          <PrivateRoute permissionKey="/ventes">
            <Commande />
          </PrivateRoute>
        }
      />
      <Route
        path="/cocina"
        element={
          <PrivateRoute permissionKey="/cocina">
            <Cuisine />
          </PrivateRoute>
        }
      />
      <Route
        path="/resume-ventes"
        element={
          <PrivateRoute permissionKey="/resume-ventes">
            <ResumeVentes />
          </PrivateRoute>
        }
      />
      <Route
        path="/ingredients"
        element={
          <PrivateRoute permissionKey="/ingredients">
            <Ingredients />
          </PrivateRoute>
        }
      />
      <Route
        path="/produits"
        element={
          <PrivateRoute permissionKey="/produits">
            <Produits />
          </PrivateRoute>
        }
      />
      <Route
        path={SITE_CUSTOMIZER_PERMISSION_KEY}
        element={
          <PrivateRoute permissionKey={SITE_CUSTOMIZER_PERMISSION_KEY}>
            <SiteCustomization />
          </PrivateRoute>
        }
      />
    </Route>

    <Route path="*" element={<NotFound />} />
  </Routes>
);


const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
