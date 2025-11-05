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

// Customer/Public pages
import Homepage from './pages/customer/Homepage';
import BookingPage from './pages/customer/BookingPage';
import BookingLookup from './pages/customer/BookingLookup';
import BookingConfirmation from './pages/customer/BookingConfirmation';
import Payment from './pages/customer/Payment';
import Dashboard from './pages/customer/Dashboard';
import Login from './pages/Auth/Login';
import Register from './pages/Auth/Register';
import Contacts from './pages/customer/Contacts';

import './styles/globals.scss';
import 'react-toastify/dist/ReactToastify.css';

// Protected Route component for customer routes
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public homepage - no authentication required */}
          <Route path="/" element={<PublicLayout />}>
            <Route index element={<Homepage />} />
          </Route>

          {/* Protected customer routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <PublicLayout />
              </ProtectedRoute>
            }
          >
            <Route path="booking" element={<BookingPage />} />
            <Route path="payment" element={<Payment />} />
            <Route path="contacts" element={<Contacts />} />
            <Route path="booking-history" element={<BookingLookup />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="about" element={<div>Giới thiệu (Coming soon)</div>} />
            <Route
              path="booking-confirmation"
              element={<BookingConfirmation />}
            />
          </Route>

          {/* Auth routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

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
