import { useCallback, useEffect, useState } from 'react';
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

export default function PatientAppointments() {
  const [loading, setLoading] = useState(true);
  const [warning, setWarning] = useState('');
  const [appointments, setAppointments] = useState([]);

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
                className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
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
