import { Button } from "@/components/ui/button"
import { Link } from 'react-router-dom'

const Home = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground">
      <h1 className="text-4xl font-bold mb-4">Welcome to AIPiyanut</h1>
      <p className="text-xl mb-8">Sign up to use</p>
      <div className="space-x-4">
        <Button asChild>
          <Link to="/signin">Sign In</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/signup">Sign Up</Link>
        </Button>
      </div>
    </div>
  );
};

export default Home;
