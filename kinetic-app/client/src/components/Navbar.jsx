import { Link } from 'react-router-dom';
import ThemeToggle from './ThemeToggle';

const Navbar = () => {
  return (
    <nav className="fixed top-0 w-full z-50 bg-white/80 dark:bg-[#0E0E0E]/80 backdrop-blur-xl font-space">
      <div className="flex justify-between items-center px-8 py-4 max-w-screen-2xl mx-auto">
        <Link to="/" className="text-2xl font-black italic tracking-tighter dark:text-white">VELOCITY</Link>

        <div className="hidden md:flex items-center space-x-8">
          <Link to="/dashboard" className="text-landing-muted hover:text-electric-lime font-bold transition-colors">Dashboard</Link>
          <Link to="/pricing" className="text-landing-muted hover:text-electric-lime font-bold transition-colors">Pricing</Link>
        </div>

        <div className="flex items-center space-x-6">
          <ThemeToggle />
          <Link to="/pricing">
            <button className="bg-electric-lime text-black px-6 py-2.5 rounded-xl font-black hover:scale-105 transition">GO PRO</button>
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
