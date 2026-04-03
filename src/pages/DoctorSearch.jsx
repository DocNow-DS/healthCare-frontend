import { useEffect, useMemo, useState } from 'react';
import {
  MagnifyingGlassIcon,
  AdjustmentsHorizontalIcon,
  StarIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { API } from '../config/api';

const fallbackImage = 'https://images.unsplash.com/photo-1559839734-2b71f1536783?auto=format&fit=crop&q=80&w=200';

export default function DoctorSearch() {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('All');
  const [bookingDoctor, setBookingDoctor] = useState(null);
  const [booking, setBooking] = useState(false);
  const [bookMessage, setBookMessage] = useState(null);
  const [bookForm, setBookForm] = useState({
    startTime: '',
    consultationType: 'ONLINE',
    notes: '',
  });

  /** Specialty chips; built when loading with &quot;All&quot; so filters stay complete while viewing one specialty. */
  const [specialtyOptions, setSpecialtyOptions] = useState(['All']);

  const loadDoctors = async (specialtyFilter) => {
    setLoading(true);
    setError('');
    try {
      const param = specialtyFilter === 'All' ? undefined : specialtyFilter;
      const list = await API.patientBooking.listDoctors(param);
      const arr = Array.isArray(list) ? list : [];
      setDoctors(arr);
      if (specialtyFilter === 'All') {
        const next = new Set(['All']);
        arr.forEach((doc) => {
          const spec = doc?.specialty || doc?.specialization;
          if (typeof spec === 'string' && spec.trim()) next.add(spec.trim());
        });
        setSpecialtyOptions(Array.from(next));
      }
    } catch (e) {
      setError(e?.message || 'Unable to load doctors from appointment service');
      setDoctors([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDoctors(selectedSpecialty);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch when specialty chip changes
  }, [selectedSpecialty]);

  const filteredDoctors = useMemo(
    () =>
      doctors.filter((doc) =>
        String(doc.name || doc.fullName || doc.username || '')
          .toLowerCase()
          .includes(searchTerm.toLowerCase()),
      ),
    [doctors, searchTerm],
  );

  const openBooking = (doctor) => {
    setBookMessage(null);
    setBookForm({ startTime: '', consultationType: 'ONLINE', notes: '' });
    setBookingDoctor(doctor);
  };

  const submitBooking = async (e) => {
    e.preventDefault();
    if (!bookingDoctor || !bookForm.startTime) return;
    setBooking(true);
    setBookMessage(null);
    try {
      const startTime =
        bookForm.startTime.length === 16 ? `${bookForm.startTime}:00` : bookForm.startTime;
      await API.patientAppointments.create({
        doctorId: String(bookingDoctor.id),
        startTime,
        durationMinutes: 30,
        consultationType: bookForm.consultationType,
        notes: bookForm.notes || undefined,
      });
      setBookMessage({ type: 'ok', text: 'Appointment requested successfully.' });
    } catch (err) {
      setBookMessage({
        type: 'err',
        text: err?.message || 'Could not create appointment. Are you logged in as a patient?',
      });
    } finally {
      setBooking(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b-2 border-slate-50 pb-8">
        <div className="flex-1">
          <h1 className="text-3xl font-black text-[#182C61] tracking-tighter mb-4 underline decoration-[#eb2f06] decoration-4 underline-offset-4">
            Find specialists
          </h1>
          <p className="text-sm text-[#808e9b] font-bold mb-4">
            Doctors come from the appointment service (
            <code className="text-xs bg-slate-100 px-1 rounded">/api/patient/booking/doctors</code>
            , optional <code className="text-xs bg-slate-100 px-1 rounded">?specialty=…</code>). Search filters the
            list by name only.
          </p>
          <div className="relative group">
            <MagnifyingGlassIcon className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-[#808e9b] group-focus-within:text-[#182C61] transition-colors" />
            <input
              type="text"
              placeholder="Search by doctor name or specialty text…"
              className="w-full pl-14 pr-6 py-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:outline-none focus:ring-4 focus:ring-[#182C61]/5 focus:border-[#182C61] text-[#1e272e] font-black tracking-tight text-base transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={() => loadDoctors(selectedSpecialty)}
            className="p-4 bg-white border-2 border-slate-50 rounded-xl text-[#182C61] hover:border-[#182C61] transition-all relative"
            title="Refresh doctors"
          >
            <AdjustmentsHorizontalIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      {error ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
          <ExclamationTriangleIcon className="h-5 w-5 text-amber-600 mt-0.5" />
          <span className="text-sm font-semibold text-amber-800">{error}</span>
        </div>
      ) : null}

      <div className="flex items-center space-x-3 overflow-x-auto pb-2 scrollbar-hide">
        {specialtyOptions.map((spec) => (
          <button
            key={spec}
            type="button"
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
        {loading ? (
          <div className="col-span-full text-sm font-bold text-[#808e9b]">Loading doctors...</div>
        ) : doctors.length === 0 ? (
          <div className="col-span-full text-sm font-bold text-[#808e9b]">
            No doctors returned. Try refreshing or check the doctor service.
          </div>
        ) : filteredDoctors.length === 0 ? (
          <div className="col-span-full text-sm font-bold text-[#808e9b]">
            No doctors match your filters. Clear the search box or pick &quot;All&quot;.
          </div>
        ) : (
          filteredDoctors.map((doctor) => (
          <div key={doctor.id} className="dashboard-card group hover:-translate-y-1 transition-all duration-500">
            <div className="flex items-start justify-between mb-6">
              <div className="relative">
                <img
                  src={doctor.profileImageUrl || doctor.image || fallbackImage}
                  alt={doctor.name || doctor.fullName || 'Doctor'}
                  className="w-20 h-20 rounded-2xl object-cover grayscale group-hover:grayscale-0 transition-all duration-700"
                />
                <div className="absolute -bottom-1 -right-1 h-6 w-6 bg-white rounded-lg shadow-md flex items-center justify-center border-2 border-slate-50">
                  <div
                    className={`h-2.5 w-2.5 rounded-full ${
                      doctor.enabled !== false ? 'bg-[#eb2f06] animate-pulse' : 'bg-slate-300'
                    }`}
                  ></div>
                </div>
              </div>
              <div className="flex items-center space-x-1 bg-[#eb2f06]/5 px-2 py-1 rounded-full">
                <StarIcon className="h-3.5 w-3.5 text-[#eb2f06] fill-current" />
                <span className="text-[10px] font-black text-[#eb2f06]">{doctor.rating || 'N/A'}</span>
              </div>
            </div>
            
            <div className="space-y-1">
              <h3 className="text-xl font-black text-[#182C61] tracking-tight">{doctor.name || doctor.fullName || doctor.username || 'Doctor'}</h3>
              <p className="text-[9px] font-black text-[#808e9b] uppercase tracking-[0.2em]">{doctor.specialization || doctor.specialty || 'General'}</p>
            </div>

            <div className="mt-6 pt-6 border-t-2 border-slate-50 flex items-center justify-between">
              <div>
                <p className="text-[9px] font-black text-[#808e9b] uppercase tracking-widest mb-1">Fee</p>
                <p className="text-lg font-black text-[#182C61]">LKR {doctor.consultationFee || doctor.fee || 'N/A'}</p>
              </div>
              <button
                type="button"
                onClick={() => openBooking(doctor)}
                className="btn-primary py-3 px-6 text-[9px] uppercase tracking-widest font-black"
              >
                Book
              </button>
            </div>
          </div>
          ))
        )}
      </div>

      {bookingDoctor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#182C61]/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl border-2 border-slate-100 shadow-2xl max-w-md w-full p-8 relative">
            <button
              type="button"
              onClick={() => setBookingDoctor(null)}
              className="absolute top-4 right-4 p-2 rounded-xl text-[#808e9b] hover:bg-slate-50"
              aria-label="Close"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
            <h2 className="text-2xl font-black text-[#182C61] mb-1">Book appointment</h2>
            <p className="text-sm text-[#808e9b] font-bold mb-6">
              {bookingDoctor.name || bookingDoctor.fullName || bookingDoctor.username} —{' '}
              {bookingDoctor.specialization || bookingDoctor.specialty || 'Doctor'}
            </p>
            <form onSubmit={submitBooking} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-[#808e9b] mb-2">
                  Start time
                </label>
                <input
                  type="datetime-local"
                  required
                  value={bookForm.startTime}
                  onChange={(e) => setBookForm((f) => ({ ...f, startTime: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 font-bold text-[#182C61]"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-[#808e9b] mb-2">
                  Consultation type
                </label>
                <select
                  value={bookForm.consultationType}
                  onChange={(e) => setBookForm((f) => ({ ...f, consultationType: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 font-bold text-[#182C61]"
                >
                  <option value="ONLINE">Online</option>
                  <option value="IN_PERSON">In person</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-[#808e9b] mb-2">
                  Notes (optional)
                </label>
                <textarea
                  value={bookForm.notes}
                  onChange={(e) => setBookForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 font-bold text-[#182C61]"
                  placeholder="Reason for visit…"
                />
              </div>
              {bookMessage && (
                <p
                  className={`text-sm font-bold ${bookMessage.type === 'ok' ? 'text-emerald-600' : 'text-red-600'}`}
                >
                  {bookMessage.text}
                </p>
              )}
              <button
                type="submit"
                disabled={booking}
                className="btn-primary w-full py-4 text-xs uppercase tracking-widest font-black disabled:opacity-50"
              >
                {booking ? 'Sending…' : 'Request appointment'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
