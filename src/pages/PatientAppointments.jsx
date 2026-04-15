import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { API } from '../config/api';
import {
  CalendarDaysIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';

const formatWhen = (iso) => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return String(iso);
  }
};

const formatWhenShort = (iso) => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString(undefined, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return String(iso);
  }
};

const getDoctorInitials = (name) => {
  const cleaned = String(name || '').trim();
  if (!cleaned) return 'DR';
  const parts = cleaned.split(/[\s_.-]+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
};

const getStatusMeta = (status) => {
  const normalized = String(status || '').toUpperCase();
  if (normalized === 'ACCEPTED') {
    return {
      label: 'Accepted',
      badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      dot: 'bg-emerald-500',
    };
  }
  if (normalized === 'DECLINED') {
    return {
      label: 'Declined',
      badge: 'bg-rose-50 text-rose-700 border-rose-200',
      dot: 'bg-rose-500',
    };
  }
  if (normalized === 'CANCELLED') {
    return {
      label: 'Cancelled',
      badge: 'bg-slate-100 text-slate-700 border-slate-200',
      dot: 'bg-slate-500',
    };
  }
  if (normalized === 'COMPLETED') {
    return {
      label: 'Completed',
      badge: 'bg-sky-50 text-sky-700 border-sky-200',
      dot: 'bg-sky-500',
    };
  }
  if (normalized === 'PENDING') {
    return {
      label: 'Pending',
      badge: 'bg-amber-50 text-amber-700 border-amber-200',
      dot: 'bg-amber-500',
    };
  }
  return {
    label: normalized || 'Unknown',
    badge: 'bg-slate-100 text-slate-700 border-slate-200',
    dot: 'bg-slate-500',
  };
};

const resolveDoctorDisplayName = (doctor) => {
  if (!doctor) return '';
  return String(
    doctor?.username ||
      doctor?.name ||
      doctor?.fullName ||
      doctor?.doctorName ||
      doctor?.email ||
      '',
  ).trim();
};

function AnimatedProgressBar({ targetPercent, status }) {
  const target = Number.isFinite(targetPercent) ? Math.max(0, Math.min(100, targetPercent)) : 0;
  const [percent, setPercent] = useState(target);
  const rafRef = useRef(null);

  // When target changes, animate smoothly from current percent to target percent.
  useEffect(() => {
    const from = percent;
    const to = target;
    if (from === to) return;

    const start = performance.now();
    const durationMs = 700;

    const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

    const tick = (now) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = easeOutCubic(t);
      const next = Math.round(from + (to - from) * eased);
      setPercent(next);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  const normalizedStatus = String(status || '').toUpperCase();
  const isLive = !['COMPLETED', 'CANCELLED', 'DECLINED'].includes(normalizedStatus);
  const isDone = normalizedStatus === 'COMPLETED' || percent >= 100;
  const isStopped = normalizedStatus === 'CANCELLED' || normalizedStatus === 'DECLINED';

  const progressTone = isStopped
    ? 'from-rose-500 to-orange-500'
    : isDone
      ? 'from-emerald-500 to-teal-500'
      : 'from-sky-500 via-indigo-500 to-[#182C61]';

  const statusText = isStopped ? normalizedStatus.toLowerCase() : isDone ? 'completed' : 'in progress';
  const statusBadgeTone = isStopped
    ? 'bg-rose-500/20 text-rose-100 ring-rose-300/40'
    : isDone
      ? 'bg-emerald-500/20 text-emerald-100 ring-emerald-300/40'
      : 'bg-sky-500/20 text-sky-100 ring-sky-300/40';

  return (
    <div className="w-full rounded-2xl bg-white/5 border border-white/10 p-3 md:p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/60">Treatment progress</p>
          <p className="text-xs text-white/70 mt-1">Live appointment lifecycle status</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-[10px] font-black uppercase tracking-widest rounded-full px-2.5 py-1 ring-1 ${statusBadgeTone}`}>
            {statusText}
          </span>
          <span className="text-sm font-black text-white">{percent}%</span>
        </div>
      </div>

      <div className="h-3 rounded-full bg-white/15 overflow-hidden relative">
        <div
          className={`absolute inset-y-0 left-0 rounded-full bg-gradient-to-r ${progressTone} transition-[width] duration-500 ease-out`}
          style={{ width: `${percent}%` }}
        />
        <div
          className={`absolute inset-y-0 left-0 rounded-full bg-white/20 ${isLive ? 'animate-pulse' : ''}`}
          style={{ width: `${percent}%`, opacity: isLive ? 1 : 0 }}
        />
      </div>

      <div className="grid grid-cols-3 gap-2 text-[10px] uppercase tracking-wider font-bold">
        <div className={`rounded-lg px-2 py-1 text-center ${percent >= 1 ? 'bg-white/10 text-white/90' : 'bg-white/5 text-white/50'}`}>
          Scheduled
        </div>
        <div className={`rounded-lg px-2 py-1 text-center ${percent >= 50 ? 'bg-white/10 text-white/90' : 'bg-white/5 text-white/50'}`}>
          Confirmed
        </div>
        <div className={`rounded-lg px-2 py-1 text-center ${isDone ? 'bg-emerald-500/20 text-emerald-100' : 'bg-white/5 text-white/50'}`}>
          Completed
        </div>
      </div>
    </div>
  );
}

export default function PatientAppointments() {
  const [loading, setLoading] = useState(true);
  const [warning, setWarning] = useState('');
  const [appointments, setAppointments] = useState([]);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [expandedId, setExpandedId] = useState(null);
  const [userPickedId, setUserPickedId] = useState(null);
  const userPickedIdRef = useRef(userPickedId);
  const expandedIdRef = useRef(expandedId);
  const doctorNameCacheRef = useRef(new Map());
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    userPickedIdRef.current = userPickedId;
  }, [userPickedId]);

  useEffect(() => {
    expandedIdRef.current = expandedId;
  }, [expandedId]);

  const loadAppointments = useCallback(async () => {
    setLoading(true);
    setWarning('');
    try {
      const list = await API.patientAppointments.list();
      const normalized = Array.isArray(list) ? list : [];
      const doctorIds = [...new Set(
        normalized
          .map((a) => String(a?.doctorId || '').trim())
          .filter(Boolean),
      )];

      const missingDoctorIds = doctorIds.filter((id) => !doctorNameCacheRef.current.has(id));
      if (missingDoctorIds.length > 0) {
        const doctorResults = await Promise.allSettled(
          missingDoctorIds.map((doctorId) => API.doctors.getById(doctorId)),
        );
        doctorResults.forEach((result, index) => {
          const doctorId = missingDoctorIds[index];
          if (result.status === 'fulfilled') {
            const resolvedName = resolveDoctorDisplayName(result.value);
            doctorNameCacheRef.current.set(doctorId, resolvedName || doctorId);
          } else {
            doctorNameCacheRef.current.set(doctorId, doctorId);
          }
        });
      }

      const normalizedWithDoctorName = normalized.map((a) => {
        const doctorId = String(a?.doctorId || '').trim();
        const resolvedName =
          resolveDoctorDisplayName(a) ||
          (doctorId ? doctorNameCacheRef.current.get(doctorId) : '') ||
          '';
        return {
          ...a,
          doctorName: resolvedName || 'Doctor',
        };
      });
      normalizedWithDoctorName.sort((a, b) => {
        const aTime = new Date(a?.startTime || a?.createdAt || 0).getTime();
        const bTime = new Date(b?.startTime || b?.createdAt || 0).getTime();
        return bTime - aTime;
      });
      setAppointments(normalizedWithDoctorName);

      // If the user has not manually picked an appointment yet, auto-select the
      // nearest upcoming one (or latest if there is no future appointment).
      if (!userPickedIdRef.current && normalizedWithDoctorName.length > 0) {
        const now = Date.now();
        const withTimes = normalizedWithDoctorName
          .map((a) => ({
            raw: a,
            time: new Date(a?.startTime || a?.createdAt || 0).getTime(),
          }))
          .filter((x) => Number.isFinite(x.time));

        let candidate = null;
        if (withTimes.length > 0) {
          const upcoming = withTimes.filter((x) => x.time >= now);
          if (upcoming.length > 0) {
            upcoming.sort((a, b) => a.time - b.time);
            candidate = upcoming[0].raw;
          } else {
            withTimes.sort((a, b) => b.time - a.time);
            candidate = withTimes[0].raw;
          }
        } else {
          candidate = normalizedWithDoctorName[0];
        }

        if (candidate && candidate.id !== expandedIdRef.current) {
          setExpandedId(candidate.id);
        }
      }
    } catch (e) {
      setWarning(e?.message || 'Unable to load appointments from the appointment service');
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  const filteredAppointments = useMemo(() => {
    if (statusFilter === 'ALL') return appointments;
    return appointments.filter((a) => String(a?.status || '').toUpperCase() === statusFilter);
  }, [appointments, statusFilter]);
  const expandedAppointment = useMemo(
    () => filteredAppointments.find((a) => a.id === expandedId) || null,
    [filteredAppointments, expandedId],
  );

  const isCancelableStatus = (status) => {
    const s = String(status || '').toUpperCase();
    return !['COMPLETED', 'CANCELLED', 'DECLINED'].includes(s);
  };

  const handleCancelAppointment = async (appointment) => {
    const appointmentId = appointment?.id;
    if (!appointmentId) return;
    if (!isCancelableStatus(appointment?.status)) return;

    const ok = window.confirm('Cancel this appointment?');
    if (!ok) return;

    setActionLoading(true);
    setActionError('');
    try {
      await API.patientAppointments.cancel(appointmentId);
      await loadAppointments();
    } catch (e) {
      setActionError(e?.message || 'Unable to cancel appointment.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteAppointment = async (appointment) => {
    const appointmentId = appointment?.id;
    if (!appointmentId) return;

    const ok = window.confirm('Delete this appointment permanently?');
    if (!ok) return;

    setActionLoading(true);
    setActionError('');
    try {
      await API.patientAppointments.delete(appointmentId);
      // Clear selection so the "nearest appointment" auto-pick can re-run.
      setUserPickedId(null);
      setExpandedId(null);
      userPickedIdRef.current = null;
      expandedIdRef.current = null;
      await loadAppointments();
    } catch (e) {
      setActionError(e?.message || 'Unable to delete appointment.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="max-w-lg">
          <h1 className="text-3xl font-black text-[#182C61]">My appointments</h1>
        </div>
        <button
          type="button"
          onClick={loadAppointments}
          className="px-4 py-2 bg-[#182C61] text-white rounded-xl font-black text-sm hover:bg-[#182C61]/85"
        >
          Refresh
        </button>
      </div>

      {expandedAppointment && (
        <div className="bg-[#182C61] rounded-3xl border-2 border-[#182C61]/10 shadow-2xl p-6 md:p-8 text-white space-y-4">
          <div className="space-y-1">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-white/60">Selected appointment</p>
            <h2 className="text-xl font-black tracking-tight">Progress overview</h2>
          </div>

          <div className="pt-2">
            <AnimatedProgressBar
              targetPercent={
                typeof expandedAppointment.progressPercent === 'number'
                  ? expandedAppointment.progressPercent
                  : 0
              }
              status={expandedAppointment.status}
            />
          </div>
        </div>
      )}

      {warning ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
          <ExclamationTriangleIcon className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
          <span className="text-sm font-semibold text-amber-800">{warning}</span>
        </div>
      ) : null}

      <div className="bg-white border-2 border-slate-50 rounded-2xl p-5">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {[
            { key: 'ALL', label: 'All' },
            { key: 'PENDING', label: 'Pending' },
            { key: 'ACCEPTED', label: 'Accepted' },
            { key: 'DECLINED', label: 'Declined' },
          ].map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setStatusFilter(item.key)}
              className={`px-3 py-1.5 rounded-full border text-xs font-black uppercase tracking-wider transition-colors ${
                statusFilter === item.key
                  ? 'bg-[#182C61] border-[#182C61] text-white'
                  : 'bg-white border-slate-200 text-[#182C61] hover:bg-slate-50'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-sm font-bold text-[#808e9b]">Loading appointments...</p>
        ) : filteredAppointments.length === 0 ? (
          <p className="text-sm font-bold text-[#808e9b]">No appointments yet. Book a specialist from the dashboard.</p>
        ) : (
          <div className="space-y-3">
            {filteredAppointments.map((a) => (
              <div
                key={a.id}
                role="button"
                tabIndex={0}
                onClick={() => {
                  setUserPickedId(a.id);
                  setExpandedId(a.id);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    setUserPickedId(a.id);
                    setExpandedId(a.id);
                  }
                }}
                className={`rounded-2xl border transition-all cursor-pointer ${
                  expandedId === a.id
                    ? 'border-[#182C61]/25 bg-white shadow-sm'
                    : 'border-slate-200/80 bg-white hover:border-[#182C61]/20 hover:shadow-sm'
                }`}
              >
                <div className="p-4 md:p-5 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-[#182C61]/10 text-[#182C61] flex items-center justify-center text-xs font-black tracking-wide shrink-0">
                      {getDoctorInitials(a.doctorName)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-base font-black text-[#182C61] truncate">
                        {a.doctorName || a.doctorFullName || a.doctor || 'Doctor'}
                      </p>
                      <p className="text-xs font-semibold text-[#808e9b] truncate">
                        {formatWhenShort(a.startTime)}
                      </p>
                    </div>
                  </div>

                  <div className={`shrink-0 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold ${getStatusMeta(a.status).badge}`}>
                    <span className={`h-2 w-2 rounded-full ${getStatusMeta(a.status).dot}`} />
                    {getStatusMeta(a.status).label}
                  </div>
                </div>

                {expandedId === a.id ? (
                  <div className="border-t border-slate-100 px-4 md:px-5 pb-4 md:pb-5 pt-4">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                      <div className="lg:col-span-2 rounded-xl border border-slate-100 bg-slate-50/60 p-4 space-y-2">
                        <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#808e9b]">
                          Appointment details
                        </p>
                        <p className="text-sm font-black text-[#182C61]">
                          {a.consultationType || 'Consultation'}
                        </p>
                        <p className="text-xs font-semibold text-[#4b5563]">
                          Start: {formatWhen(a.startTime)}
                        </p>
                        <p className="text-xs font-semibold text-[#4b5563]">
                          End: {a.endTime ? formatWhen(a.endTime) : '—'}
                        </p>
                        <p className="text-xs text-[#6b7280]">
                          {a.notes && String(a.notes).trim() ? a.notes : 'No notes.'}
                        </p>
                      </div>

                      <div className="rounded-xl border border-slate-100 bg-white p-4 space-y-3">
                        <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#808e9b]">
                          Actions
                        </p>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCancelAppointment(a);
                          }}
                          disabled={actionLoading || !isCancelableStatus(a.status)}
                          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 disabled:opacity-50 disabled:hover:bg-emerald-50 transition-colors"
                          title="Cancel appointment"
                        >
                          <XCircleIcon className="h-4 w-4" />
                          <span className="text-xs font-black uppercase tracking-wide">Cancel</span>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteAppointment(a);
                          }}
                          disabled={actionLoading}
                          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 disabled:opacity-50 disabled:hover:bg-rose-50 transition-colors"
                          title="Delete appointment"
                        >
                          <TrashIcon className="h-4 w-4" />
                          <span className="text-xs font-black uppercase tracking-wide">Delete</span>
                        </button>
                      </div>
                    </div>

                    {actionError ? (
                      <div className="mt-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl p-3 text-sm font-semibold">
                        {actionError}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
