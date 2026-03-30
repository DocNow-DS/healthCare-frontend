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

export default function PatientAppointments() {
  const user = useMemo(() => readAuthUser(), []);
  const patientId = useMemo(() => user?.id || user?.userId || user?.username || '', [user]);

  const [loading, setLoading] = useState(true);
  const [warning, setWarning] = useState('');
  const [appointments, setAppointments] = useState([]);

  const loadAppointments = async () => {
    if (!patientId) return;
    setLoading(true);
    setWarning('');
    try {
      const list = await API.telemedSessions.listForPatient(patientId);
      const normalized = Array.isArray(list) ? list : [];
      normalized.sort((a, b) => {
        const aTime = new Date(a?.startedAt || a?.createdAt || 0).getTime();
        const bTime = new Date(b?.startedAt || b?.createdAt || 0).getTime();
        return bTime - aTime;
      });
      setAppointments(normalized);
    } catch (e) {
      setWarning(e?.message || 'Unable to load appointments');
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAppointments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="max-w-sm">
          <h1 className="text-3xl font-black text-[#182C61]">Appointments</h1>
          <p className="text-[#808e9b] mt-1 font-bold">Your backend telemedicine session history</p>
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
        ) : appointments.length === 0 ? (
          <p className="text-sm font-bold text-[#808e9b]">No appointments found.</p>
        ) : (
          <div className="space-y-3">
            {appointments.map((a) => (
              <div key={a.id} className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                <div>
                  <p className="text-sm font-black text-[#182C61]">Doctor ID: {a.doctorId || 'N/A'}</p>
                  <p className="text-xs font-bold text-[#808e9b] mt-1">
                    {new Date(a.startedAt || a.createdAt || Date.now()).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[#182C61]">
                  <CalendarDaysIcon className="h-4 w-4" />
                  {a.status || 'IN_SESSION'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
