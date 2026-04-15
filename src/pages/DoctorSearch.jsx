import { useEffect, useMemo, useState } from 'react';
import {
  MagnifyingGlassIcon,
  AdjustmentsHorizontalIcon,
  StarIcon,
  ExclamationTriangleIcon,
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
  const [bookingDoctor, setBookingDoctor] = useState(null);
  const [booking, setBooking] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [doctorAvailability, setDoctorAvailability] = useState([]);
  const [availabilityFallback, setAvailabilityFallback] = useState(false);
  const [doctorBookedAppointments, setDoctorBookedAppointments] = useState([]);
  const [patientBookedAppointments, setPatientBookedAppointments] = useState([]);
  const [bookMessage, setBookMessage] = useState(null);
  const [bookForm, setBookForm] = useState({
    date: '',
    time: '',
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
            />
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={() => loadDoctors(selectedSpecialty)}
            className="p-3 bg-slate-100 border border-slate-200 rounded-xl text-[#182C61] hover:border-[#182C61]/40 transition-all relative"
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
          <div key={doctor.id} className="bg-white border border-slate-300/70 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all duration-300">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <img
                    src={doctor.profileImageUrl || doctor.image || fallbackImage}
                    alt={doctor.name || doctor.fullName || 'Doctor'}
                    className="w-16 h-16 rounded-2xl object-cover"
                  />
                  <span className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-white bg-emerald-500" />
                </div>
                <div className="flex items-center gap-1 text-[#c79a2b]">
                  <StarIcon className="h-4 w-4 fill-current" />
                  <span className="text-lg font-black leading-none">{doctor.rating || '4.8'}</span>
                  <span className="text-sm font-bold text-slate-600">/ 5</span>
                </div>
              </div>
              <span className="text-sm font-semibold text-slate-500 flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${doctor.enabled !== false ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                {doctor.enabled !== false ? 'online' : 'offline'}
              </span>
            </div>

            <div>
              <h3 className="text-2xl md:text-[26px] leading-tight font-black text-[#111827]">
                Dr. {doctor.name || doctor.fullName || doctor.username || 'Doctor'}
              </h3>
              <p className="text-sm text-slate-600 mt-1 leading-5">
                {doctor.specialization || doctor.specialty || 'General specialist'}
                {(doctor.hospitalName || doctor.hospital) ? `, ${doctor.hospitalName || doctor.hospital}` : ''}
              </p>
            </div>

            <div className="mt-5 pt-4 border-t border-slate-200 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-slate-700">Consultation Fee:</p>
                <p className="text-2xl leading-none font-black text-emerald-600 mt-1">
                  LKR {doctor.consultationFee || doctor.fee || 'N/A'}
                </p>
                <p className="text-sm font-black text-slate-800 mt-4">VIEW PROFILE</p>
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
            <div className="mb-6 rounded-2xl bg-gradient-to-r from-[#182C61]/8 to-[#eb2f06]/8 border border-[#182C61]/10 p-4">
              <h2 className="text-2xl font-black text-[#182C61] mb-1">Book appointment</h2>
              <p className="text-sm text-[#808e9b] font-bold">
                Secure your slot with real-time availability checks.
              </p>
            </div>
            <p className="text-sm text-[#808e9b] font-bold mb-6">
              {bookingDoctor.name || bookingDoctor.fullName || bookingDoctor.username} —{' '}
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
                disabled={booking || !bookForm.date || !bookForm.time || loadingSlots}
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
