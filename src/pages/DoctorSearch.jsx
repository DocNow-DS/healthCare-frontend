import { useEffect, useMemo, useState } from 'react';
import {
  AdjustmentsHorizontalIcon,
  ExclamationTriangleIcon,
  HeartIcon,
  MagnifyingGlassIcon,
  StarIcon,
  VideoCameraIcon,
  XMarkIcon,
  CalendarIcon,
  ClockIcon,
  CheckCircleIcon,
  UsersIcon,
  BriefcaseIcon,
  ArrowRightIcon,
  HandThumbUpIcon,
  ChatBubbleLeftRightIcon,
} from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';
import { API } from '../config/api';

const specialtyEmoji = {
  'All': '🏥',
  'General': '🩺',
  'Cardiology': '🫀',
  'Dermatology': '🧪',
  'Pediatrics': '👶',
  'Neurology': '🧠',
  'Orthopedic': '🦴',
  'Psychiatry': '🧠',
  'Gastroenterology': '🧪',
  'Dental': '🦷',
  'Ophthalmology': '👁️',
  'Urology': '🧪',
  'Oncologist': '🎗️',
  'Dentist': '🦷',
};

const getDoctorName = (doc) => {
  if (!doc) return 'Doctor';
  return withDoctorPrefix(doc.name || doc.fullName || doc.username || 'Doctor');
};

const getSpecialty = (doc) => {
  if (!doc) return 'General';
  return doc.specialization || doc.specialty || 'General Practice';
};

const FAKE_DOCTOR_IMAGES = [
  'https://images.unsplash.com/photo-1559839734-2b71f1536783?auto=format&fit=crop&q=80&w=400',
  'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80&w=400',
  'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&q=80&w=400',
  'https://images.unsplash.com/photo-1594824476967-48c8b964273f?auto=format&fit=crop&q=80&w=400',
  'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=400',
  'https://images.unsplash.com/photo-1651008376811-b90baee60c1f?auto=format&fit=crop&q=80&w=400',
  'https://images.unsplash.com/photo-1582750433449-648ed127bb54?auto=format&fit=crop&q=80&w=400',
  'https://images.unsplash.com/photo-1612531388300-473523a54992?auto=format&fit=crop&q=80&w=400',
];

const fallbackImage = FAKE_DOCTOR_IMAGES[0];

