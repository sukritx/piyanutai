import { useState } from 'react';
import { z } from 'zod';
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';

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
    setErrors(prev => ({ ...prev, [e.target.name]: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setAlertError('');

    try {
      signinSchema.parse(formData);
      await login(formData);
      navigate('/chat');
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors = {};
        error.errors.forEach(err => {
          newErrors[err.path[0]] = err.message;
        });
        setErrors(newErrors);
      } else if (error.response?.data?.details) {
        const newErrors = {};
        error.response.data.details.forEach(detail => {
          newErrors[detail.field] = detail.message;
        });
        setErrors(newErrors);
      } else {
        setAlertError(error.response?.data?.message || 'An error occurred during sign in');
      }
    }
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
      </CardContent>
    </Card>
  );
};

export default Signin;
