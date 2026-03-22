import { 
  VideoCameraIcon, 
  BeakerIcon, 
  CalendarDaysIcon, 
  ShieldCheckIcon,
  EnvelopeIcon,
  PhoneIcon,
  MapPinIcon
} from '@heroicons/react/24/outline';
import HomeNavbar from '../components/HomeNavbar';
import { Link } from 'react-router-dom';

const services = [
  {
    name: 'Video Consultations',
    description: 'Connect with top doctors from the comfort of your home via secure high-definition video.',
    icon: VideoCameraIcon,
  },
  {
    name: 'AI Symptom Checker',
    description: 'Get instant, AI-powered health insights and recommended doctor specialties.',
    icon: BeakerIcon,
  },
  {
    name: 'Instant Booking',
    description: 'Search for specialists and book appointments in seconds with real-time availability.',
    icon: CalendarDaysIcon,
  },
  {
    name: 'Secure Records',
    description: 'Your medical history and prescriptions are encrypted and accessible only by you.',
    icon: ShieldCheckIcon,
  },
];

export default function LandingPage() {
  return (
    <div className="bg-white min-h-screen selection:bg-[#182C61]/10">
      <HomeNavbar />
      
      {/* Hero Section */}
      <section className="relative pt-24 pb-16 lg:pt-32 lg:pb-24 overflow-hidden">
        <div className="absolute inset-0 bg-[#182C61] -skew-y-3 origin-top-left translate-y-[-5%] z-0"></div>
        <div className="max-w-7xl mx-auto px-6 lg:px-10 relative z-10">
          <div className="text-center lg:text-left grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8 animate-in fade-in slide-in-from-left-8 duration-1000">
              <div className="inline-flex items-center space-x-3 px-5 py-2 bg-white/10 backdrop-blur-md rounded-full border border-white/20">
                <div className="h-1.5 w-1.5 rounded-full bg-[#eb2f06] animate-pulse"></div>
                <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Next-Gen Telemedicine</span>
              </div>
              
              <h1 className="text-5xl lg:text-6xl font-black text-white tracking-tighter leading-[0.95]">
                Expert care, <br />
                <span className="text-white/40">anywhere.</span>
              </h1>
              
              <p className="text-lg text-white/70 max-w-lg font-bold leading-relaxed">
                Connect with world-class specialists in seconds. Secure, AI-powered health management for the modern patient.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start space-y-4 sm:space-y-0 sm:space-x-6">
                <Link to="/signup" className="btn-accent w-full sm:w-auto px-10 py-5 text-xs shadow-xl shadow-[#eb2f06]/20">
                  Book Appointment
                </Link>
                <Link to="/login" className="px-10 py-5 text-white font-black hover:text-[#eb2f06] transition-colors uppercase tracking-[0.2em] text-[10px] underline underline-offset-4">
                  View Doctors
                </Link>
              </div>
            </div>

            <div className="relative animate-in fade-in zoom-in duration-1000 delay-300">
              <div className="absolute -inset-6 bg-[#eb2f06]/20 rounded-full blur-2xl opacity-20"></div>
              <img 
                src="https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&q=80&w=2000" 
                alt="Modern Healthcare" 
                className="relative rounded-[2.5rem] shadow-2xl border-4 border-white/10 grayscale-[0.2] hover:grayscale-0 transition-all duration-700 max-h-[500px] w-full object-cover"
              />
              <div className="absolute -bottom-6 -left-6 bg-white p-6 rounded-[1.5rem] shadow-xl border border-slate-50 hidden lg:block animate-bounce-slow">
                <div className="flex items-center space-x-3">
                  <div className="p-3 bg-[#182C61]/5 rounded-xl text-[#182C61]">
                    <ShieldCheckIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-[#182C61]">4.9/5 Rating</p>
                    <p className="text-[9px] font-black text-[#808e9b] uppercase tracking-widest">By 10k+ Patients</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
            <h2 className="text-[10px] font-black text-[#eb2f06] uppercase tracking-[0.3em]">Our Services</h2>
            <p className="text-4xl font-black text-[#182C61] tracking-tighter">Everything you need in one place</p>
            <p className="text-base text-[#808e9b] font-bold leading-relaxed">We combine cutting-edge technology with human expertise to deliver the best care experience.</p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {services.map((service, i) => (
              <div key={i} className="group p-8 bg-white border border-slate-50 rounded-[2rem] hover:shadow-xl hover:shadow-[#182C61]/5 hover:-translate-y-1 transition-all duration-500">
                <div className="h-14 w-14 bg-[#182C61]/5 rounded-xl flex items-center justify-center mb-6 group-hover:bg-[#182C61] group-hover:text-white transition-all duration-500">
                  <service.icon className="h-7 w-7 text-[#182C61] group-hover:text-white transition-colors" />
                </div>
                <h3 className="text-lg font-black text-[#182C61] mb-3 tracking-tight">{service.name}</h3>
                <p className="text-[#808e9b] font-bold text-xs leading-relaxed">{service.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-6">
        <div className="max-w-7xl mx-auto bg-[#182C61] rounded-[3rem] p-12 lg:p-20 relative overflow-hidden text-center lg:text-left">
           <div className="absolute top-0 right-0 w-1/4 h-full bg-white/5 -skew-x-12 translate-x-1/2"></div>
           <div className="relative z-10 grid lg:grid-cols-2 gap-16 items-center">
              <div className="space-y-6">
                 <h2 className="text-4xl lg:text-5xl font-black text-white tracking-tighter leading-none">
                    Start your <br />
                    <span className="text-[#eb2f06]">health journey.</span>
                 </h2>
                 <p className="text-lg text-white/60 font-bold max-w-md">
                    Join thousands of families who trust DocNow for their daily medical needs.
                 </p>
              </div>
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-end gap-5">
                 <Link to="/signup" className="btn-accent px-12 py-5 text-[10px] border-2 border-white/10 uppercase tracking-[0.2em] font-black rounded-xl">
                    Join Now
                 </Link>
              </div>
           </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 border-t-2 border-slate-50">
        <div className="max-w-7xl mx-auto px-10">
          <div className="flex flex-col md:flex-row justify-between items-center text-[#808e9b] text-sm font-black uppercase tracking-widest gap-10">
            <div className="flex items-center space-x-10 text-white">
               <span className="text-[#182C61]">© 2026 DocNow</span>
            </div>
            <div className="flex space-x-12">
               <a href="#" className="hover:text-[#182C61] transition-colors">Privacy</a>
               <a href="#" className="hover:text-[#182C61] transition-colors">Terms</a>
               <a href="#" className="hover:text-[#182C61] transition-colors">Security</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
