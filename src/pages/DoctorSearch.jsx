import { useEffect, useMemo, useState } from 'react';
import {
  AdjustmentsHorizontalIcon,
  ExclamationTriangleIcon,
  HeartIcon,
  MagnifyingGlassIcon,
  StarIcon,
  VideoCameraIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';
import { API } from '../config/api';

const fallbackImage = 'https://images.unsplash.com/photo-1559839734-2b71f1536783?auto=format&fit=crop&q=80&w=200';
const SLOT_MINUTES = 30;
const SLOT_HOUR_START = 8;
const SLOT_HOUR_END = 20;
const BLOCKING_STATUSES = new Set(['PENDING', 'ACCEPTED', 'RESCHEDULE_REQUESTED']);
const DAY_NAMES = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

const toDateSafe = (value) => {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

const withDoctorPrefix = (name) => {
  const cleaned = String(name || '').trim();
  if (!cleaned) return 'Doctor';
  if (/^dr\.?\s+/i.test(cleaned)) return cleaned;
  return `Dr. ${cleaned}`;
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
      .map((item) => ({ ...item, parsedStart: normalizeDate(item?.startTime || item?.scheduledAt || item?.createdAt) }))
      .filter((item) => item.parsedStart && item.parsedStart.getTime() >= now.getTime())
      .sort((a, b) => a.parsedStart.getTime() - b.parsedStart.getTime())
      .slice(0, 3);
  }, [appointments]);

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
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-200 pb-6">
        <div className="flex-1">
          <h1 className="text-4xl font-black text-[#182C61] tracking-tight mb-4">Find specialists</h1>
          <div className="relative group">
            <MagnifyingGlassIcon className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-[#808e9b] group-focus-within:text-[#182C61] transition-colors" />
            <input
              type="text"
              placeholder="Search by doctor name, specialty, or hospital"
              className="w-full pl-14 pr-6 py-3.5 bg-white border border-slate-300 rounded-full focus:outline-none focus:ring-4 focus:ring-[#182C61]/10 focus:border-[#182C61] text-[#1e272e] font-semibold text-base transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-12 pr-4 text-sm font-semibold text-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            />
          </div>
          <button
            type="button"
            onClick={() => loadDoctors(selectedSpecialty)}
            className="p-3 bg-slate-100 border border-slate-200 rounded-xl text-[#182C61] hover:border-[#182C61]/40 transition-all relative"
            title="Refresh doctors"
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

      <div className="flex items-center space-x-3 overflow-x-auto pb-2 scrollbar-hide">
        {specialtyOptions.map((spec) => (
          <button
            key={spec}
            type="button"
            onClick={() => setSelectedSpecialty(spec)}
            className={`px-6 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-wide transition-all whitespace-nowrap ${
              selectedSpecialty === spec
                ? 'bg-[#182C61] text-white shadow-lg shadow-[#182C61]/20'
                : 'bg-[#d8e8fb] text-[#182C61] border border-[#c5daf5] hover:bg-[#cfe2fa]'
            }`}
          >
            {spec}
          </button>
        ))}
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
        ) : (
          filteredDoctors.map((doctor) => (
          <div key={doctor.id} className="bg-white border border-slate-300/70 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all duration-300">
            <div className="flex items-start justify-between mb-4">
              <div />
              <span className="text-sm font-semibold text-slate-500 flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${doctor.enabled !== false ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                {doctor.enabled !== false ? 'online' : 'offline'}
              </span>
            </div>

            <div>
              <h3 className="text-xl md:text-2xl leading-tight font-black text-[#111827]">
                {withDoctorPrefix(doctor.name || doctor.fullName || doctor.username || 'Doctor')}
              </h3>
              <p className="text-xs text-slate-600 mt-1 leading-5">
                {doctor.specialization || doctor.specialty || 'General specialist'}
                {(doctor.hospitalName || doctor.hospital) ? `, ${doctor.hospitalName || doctor.hospital}` : ''}
              </p>
            </div>

            <div className="mt-5 pt-4 border-t border-slate-200 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs text-slate-700">Consultation Fee:</p>
                <p className="text-xl leading-none font-black text-emerald-600 mt-1">
                  LKR {doctor.consultationFee || doctor.fee || 'N/A'}
                </p>
                <p className="text-xs font-black text-slate-800 mt-4">VIEW PROFILE</p>
              </div>
              <button
                type="button"
                onClick={() => openBooking(doctor)}
                className="bg-[#1e3a8a] hover:bg-[#1d357d] text-white font-black uppercase tracking-wide text-[11px] px-6 py-3 rounded-xl shadow-lg shadow-[#1e3a8a]/25"
              >
                Book
              </button>
            </div>
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
            <div className="mb-6 rounded-2xl bg-gradient-to-r from-[#182C61]/8 to-[#eb2f06]/8 border border-[#182C61]/10 p-4">
              <h2 className="text-2xl font-black text-[#182C61] mb-1">Book appointment</h2>
              <p className="text-sm text-[#808e9b] font-bold">
                Secure your slot with real-time availability checks.
              </p>
            </div>
            <p className="text-sm text-[#808e9b] font-bold mb-6">
              {withDoctorPrefix(bookingDoctor.name || bookingDoctor.fullName || bookingDoctor.username)} —{' '}
              {bookingDoctor.specialization || bookingDoctor.specialty || 'Doctor'}
            </p>
            <form onSubmit={submitBooking} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-[#808e9b] mb-2">
                  Appointment date
                </label>
                <input
                  type="date"
                  required
                  min={new Date().toISOString().slice(0, 10)}
                  value={bookForm.date}
                  onChange={(e) =>
                    setBookForm((f) => ({ ...f, date: e.target.value, time: '' }))
                  }
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 font-bold text-[#182C61] bg-white"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-[#808e9b] mb-2">
                  Time slot
                </label>
                <select
                  required
                  value={bookForm.time}
                  disabled={!bookForm.date || loadingSlots}
                  onChange={(e) => setBookForm((f) => ({ ...f, time: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 font-bold text-[#182C61] bg-white disabled:bg-slate-50 disabled:text-slate-400"
                >
                  <option value="">
                    {!bookForm.date
                      ? 'Select a date first'
                      : loadingSlots
                        ? 'Loading availability...'
                        : availableSlotCount > 0
                          ? 'Select available slot'
                          : 'No available slots'}
                  </option>
                  {slotOptions.map((slot) => (
                    <option key={slot.value} value={slot.value} disabled={slot.disabled}>
                      {slot.disabled ? `${slot.label} (${slot.reason})` : slot.label}
                    </option>
                  ))}
                </select>
                {bookForm.date && !loadingSlots ? (
                  <p className="mt-2 text-[11px] font-semibold text-[#808e9b]">
                    {availableSlotCount} available slots for this date.
                  </p>
                ) : null}
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-[#808e9b] mb-2">
                  Consultation type
                </label>
                <select
                  value={bookForm.consultationType}
                  onChange={(e) =>
                    setBookForm((f) => ({ ...f, consultationType: e.target.value, time: '' }))
                  }
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 font-bold text-[#182C61]"
                >
                  <option value="ONLINE">Online</option>
                  <option value="IN_PERSON">In person</option>
                </select>
              </div>
              {bookForm.date && !loadingSlots && slotOptions.length === 0 ? (
                <p className="text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  No active availability for this doctor on the selected date.
                </p>
              ) : null}
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
                disabled={booking || !bookForm.date || !bookForm.time || loadingSlots}
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
