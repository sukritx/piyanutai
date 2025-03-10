import { Button } from "@/components/ui/button"
import { Link } from 'react-router-dom'

const Home = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground px-4 md:px-6">
      <div className="max-w-4xl mx-auto text-center">
        <div className="mb-6">
          <img 
            src="/piyanut.jpg" 
            alt="Piyanut" 
            className="w-80 h-80 object-cover rounded-2xl mx-auto shadow-lg"
          />
        </div>
        <div className="text-purple-600 font-medium mb-4">
          🎉 Celebrating the 60th Anniversary of CMU 🎉
        </div>
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-2">
          AI platform for nursing
        </h1>
        <div className="text-xl md:text-2xl text-muted-foreground mb-6">
          Associate Professor Dr Piyanut Xuto
          <br />
          <span className="text-lg md:text-xl">Faculty of Nursing, Chiang Mai University</span>
        </div>
        <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto">
          AIPiyanut brings you cutting-edge AI for education and research for nursing.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Button size="lg" className="w-full sm:w-auto">
            <Link to="/signin">Login</Link>
          </Button>
          <Button size="lg" variant="outline" className="w-full sm:w-auto">
            <Link to="/signup">Register</Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Home;
