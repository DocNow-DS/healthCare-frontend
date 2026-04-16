import { useEffect, useMemo, useState } from 'react';
import {
  AdjustmentsHorizontalIcon,
  CalendarIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  HeartIcon,
  MagnifyingGlassIcon,
  StarIcon,
  VideoCameraIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';
import { API } from '../config/api';

const fallbackImage =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='320' height='240' viewBox='0 0 320 240'%3E%3Crect width='320' height='240' fill='%23eef2ff'/%3E%3Ccircle cx='160' cy='92' r='34' fill='%23bfdbfe'/%3E%3Cpath d='M90 205c8-34 35-56 70-56 35 0 62 22 70 56' fill='%2393c5fd'/%3E%3Crect x='118' y='154' width='84' height='42' rx='10' fill='%2360a5fa'/%3E%3Cpath d='M152 162h16v26h-16z' fill='%23fff'/%3E%3Cpath d='M147 167h26v16h-26z' fill='%23fff'/%3E%3C/svg%3E";

const getDoctorImage = (doctor) => doctor?.profileImageUrl || doctor?.image || fallbackImage;

const handleImageFallback = (event) => {
  // Prevent loops if fallback itself fails for any reason.
  event.currentTarget.onerror = null;
  event.currentTarget.src = fallbackImage;
};

const specialtyEmoji = {
  All: '🩺',
  GP: '🩺',
  Cardiology: '❤️',
  Orthopedic: '🦴',
  Oncology: '🧬',
  Dentist: '🦷',
  Neurology: '🧠',
  Psychiatry: '🧘',
};

const normalizeDate = (value) => {
  const d = value ? new Date(value) : null;
  return d && !Number.isNaN(d.getTime()) ? d : null;
};

const getDoctorName = (doc) => doc?.name || doc?.fullName || doc?.username || 'Doctor';
const getSpecialty = (doc) => doc?.specialization || doc?.specialty || 'General';

export default function DoctorSearch() {
  const navigate = useNavigate();
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('All');
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [bookingDoctor, setBookingDoctor] = useState(null);
  const [booking, setBooking] = useState(false);
  const [bookMessage, setBookMessage] = useState(null);
  const [favoriteIds, setFavoriteIds] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [selectedDoctorDetails, setSelectedDoctorDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [bookForm, setBookForm] = useState({
    startTime: '',
    consultationType: 'ONLINE',
    notes: '',
  });
  const [specialtyOptions, setSpecialtyOptions] = useState(['All']);

  const loadDoctors = async (specialtyFilter) => {
    setLoading(true);
    setError('');
    try {
      const param = specialtyFilter === 'All' ? undefined : specialtyFilter;
      const list = await API.patientBooking.listDoctors(param);
      const arr = Array.isArray(list) ? list : [];
      setDoctors(arr);
      if (arr.length > 0 && !selectedDoctorId) {
        setSelectedDoctorId(String(arr[0].id || ''));
      }
      if (specialtyFilter === 'All') {
        const next = new Set(['All']);
        arr.forEach((doc) => {
          const spec = getSpecialty(doc);
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

  const loadAppointments = async () => {
    try {
      const list = await API.patientAppointments.list();
      setAppointments(Array.isArray(list) ? list : []);
    } catch {
      setAppointments([]);
    }
  };

  useEffect(() => {
    loadDoctors(selectedSpecialty);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSpecialty]);

  useEffect(() => {
    loadAppointments();
  }, []);

  const filteredDoctors = useMemo(
    () =>
      doctors.filter((doc) => {
        const name = getDoctorName(doc).toLowerCase();
        const spec = getSpecialty(doc).toLowerCase();
        const q = searchTerm.toLowerCase();
        return name.includes(q) || spec.includes(q);
      }),
    [doctors, searchTerm],
  );

  const selectedDoctor = useMemo(() => {
    const inFiltered = filteredDoctors.find((d) => String(d.id || '') === selectedDoctorId);
    if (inFiltered) return inFiltered;
    return filteredDoctors[0] || null;
  }, [filteredDoctors, selectedDoctorId]);

  useEffect(() => {
    const id = String(selectedDoctor?.id || '');
    if (!id) {
      setSelectedDoctorDetails(null);
      return;
    }

    let alive = true;
    const loadSelectedDoctorDetails = async () => {
      setDetailsLoading(true);
      try {
        const details = await API.doctors.getById(id);
        if (alive) setSelectedDoctorDetails(details || null);
      } catch {
        if (alive) setSelectedDoctorDetails(null);
      } finally {
        if (alive) setDetailsLoading(false);
      }
    };

    loadSelectedDoctorDetails();
    return () => {
      alive = false;
    };
  }, [selectedDoctor]);

  const effectiveSelectedDoctor = useMemo(() => {
    if (!selectedDoctor) return null;
    return {
      ...selectedDoctor,
      ...(selectedDoctorDetails || {}),
    };
  }, [selectedDoctor, selectedDoctorDetails]);

  const upcomingAppointments = useMemo(() => {
    const now = new Date();
    return appointments
      .map((item) => ({ ...item, parsedStart: normalizeDate(item?.startTime || item?.scheduledAt || item?.createdAt) }))
      .filter((item) => item.parsedStart && item.parsedStart.getTime() >= now.getTime())
      .sort((a, b) => a.parsedStart.getTime() - b.parsedStart.getTime())
      .slice(0, 3);
  }, [appointments]);

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
      const startTime = bookForm.startTime.length === 16 ? `${bookForm.startTime}:00` : bookForm.startTime;
      await API.patientAppointments.create({
        doctorId: String(bookingDoctor.id),
        startTime,
        durationMinutes: 30,
        consultationType: bookForm.consultationType,
        notes: bookForm.notes || undefined,
      });
      setBookMessage({ type: 'ok', text: 'Appointment requested. Redirecting to your appointments...' });
      setTimeout(() => {
        navigate('/dashboard/appointments');
      }, 800);
    } catch (err) {
      setBookMessage({
        type: 'err',
        text: err?.message || 'Could not create appointment. Please confirm you are logged in as patient.',
      });
    } finally {
      setBooking(false);
    }
  };

  const toggleFavorite = (id) => {
    const key = String(id || '');
    setFavoriteIds((prev) => (prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key]));
  };

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-4 md:p-6 shadow-lg shadow-primary-500/5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-primary-500">Welcome back, patient</h1>
            <p className="text-sm font-semibold text-[#808e9b] mt-1">
              Find specialists, review upcoming schedules, and book appointments quickly.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-primary-500 uppercase tracking-widest w-fit">
            <CalendarIcon className="h-4 w-4" />
            {new Date().toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' })}
          </div>
        </div>

        <div className="mt-4 flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#808e9b]" />
            <input
              type="text"
              placeholder="Search doctors, specialization..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-12 pr-4 text-sm font-semibold text-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            />
          </div>
          <button
            type="button"
            onClick={() => loadDoctors(selectedSpecialty)}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-black uppercase tracking-widest text-primary-500 hover:bg-slate-50"
          >
            <AdjustmentsHorizontalIcon className="h-5 w-5" />
            Refresh
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
          {specialtyOptions.map((spec) => {
            const active = selectedSpecialty === spec;
            const emoji = specialtyEmoji[spec] || '🩺';
            return (
              <button
                key={spec}
                type="button"
                onClick={() => setSelectedSpecialty(spec)}
                className={`rounded-2xl border p-3 text-left transition ${
                  active
                    ? 'border-primary-500 bg-primary-50 text-primary-500'
                    : 'border-slate-200 bg-white text-[#808e9b] hover:border-primary-500/30'
                }`}
              >
                <p className="text-lg">{emoji}</p>
                <p className="mt-2 text-[10px] font-black uppercase tracking-widest truncate">{spec}</p>
              </button>
            );
          })}
        </div>
      </div>

      {error ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
          <ExclamationTriangleIcon className="h-5 w-5 text-amber-600 mt-0.5" />
          <span className="text-sm font-semibold text-amber-800">{error}</span>
        </div>
      ) : null}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="xl:col-span-2 rounded-3xl border border-slate-200 bg-white p-4 shadow-lg shadow-primary-500/5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-black text-primary-500">
              Recommended Doctors ({filteredDoctors.length})
            </h2>
            <button
              type="button"
              onClick={() => navigate('/dashboard/appointments')}
              className="text-xs font-black uppercase tracking-widest text-primary-500 hover:text-accent-red"
            >
              My Appointments
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {loading ? (
              <div className="col-span-full text-sm font-semibold text-[#808e9b]">Loading doctors...</div>
            ) : filteredDoctors.length === 0 ? (
              <div className="col-span-full text-sm font-semibold text-[#808e9b]">No doctors match your filter.</div>
            ) : (
              filteredDoctors.map((doctor) => {
                const id = String(doctor.id || '');
                const selected = id === String(effectiveSelectedDoctor?.id || '');
                const isFavorite = favoriteIds.includes(id);
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setSelectedDoctorId(id)}
                    className={`text-left rounded-2xl border p-3 transition ${
                      selected
                        ? 'border-primary-500 bg-primary-50/40 shadow-md shadow-primary-500/10'
                        : 'border-slate-200 bg-white hover:border-primary-500/30'
                    }`}
                  >
                    <img
                      src={getDoctorImage(doctor)}
                      alt={getDoctorName(doctor)}
                      className="h-28 w-full object-cover rounded-xl bg-slate-100"
                      onError={handleImageFallback}
                    />
                    <div className="mt-3 flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-black text-primary-500 leading-tight">{getDoctorName(doctor)}</p>
                        <p className="text-[10px] font-black uppercase tracking-widest text-[#808e9b] mt-1">{getSpecialty(doctor)}</p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(id);
                        }}
                        className="p-1 rounded-lg hover:bg-slate-100"
                        aria-label="Toggle favorite"
                      >
                        <HeartIcon className={`h-5 w-5 ${isFavorite ? 'text-accent-red fill-accent-red' : 'text-slate-400'}`} />
                      </button>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <p className="text-lg font-black text-primary-500">${doctor.consultationFee || doctor.fee || 36}/h</p>
                      <div className="inline-flex items-center gap-1 rounded-full bg-accent-red/5 px-2 py-1">
                        <StarIcon className="h-3.5 w-3.5 text-accent-red" />
                        <span className="text-[10px] font-black text-accent-red">{doctor.rating || '4.8'}</span>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-lg shadow-primary-500/5">
            <h3 className="text-base font-black text-primary-500 mb-3">
              Upcoming Schedule ({upcomingAppointments.length})
            </h3>
            <div className="space-y-3">
              {upcomingAppointments.length === 0 ? (
                <p className="text-sm font-semibold text-[#808e9b]">No upcoming appointments found.</p>
              ) : (
                upcomingAppointments.map((item, idx) => (
                  <div key={item.id || idx} className="rounded-xl border border-slate-200 p-3 bg-slate-50/60">
                    <p className="text-sm font-black text-primary-500">{item.doctorName || `Doctor ${idx + 1}`}</p>
                    <div className="mt-2 flex items-center justify-between text-[11px] text-[#808e9b] font-bold">
                      <span className="inline-flex items-center gap-1">
                        <CalendarIcon className="h-4 w-4" />
                        {normalizeDate(item.startTime || item.scheduledAt || item.createdAt)?.toLocaleDateString() || 'Pending'}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <ClockIcon className="h-4 w-4" />
                        {normalizeDate(item.startTime || item.scheduledAt || item.createdAt)?.toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        }) || '--:--'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-lg shadow-primary-500/5">
            {!effectiveSelectedDoctor ? (
              <p className="text-sm font-semibold text-[#808e9b]">Select a doctor card to view details.</p>
            ) : (
              <>
                <div className="flex items-start gap-3">
                  <img
                    src={getDoctorImage(effectiveSelectedDoctor)}
                    alt={getDoctorName(effectiveSelectedDoctor)}
                    className="h-16 w-16 rounded-xl object-cover"
                    onError={handleImageFallback}
                  />
                  <div className="flex-1">
                    <p className="text-lg font-black text-primary-500 leading-tight">{getDoctorName(effectiveSelectedDoctor)}</p>
                    <p className="text-xs font-bold text-[#808e9b] mt-1">{getSpecialty(effectiveSelectedDoctor)}</p>
                    <p className="mt-1 text-xl font-black text-primary-500">
                      ${effectiveSelectedDoctor.consultationFee || effectiveSelectedDoctor.fee || 36}/h
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2">
                  <div className="rounded-xl border border-slate-200 p-2 text-center bg-slate-50">
                    <p className="text-xs font-black text-primary-500">{effectiveSelectedDoctor.yearsOfExperience || 0}y</p>
                    <p className="text-[10px] font-bold text-[#808e9b]">Experience</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 p-2 text-center bg-slate-50">
                    <p className="text-xs font-black text-primary-500">{effectiveSelectedDoctor.department || 'N/A'}</p>
                    <p className="text-[10px] font-bold text-[#808e9b]">Department</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 p-2 text-center bg-slate-50">
                    <p className="text-xs font-black text-primary-500">{effectiveSelectedDoctor.isVerified ? 'Yes' : 'No'}</p>
                    <p className="text-[10px] font-bold text-[#808e9b]">Verified</p>
                  </div>
                </div>

                <div className="mt-3 rounded-xl border border-slate-200 p-3 bg-slate-50/50">
                  <p className="text-[10px] font-black uppercase tracking-widest text-[#808e9b]">Hospital</p>
                  <p className="text-xs font-bold text-primary-500 mt-1">{effectiveSelectedDoctor.hospitalName || 'Not specified'}</p>
                  <p className="text-[10px] font-black uppercase tracking-widest text-[#808e9b] mt-3">Qualifications</p>
                  <p className="text-xs font-bold text-primary-500 mt-1">{effectiveSelectedDoctor.qualifications || effectiveSelectedDoctor.education || 'Not specified'}</p>
                </div>

                {detailsLoading ? (
                  <p className="mt-3 text-xs font-semibold text-[#808e9b]">Loading doctor profile details...</p>
                ) : null}

                <p className="mt-4 text-xs font-semibold text-[#808e9b] leading-relaxed">
                  {effectiveSelectedDoctor.about || 'Specialist profile available. Book a consultation to confirm schedule and visit notes.'}
                </p>

                <button
                  type="button"
                  onClick={() => openBooking(effectiveSelectedDoctor)}
                  className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary-500 text-white px-4 py-3 text-xs font-black uppercase tracking-widest hover:bg-primary-600"
                >
                  <VideoCameraIcon className="h-4 w-4" />
                  Booking Appointment
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {bookingDoctor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-primary-500/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl border-2 border-slate-100 shadow-2xl max-w-md w-full p-8 relative">
            <button
              type="button"
              onClick={() => setBookingDoctor(null)}
              className="absolute top-4 right-4 p-2 rounded-xl text-[#808e9b] hover:bg-slate-50"
              aria-label="Close"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
            <h2 className="text-2xl font-black text-primary-500 mb-1">Book appointment</h2>
            <p className="text-sm text-[#808e9b] font-bold mb-6">
              {getDoctorName(bookingDoctor)} - {getSpecialty(bookingDoctor)}
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
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 font-bold text-primary-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-[#808e9b] mb-2">
                  Consultation type
                </label>
                <select
                  value={bookForm.consultationType}
                  onChange={(e) => setBookForm((f) => ({ ...f, consultationType: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 font-bold text-primary-500"
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
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 font-bold text-primary-500"
                  placeholder="Reason for visit..."
                />
              </div>
              {bookMessage && (
                <p className={`text-sm font-bold ${bookMessage.type === 'ok' ? 'text-emerald-600' : 'text-red-600'}`}>
                  {bookMessage.type === 'ok' ? <CheckCircleIcon className="inline h-4 w-4 mr-1" /> : null}
                  {bookMessage.text}
                </p>
              )}
              <button
                type="submit"
                disabled={booking}
                className="btn-primary w-full py-4 text-xs uppercase tracking-widest font-black disabled:opacity-50"
              >
                {booking ? 'Sending...' : 'Request appointment'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
