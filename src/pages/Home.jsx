import { 
  CalendarIcon, 
  UserGroupIcon, 
  ChatBubbleBottomCenterTextIcon,
  BeakerIcon,
  PlusIcon
} from '@heroicons/react/24/outline';

const userRaw = localStorage.getItem('auth_user');
const user = userRaw ? JSON.parse(userRaw) : { username: 'punsith', role: 'Patient' };

const stats = [
  { name: 'Active Appointments', value: '03', icon: CalendarIcon, color: 'bg-[#182C61]' },
  { name: 'Medical Reports', value: '12', icon: ChatBubbleBottomCenterTextIcon, color: 'bg-indigo-600' },
  { name: 'Assigned Doctors', value: '04', icon: UserGroupIcon, color: 'bg-emerald-600' },
  { name: 'Health Score', value: '98%', icon: BeakerIcon, color: 'bg-[#eb2f06]' },
];

export default function Home() {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000">
      {/* Header */}
      <div className="flex items-end justify-between border-b-2 border-slate-50 pb-6">
        <div>
          <h1 className="text-3xl font-black text-[#182C61] tracking-tighter leading-none">
            Welcome, {user.username}<span className="text-[#eb2f06]">!</span>
          </h1>
          <p className="text-[#808e9b] mt-3 font-black uppercase tracking-[0.2em] text-[10px]">
            Patient Portal • <span className="text-[#eb2f06]">3 New Updates</span>
          </p>
        </div>
        <div className="hidden lg:flex items-center space-x-3 bg-[#182C61] p-2 rounded-2xl shadow-lg">
          <div className="h-10 w-10 bg-white/10 rounded-xl flex items-center justify-center">
            <BeakerIcon className="h-5 w-5 text-white" />
          </div>
          <div className="pr-4">
            <p className="text-[9px] font-black text-white/50 uppercase tracking-widest">AI Hub</p>
            <p className="text-[11px] font-black text-white">Active</p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.name} className="dashboard-card group">
            <div className="flex items-center justify-between mb-6">
              <div className={`p-4 rounded-xl ${stat.color} text-white shadow-lg transition-all group-hover:rotate-6`}>
                <stat.icon className="h-6 w-6" />
              </div>
              <span className="text-[9px] font-black text-[#eb2f06] uppercase tracking-widest bg-[#eb2f06]/5 px-2 py-1 rounded-full">+14%</span>
            </div>
            <p className="text-[9px] font-black text-[#808e9b] uppercase tracking-[0.2em] mb-1">{stat.name}</p>
            <p className="text-3xl font-black text-[#182C61] tracking-tighter">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border-2 border-slate-50 p-8 rounded-[2rem] shadow-xl shadow-[#182C61]/5">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-black text-[#182C61] tracking-tight">Appointments</h3>
              <button className="text-[10px] font-black text-[#182C61] uppercase tracking-widest hover:text-[#eb2f06] transition-colors underline underline-offset-4 decoration-2">All</button>
            </div>
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <div key={i} className="flex items-center p-4 bg-slate-50/50 border-2 border-white rounded-[1.5rem] hover:border-[#182C61]/10 transition-all cursor-pointer group">
                  <div className="h-12 w-12 rounded-xl overflow-hidden mr-4 shadow-lg grayscale group-hover:grayscale-0 transition-all">
                    <img src={`https://i.pravatar.cc/150?u=${i}`} alt="doc" />
                  </div>
                  <div className="flex-1">
                    <p className="font-black text-[#182C61] text-base">Dr. {i === 1 ? 'Sarah Wilson' : 'Michael Chen'}</p>
                    <p className="text-[10px] font-bold text-[#808e9b] uppercase tracking-widest">Cardiology • 2:00 PM</p>
                  </div>
                  <button className="p-3 bg-white text-[#182C61] rounded-xl shadow-md border border-slate-50 hover:bg-[#182C61] hover:text-white transition-all">
                    <CalendarIcon className="h-5 w-5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-[#182C61] p-8 rounded-[2rem] shadow-xl shadow-[#182C61]/15 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:rotate-45 transition-transform duration-1000">
              <BeakerIcon className="h-24 w-24 text-white" />
            </div>
            <div className="relative z-10 space-y-6">
              <div>
                <p className="text-[9px] font-black text-white/50 uppercase tracking-[0.2em] mb-2">AI Health Pulse</p>
                <h3 className="text-2xl font-black text-white tracking-tighter leading-tight">Health Status: Excellent</h3>
              </div>
              <div className="bg-white/10 backdrop-blur-xl p-4 rounded-xl border border-white/20">
                <p className="text-[11px] text-white/90 font-bold leading-relaxed">
                  "Continue with your current routine. Your vitals are stable."
                </p>
              </div>
              <button className="w-full py-4 bg-white text-[#182C61] font-black rounded-xl shadow-lg hover:scale-[1.02] transition-all uppercase tracking-widest text-[10px]">
                Health Checker
              </button>
            </div>
          </div>

          <button className="w-full py-8 bg-[#eb2f06]/5 border-2 border-[#eb2f06]/10 rounded-[2rem] group hover:bg-[#eb2f06] transition-all duration-500">
             <div className="flex flex-col items-center">
                <PlusIcon className="h-8 w-8 text-[#eb2f06] group-hover:text-white transition-colors mb-2" />
                <span className="text-[10px] font-black text-[#eb2f06] group-hover:text-white uppercase tracking-[0.3em]">New Booking</span>
             </div>
          </button>
        </div>
      </div>
    </div>
  );
}
