import React from 'react';
import { HashRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import Navbar from './components/shared/Navbar';
import LoginPage from './components/LoginPage';
import AdminLoginPage from './components/admin/AdminLoginPage'; // Import AdminLoginPage
import Dashboard from './components/Dashboard';
import ProtectedView from './components/shared/ProtectedView';
import { useAuth } from './contexts/AuthContext'; // Corrected path
// HomePage is no longer used directly
import ProjectBrowser from './components/freelancer/ProjectBrowser'; // For public browsing
import ProjectDetailsPage from './components/ProjectDetailsPage';
import { NAV_LINKS, APP_NAME } from './constants';
import LoadingSpinner from './components/shared/LoadingSpinner'; // Ensured path is relative
import GlobalTimerDisplay from './components/shared/GlobalTimerDisplay';

// Import ToastProvider and ToastContainer
import { ToastProvider } from './components/shared/toast/ToastContext';
import { ToastContainer } from './components/shared/toast/ToastContainer';

// Component to handle root path redirection
const RootRedirect: React.FC = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <LoadingSpinner text="Initializing..." size="lg" />
      </div>
    );
  }
  // If user is loaded, redirect accordingly
  return user ? <Navigate to={NAV_LINKS.DASHBOARD_OVERVIEW} replace /> : <Navigate to={NAV_LINKS.LOGIN} replace />;
};


const AppLayout: React.FC = () => {
  const { isLoading: authLoading } = useAuth(); // Use a different name to avoid conflict
  
  // This loading state is for initial app load, not page transitions within AppLayout
  if (authLoading && !localStorage.getItem('archConnectUser')) { // Only show full screen spinner on first load without stored user
      return (
          <div className="flex items-center justify-center h-screen">
              <LoadingSpinner text="Initializing Platform..." size="lg" />
          </div>
      );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <GlobalTimerDisplay />
      <main className="flex-grow flex flex-col pt-16">
        <Outlet /> 
      </main>
       <footer className="bg-slate-800 text-slate-400 py-6 text-center text-xs">
        <div className="container mx-auto px-4">
          <p>&copy; {new Date().getFullYear()} {APP_NAME}. All rights reserved.</p>
          <p className="mt-1">Designed and Maintained by Apex Planners</p>
        </div>
      </footer>
    </div>
  );
};

// New component to include ToastContainer within the ToastProvider's scope
// and alongside AppLayout
const AppLayoutWithToastContainer: React.FC = () => {
  return (
    <>
      <AppLayout />
      <ToastContainer />
    </>
  );
};

const App: React.FC = () => {
  return (
    <HashRouter>
      <ToastProvider> {/* Wrap with ToastProvider */}
        <Routes>
          {/* Routes without Navbar/Footer - these won't have toasts unless ToastProvider is higher or they are also wrapped */}
          <Route path={NAV_LINKS.LOGIN} element={<LoginPage />} />
          <Route path={NAV_LINKS.ADMIN_LOGIN} element={<AdminLoginPage />} />

          {/* Routes with Navbar/Footer (AppLayout) wrapped by AppLayoutWithToastContainer */}
          <Route element={<AppLayoutWithToastContainer />}>
            <Route path={NAV_LINKS.HOME} element={<RootRedirect />} />
            <Route path={NAV_LINKS.PUBLIC_PROJECT_BROWSE} element={<ProjectBrowser />} />
            <Route
              path={`${NAV_LINKS.DASHBOARD}/*`}
              element={
                <ProtectedView>
                  <Dashboard />
                </ProtectedView>
              }
            />
            <Route
              path={NAV_LINKS.PROJECT_DETAILS.replace(':id', ':id')}
              element={
                <ProtectedView>
                  <div className="bg-white shadow-lg my-0 rounded-lg">
                      <ProjectDetailsPage />
                  </div>
                </ProtectedView>
              }
            />
            {/* Catch-all inside AppLayoutWithToastContainer, typically redirects to NAV_LINKS.HOME which then handles auth redirection */}
            <Route path="*" element={<Navigate to={NAV_LINKS.HOME} replace />} />
          </Route>
          {/* A more general catch-all if no other top-level route matches */}
          <Route path="*" element={<Navigate to={NAV_LINKS.HOME} replace />} />
        </Routes>
      </ToastProvider>
    </HashRouter>
  );
};

export default App;
