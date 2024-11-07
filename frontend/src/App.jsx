import { Route, Routes } from 'react-router-dom';
import { Toaster } from "@/components/ui/toaster"
import Home from './pages/Home';
import Signin from './pages/Signin';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import AuthCallback from './pages/AuthCallback';
import Chat from './pages/Chat';
import Navbar from './components/Navbar';
import { AuthProvider } from './hooks/useAuth';
import Finetune from './pages/Finetune';

function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto py-8">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/signin" element={<Signin />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/auth-callback" element={<AuthCallback />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/finetune" element={<Finetune />} />
          </Routes>
        </div>
        <Toaster />
      </div>
    </AuthProvider>
  );
}

export default App;
