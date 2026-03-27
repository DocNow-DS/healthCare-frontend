import { useEffect, useMemo, useState } from 'react';
import { API } from '../config/api';
import { CalendarDaysIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

const readAuthUser = () => {
  try {
    const raw = localStorage.getItem('auth_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export default function DoctorAppointments() {
  const user = useMemo(() => readAuthUser(), []);
  const doctorId = useMemo(() => user?.id || user?.userId || user?.username || '', [user]);

  const [loading, setLoading] = useState(true);
  const [warning, setWarning] = useState('');
  const [sessions, setSessions] = useState([]);

  const loadAppointments = async () => {
    if (!doctorId) return;
    setLoading(true);
    setWarning('');
    try {
      const list = await API.telemedSessions.listForDoctor(doctorId);
      const normalized = Array.isArray(list) ? list : [];
      normalized.sort((a, b) => {
        const aTime = new Date(a?.startedAt || a?.createdAt || 0).getTime();
        const bTime = new Date(b?.startedAt || b?.createdAt || 0).getTime();
        return bTime - aTime;
      });
      setSessions(normalized);
    } catch (e) {
      setWarning(e?.message || 'Unable to load doctor appointments');
      setSessions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAppointments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doctorId]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-[#182C61]">Appointments</h1>
          <p className="text-[#808e9b] mt-1 font-bold">Live telemedicine schedule from backend</p>
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
          <ExclamationTriangleIcon className="h-5 w-5 text-amber-600 mt-0.5" />
          <span className="text-sm font-semibold text-amber-800">{warning}</span>
        </div>
      ) : null}

      <div className="bg-white border-2 border-slate-50 rounded-2xl p-5">
        {loading ? (
          <p className="text-sm font-bold text-[#808e9b]">Loading appointments...</p>
        ) : sessions.length === 0 ? (
          <p className="text-sm font-bold text-[#808e9b]">No appointments found.</p>
        ) : (
          <div className="space-y-3">
            {sessions.map((s) => (
              <div key={s.id} className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                <div>
                  <p className="text-sm font-black text-[#182C61]">Patient ID: {s.patientId || 'N/A'}</p>
                  <p className="text-xs font-bold text-[#808e9b] mt-1">
                    {new Date(s.startedAt || s.createdAt || Date.now()).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[#182C61]">
                  <CalendarDaysIcon className="h-4 w-4" />
                  {s.status || 'IN_SESSION'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
