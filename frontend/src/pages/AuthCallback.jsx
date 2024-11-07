import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const AuthCallback = () => {
  const navigate = useNavigate();
  const { checkAuthStatus } = useAuth();

  useEffect(() => {
    const completeAuth = async () => {
      await checkAuthStatus();
      navigate('/dashboard');
    };

    completeAuth();
  }, [checkAuthStatus, navigate]);

  return <div>Completing authentication...</div>;
};

export default AuthCallback;