import { Navigate } from 'react-router-dom';

interface AdminRouteProps {
    children: React.ReactNode;
}

export default function AdminRoute({ children }: AdminRouteProps) {
    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : null;
    
    if (!userStr) {
        return <Navigate to="/" replace />;
    }
    
    if (user?.role !== 'admin') {
        return <Navigate to="/dashboard" replace />;
    }
    
    return <>{children}</>;
}
