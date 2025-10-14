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
import BookingLookup from './pages/customer/BookingLookup';
import BookingConfirmation from './pages/customer/BookingConfirmation';
import Dashboard from './pages/customer/Dashboard';
import Login from './pages/Auth/Login';
import Register from './pages/Auth/Register';
import Contacts from './pages/customer/Contacts';

// Admin pages
import Bookings from './pages/admin/Bookings';
import Courts from './pages/admin/Courts';
import TimeFrames from './pages/admin/TimeFrames';

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

  // Require authentication for public routes
  if (!isAuthenticated()) {
    console.log('PublicRoute - user not authenticated, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  // If an admin user is accessing public route, redirect to admin dashboard
  if (isAdmin()) {
    console.log(
      'Admin user accessing public route, redirecting to admin dashboard'
    );
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
          <Route
            path="/"
            element={
              <PublicRoute>
                <PublicLayout />
              </PublicRoute>
            }
          >
            <Route index element={<Homepage />} />
            <Route path="booking" element={<BookingPage />} />
            <Route path="contacts" element={<Contacts />} />
            <Route path="booking-history" element={<BookingLookup />} />
            <Route path="about" element={<div>Giới thiệu (Coming soon)</div>} />
            <Route
              path="booking-confirmation"
              element={<BookingConfirmation />}
            />
          </Route>

          {/* Auth routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

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
            <Route
              path="bookings"
              element={
                <ProtectedRoute adminOnly={true}>
                  <Bookings />
                </ProtectedRoute>
              }
            />
            <Route
              path="courts"
              element={
                <ProtectedRoute adminOnly={true}>
                  <Courts />
                </ProtectedRoute>
              }
            />
            <Route
              path="timeframes"
              element={
                <ProtectedRoute adminOnly={true}>
                  <TimeFrames />
                </ProtectedRoute>
              }
            />

            {/* Redirect admin root to dashboard */}
            <Route
              path=""
              element={<Navigate to="/admin/dashboard" replace />}
            />
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
