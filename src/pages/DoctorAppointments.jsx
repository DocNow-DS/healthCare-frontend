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
  const [expandedId, setExpandedId] = useState(null);
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
      if (normalized.length > 0 && !expandedId) {
        setExpandedId(normalized[0].id);
      }
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

    navigate(`/dashboard/patients/${encodeURIComponent(patientId)}/care-plans?${params.toString()}`, {
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
                role="button"
                tabIndex={0}
                onClick={() => setExpandedId(a.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') setExpandedId(a.id);
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
                      {getPersonInitials(a.patientName || a.patientFullName || a.patientId || 'PT')}
                    </div>
                    <div className="min-w-0">
                      <p className="text-base font-black text-[#182C61] truncate">
                        {a.patientName || a.patientFullName || `Patient ${a.patientId || 'N/A'}`}
                      </p>
                      <p className="text-xs font-semibold text-[#808e9b] truncate">
                        {formatAppointmentTimeShort(a.startTime)}
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
                          Patient ID: {a.patientId || 'N/A'}
                        </p>
                        <p className="text-xs font-semibold text-[#4b5563]">
                          Start: {formatAppointmentTime(a.startTime)}
                        </p>
                        <p className="text-xs font-semibold text-[#4b5563]">
                          End: {a.endTime ? formatAppointmentTime(a.endTime) : '—'}
                        </p>
                        <p className="text-xs text-[#6b7280]">
                          {a.notes && String(a.notes).trim() ? a.notes : 'No notes.'}
                        </p>
                        {sessionLinksByAppointment[a.id] ? (
                          <a
                            href={sessionLinksByAppointment[a.id]}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-block text-xs font-black text-[#182C61] hover:underline"
                          >
                            Open session link
                          </a>
                        ) : null}
                      </div>

                      <div className="rounded-xl border border-slate-100 bg-white p-4 space-y-3">
                        <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#808e9b]">
                          Actions
                        </p>

                        {isPendingApproval(a) ? (
                          <div className="space-y-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDoctorAction(a, 'ACCEPT');
                              }}
                              disabled={Boolean(actingByAppointment[a.id])}
                              className="w-full px-3 py-2.5 rounded-xl text-xs font-black bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
                            >
                              {actingByAppointment[a.id] ? 'Saving...' : 'Approve'}
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDoctorAction(a, 'DECLINE');
                              }}
                              disabled={Boolean(actingByAppointment[a.id])}
                              className="w-full px-3 py-2.5 rounded-xl text-xs font-black border border-rose-600 text-rose-700 hover:bg-rose-50 disabled:opacity-60"
                            >
                              Decline
                            </button>
                          </div>
                        ) : null}

                        {canGenerateSession(a) ? (
                          <div className="space-y-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleGenerateSessionLink(a);
                              }}
                              disabled={Boolean(generatingByAppointment[a.id]) || Boolean(actingByAppointment[a.id])}
                              className="w-full px-3 py-2.5 rounded-xl text-xs font-black bg-[#182C61] text-white hover:bg-[#182C61]/85 disabled:opacity-60"
                            >
                              {generatingByAppointment[a.id] ? 'Generating...' : 'Generate Link'}
                            </button>

                            {sessionLinksByAppointment[a.id] ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCopyLink(sessionLinksByAppointment[a.id]);
                                }}
                                className="w-full px-3 py-2.5 rounded-xl text-xs font-black border border-[#182C61] text-[#182C61] hover:bg-[#182C61]/5"
                              >
                                Copy Link
                              </button>
                            ) : null}

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCreateCarePlan(a);
                              }}
                              className="w-full px-3 py-2.5 rounded-xl text-xs font-black border border-[#182C61] text-[#182C61] hover:bg-[#182C61]/5"
                            >
                              Create Care Plans
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </div>
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

function formatAppointmentTime(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString();
}

function formatAppointmentTimeShort(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getPersonInitials(name) {
  const cleaned = String(name || '').trim();
  if (!cleaned) return 'PT';
  const parts = cleaned.split(/[\s_.-]+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
}

function getStatusMeta(status) {
  const normalized = String(status || '').toUpperCase();
  if (normalized === 'ACCEPTED') {
    return { label: 'Accepted', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' };
  }
  if (normalized === 'DECLINED') {
    return { label: 'Declined', badge: 'bg-rose-50 text-rose-700 border-rose-200', dot: 'bg-rose-500' };
  }
  if (normalized === 'CANCELLED') {
    return { label: 'Cancelled', badge: 'bg-slate-100 text-slate-700 border-slate-200', dot: 'bg-slate-500' };
  }
  if (normalized === 'COMPLETED') {
    return { label: 'Completed', badge: 'bg-sky-50 text-sky-700 border-sky-200', dot: 'bg-sky-500' };
  }
  if (normalized === 'PENDING' || normalized === 'RESCHEDULE_REQUESTED') {
    return { label: 'Pending', badge: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' };
  }
  return { label: normalized || 'Unknown', badge: 'bg-slate-100 text-slate-700 border-slate-200', dot: 'bg-slate-500' };
}

function canGenerateSession(appointment) {
  const status = String(appointment?.status || '').toUpperCase();
  return status === 'ACCEPTED';
}

function isPendingApproval(appointment) {
  const status = String(appointment?.status || '').toUpperCase();
  return status === 'PENDING' || status === 'RESCHEDULE_REQUESTED';
}
