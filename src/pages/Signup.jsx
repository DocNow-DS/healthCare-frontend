import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

export default function Signup({ onSignup }) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Patient');
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    localStorage.setItem('auth_token', 'mock_token');
    localStorage.setItem('auth_user', JSON.stringify({ username, role }));
    
    if (onSignup) onSignup();
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-white flex flex-col justify-center py-8 sm:px-6 lg:px-8 selection:bg-[#182C61]/10">
      <div className="sm:mx-auto sm:w-full sm:max-w-md animate-in fade-in slide-in-from-top-8 duration-1000">
        <div className="flex justify-center group cursor-pointer transition-transform hover:scale-110">
          <div className="h-12 w-12 bg-[#182C61] rounded-xl flex items-center justify-center shadow-xl">
            <span className="text-white font-black text-2xl">+</span>
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-black text-[#182C61] tracking-tighter">
          Join DocNow<span className="text-[#eb2f06]">.</span>
        </h2>
        <p className="mt-2 text-center text-[10px] font-black text-[#808e9b] uppercase tracking-[0.2em]">
          Standard Patient Enrollment
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
        <div className="bg-white py-10 px-8 border-2 border-slate-50 rounded-[2rem] shadow-2xl shadow-[#182C61]/5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-1.5 h-full bg-[#182C61]"></div>
          
          <div className="flex gap-3 mb-8">
            {['Patient', 'Doctor'].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                className={`flex-1 py-3 text-[10px] font-black uppercase tracking-[0.2em] rounded-xl transition-all duration-300 border-2 ${
                  role === r 
                  ? 'bg-[#182C61] text-white border-[#182C61] shadow-lg' 
                  : 'bg-white text-[#808e9b] border-slate-50 hover:border-[#182C61]/20'
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-[#808e9b] uppercase tracking-widest mb-2">Legal Name</label>
                <input
                  type="text"
                  required
                  className="w-full px-5 py-3.5 bg-slate-50 border-2 border-transparent rounded-xl focus:outline-none focus:ring-4 focus:ring-[#182C61]/5 focus:border-[#182C61] text-sm text-[#1e272e] font-black transition-all"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-[#808e9b] uppercase tracking-widest mb-2">Email</label>
                <input
                  type="email"
                  required
                  className="w-full px-5 py-3.5 bg-slate-50 border-2 border-transparent rounded-xl focus:outline-none focus:ring-4 focus:ring-[#182C61]/5 focus:border-[#182C61] text-sm text-[#1e272e] font-black transition-all"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-[#808e9b] uppercase tracking-widest mb-2">Secure Password</label>
              <input
                type="password"
                required
                className="w-full px-5 py-3.5 bg-slate-50 border-2 border-transparent rounded-xl focus:outline-none focus:ring-4 focus:ring-[#182C61]/5 focus:border-[#182C61] text-sm text-[#1e272e] font-black transition-all"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div>
              <button type="submit" className="btn-primary w-full py-4 text-[10px]">
                Create Account
              </button>
            </div>
          </form>

          <div className="mt-8 pt-8 border-t-2 border-slate-50 text-center">
            <p className="text-[10px] font-black text-[#808e9b] uppercase tracking-widest">
              Already a Member?{' '}
              <Link to="/login" className="text-[#182C61] hover:text-[#eb2f06] transition-colors underline underline-offset-4">
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
