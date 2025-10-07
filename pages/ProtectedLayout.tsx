import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { NotificationCounts } from '../types';
import ReportModal from '../components/ReportModal';
import { Menu } from 'lucide-react';

const ProtectedLayout: React.FC = () => {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const { role } = useAuth();
  const [notifications, setNotifications] = useState<NotificationCounts | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  const openSidebar = () => setSidebarOpen(true);
  const closeSidebar = () => setSidebarOpen(false);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const counts = await api.getNotificationCounts();
        setNotifications(counts);
      } catch (error) {
        console.error("Failed to fetch notifications", error);
      }
    };

    // Initial fetch
    fetchNotifications();

    // Subscribe to real-time updates
    const unsubscribe = api.notifications.subscribe('notifications_updated', fetchNotifications);

    // Cleanup subscription on unmount
    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <>
      <div className="app-shell">
        <Sidebar
          isOpen={isSidebarOpen}
          onClose={closeSidebar}
          notifications={notifications}
          onReportClick={() => setIsReportModalOpen(true)}
        />
        <div className="app-main">
          <header className="app-header">
            <button
              type="button"
              onClick={openSidebar}
              className="app-header__menu-button md:hidden"
              aria-label="Abrir el menú"
            >
              <Menu size={24} />
            </button>
            <h1 className="app-header__title">Bienvenido, {role?.name}</h1>
            <div className="app-header__spacer md:hidden" aria-hidden="true" />
            {/* Add other header elements like user menu here */}
          </header>
          <main className="app-content">
            <div className="app-content__inner">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
      <ReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
      />
    </>
  );
};

export default ProtectedLayout;