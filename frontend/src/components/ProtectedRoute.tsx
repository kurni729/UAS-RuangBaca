import { Navigate } from 'react-router-dom';

interface ProtectedRouteProps {
    children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
    const userStr = localStorage.getItem('user');
    
    if (!userStr) {
        return <Navigate to="/" replace />;
    }
    
    return <>{children}</>;
}
