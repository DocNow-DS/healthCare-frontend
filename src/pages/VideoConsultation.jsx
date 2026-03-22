import { 
  VideoCameraIcon, 
  MicrophoneIcon, 
  ChatBubbleBottomCenterIcon,
  PhoneXMarkIcon,
  ShieldCheckIcon,
  UserIcon
} from '@heroicons/react/24/solid';

export default function VideoConsultation() {
  return (
    <div className="h-[calc(100vh-140px)] flex flex-col space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-1000">
      <div className="flex items-center justify-between border-b-2 border-slate-50 pb-6">
        <div className="flex items-center space-x-4">
           <div className="h-10 w-10 bg-[#182C61] rounded-xl flex items-center justify-center shadow-lg shadow-[#182C61]/20">
              <VideoCameraIcon className="h-6 w-6 text-white" />
           </div>
           <div>
              <h1 className="text-2xl font-black text-[#182C61] tracking-tighter">Consultation</h1>
              <p className="text-[#808e9b] mt-1 font-black uppercase tracking-widest text-[8px] flex items-center">
                 <span className="h-1.5 w-1.5 rounded-full bg-[#eb2f06] mr-1.5 animate-pulse"></span>
                 AES-256 Secure
              </p>
           </div>
        </div>
        <div className="hidden lg:flex items-center space-x-2 bg-white border-2 border-slate-50 px-5 py-3 rounded-xl shadow-sm">
           <div className="text-right">
              <p className="text-[8px] font-black text-[#808e9b] uppercase tracking-widest text-white">Consultant</p>
              <p className="text-sm font-black text-[#182C61]">Dr. Sarah Wilson</p>
           </div>
           <div className="h-8 w-8 rounded-lg bg-slate-100 overflow-hidden ml-3">
              <img src="https://i.pravatar.cc/150?u=1" alt="doc" />
           </div>
        </div>
      </div>

      <div className="flex-1 flex gap-8 min-h-0 relative">
        {/* Main Video Area */}
        <div className="flex-1 bg-slate-900 rounded-[2rem] shadow-xl relative overflow-hidden ring-4 ring-white group">
          {/* Main Feed */}
          <div className="absolute inset-0 flex items-center justify-center opacity-40">
            <UserIcon className="h-48 w-48 text-white/10" />
          </div>
          
          {/* Self Feed */}
          <div className="absolute top-6 right-6 w-48 h-32 bg-slate-800 rounded-2xl border-2 border-white/10 shadow-xl z-20 overflow-hidden">
             <p className="absolute bottom-2 left-4 text-[8px] font-black text-white/50 uppercase tracking-widest">Self View</p>
          </div>

          {/* Controls */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center space-x-4 z-30">
             {[
               { icon: MicrophoneIcon, color: 'bg-white/10', text: 'white', active: true },
               { icon: VideoCameraIcon, color: 'bg-white/10', text: 'white', active: true },
               { icon: ChatBubbleBottomCenterIcon, color: 'bg-white/10', text: 'white', active: false },
             ].map((btn, i) => (
                <button key={i} className={`p-4 rounded-xl ${btn.color} text-${btn.text} backdrop-blur-md border border-white/10 hover:scale-105 transition-all`}>
                   <btn.icon className="h-5 w-5" />
                </button>
             ))}
             <button className="p-6 rounded-2xl bg-[#eb2f06] text-white shadow-lg hover:scale-105 transition-all">
                <PhoneXMarkIcon className="h-6 w-6" />
             </button>
          </div>

          {/* Overlays */}
          <div className="absolute top-6 left-6 p-4 bg-white/10 backdrop-blur-md rounded-xl border border-white/10 z-10 flex items-center space-x-2">
             <ShieldCheckIcon className="h-4 w-4 text-[#eb2f06]" />
             <span className="text-[10px] font-black text-white uppercase tracking-widest">Secure</span>
          </div>
        </div>

        {/* Action Panel */}
        <div className="w-80 hidden xl:flex flex-col gap-6">
           <div className="bg-white border-2 border-slate-50 p-8 rounded-[2rem] shadow-xl shadow-[#182C61]/5 flex-1">
              <div className="flex items-center justify-between mb-6">
                 <h3 className="text-lg font-black text-[#182C61] tracking-tight">Log</h3>
              </div>
              <div className="space-y-4">
                 {[
                   'Patient joined',
                   'Searching consultant...',
                   'Handshake complete'
                 ].map((log, i) => (
                    <div key={i} className="flex items-start space-x-3 opacity-50">
                       <div className="h-1.5 w-1.5 rounded-full bg-[#182C61] mt-1.5"></div>
                       <p className="text-[11px] font-bold text-[#808e9b]">{log}</p>
                    </div>
                 ))}
              </div>
           </div>
           
           <div className="bg-[#182C61] p-8 rounded-[2rem] shadow-xl shadow-[#182C61]/20">
              <h3 className="text-white font-black text-base mb-4">Support</h3>
              <button className="w-full py-3 bg-white text-[#182C61] font-black rounded-xl hover:bg-[#eb2f06] hover:text-white transition-all uppercase tracking-widest text-[9px]">
                Support Portal
              </button>
           </div>
        </div>
      </div>
    </div>
  );
}
