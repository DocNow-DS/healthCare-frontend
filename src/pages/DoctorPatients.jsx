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
  const [detailLoading, setDetailLoading] = useState(false);
  const [warning, setWarning] = useState('');
  const [patients, setPatients] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [selectedReports, setSelectedReports] = useState([]);
  const [selectedPrescriptions, setSelectedPrescriptions] = useState([]);

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
      if (!selectedPatientId && assigned.length > 0) {
        setSelectedPatientId(String(assigned[0]?.id || assigned[0]?.userId || ''));
      }
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

  useEffect(() => {
    const loadSelectedPatient = async () => {
      if (!selectedPatientId) {
        setSelectedPatient(null);
        setSelectedReports([]);
        setSelectedPrescriptions([]);
        return;
      }

      setDetailLoading(true);
      try {
        const [profile, reports, prescriptions] = await Promise.all([
          API.patients.getById(selectedPatientId),
          API.patients.getReportsByPatientId(selectedPatientId),
          API.patients.getPrescriptionsByPatientId(selectedPatientId),
        ]);
        setSelectedPatient(profile || null);
        setSelectedReports(Array.isArray(reports) ? reports : []);
        setSelectedPrescriptions(Array.isArray(prescriptions) ? prescriptions : []);
      } catch (e) {
        setWarning(e?.message || 'Unable to load selected patient details');
        setSelectedPatient(null);
        setSelectedReports([]);
        setSelectedPrescriptions([]);
      } finally {
        setDetailLoading(false);
      }
    };

    loadSelectedPatient();
  }, [selectedPatientId]);

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
              <button
                type="button"
                key={p.id || p.userId}
                onClick={() => setSelectedPatientId(String(p.id || p.userId || ''))}
                className={`text-left p-4 rounded-xl border transition-colors ${
                  String(p.id || p.userId || '') === selectedPatientId
                    ? 'bg-white border-[#182C61]/40'
                    : 'bg-slate-50 border-slate-100 hover:border-[#182C61]/20'
                }`}
              >
                <div className="flex items-center gap-2">
                  <UserGroupIcon className="h-5 w-5 text-[#182C61]" />
                  <p className="text-sm font-black text-[#182C61]">{p.name || p.username || 'Patient'}</p>
                </div>
                <p className="text-xs font-bold text-[#808e9b] mt-2">{p.email || 'No email available'}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white border-2 border-slate-50 rounded-2xl p-5 space-y-4">
        <h2 className="text-xl font-black text-[#182C61]">Patient Details</h2>
        {detailLoading ? (
          <p className="text-sm font-bold text-[#808e9b]">Loading patient details...</p>
        ) : !selectedPatient ? (
          <p className="text-sm font-bold text-[#808e9b]">Select a patient to view full details and reports.</p>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Detail label="Name" value={selectedPatient.name || selectedPatient.username || 'N/A'} />
              <Detail label="Email" value={selectedPatient.email || 'N/A'} />
              <Detail label="Phone" value={selectedPatient.phone || 'N/A'} />
              <Detail label="Age" value={selectedPatient.age || 'N/A'} />
              <Detail label="Gender" value={selectedPatient.gender || 'N/A'} />
              <Detail label="Patient ID" value={selectedPatient.id || selectedPatient.userId || 'N/A'} />
              <Detail label="Address" value={selectedPatient.address || 'N/A'} />
              <Detail label="Medical History" value={selectedPatient.medicalHistory || 'N/A'} />
            </div>

            <div className="pt-2">
              <h3 className="text-sm font-black text-[#182C61] uppercase tracking-wider mb-2">
                Reports ({selectedReports.length})
              </h3>
              {selectedReports.length === 0 ? (
                <p className="text-sm font-bold text-[#808e9b]">No reports available for this patient.</p>
              ) : (
                <div className="space-y-2">
                  {selectedReports.map((r, idx) => (
                    <div key={r.id || idx} className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                      <p className="text-sm font-black text-[#182C61]">{r.fileName || 'Medical Report'}</p>
                      <p className="text-xs font-bold text-[#808e9b] mt-1">{r.description || 'No description'}</p>
                      {(r.filePath || r.fileUrl || r.downloadUrl)?.startsWith?.('http') ? (
                        <a
                          href={r.filePath || r.fileUrl || r.downloadUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-block mt-2 text-xs font-black text-[#182C61] hover:underline"
                        >
                          Open report
                        </a>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-2">
              <h3 className="text-sm font-black text-[#182C61] uppercase tracking-wider mb-2">
                Prescriptions ({selectedPrescriptions.length})
              </h3>
              {selectedPrescriptions.length === 0 ? (
                <p className="text-sm font-bold text-[#808e9b]">No prescriptions available for this patient.</p>
              ) : (
                <div className="space-y-2">
                  {selectedPrescriptions.map((p, idx) => (
                    <div key={p.id || p.prescriptionId || idx} className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                      <p className="text-sm font-black text-[#182C61]">{p.title || p.fileName || 'Prescription'}</p>
                      <p className="text-xs font-bold text-[#808e9b] mt-1">{p.description || p.notes || 'No details'}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Detail({ label, value }) {
  return (
    <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
      <p className="text-[10px] font-black uppercase tracking-widest text-[#808e9b]">{label}</p>
      <p className="text-sm font-bold text-[#182C61] mt-1 break-words">{value}</p>
    </div>
  );
}
