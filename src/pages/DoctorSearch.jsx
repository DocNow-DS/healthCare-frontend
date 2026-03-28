import { useState, useEffect, useMemo } from 'react';
import {
  MagnifyingGlassIcon,
  AdjustmentsHorizontalIcon,
  StarIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import API from '../config/api';

const SPECIALTY_FILTERS = [
  'All',
  'Cardiology',
  'Neurology',
  'Pediatrics',
  'Dermatology',
  'General',
  'Orthopedics',
  'Oncology',
];

function avatarUrl(doctor) {
  const name = doctor?.name || doctor?.username || 'DR';
  return (
    doctor?.profileImageUrl ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=182C61&color=fff&size=128`
  );
}

export default function DoctorSearch() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('All');
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [bookingDoctor, setBookingDoctor] = useState(null);
  const [bookForm, setBookForm] = useState({
    startTime: '',
    consultationType: 'ONLINE',
    notes: '',
  });
  const [bookMessage, setBookMessage] = useState(null);
  const [booking, setBooking] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const data = await API.appointments.searchDoctorsForBooking(
          selectedSpecialty === 'All' ? null : selectedSpecialty,
        );
        if (!cancelled) setDoctors(Array.isArray(data) ? data : []);
      } catch (e) {
        if (!cancelled) {
          setDoctors([]);
          const status = e?.status;
          const isNotFound = status === 404;
          setLoadError({
            message:
              e?.message ||
              'Unable to load doctors. Start appointment (8080) and patient (8081) services, then refresh.',
            status,
            code: e?.code,
            isNotFound,
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedSpecialty]);

  const filteredDoctors = useMemo(
    () =>
      doctors.filter((doc) => {
        const name = (doc.name || doc.username || '').toLowerCase();
        const spec = (doc.specialty || '').toLowerCase();
        const q = searchTerm.toLowerCase().trim();
        if (!q) return true;
        return name.includes(q) || spec.includes(q);
      }),
    [doctors, searchTerm],
  );

  const openBook = (doctor) => {
    setBookMessage(null);
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(10, 0, 0, 0);
    const pad = (n) => String(n).padStart(2, '0');
    const local = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    setBookForm((f) => ({ ...f, startTime: local, consultationType: 'ONLINE', notes: '' }));
    setBookingDoctor(doctor);
  };

  const submitBooking = async (e) => {
    e.preventDefault();
    if (!bookingDoctor || !bookForm.startTime) return;
    setBooking(true);
    setBookMessage(null);
    let startTime = bookForm.startTime;
    if (startTime.length === 16) startTime += ':00';
    try {
      await API.appointments.create({
        doctorId: bookingDoctor.id,
        startTime,
        durationMinutes: 30,
        consultationType: bookForm.consultationType,
        notes: bookForm.notes || undefined,
      });
      setBookMessage({ type: 'ok', text: 'Appointment requested. Status will be pending until the doctor accepts.' });
      setTimeout(() => {
        setBookingDoctor(null);
        setBookMessage(null);
      }, 2200);
    } catch (err) {
      setBookMessage({
        type: 'err',
        text:
          err?.message ||
          'Booking failed. Check appointment service (8080), JWT login, and that the slot is in the future.',
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
            Filter by specialty, then search by name. Book sends a request to the appointment service using your
            account.
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
            className="p-4 bg-white border-2 border-slate-50 rounded-xl text-[#182C61] hover:border-[#182C61] transition-all relative"
            aria-label="Filters"
          >
            <AdjustmentsHorizontalIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      {loadError && (
        <div
          className={`rounded-2xl border-2 px-6 py-4 text-sm font-bold ${
            loadError.isNotFound
              ? 'border-amber-200 bg-amber-50 text-amber-950'
              : 'border-red-100 bg-red-50 text-red-800'
          }`}
          role="alert"
        >
          <p className="font-black uppercase tracking-widest text-[10px] opacity-70 mb-1">
            {loadError.isNotFound ? 'Nothing found' : 'Could not load'}
            {loadError.code ? ` • ${loadError.code}` : ''}
          </p>
          <p>{loadError.message}</p>
          {loadError.isNotFound && (
            <p className="mt-2 text-xs font-bold opacity-80">
              Try another specialty chip or choose &quot;All&quot;, or clear the search box.
            </p>
          )}
        </div>
      )}

      <div className="flex items-center space-x-3 overflow-x-auto pb-2 scrollbar-hide">
        {SPECIALTY_FILTERS.map((spec) => (
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

      {loading ? (
        <p className="text-center text-[#808e9b] font-black py-16">Loading doctors…</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDoctors.map((doctor) => (
            <div
              key={doctor.id}
              className="dashboard-card group hover:-translate-y-1 transition-all duration-500"
            >
              <div className="flex items-start justify-between mb-6">
                <div className="relative">
                  <img
                    src={avatarUrl(doctor)}
                    alt=""
                    className="w-20 h-20 rounded-2xl object-cover grayscale group-hover:grayscale-0 transition-all duration-700"
                  />
                  <div className="absolute -bottom-1 -right-1 h-6 w-6 bg-white rounded-lg shadow-md flex items-center justify-center border-2 border-slate-50">
                    <div
                      className={`h-2.5 w-2.5 rounded-full ${
                        doctor.enabled !== false ? 'bg-emerald-500' : 'bg-slate-300'
                      }`}
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-1 bg-[#eb2f06]/5 px-2 py-1 rounded-full">
                  <StarIcon className="h-3.5 w-3.5 text-[#eb2f06] fill-current" />
                  <span className="text-[10px] font-black text-[#eb2f06]">—</span>
                </div>
              </div>

              <div className="space-y-1">
                <h3 className="text-xl font-black text-[#182C61] tracking-tight">
                  {doctor.name || doctor.username || 'Doctor'}
                </h3>
                <p className="text-[9px] font-black text-[#808e9b] uppercase tracking-[0.2em]">
                  {doctor.specialty || 'Specialty not set'}
                </p>
                {doctor.hospitalName && (
                  <p className="text-xs text-[#808e9b] font-bold mt-1">{doctor.hospitalName}</p>
                )}
              </div>

              <div className="mt-6 pt-6 border-t-2 border-slate-50 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  {doctor.isVerified && (
                    <span className="inline-block text-[9px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">
                      Verified
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => openBook(doctor)}
                  className="btn-primary py-3 px-6 text-[9px] uppercase tracking-widest font-black shrink-0"
                >
                  Book
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading &&
        !loadError &&
        doctors.length > 0 &&
        filteredDoctors.length === 0 && (
          <p className="text-center rounded-2xl border-2 border-slate-100 bg-slate-50 text-[#808e9b] font-bold py-12 px-6">
            No doctor name or specialty matches your search text. Clear the search box or try different keywords.
          </p>
        )}

      {!loading && !loadError && doctors.length === 0 && (
        <p className="text-center text-[#808e9b] font-bold py-12">
          No doctors returned. Try &quot;All&quot; or another specialty.
        </p>
      )}

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
              {bookingDoctor.name || bookingDoctor.username} — {bookingDoctor.specialty || 'Doctor'}
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
