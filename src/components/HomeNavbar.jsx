import { Link } from 'react-router-dom';

export default function HomeNavbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md m-4 rounded-[2rem] border-2 border-slate-50 shadow-2xl shadow-[#1e272e]/5">
      <div className="max-w-7xl mx-auto px-10 h-20 flex items-center justify-between">
        <div className="flex items-center group cursor-pointer">
          <div className="h-10 w-10 bg-[#182C61] rounded-2xl flex items-center justify-center shadow-xl shadow-[#182C61]/20 group-hover:rotate-12 transition-transform">
            <span className="text-white font-black text-xl">+</span>
          </div>
          <span className="ml-4 text-2xl font-black text-[#1e272e] tracking-tighter">
            DocNow<span className="text-[#eb2f06]">.</span>
          </span>
        </div>
        
        <div className="hidden lg:flex items-center space-x-12">
          <a href="#services" className="text-sm font-black text-[#808e9b] hover:text-[#182C61] transition-colors uppercase tracking-widest">Services</a>
          <a href="#about" className="text-sm font-black text-[#808e9b] hover:text-[#182C61] transition-colors uppercase tracking-widest">About</a>
          <a href="#contact" className="text-sm font-black text-[#808e9b] hover:text-[#182C61] transition-colors uppercase tracking-widest">Contact</a>
        </div>

        <div className="flex items-center space-x-6">
          <Link to="/login" className="text-sm font-black text-[#808e9b] hover:text-[#0fbcf9] transition-colors uppercase tracking-widest">
            Login
          </Link>
          <Link to="/signup" className="px-8 py-3.5 bg-[#0fbcf9] text-white text-xs font-black rounded-2xl shadow-xl shadow-[#0fbcf9]/20 hover:bg-[#0fbcf9]/90 hover:scale-[1.05] transition-all uppercase tracking-[0.2em]">
            Get Started
          </Link>
        </div>
      </div>
    </nav>
  );
}
