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
import PublicLayout from './layouts/PublicLayout';
//import Login from './pages/Login';

// Customer/Public pages
import Homepage from './pages/customer/Homepage';
import BookingPage from './pages/customer/BookingPage';
import Dashboard from './pages/customer/Dashboard';

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

// Public Route component (redirects to admin dashboard if already logged in as admin)
const PublicRoute = ({ children }) => {
  const { isAuthenticated, isAdmin, isLoading } = useAuth();

  console.log(
    'PublicRoute - isLoading:',
    isLoading,
    'isAuthenticated:',
    isAuthenticated(),
    'isAdmin:',
    isAdmin()
  );

  if (isLoading) {
    return <div>Loading...</div>;
  }

  // Only redirect admins to admin dashboard, let regular users access public pages
  if (isAuthenticated() && isAdmin()) {
    console.log('Admin user accessing public route, redirecting to admin dashboard');
    return <Navigate to="/admin/dashboard" replace />;
  }

  return children;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public routes with PublicLayout */}
          <Route path="/" element={<PublicLayout />}>
            <Route index element={<Homepage />} />
            <Route path="booking" element={<BookingPage />} />
            <Route path="booking-history" element={<div>Lịch sử đặt sân (Coming soon)</div>} />
            <Route path="about" element={<div>Giới thiệu (Coming soon)</div>} />
            <Route path="booking-confirmation" element={<div>Xác nhận đặt sân (Coming soon)</div>} />
          </Route>
          
          {/* Login route (standalone) */}
          {/* <Route 
            path="/login" 
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            } 
          /> */}

          {/* Admin routes with AppLayout */}
          <Route path="/admin" element={<AppLayout />}>
            <Route 
              index 
              element={
                <ProtectedRoute adminOnly={true}>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
            <Route
              path="dashboard"
              element={
                <ProtectedRoute adminOnly={true}>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            {/* Add more admin routes here as needed */}
            
            {/* Redirect admin root to dashboard */}
            <Route path="" element={<Navigate to="/admin/dashboard" replace />} />
          </Route>

          {/* Catch all route - redirect to homepage */}
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
