import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../hooks/useAuth';

const AuthComplete = () => {
    const navigate = useNavigate();
    const { login } = useAuth();

    useEffect(() => {
        const fetchToken = async () => {
            try {
                const response = await api.post('/auth/complete-authentication');
                login(response.data.token);
                navigate('/dashboard');
            } catch (error) {
                console.error('Error completing authentication:', error);
                navigate('/signin');
            }
        };

        fetchToken();
    }, [navigate, login]);

    return <div>Completing authentication...</div>;
};

export default AuthComplete;