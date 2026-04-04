import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();
  const user = useMemo(() => readAuthUser(), []);
  const doctorId = useMemo(() => user?.id || user?.userId || user?.username || '', [user]);

  const [loading, setLoading] = useState(true);
  const [warning, setWarning] = useState('');
  const [appointments, setAppointments] = useState([]);
  const [sessionLinksByAppointment, setSessionLinksByAppointment] = useState({});
  const [generatingByAppointment, setGeneratingByAppointment] = useState({});
  const [actingByAppointment, setActingByAppointment] = useState({});
  const [actionMessage, setActionMessage] = useState('');

  const loadAppointments = async () => {
    if (!doctorId) return;
    setLoading(true);
    setWarning('');
    try {
      const list = await API.doctorAppointments.list(doctorId);
      const normalized = Array.isArray(list) ? list : [];
      normalized.sort((a, b) => {
        const aTime = new Date(a?.startTime || a?.createdAt || 0).getTime();
        const bTime = new Date(b?.startTime || b?.createdAt || 0).getTime();
        return bTime - aTime;
      });
      setAppointments(normalized);
    } catch (e) {
      setWarning(e?.message || 'Unable to load doctor appointments');
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAppointments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doctorId]);

  const handleGenerateSessionLink = async (appointment) => {
    if (!appointment?.id) {
      setActionMessage('Missing appointment id.');
      return;
    }
    if (!doctorId) {
      setActionMessage('Missing doctor id. Please login again.');
      return;
    }

    const appointmentId = String(appointment.id);
    setActionMessage('');
    setGeneratingByAppointment((prev) => ({ ...prev, [appointmentId]: true }));

    try {
      const created = await API.telemedSessions.createOrGetByAppointment(appointmentId, {
        doctorId,
        patientId: appointment.patientId,
      });
      const link = created?.sessionUrl || created?.jitsiUrl || '';
      if (!link) {
        throw new Error('Session created but no link returned');
      }
      setSessionLinksByAppointment((prev) => ({ ...prev, [appointmentId]: link }));
      setActionMessage(`Session link generated for appointment ${appointmentId}.`);
    } catch (e) {
      setActionMessage(e?.message || 'Failed to generate session link');
    } finally {
      setGeneratingByAppointment((prev) => ({ ...prev, [appointmentId]: false }));
    }
  };

  const handleDoctorAction = async (appointment, action) => {
    const appointmentId = String(appointment?.id || '');
    if (!appointmentId || !doctorId) {
      setActionMessage('Missing appointment or doctor id.');
      return;
    }

    setActionMessage('');
    setActingByAppointment((prev) => ({ ...prev, [appointmentId]: true }));
    try {
      const payload = { action, message: action === 'ACCEPT' ? 'Approved by doctor' : 'Declined by doctor' };
      await API.doctorAppointments.action(doctorId, appointmentId, payload);
      setActionMessage(
        action === 'ACCEPT'
          ? `Appointment ${appointmentId} approved. Patient can now see approved status.`
          : `Appointment ${appointmentId} declined.`,
      );
      await loadAppointments();
    } catch (e) {
      setActionMessage(e?.message || `Failed to ${action.toLowerCase()} appointment`);
    } finally {
      setActingByAppointment((prev) => ({ ...prev, [appointmentId]: false }));
    }
  };

  const handleCopyLink = async (link) => {
    try {
      await navigator.clipboard.writeText(link);
      setActionMessage('Session link copied to clipboard.');
    } catch {
      setActionMessage('Could not copy link automatically. Please copy it manually.');
    }
  };

  const handleCreateCarePlan = (appointment) => {
    if (!appointment?.patientId) {
      setActionMessage('Patient details are missing for this appointment.');
      return;
    }

    const patientId = String(appointment.patientId);
    const appointmentId = appointment?.id != null ? String(appointment.id) : '';
    const params = new URLSearchParams({
      tab: 'create',
      patientId,
    });

    if (appointmentId) {
      params.set('appointmentId', appointmentId);
    }

    navigate(`/dashboard/care-plans?${params.toString()}`, {
      state: {
        patientDetails: {
          id: patientId,
          name: appointment?.patientName || appointment?.patientFullName || appointment?.name || '',
          email: appointment?.patientEmail || '',
          phone: appointment?.patientPhone || appointment?.phone || '',
          age: appointment?.patientAge || '',
          gender: appointment?.patientGender || '',
        },
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="max-w-sm">
          <h1 className="text-3xl font-black text-[#182C61]">Appointments</h1>
          <p className="text-[#808e9b] mt-1 font-bold">Your booked appointments from backend</p>
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

      {actionMessage ? (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
          <span className="text-sm font-semibold text-blue-800">{actionMessage}</span>
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
              <div
                key={a.id}
                className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
              >
                <div>
                  <p className="text-sm font-black text-[#182C61]">
                    Patient ID: {a.patientId || 'N/A'}
                  </p>
                  <p className="text-xs font-bold text-[#808e9b] mt-1">
                    {formatAppointmentTime(a.startTime)}{a.endTime ? ` – ${formatAppointmentTime(a.endTime)}` : ''}
                  </p>
                  {a.notes ? (
                    <p className="text-xs text-[#808e9b] mt-2 line-clamp-2">{a.notes}</p>
                  ) : null}

                  {sessionLinksByAppointment[a.id] ? (
                    <a
                      href={sessionLinksByAppointment[a.id]}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-block mt-2 text-xs font-black text-[#182C61] hover:underline"
                    >
                      Open session link
                    </a>
                  ) : null}
                </div>

                <div className="flex flex-col items-start sm:items-end gap-2">
                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[#182C61]">
                    <CalendarDaysIcon className="h-4 w-4" />
                    {String(a.status || '—').toUpperCase()}
                  </div>

                  {isPendingApproval(a) ? (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleDoctorAction(a, 'ACCEPT')}
                        disabled={Boolean(actingByAppointment[a.id])}
                        className="px-3 py-1.5 rounded-lg text-xs font-black bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
                      >
                        {actingByAppointment[a.id] ? 'Saving...' : 'Approve'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDoctorAction(a, 'DECLINE')}
                        disabled={Boolean(actingByAppointment[a.id])}
                        className="px-3 py-1.5 rounded-lg text-xs font-black border border-rose-600 text-rose-700 hover:bg-rose-50 disabled:opacity-60"
                      >
                        Decline
                      </button>
                    </div>
                  ) : null}

                  {canGenerateSession(a) ? (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleGenerateSessionLink(a)}
                        disabled={Boolean(generatingByAppointment[a.id]) || Boolean(actingByAppointment[a.id])}
                        className="px-3 py-1.5 rounded-lg text-xs font-black bg-[#182C61] text-white hover:bg-[#182C61]/85 disabled:opacity-60"
                      >
                        {generatingByAppointment[a.id] ? 'Generating...' : 'Generate Link'}
                      </button>

                      {sessionLinksByAppointment[a.id] ? (
                        <button
                          type="button"
                          onClick={() => handleCopyLink(sessionLinksByAppointment[a.id])}
                          className="px-3 py-1.5 rounded-lg text-xs font-black border border-[#182C61] text-[#182C61] hover:bg-[#182C61]/5"
                        >
                          Copy Link
                        </button>
                      ) : null}

                      <button
                        type="button"
                        onClick={() => handleCreateCarePlan(a)}
                        className="px-3 py-1.5 rounded-lg text-xs font-black border border-[#182C61] text-[#182C61] hover:bg-[#182C61]/5"
                      >
                        Create Care Plans
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function formatAppointmentTime(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString();
}

function canGenerateSession(appointment) {
  const status = String(appointment?.status || '').toUpperCase();
  return status === 'ACCEPTED';
}

function isPendingApproval(appointment) {
  const status = String(appointment?.status || '').toUpperCase();
  return status === 'PENDING' || status === 'RESCHEDULE_REQUESTED';
}
