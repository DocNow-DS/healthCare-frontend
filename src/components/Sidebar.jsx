import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { getAuthData, clearAuthData } from '../utils/auth';
import { 
  HomeIcon, 
  CalendarIcon, 
  UserGroupIcon, 
  BeakerIcon, 
  VideoCameraIcon,
  ClipboardDocumentListIcon,
  CreditCardIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  ShieldCheckIcon,
  Squares2X2Icon,
  BellIcon,
  UserCircleIcon
} from '@heroicons/react/24/outline';

const navConfigs = {
  Patient: [
    { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
    { name: 'My Appointments', href: '/dashboard/appointments', icon: CalendarIcon },
    { name: 'Specialists', href: '/dashboard/doctors', icon: UserGroupIcon },
    { name: 'AI Checker', href: '/dashboard/ai-checker', icon: BeakerIcon },
    { name: 'Consultations', href: '/dashboard/consultations', icon: VideoCameraIcon },
    { name: 'Bill Requests', href: '/dashboard/payments', icon: CreditCardIcon },
    { name: 'Notifications', href: '/dashboard/notifications', icon: BellIcon },
    { name: 'Profile', href: '/dashboard/profile', icon: UserCircleIcon },
  ],
  Doctor: [
    { name: 'Schedule', href: '/dashboard', icon: HomeIcon },
    { name: 'Appointments', href: '/dashboard/appointments', icon: CalendarIcon },
    { name: 'Patients', href: '/dashboard/patients', icon: UserGroupIcon },
    { name: 'Care Plans', href: '/dashboard/care-plans', icon: ClipboardDocumentListIcon },
    { name: 'Consultations', href: '/dashboard/consultations', icon: VideoCameraIcon },
    { name: 'Bill Requests', href: '/dashboard/bill-requests', icon: CreditCardIcon },
    { name: 'Profile', href: '/dashboard/profile', icon: UserCircleIcon },
  ],
  Admin: [
    { name: 'Admin Hub', href: '/dashboard', icon: Squares2X2Icon },
    { name: 'Doctors', href: '/dashboard/doctors-management', icon: UserGroupIcon },
    { name: 'Patients', href: '/dashboard/patients-management', icon: UserGroupIcon },
    { name: 'Management', href: '/dashboard/management', icon: ShieldCheckIcon },
    { name: 'Transactions', href: '/dashboard/transactions', icon: CreditCardIcon },
    { name: 'Settings', href: '/dashboard/settings', icon: Cog6ToothIcon },
  ]
};

export default function Sidebar({ onLogout }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState({ username: 'User', role: 'Patient' });

  useEffect(() => {
    const { user: authUser } = getAuthData();
    const resolveRole = (roles) => {
      const first = Array.isArray(roles) ? String(roles[0] || '').toUpperCase() : '';
      if (first === 'ADMIN') return 'Admin';
      if (first === 'DOCTOR') return 'Doctor';
      return 'Patient';
    };

    if (authUser) {
      setUser({
        username: authUser.username,
        role: resolveRole(authUser.roles)
      });
    }
  }, []);

  const handleLogout = () => {
    clearAuthData();
    if (onLogout) onLogout();
    navigate('/');
  };

  const navigation = navConfigs[user.role] || navConfigs.Patient;

  return (
    <div className="hidden lg:flex lg:flex-shrink-0 h-full">
      <div className="flex flex-col w-64 bg-[#182C61] m-3 rounded-[1.5rem] shadow-xl shadow-[#182C61]/10">
        <div className="flex-1 flex flex-col pt-8 pb-4 overflow-y-auto scrollbar-hide">
          <div className="flex items-center px-8 mb-10 group cursor-pointer" onClick={() => navigate('/')}>
            <div className="h-10 w-10 bg-white rounded-xl flex items-center justify-center shadow-lg group-hover:rotate-12 transition-transform">
              <span className="text-[#182C61] font-black text-xl">+</span>
            </div>
            <span className="ml-3 text-xl font-black text-white tracking-tighter">
              DocNow<span className="text-[#eb2f06]">.</span>
            </span>
          </div>
          
          <nav className="flex-1 px-4 space-y-1.5">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`
                    group flex items-center px-4 py-3 text-[11px] font-black rounded-xl transition-all duration-300 uppercase tracking-[0.15em]
                    ${isActive 
                      ? 'bg-white text-[#182C61] shadow-lg scale-[1.02]' 
                      : 'text-white/60 hover:bg-white/5 hover:text-white'}
                  `}
                >
                  <item.icon
                    className={`mr-3 h-5 w-5 transition-colors ${isActive ? 'text-[#182C61]' : 'text-white/40 group-hover:text-white'}`}
                    aria-hidden="true"
                  />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-white/5">
          <button
            onClick={handleLogout}
            className="w-full flex items-center px-4 py-3 text-[11px] font-black text-white/50 rounded-xl hover:bg-[#eb2f06] hover:text-white transition-all duration-300 uppercase tracking-[0.15em] group"
          >
            <ArrowRightOnRectangleIcon className="mr-3 h-5 w-5 text-white/30 group-hover:text-white transition-colors" aria-hidden="true" />
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}
