import { useEffect, useMemo, useState } from 'react';
import { API } from '../config/api';
import { UserGroupIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

const readAuthUser = () => {
  try {
    const raw = localStorage.getItem('auth_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export default function DoctorPatients() {
  const user = useMemo(() => readAuthUser(), []);
  const doctorId = useMemo(() => user?.id || user?.userId || user?.username || '', [user]);

  const [loading, setLoading] = useState(true);
  const [warning, setWarning] = useState('');
  const [patients, setPatients] = useState([]);

  const loadPatients = async () => {
    setLoading(true);
    setWarning('');
    try {
      const [allPatients, sessions] = await Promise.all([
        API.patients.getAll(),
        doctorId ? API.telemedSessions.listForDoctor(doctorId) : Promise.resolve([]),
      ]);

      const patientMap = new Map((Array.isArray(allPatients) ? allPatients : []).map((p) => [String(p?.id || p?.userId), p]));
      const ids = new Set((Array.isArray(sessions) ? sessions : []).map((s) => String(s?.patientId || '')).filter(Boolean));
      const assigned = Array.from(ids).map((id) => patientMap.get(id)).filter(Boolean);

      setPatients(assigned);
    } catch (e) {
      setWarning(e?.message || 'Unable to load patients');
      setPatients([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPatients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doctorId]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-[#182C61]">My Patients</h1>
          <p className="text-[#808e9b] mt-1 font-bold">Patients linked through your consultations</p>
        </div>
        <button
          type="button"
          onClick={loadPatients}
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
          <p className="text-sm font-bold text-[#808e9b]">Loading patients...</p>
        ) : patients.length === 0 ? (
          <p className="text-sm font-bold text-[#808e9b]">No linked patients found.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {patients.map((p) => (
              <div key={p.id || p.userId} className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-2">
                  <UserGroupIcon className="h-5 w-5 text-[#182C61]" />
                  <p className="text-sm font-black text-[#182C61]">{p.name || p.username || 'Patient'}</p>
                </div>
                <p className="text-xs font-bold text-[#808e9b] mt-2">{p.email || 'No email available'}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
