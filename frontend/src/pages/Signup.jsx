import { useState } from 'react';
import axios from 'axios';
import { z } from 'zod';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import GoogleLogo from '@/components/GoogleLogo';
import { useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';  // Add this import
import api from '../utils/api';  // Add this import

const signupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters long"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters long"),
});

const Signup = () => {
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();
  const { login } = useAuth();  // Add this line

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    // Clear the error for this field when the user starts typing
    setErrors(prev => ({ ...prev, [e.target.name]: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({}); // Clear all errors before validation

    try {
      // Validate form data using Zod
      signupSchema.parse(formData);

      // console.log('Sending signup request with data:', formData);
      const response = await api.post('/api/v1/auth/signup', formData);
      // console.log('Signup response:', response.data);
      await login(formData);
      navigate('/dashboard');
    } catch (error) {
      console.error('Signup error:', error);

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
        setErrors({ general: error.response?.data?.message || 'An error occurred during signup' });
      }
    }
  };

  const handleGoogleSignUp = () => {
    window.location.href = `${import.meta.env.VITE_API_URL}/api/v1/auth/google`;
  };

  return (
    <Card className="w-[350px] mx-auto">
      <CardHeader>
        <CardTitle>Sign Up</CardTitle>
      </CardHeader>
      <CardContent>
        {errors.general && <p className="text-red-500 text-sm mb-4">{errors.general}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input type="text" name="name" placeholder="Name" value={formData.name} onChange={handleChange} />
          {errors.name && <p className="text-red-500 text-sm">{errors.name}</p>}
          <Input type="email" name="email" placeholder="Email" value={formData.email} onChange={handleChange} />
          {errors.email && <p className="text-red-500 text-sm">{errors.email}</p>}
          <Input type="password" name="password" placeholder="Password" value={formData.password} onChange={handleChange} />
          {errors.password && <p className="text-red-500 text-sm">{errors.password}</p>}
          <Button type="submit" className="w-full">Sign Up</Button>
        </form>
        <div className="mt-4">
          <Button variant="outline" className="w-full flex items-center justify-center" onClick={handleGoogleSignUp}>
            <GoogleLogo />
            <span className="ml-2">Sign up with Google</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default Signup;
