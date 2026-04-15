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
  const [filterKey, setFilterKey] = useState('ALL');
  const [nowMs, setNowMs] = useState(Date.now());
  const [sessionLinksByAppointment, setSessionLinksByAppointment] = useState({});
  const [generatingByAppointment, setGeneratingByAppointment] = useState({});
  const [actingByAppointment, setActingByAppointment] = useState({});
  const [actionMessage, setActionMessage] = useState('');

  const loadAppointments = async () => {
    if (!doctorId) return;
    setLoading(true);
    setWarning('');
    try {
      const [list, allPatients] = await Promise.all([
        API.doctorAppointments.list(doctorId),
        API.patients.getAll().catch(() => []),
      ]);
      const normalized = Array.isArray(list) ? list : [];
      const patientById = new Map();
      (Array.isArray(allPatients) ? allPatients : []).forEach((patient) => {
        [patient?._id, patient?.id, patient?.userId, patient?.username, patient?.email]
          .map((value) => String(value || '').trim())
          .filter(Boolean)
          .forEach((key) => patientById.set(key, patient));
      });

      const normalizedWithPatientInfo = normalized.map((a) => {
        const patientId = String(a?.patientId || '').trim();
        const profile = patientId ? patientById.get(patientId) : null;
        const resolvedName = firstMeaningfulText(
          a?.patientName,
          a?.patientFullName,
          a?.name,
          profile?.name,
          profile?.fullName,
          profile?.username,
          patientId,
        );
        return {
          ...a,
          patientName: resolvedName,
          patientGender: a?.patientGender || a?.gender || profile?.gender || '',
        };
      });
      normalizedWithPatientInfo.sort((a, b) => {
        const aTime = new Date(a?.startTime || a?.createdAt || 0).getTime();
        const bTime = new Date(b?.startTime || b?.createdAt || 0).getTime();
        return bTime - aTime;
      });
      setAppointments(normalizedWithPatientInfo);
      if (normalizedWithPatientInfo.length > 0 && !expandedId) {
        setExpandedId(normalizedWithPatientInfo[0].id);
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

  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const filteredAppointments = useMemo(
    () => appointments.filter((a) => matchesFilter(a, filterKey)),
    [appointments, filterKey],
  );

  const sortedFilteredAppointments = useMemo(
    () =>
      [...filteredAppointments].sort((a, b) => {
        const aTime = new Date(a?.startTime || a?.createdAt || 0).getTime();
        const bTime = new Date(b?.startTime || b?.createdAt || 0).getTime();
        return bTime - aTime;
      }),
    [filteredAppointments],
  );

  useEffect(() => {
    if (sortedFilteredAppointments.length === 0) {
      setExpandedId(null);
      return;
    }
    const stillVisible = sortedFilteredAppointments.some((a) => a.id === expandedId);
    if (!stillVisible) {
      setExpandedId(sortedFilteredAppointments[0].id);
    }
  }, [sortedFilteredAppointments, expandedId]);

  const nextAppointment = useMemo(() => {
    const now = nowMs;
    const candidateStatuses = new Set(['PENDING', 'ACCEPTED', 'RESCHEDULE_REQUESTED']);
    return appointments
      .filter((a) => candidateStatuses.has(String(a?.status || '').toUpperCase()))
      .map((a) => ({
        raw: a,
        startMs: new Date(a?.startTime || 0).getTime(),
      }))
      .filter((x) => Number.isFinite(x.startMs) && x.startMs > now)
      .sort((a, b) => a.startMs - b.startMs)[0]?.raw || null;
  }, [appointments, nowMs]);

  const countdownParts = useMemo(() => {
    if (!nextAppointment) return null;
    const startMs = new Date(nextAppointment.startTime).getTime();
    if (!Number.isFinite(startMs)) return null;
    const deltaMs = Math.max(0, startMs - nowMs);
    const totalSeconds = Math.floor(deltaMs / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return { days, hours, minutes, seconds };
  }, [nextAppointment, nowMs]);

  const countdownUrgency = useMemo(() => {
    if (!nextAppointment) return 'normal';
    const startMs = new Date(nextAppointment.startTime).getTime();
    if (!Number.isFinite(startMs)) return 'normal';
    const remaining = startMs - nowMs;
    if (remaining <= 60 * 60 * 1000) return 'critical';
    if (remaining <= 6 * 60 * 60 * 1000) return 'soon';
    return 'normal';
  }, [nextAppointment, nowMs]);

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

  const handleCompleteAppointment = async (appointment) => {
    const appointmentId = String(appointment?.id || '');
    if (!appointmentId || !doctorId) {
      setActionMessage('Missing appointment or doctor id.');
      return;
    }
    setActionMessage('');
    setActingByAppointment((prev) => ({ ...prev, [appointmentId]: true }));
    try {
      await API.doctorAppointments.complete(doctorId, appointmentId);
      setActionMessage(`Appointment ${appointmentId} marked as completed.`);
      await loadAppointments();
    } catch (e) {
      setActionMessage(e?.message || 'Failed to mark appointment as completed');
    } finally {
      setActingByAppointment((prev) => ({ ...prev, [appointmentId]: false }));
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

      <div className="relative overflow-hidden rounded-3xl border border-[#182C61]/20 bg-gradient-to-br from-[#132b66] via-[#1c3d8c] to-[#365ab3] p-5 md:p-6 text-white shadow-xl shadow-[#182C61]/20">
        <div className="absolute -top-16 -right-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-20 -left-10 h-44 w-44 rounded-full bg-cyan-300/10 blur-2xl" />

        <div className="relative z-10 flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.24em] font-black text-white/70">My next appointment</p>
              <p className="text-sm text-white/85 font-semibold mt-1">Real-time doctor schedule countdown</p>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/15 border border-white/30 px-3 py-1 text-[11px] font-black uppercase tracking-wider">
              <span className={`h-2 w-2 rounded-full ${countdownUrgency === 'critical' ? 'bg-rose-300 animate-ping' : countdownUrgency === 'soon' ? 'bg-amber-300 animate-pulse' : 'bg-emerald-300'}`} />
              Live
            </span>
          </div>

          {nextAppointment && countdownParts ? (
            <>
              <div className="rounded-2xl bg-white/10 border border-white/20 px-4 py-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm md:text-base font-black tracking-tight">
                  {formatPatientDisplayName(nextAppointment)}
                </p>
                <p className="text-xs md:text-sm font-semibold text-white/80">{formatAppointmentTimeShort(nextAppointment.startTime)}</p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { key: 'd', value: countdownParts.days, label: 'Days' },
                  { key: 'h', value: countdownParts.hours, label: 'Hours' },
                  { key: 'm', value: countdownParts.minutes, label: 'Minutes' },
                  { key: 's', value: countdownParts.seconds, label: 'Seconds' },
                ].map((part) => (
                  <div
                    key={part.key}
                    className={`rounded-xl border border-white/25 bg-white/15 px-3 py-2.5 text-center transition-all duration-300 ${
                      part.key === 's' ? 'ring-1 ring-white/20 shadow-lg shadow-black/10' : ''
                    }`}
                  >
                    <p className={`text-2xl font-black leading-none tabular-nums ${part.key === 's' ? 'animate-pulse' : ''}`}>
                      {String(part.value).padStart(2, '0')}
                    </p>
                    <p className="text-[10px] uppercase tracking-[0.16em] text-white/75 mt-1">{part.label}</p>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="rounded-2xl bg-white/10 border border-white/20 p-4">
              <p className="text-xl font-black tracking-tight">No upcoming appointments</p>
              <p className="text-sm text-white/75 mt-1">New bookings will appear here automatically.</p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white border-2 border-slate-50 rounded-2xl p-5">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {[
            {
              key: 'ALL',
              label: 'All',
              emoji: '📋',
              active: 'bg-[#182C61] border-[#182C61] text-white shadow-md shadow-[#182C61]/20',
              idle: 'bg-[#eaf1ff] border-[#d7e4ff] text-[#182C61] hover:bg-[#dfeaff]',
            },
            {
              key: 'TODAY',
              label: 'Today',
              emoji: '📅',
              active: 'bg-sky-600 border-sky-600 text-white shadow-md shadow-sky-600/20',
              idle: 'bg-sky-50 border-sky-200 text-sky-700 hover:bg-sky-100',
            },
            {
              key: 'TOMORROW',
              label: 'Tomorrow',
              emoji: '🌤️',
              active: 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-600/20',
              idle: 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100',
            },
            {
              key: 'DONE',
              label: 'Done',
              emoji: '✅',
              active: 'bg-emerald-600 border-emerald-600 text-white shadow-md shadow-emerald-600/20',
              idle: 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100',
            },
            {
              key: 'PENDING',
              label: 'Pending',
              emoji: '⏳',
              active: 'bg-amber-500 border-amber-500 text-white shadow-md shadow-amber-500/20',
              idle: 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100',
            },
            {
              key: 'TO_BE_CONFIRMED',
              label: 'To Be Confirmed',
              emoji: '🕒',
              active: 'bg-orange-500 border-orange-500 text-white shadow-md shadow-orange-500/20',
              idle: 'bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100',
            },
            {
              key: 'DECLINED',
              label: 'Declined',
              emoji: '❌',
              active: 'bg-rose-600 border-rose-600 text-white shadow-md shadow-rose-600/20',
              idle: 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100',
            },
          ].map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilterKey(f.key)}
              className={`px-3.5 py-1.5 rounded-full border text-xs font-black uppercase tracking-wider transition-all ${
                filterKey === f.key
                  ? f.active
                  : f.idle
              }`}
            >
              <span className="mr-1">{f.emoji}</span>
              {f.label}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-sm font-bold text-[#808e9b]">Loading appointments...</p>
        ) : sortedFilteredAppointments.length === 0 ? (
          <p className="text-sm font-bold text-[#808e9b]">No appointments found.</p>
        ) : (
          <div className="space-y-3">
            {sortedFilteredAppointments.map((a) => (
              <div
                key={a.id}
                role="button"
                tabIndex={0}
                onClick={() => setExpandedId(a.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') setExpandedId(a.id);
                }}
                className={`rounded-2xl border transition-all duration-200 cursor-pointer ${
                  expandedId === a.id
                    ? 'border-[#182C61]/25 bg-gradient-to-r from-white to-[#f8fbff] shadow-md'
                    : 'border-slate-200/80 bg-white hover:border-[#182C61]/20 hover:shadow-md hover:-translate-y-0.5'
                }`}
              >
                <div className="p-4 md:p-5 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#dbe7ff] to-[#edf3ff] text-[#182C61] flex items-center justify-center text-xs font-black tracking-wide shrink-0">
                      {getPersonInitials(a.patientName || a.patientFullName || a.patientId || 'PT')}
                    </div>
                    <div className="min-w-0">
                      <p className="text-base font-black text-[#182C61] truncate">
                        {formatPatientDisplayName(a)}
                      </p>
                      <p className="text-xs font-semibold text-[#808e9b] truncate">{formatAppointmentTimeShort(a.startTime)}</p>
                    </div>
                  </div>

                  <div className={`shrink-0 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold ${getStatusMeta(a.status).badge}`}>
                    <span className={`h-2 w-2 rounded-full ${getStatusMeta(a.status).dot}`} />
                    {getStatusMeta(a.status).label}
                  </div>
                </div>

                {expandedId === a.id ? (
                  <div className="border-t border-slate-100 px-4 md:px-5 pb-4 md:pb-5 pt-4">
                    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                      <div className="grid grid-cols-1 lg:grid-cols-[1.8fr_1fr]">
                        <div className="p-4 border-b lg:border-b-0 lg:border-r border-slate-200 bg-gradient-to-br from-[#f8fbff] to-[#eef5ff]">
                          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#4b5a78] mb-2">
                            Appointment details ✨
                          </p>
                          <p className="text-lg font-black text-[#182C61] mb-1">
                            {String(a.consultationType || 'Consultation').toUpperCase()} {String(a.consultationType || '').toUpperCase() === 'ONLINE' ? '📹' : ''}
                          </p>
                          <div className="space-y-1.5 text-sm text-[#334155]">
                            <p>🪪 Patient ID: {a.patientId || 'N/A'}</p>
                            <p>🕒 Start: {formatAppointmentTime(a.startTime)}</p>
                            <p>⏱️ End: {a.endTime ? formatAppointmentTime(a.endTime) : '—'}</p>
                            <p>📝 {a.notes && String(a.notes).trim() ? a.notes : 'No notes.'}</p>
                          </div>
                        </div>

                        <div className="p-4 flex flex-col justify-between bg-gradient-to-b from-white to-[#f9fbff]">
                          <div>
                            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#4b5a78] mb-3">Actions ⚡</p>

                            {isPendingApproval(a) ? (
                              <div className="space-y-2 mb-2">
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
                                  className="w-full px-3 py-2.5 rounded-xl text-xs font-black border border-rose-300 text-rose-700 hover:bg-rose-50 disabled:opacity-60"
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
                                  className="w-full px-3 py-2.5 rounded-xl text-sm font-black bg-gradient-to-r from-[#182C61] to-[#24448e] text-white hover:brightness-105 disabled:opacity-60 shadow-md shadow-[#182C61]/25"
                                >
                                  {generatingByAppointment[a.id] ? 'Generating...' : '🔗 Generate Link'}
                                </button>

                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCreateCarePlan(a);
                                  }}
                                  className="w-full px-3 py-2.5 rounded-xl text-sm font-black bg-gradient-to-r from-[#182C61] to-[#24448e] text-white hover:brightness-105 shadow-md shadow-[#182C61]/25"
                                >
                                  🧾 Create Care Plans
                                </button>

                                {sessionLinksByAppointment[a.id] ? (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleCopyLink(sessionLinksByAppointment[a.id]);
                                    }}
                                    className="w-full px-3 py-2 rounded-lg text-xs font-black border border-[#182C61]/30 text-[#182C61] hover:bg-[#182C61]/5"
                                  >
                                    📋 Copy Link
                                  </button>
                                ) : null}
                              </div>
                            ) : null}

                            {canMarkCompleted(a) ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCompleteAppointment(a);
                                }}
                                disabled={Boolean(actingByAppointment[a.id])}
                                className="w-full mt-2 px-3 py-2.5 rounded-xl text-sm font-black bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:brightness-105 disabled:opacity-60"
                              >
                                {actingByAppointment[a.id] ? 'Saving...' : '✅ Confirm Done'}
                              </button>
                            ) : null}
                          </div>
                        </div>
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
    return { label: 'Done', badge: 'bg-sky-50 text-sky-700 border-sky-200', dot: 'bg-sky-500' };
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

function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function matchesFilter(appointment, filterKey) {
  if (filterKey === 'ALL') return true;

  const status = String(appointment?.status || '').toUpperCase();
  if (filterKey === 'DONE') return status === 'COMPLETED';
  if (filterKey === 'PENDING') return status === 'PENDING' || status === 'RESCHEDULE_REQUESTED';
  if (filterKey === 'TO_BE_CONFIRMED') return canMarkCompleted(appointment);
  if (filterKey === 'DECLINED') return status === 'DECLINED';

  const start = new Date(appointment?.startTime || 0);
  if (Number.isNaN(start.getTime())) return false;
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);

  if (filterKey === 'TODAY') return isSameDay(start, now);
  if (filterKey === 'TOMORROW') return isSameDay(start, tomorrow);

  return true;
}

function canMarkCompleted(appointment) {
  const status = String(appointment?.status || '').toUpperCase();
  if (status !== 'ACCEPTED') return false;
  const end = new Date(appointment?.endTime || 0);
  if (!Number.isNaN(end.getTime())) {
    return end.getTime() <= Date.now();
  }
  const start = new Date(appointment?.startTime || 0);
  if (Number.isNaN(start.getTime())) return false;
  const assumedEnd = start.getTime() + 30 * 60 * 1000;
  return assumedEnd <= Date.now();
}

function formatPatientDisplayName(appointment) {
  const rawName = firstMeaningfulText(
    appointment?.patientName,
    appointment?.patientFullName,
    appointment?.name,
    appointment?.patientId,
    'N/A',
  );
  const nameWithoutPatientLabel = rawName.replace(/^patient\s+/i, '').trim();
  const gender = String(appointment?.patientGender || appointment?.gender || '').trim().toUpperCase();
  const prefix = gender.startsWith('M') ? 'Mr.' : gender.startsWith('F') ? 'Miss' : '';
  return prefix ? `${prefix} ${nameWithoutPatientLabel}` : nameWithoutPatientLabel;
}

function isMeaningfulText(value) {
  const text = String(value || '').trim();
  if (!text) return false;
  const normalized = text.toLowerCase();
  return !['unknown', 'n/a', 'na', 'null', 'undefined'].includes(normalized);
}

function firstMeaningfulText(...values) {
  for (const value of values) {
    if (isMeaningfulText(value)) return String(value).trim();
  }
  return '';
}
