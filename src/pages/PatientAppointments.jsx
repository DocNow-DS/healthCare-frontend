import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { API } from '../config/api';
import { CalendarDaysIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

const formatWhen = (iso) => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return String(iso);
  }
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

  const isLive = status !== 'COMPLETED' && status !== 'CANCELLED' && status !== 'DECLINED';

  const barColor =
    percent === 100
      ? 'bg-emerald-500'
      : percent >= 70
        ? 'bg-[#182C61]'
        : percent >= 45
          ? 'bg-[#eb2f06]'
          : 'bg-[#eb2f06]';

  return (
    <div className="w-full">
      <div className="h-3.5 rounded-full bg-slate-100 overflow-hidden relative">
        <div
          className={`h-full rounded-full transition-[width] duration-500 ease-out ${barColor} ${
            isLive ? 'animate-pulse' : ''
          }`}
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className="mt-2 text-[11px] font-black uppercase tracking-widest text-[#808e9b] flex items-center justify-between">
        <span>Progress</span>
        <span>
          {percent}% {isLive ? '· updating' : ''}
        </span>
      </div>
    </div>
  );
}

export default function PatientAppointments() {
  const [loading, setLoading] = useState(true);
  const [warning, setWarning] = useState('');
  const [appointments, setAppointments] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [userPickedId, setUserPickedId] = useState(null);

  const loadAppointments = useCallback(async () => {
    setLoading(true);
    setWarning('');
    try {
      const list = await API.patientAppointments.list();
      const normalized = Array.isArray(list) ? list : [];
      normalized.sort((a, b) => {
        const aTime = new Date(a?.startTime || a?.createdAt || 0).getTime();
        const bTime = new Date(b?.startTime || b?.createdAt || 0).getTime();
        return bTime - aTime;
      });
      setAppointments(normalized);

      // If the user has not manually picked an appointment yet, auto-select the
      // nearest upcoming one (or latest if there is no future appointment).
      if (!userPickedId && normalized.length > 0) {
        const now = Date.now();
        const withTimes = normalized
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
          candidate = normalized[0];
        }

        if (candidate && candidate.id !== expandedId) {
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

  const expandedAppointment = useMemo(
    () => appointments.find((a) => a.id === expandedId) || null,
    [appointments, expandedId],
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="max-w-lg">
          <h1 className="text-3xl font-black text-[#182C61]">My appointments</h1>
          <p className="text-[#808e9b] mt-1 font-bold">
            Booked visits from the appointment service for your signed-in account (JWT).
          </p>
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
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="space-y-1">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-white/60">Selected appointment</p>
              <h2 className="text-2xl font-black tracking-tight">
                {expandedAppointment.consultationType || 'Consultation'} ·{' '}
                {formatWhen(expandedAppointment.startTime)}
              </h2>
              <p className="text-xs font-mono text-white/70">
                Doctor ID: {expandedAppointment.doctorId || '—'} · ID: {expandedAppointment.id}
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-white/80">
              <CalendarDaysIcon className="h-4 w-4" />
              {expandedAppointment.status || '—'}
            </div>
          </div>

          {expandedAppointment.notes ? (
            <p className="text-sm text-white/80 border-l-2 border-white/20 pl-3">
              {expandedAppointment.notes}
            </p>
          ) : null}

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
        {loading ? (
          <p className="text-sm font-bold text-[#808e9b]">Loading appointments...</p>
        ) : appointments.length === 0 ? (
          <p className="text-sm font-bold text-[#808e9b]">No appointments yet. Book a specialist from the dashboard.</p>
        ) : (
          <div className="space-y-3">
            {appointments.map((a) => (
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
                className={`p-4 rounded-xl bg-slate-50 border border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 cursor-pointer transition-colors ${
                  expandedId === a.id ? 'border-[#182C61]/30 bg-white' : ''
                }`}
              >
                <div className="min-w-0">
                  <p className="text-sm font-black text-[#182C61]">
                    Doctor ID: <span className="font-mono text-xs">{a.doctorId || '—'}</span>
                  </p>
                  <p className="text-xs font-bold text-[#808e9b] mt-1">
                    {a.consultationType ? `${a.consultationType} · ` : ''}
                    {formatWhen(a.startTime)}
                    {a.endTime ? ` – ${formatWhen(a.endTime)}` : ''}
                  </p>
                  {a.notes ? (
                    <p className="text-xs text-[#808e9b] mt-1 line-clamp-2">{a.notes}</p>
                  ) : null}
                  {a.progressLabel != null && a.progressLabel !== '' ? (
                    <p className="text-[10px] font-black uppercase tracking-wider text-[#eb2f06] mt-2">
                      {a.progressLabel}
                      {typeof a.progressPercent === 'number' ? ` (${a.progressPercent}%)` : ''}
                    </p>
                  ) : null}
                </div>
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[#182C61] shrink-0">
                  <CalendarDaysIcon className="h-4 w-4" />
                  {a.status || '—'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
