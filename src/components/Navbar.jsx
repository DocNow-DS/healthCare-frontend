import { useEffect, useState } from 'react';
import { 
  BellIcon, 
  MagnifyingGlassIcon,
  UserCircleIcon
} from '@heroicons/react/24/outline';
import { Link, useLocation } from 'react-router-dom';
import { getAuthData } from '../utils/auth';

export default function Navbar() {
  const location = useLocation();
  const [user, setUser] = useState(() => getAuthData().user || { username: 'User' });
  const primaryRole = String(user?.roles?.[0] || user?.role || '').toUpperCase();
  const notificationsHref = primaryRole === 'DOCTOR' || primaryRole === 'PATIENT' ? '/dashboard/notifications' : null;
  const onNotificationsPage = location.pathname.startsWith('/dashboard/notifications');

  useEffect(() => {
    const { user: authUser } = getAuthData();
    if (authUser) {
      setUser(authUser);
      return;
    }
    const storedUser = localStorage.getItem('auth_user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        setUser({ username: 'User' });
      }
    }
  }, []);

  return (
    <nav className="bg-white border-b border-slate-100 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex-1 max-w-lg hidden md:block">
          <div className="relative group">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-[#182C61] transition-colors" />
            <input 
              type="text" 
              placeholder="Search appointments, health tips..." 
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-transparent rounded-xl focus:outline-none focus:ring-4 focus:ring-[#182C61]/5 focus:border-[#182C61] transition-all"
            />
          </div>
        </div>

        <div className="flex items-center space-x-6">
          {notificationsHref ? (
            <Link
              to={notificationsHref}
              aria-label="Notifications"
              title="Notifications"
              className={`relative p-2 rounded-xl transition-colors ${
                onNotificationsPage ? 'text-[#182C61] bg-[#182C61]/5' : 'text-slate-400 hover:text-[#182C61] hover:bg-slate-50'
              }`}
            >
              <BellIcon className="h-6 w-6" />
              {!onNotificationsPage ? (
                <span className="absolute top-2 right-2 h-2.5 w-2.5 bg-[#eb2f06] border-2 border-white rounded-full" aria-hidden />
              ) : null}
            </Link>
          ) : null}
          
          <Link to="/dashboard" className="flex items-center space-x-3 group">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-black text-[#182C61] tracking-tight">{user.username}</p>
              <p className="text-[10px] font-black text-[#808e9b] uppercase tracking-widest">{user.role || 'Member'}</p>
            </div>
            <div className="h-10 w-10 bg-[#182C61] rounded-xl flex items-center justify-center text-white shadow-lg group-hover:scale-105 transition-all">
              <UserCircleIcon className="h-7 w-7" />
            </div>
          </Link>
        </div>
      </div>
    </nav>
  );
}
