import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { API } from '../config/api';

export default function Signup({ onSignup }) {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    name: '',
    phone: '',
    age: '',
    gender: '',
    address: '',
    medicalHistory: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    try {
      const result = await API.auth.register({
        username: formData.username,
        email: formData.email,
        password: formData.password,
        role: 'PATIENT',
        roles: 'PATIENT',
        name: formData.name,
        phone: formData.phone,
        age: formData.age ? parseInt(formData.age) : null,
        gender: formData.gender,
        address: formData.address,
        medicalHistory: formData.medicalHistory
      });

      const token = result?.token;
      const user = result?.user || { 
        username: formData.username, 
        email: formData.email, 
        role: 'PATIENT' 
      };

      if (token) {
        localStorage.setItem('auth_token', token);
      }
      localStorage.setItem('auth_user', JSON.stringify({ ...user, role: 'PATIENT' }));

      if (onSignup) onSignup();
      navigate('/dashboard');
    } catch (err) {
      setError(err?.message || 'Signup failed');
    } finally {
      setIsSubmitting(false);
    }
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
          Patient Registration
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
        <div className="bg-white py-10 px-8 border-2 border-slate-50 rounded-[2rem] shadow-2xl shadow-[#182C61]/5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-1.5 h-full bg-[#182C61]"></div>
          
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-[#808e9b] uppercase tracking-widest mb-2">Username</label>
                <input
                  type="text"
                  name="username"
                  required
                  className="w-full px-5 py-3.5 bg-slate-50 border-2 border-transparent rounded-xl focus:outline-none focus:ring-4 focus:ring-[#182C61]/5 focus:border-[#182C61] text-sm text-[#1e272e] font-black transition-all"
                  value={formData.username}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-[#808e9b] uppercase tracking-widest mb-2">Full Name</label>
                <input
                  type="text"
                  name="name"
                  required
                  className="w-full px-5 py-3.5 bg-slate-50 border-2 border-transparent rounded-xl focus:outline-none focus:ring-4 focus:ring-[#182C61]/5 focus:border-[#182C61] text-sm text-[#1e272e] font-black transition-all"
                  value={formData.name}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-[#808e9b] uppercase tracking-widest mb-2">Email</label>
                <input
                  type="email"
                  name="email"
                  required
                  className="w-full px-5 py-3.5 bg-slate-50 border-2 border-transparent rounded-xl focus:outline-none focus:ring-4 focus:ring-[#182C61]/5 focus:border-[#182C61] text-sm text-[#1e272e] font-black transition-all"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-[#808e9b] uppercase tracking-widest mb-2">Phone Number</label>
                <input
                  type="tel"
                  name="phone"
                  className="w-full px-5 py-3.5 bg-slate-50 border-2 border-transparent rounded-xl focus:outline-none focus:ring-4 focus:ring-[#182C61]/5 focus:border-[#182C61] text-sm text-[#1e272e] font-black transition-all"
                  value={formData.phone}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-[#808e9b] uppercase tracking-widest mb-2">Age</label>
                <input
                  type="number"
                  name="age"
                  min="0"
                  max="150"
                  className="w-full px-5 py-3.5 bg-slate-50 border-2 border-transparent rounded-xl focus:outline-none focus:ring-4 focus:ring-[#182C61]/5 focus:border-[#182C61] text-sm text-[#1e272e] font-black transition-all"
                  value={formData.age}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-[#808e9b] uppercase tracking-widest mb-2">Gender</label>
                <select
                  name="gender"
                  className="w-full px-5 py-3.5 bg-slate-50 border-2 border-transparent rounded-xl focus:outline-none focus:ring-4 focus:ring-[#182C61]/5 focus:border-[#182C61] text-sm text-[#1e272e] font-black transition-all"
                  value={formData.gender}
                  onChange={handleChange}
                >
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-[#808e9b] uppercase tracking-widest mb-2">Address</label>
              <input
                type="text"
                name="address"
                className="w-full px-5 py-3.5 bg-slate-50 border-2 border-transparent rounded-xl focus:outline-none focus:ring-4 focus:ring-[#182C61]/5 focus:border-[#182C61] text-sm text-[#1e272e] font-black transition-all"
                value={formData.address}
                onChange={handleChange}
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-[#808e9b] uppercase tracking-widest mb-2">Medical History (Optional)</label>
              <textarea
                name="medicalHistory"
                rows="2"
                className="w-full px-5 py-3.5 bg-slate-50 border-2 border-transparent rounded-xl focus:outline-none focus:ring-4 focus:ring-[#182C61]/5 focus:border-[#182C61] text-sm text-[#1e272e] font-black transition-all resize-none"
                value={formData.medicalHistory}
                onChange={handleChange}
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-[#808e9b] uppercase tracking-widest mb-2">Secure Password</label>
              <input
                type="password"
                name="password"
                required
                className="w-full px-5 py-3.5 bg-slate-50 border-2 border-transparent rounded-xl focus:outline-none focus:ring-4 focus:ring-[#182C61]/5 focus:border-[#182C61] text-sm text-[#1e272e] font-black transition-all"
                value={formData.password}
                onChange={handleChange}
              />
            </div>

            <div>
              <button type="submit" className="btn-primary w-full py-4 text-[10px]" disabled={isSubmitting}>
                {isSubmitting ? 'Creating Account...' : 'Create Account'}
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