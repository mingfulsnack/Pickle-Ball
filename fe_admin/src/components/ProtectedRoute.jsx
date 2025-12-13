import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import PropTypes from 'prop-types';

const ProtectedRoute = ({ children, requireEdit = false }) => {
  const { canEdit } = useAuth();

  // If route requires edit permission (admin/manager only) and user is staff
  if (requireEdit && !canEdit()) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return children;
};

ProtectedRoute.propTypes = {
  children: PropTypes.node.isRequired,
  requireEdit: PropTypes.bool,
};

export default ProtectedRoute;
