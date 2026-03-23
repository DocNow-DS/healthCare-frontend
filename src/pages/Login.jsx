import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { httpJson } from '../lib/http';
import { api } from '../config/api';

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const mapRolesToUiRole = (roles) => {
    const upperRoles = Array.isArray(roles)
      ? roles.map((r) => String(r).toUpperCase())
      : [];

    if (upperRoles.includes('ADMIN')) return 'Admin';
    if (upperRoles.includes('DOCTOR')) return 'Doctor';
    return 'Patient';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      const result = await httpJson(`${api.authBase}/login`, {
        method: 'POST',
        body: {
          email: username,
          password,
        },
      });

      const token = result?.token;
      const user = result?.user;
      const role = mapRolesToUiRole(user?.roles);

      if (typeof token !== 'string' || token.length === 0) {
        throw new Error('Login failed: missing token');
      }

      localStorage.setItem('auth_token', token);
      localStorage.setItem(
        'auth_user',
        JSON.stringify({
          ...(user ?? {}),
          username: user?.username ?? username.split('@')[0],
          role,
        })
      );

      if (onLogin) onLogin();
      navigate('/dashboard');
    } catch (err) {
      setError(err?.message || 'Login failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col justify-center py-8 sm:px-6 lg:px-8 selection:bg-[#182C61]/10">
      <div className="sm:mx-auto sm:w-full sm:max-w-md animate-in fade-in slide-in-from-top-8 duration-1000">
        <div className="flex justify-center group cursor-pointer">
          <div className="h-12 w-12 bg-[#182C61] rounded-xl flex items-center justify-center shadow-xl transition-transform group-hover:rotate-12 duration-500">
            <span className="text-white font-black text-2xl">+</span>
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-black text-[#182C61] tracking-tighter">
          Welcome back<span className="text-[#eb2f06]">.</span>
        </h2>
        <p className="mt-2 text-center text-[10px] font-black text-[#808e9b] uppercase tracking-[0.2em]">
          Secure Access Portal
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
        <div className="bg-white py-10 px-8 border-2 border-slate-50 rounded-[2rem] shadow-2xl shadow-[#182C61]/5 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-[#182C61]"></div>
          
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label className="block text-[10px] font-black text-[#808e9b] uppercase tracking-widest mb-2">Username or Email</label>
              <input
                type="text"
                required
                placeholder="Email address"
                className="w-full px-5 py-3.5 bg-slate-50 border-2 border-transparent rounded-xl focus:outline-none focus:ring-4 focus:ring-[#182C61]/5 focus:border-[#182C61] text-sm text-[#1e272e] font-black transition-all"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-[#808e9b] uppercase tracking-widest mb-2">Password</label>
              <input
                type="password"
                required
                className="w-full px-5 py-3.5 bg-slate-50 border-2 border-transparent rounded-xl focus:outline-none focus:ring-4 focus:ring-[#182C61]/5 focus:border-[#182C61] text-sm text-[#1e272e] font-black transition-all"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input 
                  type="checkbox" 
                  className="h-4 w-4 text-[#182C61] focus:ring-[#182C61] border-slate-200 rounded cursor-pointer" 
                />
                <label className="ml-2.5 block text-[10px] font-black text-[#808e9b] uppercase tracking-widest">Remember</label>
              </div>
              <div className="text-[10px]">
                <a href="#" className="font-black text-[#182C61] hover:text-[#eb2f06] transition-colors uppercase tracking-widest">Forgot?</a>
              </div>
            </div>

            <div>
              <button type="submit" className="btn-primary w-full py-4 text-[10px]" disabled={isSubmitting}>
                {isSubmitting ? 'Signing In…' : 'Sign In'}
              </button>
            </div>

            {error ? (
              <div className="text-center text-[10px] font-black text-[#eb2f06] uppercase tracking-widest">
                {error}
              </div>
            ) : null}
          </form>

          <div className="mt-8 pt-8 border-t-2 border-slate-50 text-center">
            <p className="text-[10px] font-black text-[#808e9b] uppercase tracking-widest">
              New to DocNow?{' '}
              <Link to="/signup" className="text-[#182C61] hover:text-[#eb2f06] transition-colors underline underline-offset-4">
                Create Account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
