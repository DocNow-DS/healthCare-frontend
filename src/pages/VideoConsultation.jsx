import { useEffect, useMemo, useState } from 'react';
import { API } from '../config/api';
import { ShieldCheckIcon, VideoCameraIcon } from '@heroicons/react/24/solid';

function readAuthUser() {
   try {
      const raw = localStorage.getItem('auth_user');
      return raw ? JSON.parse(raw) : null;
   } catch {
      return null;
   }
}

export default function VideoConsultation() {
   const authUser = useMemo(() => readAuthUser(), []);
   const myId = useMemo(() => authUser?.id || authUser?.userId || '', [authUser]);
   const isDoctor = useMemo(() => {
      const role = authUser?.role;
      const roles = authUser?.roles;
      if (typeof role === 'string') return role.toUpperCase() === 'DOCTOR';
      if (Array.isArray(roles)) return roles.map(String).some((r) => r.toUpperCase() === 'DOCTOR');
      return false;
   }, [authUser]);

   const [availablePatients, setAvailablePatients] = useState([]);
   const [doctorAppointments, setDoctorAppointments] = useState([]);
   const [patientsLoading, setPatientsLoading] = useState(false);
   const [patientsError, setPatientsError] = useState('');
   const [selectedApprovedAppointmentId, setSelectedApprovedAppointmentId] = useState('');
   const [digitalNow, setDigitalNow] = useState(new Date());

   const [myConsultations, setMyConsultations] = useState([]);
   const [consultationsLoading, setConsultationsLoading] = useState(false);

   const [jitsiUrl, setJitsiUrl] = useState('');
   const [frameLoaded, setFrameLoaded] = useState(false);
   const [embedStuck, setEmbedStuck] = useState(false);
   const [isBusy, setIsBusy] = useState(false);
   const [error, setError] = useState('');

   const appointmentPatientIds = useMemo(() => {
      const ids = new Set();
      doctorAppointments.forEach((a) => {
         const id = a?.patientId;
         if (id != null && String(id).trim().length > 0) {
            ids.add(String(id));
         }
      });
      return ids;
   }, [doctorAppointments]);

   const consultationPatients = useMemo(() => {
      if (!isDoctor) return availablePatients;
      if (appointmentPatientIds.size === 0) return [];
      return availablePatients.filter((p) => {
         const pid = p?.id || p?.userId || p?.username;
         return pid != null && appointmentPatientIds.has(String(pid));
      });
   }, [availablePatients, appointmentPatientIds, isDoctor]);

   const appointmentIds = useMemo(() => {
      const ids = new Set();
      doctorAppointments.forEach((a) => {
         if (a?.id != null) ids.add(String(a.id));
      });
      return ids;
   }, [doctorAppointments]);

   const patientLookup = useMemo(() => {
      const map = new Map();
      availablePatients.forEach((p) => {
         const pid = p?.id || p?.userId || p?.username;
         if (pid != null) {
            map.set(String(pid), p?.name || p?.username || String(pid));
         }
      });
      return map;
   }, [availablePatients]);

   const visibleConsultations = useMemo(() => {
      if (!isDoctor) return myConsultations;
      if (appointmentPatientIds.size === 0 && appointmentIds.size === 0) return [];

      return myConsultations.filter((c) => {
         const consultationPatientId = c?.patientId != null ? String(c.patientId) : '';
         const consultationAppointmentId = c?.appointmentId != null ? String(c.appointmentId) : '';
         return appointmentPatientIds.has(consultationPatientId) || appointmentIds.has(consultationAppointmentId);
      });
   }, [appointmentIds, appointmentPatientIds, isDoctor, myConsultations]);

   const consultationsByDate = useMemo(() => {
      const groups = new Map();
      visibleConsultations.forEach((c) => {
         const rawDate = c?.scheduledAt || c?.startedAt || c?.createdAt;
         const dayKey = toDateKey(rawDate);
         if (!groups.has(dayKey)) groups.set(dayKey, []);
         groups.get(dayKey).push(c);
      });

      return Array.from(groups.entries())
         .sort((a, b) => b[0].localeCompare(a[0]))
         .map(([dayKey, list]) => ({
            dayKey,
            list: [...list].sort((a, b) => {
               const at = new Date(a?.scheduledAt || a?.startedAt || a?.createdAt || 0).getTime();
               const bt = new Date(b?.scheduledAt || b?.startedAt || b?.createdAt || 0).getTime();
               return bt - at;
            }),
         }));
   }, [visibleConsultations]);

   const approvedAppointments = useMemo(() => {
      return doctorAppointments.filter((a) => String(a?.status || '').toUpperCase() === 'ACCEPTED');
   }, [doctorAppointments]);

   const selectedApprovedAppointment = useMemo(() => {
      if (!selectedApprovedAppointmentId) return null;
      return approvedAppointments.find((a) => String(a?.id) === String(selectedApprovedAppointmentId)) || null;
   }, [approvedAppointments, selectedApprovedAppointmentId]);

   const embedUrl = useMemo(() => {
      if (!jitsiUrl) return '';
      try {
         const url = new URL(jitsiUrl);
         const hashParams = new URLSearchParams((url.hash || '').replace(/^#/, ''));
         hashParams.set('config.prejoinPageEnabled', 'false');
         hashParams.set('config.startWithAudioMuted', 'false');
         hashParams.set('config.startWithVideoMuted', 'false');
         hashParams.set('config.disableDeepLinking', 'true');
         url.hash = hashParams.toString();
         return url.toString();
      } catch {
         return jitsiUrl;
      }
   }, [jitsiUrl]);

   useEffect(() => {
      if (!jitsiUrl) {
         setFrameLoaded(false);
         setEmbedStuck(false);
         return;
      }
      setFrameLoaded(false);
      setEmbedStuck(false);
      const timer = setTimeout(() => {
         if (!frameLoaded) setEmbedStuck(true);
      }, 12000);
      return () => clearTimeout(timer);
   }, [jitsiUrl, frameLoaded]);

   const loadPatientsIfDoctor = async () => {
      if (!isDoctor) return;
      setPatientsLoading(true);
      setPatientsError('');
      try {
         const list = await API.patients.getAll();
         setAvailablePatients(Array.isArray(list) ? list : []);
      } catch (e) {
         setPatientsError(e?.message || 'Failed to load patients');
      } finally {
         setPatientsLoading(false);
      }
   };

   const loadDoctorAppointments = async () => {
      if (!isDoctor || !myId) return;
      try {
         const list = await API.doctorAppointments.list(myId);
         setDoctorAppointments(Array.isArray(list) ? list : []);
      } catch {
         setDoctorAppointments([]);
      }
   };

   const loadMyConsultations = async () => {
      if (!myId) return;
      setConsultationsLoading(true);
      setError('');
      try {
         const list = isDoctor
            ? await API.telemedSessions.listForDoctor(myId)
            : await API.telemedSessions.listForPatient(myId);
         const normalized = Array.isArray(list) ? [...list] : [];
         normalized.sort((a, b) => {
            const aTime = new Date(a?.startedAt || a?.createdAt || 0).getTime();
            const bTime = new Date(b?.startedAt || b?.createdAt || 0).getTime();
            return bTime - aTime;
         });
         setMyConsultations(normalized);
      } catch (e) {
         setError(e?.message || 'Failed to load consultations');
      } finally {
         setConsultationsLoading(false);
      }
   };

   useEffect(() => {
      loadPatientsIfDoctor();
      loadDoctorAppointments();
      // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [isDoctor, myId]);

   useEffect(() => {
      loadMyConsultations();
      // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [myId, isDoctor]);

   useEffect(() => {
      if (!myId) return;
      const timer = setInterval(() => {
         loadMyConsultations();
      }, 7000);
      return () => clearInterval(timer);
      // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [myId, isDoctor]);

   useEffect(() => {
      const timer = setInterval(() => {
         setDigitalNow(new Date());
      }, 1000);
      return () => clearInterval(timer);
   }, []);

   useEffect(() => {
      if (isDoctor) return;
      if (jitsiUrl) return;
      const firstWithUrl = myConsultations.find((c) => {
         const hasUrl = Boolean(c?.sessionUrl || c?.jitsiUrl);
         const status = String(c?.status || '').toUpperCase();
         return hasUrl && status !== 'ENDED';
      });
      if (firstWithUrl) {
         setJitsiUrl(firstWithUrl.sessionUrl || firstWithUrl.jitsiUrl || '');
      }
   }, [isDoctor, jitsiUrl, myConsultations]);

   const handleGenerateLink = async () => {
      if (!isDoctor) {
         setError('Only doctors can schedule consultations');
         return;
      }
      if (!myId) {
         setError('Missing doctor id. Please login again.');
         return;
      }
      if (!selectedApprovedAppointment) {
         setError('Select an approved appointment first');
         return;
      }
      if (isBusy) return;

      const appointmentId = String(selectedApprovedAppointment.id);
      const selectedPatientId = selectedApprovedAppointment.patientId;

      setIsBusy(true);
      setError('');
      try {
         const created = await API.telemedSessions.createOrGetByAppointment(appointmentId, {
            doctorId: myId,
            patientId: selectedPatientId,
            forceNew: true,
         });
         setJitsiUrl(created?.sessionUrl || created?.jitsiUrl || '');
         await loadMyConsultations();
      } catch (e) {
         const status = e?.status;
         if (status === 403) {
            setError('403 Forbidden: your token is valid but you are not authorized as DOCTOR.');
         } else {
            setError(e?.message || 'Failed to generate link');
         }
      } finally {
         setIsBusy(false);
      }
   };

   return (
      <div className="h-[calc(100vh-60px)] flex flex-col space-y-2 animate-in fade-in slide-in-from-bottom-8 duration-1000">
         <div className="flex items-center justify-between border-b border-slate-50 pb-2">
            <div className="flex items-center space-x-3">
               <div className="h-8 w-8 bg-primary-500 rounded-lg flex items-center justify-center shadow-lg shadow-primary-500/20">
                  <VideoCameraIcon className="h-5 w-5 text-white" />
               </div>
               <div>
                  <h1 className="text-xl font-black text-primary-500 tracking-tighter">Consultation</h1>
                  <p className="text-[#808e9b] font-black uppercase tracking-widest text-[7px] flex items-center">
                     <span className="h-1 w-1 rounded-full bg-accent-red mr-1 animate-pulse"></span>
                     AES-256 Secure
                  </p>
               </div>
            </div>
         </div>

         {error ? (
            <div className="bg-white border border-slate-50 px-3 py-2 rounded-lg shadow-sm text-[10px] font-black text-accent-red uppercase tracking-widest">
               {error}
            </div>
         ) : null}

         {isDoctor ? (
            <div className="bg-gradient-to-br from-white to-slate-50 border border-slate-100 p-4 rounded-xl shadow-sm">
               <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-3">
                  <div>
                     <h3 className="text-sm font-black text-primary-500 tracking-tight">Generate Consultation Link</h3>
                     <p className="text-[10px] font-bold text-[#808e9b] uppercase tracking-widest mt-0.5">
                        Only approved appointments can generate consultation links
                     </p>
                  </div>
                  <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest">
                     <span className="px-2 py-1 rounded-full bg-primary-50 text-primary-500 border border-primary-100">
                        Appointments: {doctorAppointments.length}
                     </span>
                     <span className="px-2 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                        Approved: {patientsLoading ? '…' : approvedAppointments.length}
                     </span>
                  </div>
               </div>

               {patientsError ? (
                  <div className="text-[10px] font-bold text-accent-red mb-2">{patientsError}</div>
               ) : null}

               {!patientsLoading && approvedAppointments.length === 0 ? (
                  <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[10px] font-bold text-amber-800 uppercase tracking-widest">
                     No approved appointments found. Approve an appointment first.
                  </div>
               ) : null}

               <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                  <div className="md:col-span-2">
                     <label className="block text-[10px] font-black uppercase tracking-widest text-[#808e9b] mb-1">Approved Appointment</label>
                     <select
                        value={selectedApprovedAppointmentId}
                        onChange={(e) => setSelectedApprovedAppointmentId(e.target.value)}
                        disabled={patientsLoading || isBusy || approvedAppointments.length === 0}
                        className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-xs text-[#1e272e] font-black transition-all"
                     >
                        <option value="">{patientsLoading ? 'Loading appointments…' : 'Select approved appointment…'}</option>
                        {approvedAppointments.map((a) => {
                           const pid = a?.patientId || 'N/A';
                           const label = `#${a?.id} - Patient ${pid} - ${formatAppointmentTime(a?.startTime)}`;
                           return (
                              <option key={a?.id} value={a?.id}>
                                 {label}
                              </option>
                           );
                        })}
                     </select>
                  </div>

                  <div>
                     <label className="block text-[10px] font-black uppercase tracking-widest text-[#808e9b] mb-1">Patient</label>
                     <div className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-xs text-[#1e272e] font-black">
                        {selectedApprovedAppointment?.patientId || '—'}
                     </div>
                  </div>

                  <div>
                     <label className="block text-[10px] font-black uppercase tracking-widest text-[#808e9b] mb-1">Appointment Time</label>
                     <div className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-xs text-[#1e272e] font-black">
                        {formatAppointmentTime(selectedApprovedAppointment?.startTime)}
                     </div>
                     <div className="mt-1.5 rounded-md bg-slate-900 px-2 py-1 text-center">
                        <span className="text-[10px] font-black tracking-widest text-emerald-300">
                           {formatDigitalTime(digitalNow)}
                        </span>
                     </div>
                  </div>
               </div>

               <div className="mt-3 flex justify-end">
                  <button
                     type="button"
                     onClick={handleGenerateLink}
                     disabled={isBusy || !selectedApprovedAppointmentId || approvedAppointments.length === 0}
                     className="px-5 py-2.5 text-[10px] font-black rounded-lg bg-primary-500 text-white hover:bg-primary-500/90 transition-all uppercase tracking-widest disabled:opacity-60"
                  >
                     {isBusy ? 'Generating...' : 'Generate Link'}
                  </button>
               </div>
            </div>
         ) : null}

         <div className="bg-white border border-slate-50 p-3 rounded-lg shadow-sm">
            <div className="flex items-center justify-between mb-2">
               <h3 className="text-xs font-black text-primary-500 tracking-tight">My Consultations</h3>
               <span className="text-[9px] font-black text-[#808e9b] uppercase tracking-widest">
                  {consultationsLoading ? 'Loading…' : `${myConsultations.length}`}
               </span>
            </div>

            <div className="space-y-3 max-h-[260px] overflow-y-auto pr-1">
               {consultationsByDate.map((group) => (
                  <div key={group.dayKey} className="rounded-lg border border-slate-100 bg-slate-50/70">
                     <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between">
                        <p className="text-[10px] font-black uppercase tracking-widest text-primary-500">
                           {formatDateHeading(group.dayKey)}
                        </p>
                        <span className="text-[9px] font-black text-[#808e9b]">{group.list.length} sessions</span>
                     </div>

                     <div className="px-3 py-2 space-y-2">
                        {group.list.map((c) => (
                           <div key={c.id} className="flex items-center justify-between rounded-md border border-slate-100 bg-white px-2 py-2">
                              <div className="min-w-0">
                                 <div className="text-[10px] font-black text-[#1e272e] uppercase tracking-wider">
                                    {c.status || 'UNKNOWN'} • {formatShortDateTime(c?.scheduledAt || c?.startedAt || c?.createdAt)}
                                 </div>
                                 <div className="text-[9px] font-bold text-[#808e9b] mt-0.5 truncate">
                                    Patient: {patientLookup.get(String(c?.patientId || '')) || c?.patientId || 'N/A'}
                                 </div>
                                 <div className="text-[9px] font-bold text-[#808e9b] truncate">
                                    Appointment: {c?.appointmentId || 'N/A'} • Room: {c?.roomName || c?.roomId || 'N/A'}
                                 </div>
                              </div>

                              {(c.sessionUrl || c.jitsiUrl) ? (
                                 <button
                                    type="button"
                                    onClick={() => {
                                       const link = c.sessionUrl || c.jitsiUrl || '';
                                       setJitsiUrl(link);
                                    }}
                                    className="ml-2 px-2 py-1 text-[9px] font-black rounded-md border border-slate-200 text-primary-500 hover:border-primary-500 transition-all uppercase tracking-widest"
                                 >
                                    Join
                                 </button>
                              ) : null}
                           </div>
                        ))}
                     </div>
                  </div>
               ))}

               {!consultationsLoading && consultationsByDate.length === 0 ? (
                  <div className="text-[10px] font-bold text-[#808e9b]">No consultations</div>
               ) : null}
            </div>
         </div>

         {jitsiUrl ? (
            <div className="flex-1 bg-slate-900 rounded-4xl shadow-xl relative overflow-hidden ring-4 ring-white group min-h-[420px]">
               <iframe
                  title="Telemedicine session"
                  src={embedUrl}
                  className="absolute inset-0 w-full h-full"
                  style={{ border: 0 }}
                  allow="camera https://meet.jit.si; microphone https://meet.jit.si; display-capture https://meet.jit.si; autoplay; fullscreen"
                  allowFullScreen
                  referrerPolicy="no-referrer"
                  onLoad={() => {
                     setFrameLoaded(true);
                     setEmbedStuck(false);
                  }}
               />
               <div className="absolute top-6 left-6 p-4 bg-white/10 backdrop-blur-md rounded-xl border border-white/10 z-10 flex items-center space-x-2">
                  <ShieldCheckIcon className="h-4 w-4 text-accent-red" />
                  <span className="text-[10px] font-black text-white uppercase tracking-widest">Secure</span>
               </div>
               {embedStuck ? (
                  <div className="absolute bottom-6 right-6 z-10 bg-black/45 border border-white/20 rounded-md px-3 py-2 text-white text-[10px] font-black uppercase tracking-widest">
                     Loading stuck. Reload the page and rejoin this meeting.
                  </div>
               ) : null}
            </div>
         ) : null}
      </div>
   );
}

function formatDigitalTime(date) {
   return date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
   });
}

function formatAppointmentTime(value) {
   if (!value) return '—';
   const d = new Date(value);
   if (Number.isNaN(d.getTime())) return String(value);
   return d.toLocaleString();
}

function toDateKey(value) {
   const d = new Date(value || Date.now());
   if (Number.isNaN(d.getTime())) return 'unknown-date';
   const yyyy = d.getFullYear();
   const mm = String(d.getMonth() + 1).padStart(2, '0');
   const dd = String(d.getDate()).padStart(2, '0');
   return `${yyyy}-${mm}-${dd}`;
}

function formatDateHeading(dayKey) {
   if (!dayKey || dayKey === 'unknown-date') return 'Unknown Date';
   const d = new Date(`${dayKey}T00:00:00`);
   if (Number.isNaN(d.getTime())) return dayKey;
   return d.toLocaleDateString([], { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
}

function formatShortDateTime(value) {
   if (!value) return '—';
   const d = new Date(value);
   if (Number.isNaN(d.getTime())) return String(value);
   return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
