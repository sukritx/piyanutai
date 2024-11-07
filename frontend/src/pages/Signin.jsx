import { useState } from 'react';
import { z } from 'zod';
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import GoogleLogo from '@/components/GoogleLogo';
import { useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import api from '../utils/api';

const signinSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

const Signin = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [alertError, setAlertError] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    // Clear the error for this field when the user starts typing
    setErrors(prev => ({ ...prev, [e.target.name]: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setAlertError('');

    try {
      // Validate form data using Zod
      signinSchema.parse(formData);

      // console.log('Attempting login with credentials:', formData);
      await login(formData);
      navigate('/dashboard');
    } catch (error) {
      // console.error('Signin error:', error);

      if (error instanceof z.ZodError) {
        // Handle Zod validation errors
        const newErrors = {};
        error.errors.forEach(err => {
          newErrors[err.path[0]] = err.message;
        });
        setErrors(newErrors);
      } else if (error.response?.data?.details) {
        // Handle server-side validation errors
        const newErrors = {};
        error.response.data.details.forEach(detail => {
          newErrors[detail.field] = detail.message;
        });
        setErrors(newErrors);
      } else {
        // Handle other errors
        setAlertError(error.response?.data?.message || 'An error occurred during sign in');
      }
    }
  };

  const handleGoogleSignIn = () => {
    window.location.href = `${import.meta.env.VITE_API_URL}/api/v1/auth/google`;
  };

  return (
    <Card className="w-[350px] mx-auto">
      <CardHeader>
        <CardTitle>Sign In</CardTitle>
      </CardHeader>
      <CardContent>
        {alertError && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{alertError}</AlertDescription>
          </Alert>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input 
            type="email" 
            name="email" 
            placeholder="Email" 
            value={formData.email} 
            onChange={handleChange} 
          />
          {errors.email && <p className="text-red-500 text-sm">{errors.email}</p>}
          <Input 
            type="password" 
            name="password" 
            placeholder="Password" 
            value={formData.password} 
            onChange={handleChange} 
          />
          {errors.password && <p className="text-red-500 text-sm">{errors.password}</p>}
          <Button type="submit" className="w-full">Sign In</Button>
        </form>
        <div className="mt-4">
          <Button 
            variant="outline" 
            className="w-full flex items-center justify-center" 
            onClick={handleGoogleSignIn}
          >
            <GoogleLogo />
            <span className="ml-2">Sign in with Google</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default Signin;
