import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
    children: React.ReactNode;
}

// Admin-only route
export function AdminRoute({ children }: ProtectedRouteProps) {
    const { role, loading } = useAuth();
    const isSimpleAdmin = sessionStorage.getItem('agent_authenticated') === 'true' && sessionStorage.getItem('agent_role') === 'admin';

    if (loading && !isSimpleAdmin) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
                </div>
            </div>
        );
    }

    if (role !== 'admin' && !isSimpleAdmin) {
        return <Navigate to="/dashboard" replace />;
    }

    return <>{children}</>;
}

// Agent or Admin route
export function AgentRoute({ children }: ProtectedRouteProps) {
    const { role, loading } = useAuth();
    const isSimpleAuth = sessionStorage.getItem('agent_authenticated') === 'true';
    const simpleRole = sessionStorage.getItem('agent_role');

    if (loading && !isSimpleAuth) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
                </div>
            </div>
        );
    }

    if (role !== 'admin' && role !== 'agent' && (!isSimpleAuth || (simpleRole !== 'admin' && simpleRole !== 'agent'))) {
        return <Navigate to="/dashboard" replace />;
    }
    return <>{children}</>;
}
