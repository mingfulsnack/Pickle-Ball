import React from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import { AuthProvider, useAuth } from './context/AuthContext';
import AppLayout from './layouts/AppLayout';
import Login from './pages/Login';

// User pages


// Admin pages

import './styles/globals.scss';
import 'react-toastify/dist/ReactToastify.css';

// Protected Route component
const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { isAuthenticated, isAdmin, isLoading } = useAuth();

  console.log(
    'ProtectedRoute - isLoading:',
    isLoading,
    'isAuthenticated:',
    isAuthenticated(),
    'adminOnly:',
    adminOnly
  );

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated()) {
    console.log('User not authenticated, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && !isAdmin()) {
    console.log('User not admin, redirecting to home');
    return <Navigate to="/" replace />;
  }

  return children;
};

// Public Route component (redirects to dashboard if already logged in)
const PublicRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  console.log(
    'PublicRoute - isLoading:',
    isLoading,
    'isAuthenticated:',
    isAuthenticated()
  );

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (isAuthenticated()) {
    console.log('User is authenticated, redirecting to dashboard');
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public login route */}
          <Route path="/login" element={<Login />} />

          {/* All routes wrapped in AppLayout */}
          <Route path="/" element={<AppLayout />}>
            {/* Public routes (user dashboard and menu) */}
            

            {/* Admin-only routes */}

            <Route
              path=""
              element={
                <ProtectedRoute adminOnly={true}>
                  
                </ProtectedRoute>
              }
            />
            <Route
              path=""
              element={
                <ProtectedRoute adminOnly={true}>
                  
                </ProtectedRoute>
              }
            />
            <Route
              path=""
              element={
                <ProtectedRoute adminOnly={true}>
                  <EmployeesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path=""
              element={
                <ProtectedRoute adminOnly={true}>
                  <TablesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path=""
              element={
                <ProtectedRoute adminOnly={true}>
                  <OrdersPage />
                </ProtectedRoute>
              }
            />
            <Route
              path=""
              element={
                <ProtectedRoute adminOnly={true}>
                  <InvoicesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path=""
              element={
                <ProtectedRoute adminOnly={true}>
                  <ReportsPage />
                </ProtectedRoute>
              }
            />
          </Route>

          {/* Catch all route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

        {/* Toast Container */}
        <ToastContainer
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="colored"
        />
      </Router>
    </AuthProvider>
  );
}

export default App;
