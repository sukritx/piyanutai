import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const Dashboard = () => {
	const { user, isAuthenticated, loading, logout } = useAuth();
	const navigate = useNavigate();

	useEffect(() => {
		if (!loading && !isAuthenticated) {
			navigate('/signin');
		}
	}, [isAuthenticated, loading, navigate]);

	if (loading) {
		return <div>Loading...</div>;
	}

	if (!isAuthenticated || !user) {
		return null;
	}

	const handleLogout = async () => {
		await logout();
		navigate('/signin');
	};

	return (
		<Card className="w-[350px] mx-auto">
			<CardHeader>
				<CardTitle>Welcome, {user.name}!</CardTitle>
			</CardHeader>
			<CardContent>
				<p className="mb-4">Email: {user.email}</p>
				<Button onClick={handleLogout} className="w-full">Logout</Button>
			</CardContent>
		</Card>
	);
};

export default Dashboard;