const getDoctorImage = (doc) => {
  if (!doc) return fallbackImage;
  const original = doc.image || doc.profilePicture || doc.imageUrl;
  if (original && !original.includes('default') && original.startsWith('http')) return original;
  
  // Deterministic fake image based on ID
  const idStr = String(doc.id || doc.userId || '0');
  const index = Math.abs(idStr.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % FAKE_DOCTOR_IMAGES.length;
  return FAKE_DOCTOR_IMAGES[index];
};
const SLOT_MINUTES = 30;
const SLOT_HOUR_START = 8;
const SLOT_HOUR_END = 20;
const BLOCKING_STATUSES = new Set(['PENDING', 'ACCEPTED', 'RESCHEDULE_REQUESTED']);
const DAY_NAMES = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

const toDateSafe = (value) => {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

const handleImageFallback = (e) => {
  e.target.src = fallbackImage;
};

const normalizeDate = (date) => {
  if (!date) return null;
  const d = new Date(date);
  return isNaN(d.getTime()) ? null : d;
};

const withDoctorPrefix = (name) => {
  const cleaned = String(name || '').trim();
  if (!cleaned) return 'Doctor';
  if (/^dr\.?\s+/i.test(cleaned)) return cleaned;
  return `Dr. ${cleaned}`;
};

const getConsultationFeeLkr = (doc) => {
  const fee = Number(doc?.consultationFee);
  if (Number.isFinite(fee) && fee > 0) return fee;

  // Deterministic fallback fee in LKR: clean hundreds, 1100-4900
  const seed = String(
    doc?.id || doc?.userId || doc?.doctorId || doc?.username || doc?.name || 'doctor',
  );
  const hash = Math.abs(seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0));
  return 1100 + (hash % 39) * 100;
};

const parseTimeToMinutes = (raw) => {
  if (raw == null) return null;
  if (typeof raw === 'object') {
    const h = Number(raw?.hour);
    const m = Number(raw?.minute);
    if (Number.isFinite(h) && Number.isFinite(m)) return h * 60 + m;
  }
  const text = String(raw).trim();
  if (!text) return null;
  const [hh, mm] = text.split(':');
  const h = Number(hh);
  const m = Number(mm);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return h * 60 + m;
};

const minutesToTimeText = (minutes) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

const consultationTypeMatches = (slotType, requestedType) => {
  const s = String(slotType || '').trim().toUpperCase();
  const r = String(requestedType || '').trim().toUpperCase();
  if (!s || s === 'BOTH') return true;
  if (!r) return true;
  if (s === r) return true;
  if (s === 'IN_PERSON' && r === 'OFFLINE') return true;
  if (s === 'OFFLINE' && r === 'IN_PERSON') return true;
  return false;
};

const normalizeDayName = (rawDay) => {
  if (rawDay == null) return '';
  if (typeof rawDay === 'number') {
    if (rawDay >= 1 && rawDay <= 7) return DAY_NAMES[rawDay % 7];
    if (rawDay >= 0 && rawDay <= 6) return DAY_NAMES[rawDay];
  }
  const txt = String(rawDay).trim().toUpperCase();
  if (!txt) return '';
  if (DAY_NAMES.includes(txt)) return txt;
  const idx = Number(txt);
  if (Number.isFinite(idx)) {
    if (idx >= 1 && idx <= 7) return DAY_NAMES[idx % 7];
    if (idx >= 0 && idx <= 6) return DAY_NAMES[idx];
  }
  return txt;
};

const buildDefaultSlotOptions = (dateText, doctorAppointments, patientAppointments) => {
  if (!dateText) return [];
  const now = new Date();
  const slots = [];
  for (let hour = SLOT_HOUR_START; hour < SLOT_HOUR_END; hour += 1) {
    for (let minute = 0; minute < 60; minute += SLOT_MINUTES) {
      const value = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
      const slotStart = new Date(`${dateText}T${value}:00`);
      const slotEnd = new Date(slotStart.getTime() + SLOT_MINUTES * 60 * 1000);
      const isPast = slotStart <= now;
      const hasDoctorConflict = doctorAppointments.some((appt) => {
        const status = String(appt?.status || '').toUpperCase();
        if (!BLOCKING_STATUSES.has(status)) return false;
        const start = toDateSafe(appt?.startTime);
        const end = toDateSafe(appt?.endTime || appt?.startTime);
        if (!start || !end) return false;
        return start < slotEnd && end > slotStart;
      });
      const hasPatientConflict = patientAppointments.some((appt) => {
        const status = String(appt?.status || '').toUpperCase();
        if (!BLOCKING_STATUSES.has(status)) return false;
        const start = toDateSafe(appt?.startTime);
        const end = toDateSafe(appt?.endTime || appt?.startTime);
        if (!start || !end) return false;
        return start < slotEnd && end > slotStart;
      });
      let reason = '';
      if (isPast) reason = 'Past time';
      else if (hasDoctorConflict) reason = 'Doctor already booked';
      else if (hasPatientConflict) reason = 'Slot unavailable';
      slots.push({
        value,
        label: `${value} - ${slotEnd.toTimeString().slice(0, 5)}`,
        disabled: Boolean(reason),
        reason,
      });
    }
  }
  return slots;
};

const buildSlotOptions = (
  dateText,
  doctorAvailability,
  doctorAppointments,
  patientAppointments,
  consultationType,
) => {
  if (!dateText) return [];

  const now = new Date();
  const dayDate = new Date(`${dateText}T00:00:00`);
  const dayName = DAY_NAMES[dayDate.getDay()] || '';
  const activeWindows = (Array.isArray(doctorAvailability) ? doctorAvailability : []).filter((slot) => {
    const isActive = slot?.active ?? slot?.isActive ?? slot?.isAvailable;
    const slotDay = normalizeDayName(slot?.dayOfWeek);
    return isActive !== false && slotDay === dayName && consultationTypeMatches(slot?.consultationType, consultationType);
  });
  if (activeWindows.length === 0) {
    return buildDefaultSlotOptions(dateText, doctorAppointments, patientAppointments);
  }

  const slots = [];
  const seen = new Set();

  activeWindows.forEach((window) => {
    const startMinutes = parseTimeToMinutes(window?.startTime);
    const endMinutes = parseTimeToMinutes(window?.endTime);
    if (startMinutes == null || endMinutes == null || endMinutes <= startMinutes) return;

    for (let minute = startMinutes; minute + SLOT_MINUTES <= endMinutes; minute += SLOT_MINUTES) {
      const value = minutesToTimeText(minute);
      if (seen.has(value)) continue;
      seen.add(value);
      const slotStart = new Date(`${dateText}T${value}:00`);
      const slotEnd = new Date(slotStart.getTime() + SLOT_MINUTES * 60 * 1000);

      const isPast = slotStart <= now;

      const hasDoctorConflict = doctorAppointments.some((appt) => {
        const status = String(appt?.status || '').toUpperCase();
        if (!BLOCKING_STATUSES.has(status)) return false;
        const start = toDateSafe(appt?.startTime);
        const end = toDateSafe(appt?.endTime || appt?.startTime);
        if (!start || !end) return false;
        return start < slotEnd && end > slotStart;
      });

      const hasPatientConflict = patientAppointments.some((appt) => {
        const status = String(appt?.status || '').toUpperCase();
        if (!BLOCKING_STATUSES.has(status)) return false;
        const start = toDateSafe(appt?.startTime);
        const end = toDateSafe(appt?.endTime || appt?.startTime);
        if (!start || !end) return false;
        return start < slotEnd && end > slotStart;
      });

      let reason = '';
      if (isPast) reason = 'Past time';
      else if (hasDoctorConflict) reason = 'Doctor already booked';
      else if (hasPatientConflict) reason = 'You already have an appointment';

      slots.push({
        value,
        label: `${value} - ${slotEnd.toTimeString().slice(0, 5)}`,
        disabled: Boolean(reason),
        reason,
      });
    }
  });

  return slots.sort((a, b) => a.value.localeCompare(b.value));
};

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
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [doctorAvailability, setDoctorAvailability] = useState([]);
  const [availabilityFallback, setAvailabilityFallback] = useState(false);
  const [doctorBookedAppointments, setDoctorBookedAppointments] = useState([]);
  const [patientBookedAppointments, setPatientBookedAppointments] = useState([]);
  const [bookMessage, setBookMessage] = useState(null);
  const [favoriteIds, setFavoriteIds] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [selectedDoctorDetails, setSelectedDoctorDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [bookForm, setBookForm] = useState({
    date: '',
    time: '',
    consultationType: 'ONLINE',
    notes: '',
  });
  const [specialtyOptions, setSpecialtyOptions] = useState(['All']);
  const [activeTab, setActiveTab] = useState('About');
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);

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
        const q = searchTerm.toLowerCase().trim();
        if (!q) return true;
        const name = String(doc.name || doc.fullName || doc.username || '').toLowerCase();
        const specialty = String(doc.specialization || doc.specialty || '').toLowerCase();
        const hospital = String(doc.hospitalName || doc.hospital || '').toLowerCase();
        return name.includes(q) || specialty.includes(q) || hospital.includes(q);
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
      .map((item) => {
        const doc = doctors.find(d => String(d.id) === String(item.doctorId));
        return { 
          ...item, 
          parsedStart: normalizeDate(item?.startTime || item?.scheduledAt || item?.createdAt),
          specialty: item.specialty || (doc ? getSpecialty(doc) : 'Specialist')
        };
      })
      .filter((item) => item.parsedStart && item.parsedStart.getTime() >= now.getTime())
      .sort((a, b) => a.parsedStart.getTime() - b.parsedStart.getTime())
      .slice(0, 3);
  }, [appointments, doctors]);

  const openBooking = (doctor) => {
    setBookMessage(null);
    setBookForm({ date: '', time: '', consultationType: 'ONLINE', notes: '' });
    setBookingDoctor(doctor);
    setDoctorAvailability([]);
    setAvailabilityFallback(false);
    setDoctorBookedAppointments([]);
    setPatientBookedAppointments([]);

    const availabilityIdCandidates = [doctor?.id, doctor?.userId, doctor?.doctorId, doctor?.username]
      .map((v) => (v == null ? '' : String(v).trim()))
      .filter(Boolean)
      .filter((v, idx, arr) => arr.indexOf(v) === idx);
    const doctorId = availabilityIdCandidates[0];
    if (!doctorId) return;

    setLoadingSlots(true);
    Promise.allSettled([
      API.patientAppointments.list(),
      API.doctorAppointments.list(String(doctorId)),
      Promise.allSettled(
        availabilityIdCandidates.map((candidateId) =>
          API.patientBooking.getDoctorAvailability(String(candidateId)),
        ),
      ),
    ])
      .then(([patientResult, doctorResult, availabilityResults]) => {
        const patientList = patientResult.status === 'fulfilled' && Array.isArray(patientResult.value)
          ? patientResult.value
          : [];
        const doctorList = doctorResult.status === 'fulfilled' && Array.isArray(doctorResult.value)
          ? doctorResult.value
          : [];
        const availabilityList = availabilityResults.status === 'fulfilled'
          ? availabilityResults.value
            .filter((res) => res.status === 'fulfilled' && Array.isArray(res.value))
            .flatMap((res) => res.value)
          : [];
        setAvailabilityFallback(availabilityList.length === 0);
        setDoctorAvailability(availabilityList);
        setPatientBookedAppointments(patientList);
        setDoctorBookedAppointments(doctorList);
      })
      .finally(() => setLoadingSlots(false));
  };

  const slotOptions = useMemo(
    () =>
      buildSlotOptions(
        bookForm.date,
        doctorAvailability,
        doctorBookedAppointments,
        patientBookedAppointments,
        bookForm.consultationType,
      ),
    [
      bookForm.date,
      bookForm.consultationType,
      doctorAvailability,
      doctorBookedAppointments,
      patientBookedAppointments,
    ],
  );
  const availableSlotCount = useMemo(
    () => slotOptions.filter((slot) => !slot.disabled).length,
    [slotOptions],
  );

  const submitBooking = async (e) => {
    e.preventDefault();
    if (!bookingDoctor || !bookForm.date || !bookForm.time) return;

    const selectedSlot = slotOptions.find((slot) => slot.value === bookForm.time);
    if (!selectedSlot || selectedSlot.disabled) {
      setBookMessage({
        type: 'err',
        text: 'Selected slot is unavailable. Please choose another time.',
      });
      return;
    }

    setBooking(true);
    setBookMessage(null);
    try {
      const startTime = `${bookForm.date}T${bookForm.time}:00`;
      await API.patientAppointments.create({
        doctorId: String(bookingDoctor.id),
        startTime,
        durationMinutes: 30,
        consultationType: bookForm.consultationType,
        notes: bookForm.notes || undefined,
      });
      setBookMessage({ type: 'ok', text: 'Appointment booked successfully. Redirecting to My Appointments...' });
      setTimeout(() => {
        navigate('/dashboard/appointments');
      }, 1400);
    } catch (err) {
      const rawMessage = String(err?.message || '');
      const friendlyMessage = /already have another booking|already have an appointment|time range/i.test(rawMessage)
        ? 'This time slot is unavailable. Please choose a different slot.'
        : rawMessage;
      setBookMessage({
        type: 'err',
        text: friendlyMessage || 'Could not create appointment. Are you logged in as a patient?',
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
    <div className="flex flex-col lg:flex-row gap-8 animate-in fade-in duration-700">
      {/* Main Content Area */}
      <div className="flex-1 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-[#182C61] tracking-tight">
              Find Your Doctor
            </h1>
            <p className="text-[#808e9b] mt-1 font-bold">Search specialists, compare profiles, and book your appointment in minutes.</p>
          </div>
          <div className="hidden md:flex items-center gap-3 bg-white px-4 py-2 rounded-2xl border border-slate-100 shadow-sm">
            <CalendarIcon className="h-5 w-5 text-[#182C61]" />
            <span className="text-sm font-black text-[#182C61]">
              {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </span>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative group">
          <MagnifyingGlassIcon className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-[#808e9b] group-focus-within:text-[#182C61] transition-colors" />
          <input
            type="text"
            placeholder="Search by doctor name, specialty, or hospital"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-14 pr-6 py-4 bg-white border-2 border-transparent rounded-[2rem] focus:outline-none focus:ring-4 focus:ring-[#182C61]/5 focus:border-[#182C61] font-bold text-sm text-[#1e272e] shadow-xl shadow-[#182C61]/5 transition-all"
          />
        </div>

        {/* Specialty Categories */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-[#182C61]">Specialties</h2>
            <button className="text-[10px] font-black uppercase tracking-widest text-[#eb2f06] hover:underline">View All</button>
          </div>
          <div className="flex items-center gap-4 overflow-x-auto pb-4 scrollbar-hide">
            {specialtyOptions.map((spec) => {
              const active = selectedSpecialty === spec;
              const emoji = specialtyEmoji[spec] || '🩺';
              return (
                <button
                  key={spec}
                  onClick={() => setSelectedSpecialty(spec)}
                  className={`flex flex-col items-center justify-center min-w-[100px] h-[100px] rounded-[2rem] border-2 transition-all ${
                    active 
                    ? 'bg-[#182C61] border-[#182C61] shadow-xl shadow-[#182C61]/20 transform -translate-y-1' 
                    : 'bg-white border-slate-50 hover:border-[#182C61]/10'
                  }`}
                >
                  <span className="text-2xl mb-2">{emoji}</span>
                  <span className={`text-[10px] font-black uppercase tracking-widest ${active ? 'text-white' : 'text-[#808e9b]'}`}>{spec}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Doctor Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-[#182C61]">
              Recommended {selectedSpecialty !== 'All' ? selectedSpecialty : ''} ({filteredDoctors.length})
            </h2>
            <button className="text-[10px] font-black uppercase tracking-widest text-[#eb2f06] hover:underline">View All</button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {loading ? (
              [1, 2, 3].map(i => (
                <div key={i} className="h-64 bg-slate-50 rounded-[2rem] animate-pulse" />
              ))
            ) : filteredDoctors.length === 0 ? (
               <div className="col-span-full py-12 text-center bg-white rounded-[2rem] border-2 border-dashed border-slate-100">
                  <ExclamationTriangleIcon className="h-12 w-12 text-slate-200 mx-auto mb-4" />
                  <p className="text-sm font-bold text-[#808e9b]">No doctors found matching your criteria</p>
               </div>
            ) : (
              filteredDoctors.map((doctor) => {
                const id = String(doctor.id || '');
                const isSelected = id === selectedDoctorId;
                const isFavorite = favoriteIds.includes(id);

                return (
                  <div 
                    key={id}
                    onClick={() => {
                        setSelectedDoctorId(id);
                        if (!bookingDoctor || bookingDoctor.id !== doctor.id) {
                            openBooking(doctor);
                        }
                    }}
                    className={`group relative bg-white p-4 rounded-[2rem] border-2 transition-all cursor-pointer ${
                      isSelected 
                      ? 'border-[#182C61] shadow-2xl shadow-[#182C61]/10 transform -translate-y-1' 
                      : 'border-slate-50 hover:border-[#182C61]/10 hover:shadow-xl'
                    }`}
                  >
                    <div className="relative aspect-[4/3] rounded-[1.5rem] overflow-hidden mb-4 bg-slate-50">
                      <img 
                        src={getDoctorImage(doctor)} 
                        alt={getDoctorName(doctor)}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                        onError={handleImageFallback}
                      />
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(id);
                        }}
                        className="absolute top-3 right-3 p-2 bg-white/80 backdrop-blur-md rounded-xl shadow-sm hover:bg-white transition-colors"
                      >
                        <HeartIcon className={`h-4 w-4 ${isFavorite ? 'text-[#eb2f06] fill-[#eb2f06]' : 'text-[#808e9b]'}`} />
                      </button>
                    </div>

                    <div className="space-y-1 mb-4">
                      <h3 className="font-black text-[#182C61] leading-tight truncate">{getDoctorName(doctor)}</h3>
                      <p className="text-[10px] font-bold text-[#808e9b] uppercase tracking-widest">{getSpecialty(doctor)}</p>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                      <p className="text-lg font-black text-[#182C61]">LKR {getConsultationFeeLkr(doctor)}<span className="text-[10px] text-[#808e9b]">/h</span></p>
                      <div className="flex items-center gap-1 bg-[#eb2f06]/5 px-2 py-1 rounded-lg">
                        <StarIcon className="h-3 w-3 text-[#eb2f06] fill-[#eb2f06]" />
                        <span className="text-[10px] font-black text-[#eb2f06]">{doctor.rating || '4.8'}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Right Sidebar */}
      <div className="w-full lg:w-[400px] space-y-8">
        {/* Upcoming Schedule */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-[#182C61]">Upcoming Schedule</h2>
            <span className="bg-[#182C61] text-white text-[10px] font-black px-2 py-0.5 rounded-full">
              {upcomingAppointments.length}
            </span>
          </div>
          
          <div className="space-y-3">
            {upcomingAppointments.length === 0 ? (
              <div className="p-6 text-center bg-slate-50 rounded-[2rem] border border-slate-100">
                <CalendarIcon className="h-8 w-8 text-slate-200 mx-auto mb-2" />
                <p className="text-[10px] font-bold text-[#808e9b]">No upcoming appointments</p>
              </div>
            ) : (
              upcomingAppointments.map((item) => (
                <div key={item.id} className="bg-white p-4 rounded-[1.5rem] border border-slate-50 shadow-sm flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-[#182C61]/5 flex items-center justify-center text-xl">
                    {specialtyEmoji[item.specialty] || '🩺'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-black text-[#182C61] truncate">{item.doctorName}</h4>
                    <p className="text-[10px] font-bold text-[#808e9b] uppercase tracking-widest">{item.specialty || 'General'}</p>
                    <div className="flex items-center gap-3 mt-2 text-[9px] font-black text-[#182C61]">
                        <span className="flex items-center gap-1">
                            <CalendarIcon className="h-3 w-3 text-[#eb2f06]" />
                            {normalizeDate(item.startTime)?.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </span>
                        <span className="flex items-center gap-1">
                            <ClockIcon className="h-3 w-3 text-[#eb2f06]" />
                            {normalizeDate(item.startTime)?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    </div>
                  </div>
                  <button className="p-2 bg-[#182C61] text-white rounded-xl shadow-lg shadow-[#182C61]/20">
                     <VideoCameraIcon className="h-4 w-4" />
                  </button>
                </div>
              ))
            )}
            <button className="w-full py-2 text-[10px] font-black uppercase tracking-widest text-[#182C61] hover:text-[#eb2f06] transition-colors">
              Show All <ArrowRightIcon className="inline h-3 w-3 ml-1" />
            </button>
          </div>
        </div>

        {/* Selected Doctor Detail/Booking */}
        {effectiveSelectedDoctor && (
          <div className="bg-white rounded-[2.5rem] border-2 border-slate-50 shadow-2xl shadow-[#182C61]/5 flex flex-col overflow-hidden animate-in slide-in-from-right-8 duration-500">
            {/* Doctor Info */}
            <div className="p-6 bg-gradient-to-br from-slate-50 to-white border-b border-slate-50">
              <div className="flex items-center gap-4 mb-6">
                <img 
                  src={getDoctorImage(effectiveSelectedDoctor)} 
                  alt={getDoctorName(effectiveSelectedDoctor)}
                  className="h-16 w-16 rounded-2xl object-cover ring-4 ring-white shadow-lg"
                />
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-black text-[#182C61] leading-tight truncate">{getDoctorName(effectiveSelectedDoctor)}</h3>
                  <p className="text-[10px] font-bold text-[#808e9b] uppercase tracking-widest mb-2">{getSpecialty(effectiveSelectedDoctor)}</p>
                  <p className="text-xl font-black text-[#eb2f06]">LKR {getConsultationFeeLkr(effectiveSelectedDoctor)}<span className="text-xs text-[#808e9b]">/h</span></p>
                </div>
                <button className="p-3 bg-[#182C61] text-white rounded-2xl shadow-xl shadow-[#182C61]/20">
                    <VideoCameraIcon className="h-5 w-5" />
                </button>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Experience', value: '5 years', icon: BriefcaseIcon, color: 'text-indigo-600 bg-indigo-50' },
                  { label: 'Patients', value: '9845', icon: UsersIcon, color: 'text-emerald-600 bg-emerald-50' },
                  { label: 'Reviews', value: '6.09K', icon: HandThumbUpIcon, color: 'text-orange-600 bg-orange-50' }
                ].map((stat, i) => (
                  <div key={i} className="p-3 rounded-2xl bg-white border border-slate-50 shadow-sm text-center">
                    <div className={`w-8 h-8 ${stat.color} rounded-xl flex items-center justify-center mx-auto mb-2`}>
                        <stat.icon className="h-4 w-4" />
                    </div>
                    <p className="text-[10px] font-black text-[#182C61]">{stat.value}</p>
                    <p className="text-[8px] font-bold text-[#808e9b] uppercase tracking-wider">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Tabs */}
            <div className="px-6 pt-4">
              <div className="flex items-center justify-between border-b border-slate-50">
                {['About', 'Schedules', 'Experience', 'Review'].map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`pb-3 text-[10px] font-black uppercase tracking-widest transition-all relative ${
                      activeTab === tab ? 'text-[#182C61]' : 'text-[#808e9b] hover:text-[#182C61]'
                    }`}
                  >
                    {tab}
                    {activeTab === tab && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#182C61] rounded-full" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab Content */}
            <div className="p-6 flex-1 overflow-y-auto min-h-[300px]">
              {activeTab === 'About' && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                    <p className="text-xs text-[#1e272e] leading-relaxed font-medium">
                        {getDoctorName(effectiveSelectedDoctor)} is a renowned {getSpecialty(effectiveSelectedDoctor)} specialist known for his extraordinary talents in treating healthcare conditions. With a background in precise medicine and a passion for helping patients regain their health.
                    </p>
                    <p className="text-xs text-[#1e272e] leading-relaxed font-medium">
                        He is celebrated for his groundbreaking techniques and personalized approach to patient care.
                    </p>
                    
                    <div className="pt-6 border-t border-slate-50">
                        <button 
                            onClick={() => setIsBookingModalOpen(true)}
                            className="w-full py-4 bg-[#182C61] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-[#182C61]/20 hover:bg-[#eb2f06] transition-all transform active:scale-95"
                        >
                            Booking Appointment
                        </button>
                    </div>
                </div>
              )}
              {activeTab !== 'About' && (
                <div className="flex flex-col items-center justify-center py-12 text-center text-[#808e9b]">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                        <ClockIcon className="h-8 w-8 text-slate-200" />
                    </div>
                    <p className="text-xs font-bold">{activeTab} information coming soon</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Booking Modal */}
      {isBookingModalOpen && bookingDoctor && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-[#182C61]/40 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] border-2 border-slate-100 shadow-2xl max-w-4xl w-full overflow-hidden relative animate-in zoom-in-95 duration-300 flex flex-col md:flex-row">
            
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setIsBookingModalOpen(false)}
              className="absolute top-6 right-6 z-10 p-2 rounded-xl text-[#808e9b] hover:bg-slate-50 transition-colors"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>

            {/* Left Panel: Doctor Info & Date */}
            <div className="w-full md:w-[350px] bg-slate-50 p-8 border-r border-slate-100 space-y-8">
                <div className="space-y-4">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#eb2f06]/5 text-[#eb2f06] text-[9px] font-black uppercase tracking-widest">
                        <CalendarIcon className="h-3 w-3" />
                        Booking details
                    </div>
                    <div>
                        <div className="flex items-center gap-4 mb-4">
                            <img 
                                src={getDoctorImage(bookingDoctor)} 
                                alt={getDoctorName(bookingDoctor)}
                                className="h-16 w-16 rounded-2xl object-cover ring-4 ring-white shadow-lg"
                            />
                            <div>
                                <h2 className="text-xl font-black text-[#182C61] leading-tight">{getDoctorName(bookingDoctor)}</h2>
                                <p className="text-[10px] text-[#808e9b] font-bold uppercase tracking-widest">{getSpecialty(bookingDoctor)}</p>
                            </div>
                        </div>
                        <p className="text-[11px] text-[#1e272e] leading-relaxed font-medium">
                            Please select your preferred date and time for the consultation with {getDoctorName(bookingDoctor)}.
                        </p>
                    </div>
                </div>

                <div className="space-y-3 pt-6 border-t border-slate-200">
                    <label className="text-[9px] font-black uppercase tracking-widest text-[#808e9b]">1. Select Date</label>
                    <input
                        type="date"
                        required
                        min={new Date().toISOString().slice(0, 10)}
                        value={bookForm.date}
                        onChange={(e) => setBookForm((f) => ({ ...f, date: e.target.value, time: '' }))}
                        className="w-full px-4 py-4 rounded-2xl bg-white border-2 border-transparent shadow-sm shadow-[#182C61]/5 font-black text-xs text-[#182C61] focus:ring-4 focus:ring-[#182C61]/5 focus:border-[#182C61] transition-all"
                    />
                </div>

                <div className="hidden md:block pt-8">
                     <p className="text-[9px] font-bold text-[#808e9b] leading-relaxed">
                        Need help? Contact our support team for assistance with your booking.
                     </p>
                </div>
            </div>

            {/* Right Panel: Time & Remaining Form */}
            <form 
                onSubmit={async (e) => { await submitBooking(e); }} 
                className="flex-1 p-8 md:p-10 space-y-6 overflow-y-auto max-h-[90vh]"
            >
              <div className="space-y-4">
                <label className="text-[9px] font-black uppercase tracking-widest text-[#808e9b]">2. Pick a time slot</label>
                {!bookForm.date ? (
                    <div className="py-12 px-8 text-center bg-white rounded-3xl border-2 border-dashed border-slate-100">
                         <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                             <ClockIcon className="h-6 w-6 text-slate-200" />
                         </div>
                        <p className="text-[11px] font-bold text-[#808e9b]">Select a date on the left to see availability</p>
                    </div>
                ) : loadingSlots ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-3">
                        <div className="animate-spin h-6 w-6 border-2 border-[#182C61] border-t-transparent rounded-full" />
                        <p className="text-[10px] font-black text-[#182C61] uppercase tracking-widest">Checking availability...</p>
                    </div>
                ) : slotOptions.length === 0 ? (
                    <div className="py-12 px-8 text-center bg-amber-50 rounded-3xl border border-amber-100">
                        <p className="text-[11px] font-black text-amber-700 uppercase tracking-widest">No slots today</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {[
                            { name: 'Morning', hours: [8, 12], icon: '🌅' },
                            { name: 'Afternoon', hours: [12, 17], icon: '☀️' },
                            { name: 'Evening', hours: [17, 21], icon: '🌙' }
                        ].map(period => {
                            const periodSlots = slotOptions.filter(s => {
                                const hour = parseInt(s.value.split(':')[0]);
                                return hour >= period.hours[0] && hour < period.hours[1];
                            });
                            
                            if (periodSlots.length === 0) return null;

                            return (
                                <div key={period.name} className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs">{period.icon}</span>
                                        <h4 className="text-[9px] font-black uppercase tracking-widest text-[#182C61]">{period.name}</h4>
                                    </div>
                                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                                        {periodSlots.map(slot => {
                                            const isSelected = bookForm.time === slot.value;
                                            return (
                                                <button
                                                    key={slot.value}
                                                    type="button"
                                                    disabled={slot.disabled}
                                                    onClick={() => setBookForm(f => ({ ...f, time: slot.value }))}
                                                    className={`py-3 rounded-2xl text-[10px] font-black transition-all border ${
                                                        slot.disabled
                                                        ? 'bg-slate-50 border-transparent text-slate-300 cursor-not-allowed line-through'
                                                        : isSelected
                                                        ? 'bg-[#182C61] border-[#182C61] text-white shadow-xl shadow-[#182C61]/20 transform scale-105'
                                                        : 'bg-white border-slate-100 text-[#182C61] hover:border-[#182C61]/30 hover:shadow-lg hover:shadow-[#182C61]/5'
                                                    }`}
                                                >
                                                    {slot.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
                  <div className="space-y-3">
                    <label className="text-[9px] font-black uppercase tracking-widest text-[#808e9b]">3. Visit Type</label>
                    <div className="flex gap-2">
                        {['ONLINE', 'IN_PERSON'].map(type => (
                            <button
                                key={type}
                                type="button"
                                onClick={() => setBookForm(f => ({ ...f, consultationType: type }))}
                                className={`flex-1 py-4 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all ${
                                    bookForm.consultationType === type 
                                    ? 'bg-[#eb2f06] text-white shadow-xl shadow-[#eb2f06]/10' 
                                    : 'bg-slate-50 text-[#808e9b] hover:bg-slate-100'
                                }`}
                            >
                                {type.replace('_', ' ')}
                            </button>
                        ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[9px] font-black uppercase tracking-widest text-[#808e9b]">4. Notes</label>
                    <textarea
                      value={bookForm.notes}
                      onChange={(e) => setBookForm((f) => ({ ...f, notes: e.target.value }))}
                      rows={1}
                      className="w-full px-4 py-4 rounded-2xl bg-slate-50 border-0 font-bold text-xs text-[#1e272e] focus:ring-4 focus:ring-[#182C61]/5 min-h-[52px]"
                      placeholder="Symptoms..."
                    />
                  </div>
              </div>

              {bookMessage && (
                <div className={`p-4 rounded-[1.5rem] text-[11px] font-bold flex items-center gap-3 ${bookMessage.type === 'ok' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                    {bookMessage.type === 'ok' ? <CheckCircleIcon className="h-5 w-5" /> : <ExclamationTriangleIcon className="h-4 w-4" />}
                    {bookMessage.text}
                </div>
              )}

              <button
                type="submit"
                disabled={booking || !bookForm.date || !bookForm.time || loadingSlots}
                className="w-full py-5 bg-[#182C61] text-white rounded-[2rem] text-xs font-black uppercase tracking-widest shadow-2xl shadow-[#182C61]/20 hover:bg-[#eb2f06] transition-all transform active:scale-[0.98] disabled:opacity-50 mt-4"
              >
                {booking ? 'Confiming appointment...' : 'Confirm Appointment'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}