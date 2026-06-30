import { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

export default function ProtectedRoute({ children, requireRole }) {
    const { user } = useContext(AuthContext);
    if (!user) return <Navigate to="/login" replace />;
    if (requireRole && user.role !== requireRole) return <Navigate to="/" replace />;
    return children;
}
