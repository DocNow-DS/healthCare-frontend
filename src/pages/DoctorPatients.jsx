import { useEffect, useMemo, useState } from 'react';
import { API } from '../config/api';
import {
  ExclamationTriangleIcon,
  PlusIcon,
  TrashIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';

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

      const patientMap = new Map();
      (Array.isArray(allPatients) ? allPatients : []).forEach((patient) => {
        [patient?.id, patient?.userId, patient?.username, patient?.email]
          .map((value) => String(value || '').trim())
          .filter(Boolean)
          .forEach((key) => patientMap.set(key, patient));
      });

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
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-3 font-black text-[#182C61] uppercase tracking-wider text-xs">Patient Name</th>
                  <th className="text-left py-3 px-3 font-black text-[#182C61] uppercase tracking-wider text-xs">Gender</th>
                  <th className="text-left py-3 px-3 font-black text-[#182C61] uppercase tracking-wider text-xs">Age</th>
                  <th className="text-left py-3 px-3 font-black text-[#182C61] uppercase tracking-wider text-xs">Actions</th>
                </tr>
              </thead>
              <tbody>
                {patients.map((patient, index) => (
                  <tr key={patient.id || patient.userId || `${patient.username || 'patient'}-${index}`} className="border-b border-slate-100 hover:bg-slate-50/60">
                    <td className="py-3 px-3 font-bold text-[#1e272e]">{patient.name || patient.username || 'N/A'}</td>
                    <td className="py-3 px-3 font-semibold text-[#485460]">{patient.gender || 'N/A'}</td>
                    <td className="py-3 px-3 font-semibold text-[#485460]">{patient.age || 'N/A'}</td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          title="Add"
                          aria-label="Add"
                          className="p-2 rounded-lg border border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                        >
                          <PlusIcon className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          title="Delete"
                          aria-label="Delete"
                          className="p-2 rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          title="Digital Prescription"
                          aria-label="Digital Prescription"
                          className="p-2 rounded-lg border border-[#182C61]/30 text-[#182C61] hover:bg-[#182C61]/5"
                        >
                          <DocumentTextIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
