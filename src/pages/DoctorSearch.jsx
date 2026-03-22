import { useState } from 'react';
import { 
  MagnifyingGlassIcon, 
  AdjustmentsHorizontalIcon,
  StarIcon
} from '@heroicons/react/24/outline';

const doctors = [
  { id: 1, name: 'Dr. Sarah Wilson', specialty: 'Cardiologist', rating: 4.9, availability: 'Available Today', fee: 'LKR 2,500', image: 'https://images.unsplash.com/photo-1559839734-2b71f1536783?auto=format&fit=crop&q=80&w=200' },
  { id: 2, name: 'Dr. Michael Chen', specialty: 'Neurologist', rating: 4.8, availability: 'Available Tomorrow', fee: 'LKR 3,000', image: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80&w=200' },
  { id: 3, name: 'Dr. Emily Adams', specialty: 'Pediatrician', rating: 4.9, availability: 'Available Today', fee: 'LKR 2,000', image: 'https://images.unsplash.com/photo-1594824476967-48c8b964273f?auto=format&fit=crop&q=80&w=200' },
];

const specialties = ['All', 'Cardiology', 'Neurology', 'Pediatrics', 'Dermatology'];

export default function DoctorSearch() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('All');

  const filteredDoctors = doctors.filter(doc => 
    (selectedSpecialty === 'All' || doc.specialty.includes(selectedSpecialty)) &&
    doc.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b-2 border-slate-50 pb-8">
        <div className="flex-1">
          <h1 className="text-3xl font-black text-[#182C61] tracking-tighter mb-4 underline decoration-[#eb2f06] decoration-4 underline-offset-4">Find Specialists</h1>
          <div className="relative group">
            <MagnifyingGlassIcon className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-[#808e9b] group-focus-within:text-[#182C61] transition-colors" />
            <input 
              type="text" 
              placeholder="Search specialists..." 
              className="w-full pl-14 pr-6 py-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:outline-none focus:ring-4 focus:ring-[#182C61]/5 focus:border-[#182C61] text-[#1e272e] font-black tracking-tight text-base transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <button className="p-4 bg-white border-2 border-slate-50 rounded-xl text-[#182C61] hover:border-[#182C61] transition-all relative">
            <AdjustmentsHorizontalIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="flex items-center space-x-3 overflow-x-auto pb-2 scrollbar-hide">
        {specialties.map((spec) => (
          <button 
            key={spec}
            onClick={() => setSelectedSpecialty(spec)}
            className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
              selectedSpecialty === spec 
              ? 'bg-[#182C61] text-white shadow-lg shadow-[#182C61]/20' 
              : 'bg-white text-[#808e9b] border-2 border-slate-50 hover:border-[#182C61]/20'
            }`}
          >
            {spec}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredDoctors.map((doctor) => (
          <div key={doctor.id} className="dashboard-card group hover:-translate-y-1 transition-all duration-500">
            <div className="flex items-start justify-between mb-6">
              <div className="relative">
                <img 
                  src={doctor.image} 
                  alt={doctor.name} 
                  className="w-20 h-20 rounded-2xl object-cover grayscale group-hover:grayscale-0 transition-all duration-700"
                />
                <div className="absolute -bottom-1 -right-1 h-6 w-6 bg-white rounded-lg shadow-md flex items-center justify-center border-2 border-slate-50">
                  <div className={`h-2.5 w-2.5 rounded-full ${doctor.availability.includes('Today') ? 'bg-[#eb2f06] animate-pulse' : 'bg-slate-300'}`}></div>
                </div>
              </div>
              <div className="flex items-center space-x-1 bg-[#eb2f06]/5 px-2 py-1 rounded-full">
                <StarIcon className="h-3.5 w-3.5 text-[#eb2f06] fill-current" />
                <span className="text-[10px] font-black text-[#eb2f06]">{doctor.rating}</span>
              </div>
            </div>
            
            <div className="space-y-1">
              <h3 className="text-xl font-black text-[#182C61] tracking-tight">{doctor.name}</h3>
              <p className="text-[9px] font-black text-[#808e9b] uppercase tracking-[0.2em]">{doctor.specialty}</p>
            </div>

            <div className="mt-6 pt-6 border-t-2 border-slate-50 flex items-center justify-between">
               <div>
                  <p className="text-[9px] font-black text-[#808e9b] uppercase tracking-widest mb-1">Fee</p>
                  <p className="text-lg font-black text-[#182C61]">{doctor.fee}</p>
               </div>
               <button className="btn-primary py-3 px-6 text-[9px] uppercase tracking-widest font-black">
                  Book
               </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
