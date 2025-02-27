import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import useAuth from '../hooks/useAuth';

const Navbar = () => {
  const { isAuthenticated, loading, logout } = useAuth();

  if (loading) {
    return (
      <nav className="bg-background border-b">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <Link to="/" className="text-xl font-bold">AIPiyanut</Link>
          <div>Loading...</div>
        </div>
      </nav>
    );
  }

  return (
    <nav className="bg-background border-b">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <Link to="/" className="text-xl font-medium">AIPiyanut</Link>
        <div>
          {isAuthenticated ? (
            <>
              <Button variant="outline" onClick={logout}>
                Logout
              </Button>
            </>
          ) : (
            <>
              <Button asChild variant="ghost" className="mr-2">
                <Link to="/signin">Sign In</Link>
              </Button>
              <Button asChild>
                <Link to="/signup">Sign Up</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;