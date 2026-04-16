import { useEffect, useMemo, useState } from 'react';
import { API } from '../config/api';
import { ShieldCheckIcon, VideoCameraIcon } from '@heroicons/react/24/solid';
import {
   ChatBubbleLeftRightIcon,
   MicrophoneIcon,
   PhoneXMarkIcon,
   SpeakerWaveIcon,
   UserGroupIcon,
} from '@heroicons/react/24/outline';

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
   const patientQueryIds = useMemo(() => {
      const values = [authUser?.id, authUser?.userId, authUser?.username, authUser?.email]
         .map((v) => (v == null ? '' : String(v).trim()))
         .filter(Boolean);
      return [...new Set(values)];
   }, [authUser]);
   const isDoctor = useMemo(() => {
      const role = authUser?.role;
      const roles = authUser?.roles;
      if (typeof role === 'string') return role.toUpperCase() === 'DOCTOR';
      if (Array.isArray(roles)) return roles.map(String).some((r) => r.toUpperCase() === 'DOCTOR');
      return false;
   }, [authUser]);

   const [availablePatients, setAvailablePatients] = useState([]);
   const [availableDoctors, setAvailableDoctors] = useState([]);
   const [doctorAppointments, setDoctorAppointments] = useState([]);
   const [patientsLoading, setPatientsLoading] = useState(false);
   const [patientsError, setPatientsError] = useState('');
   const [selectedApprovedAppointmentId, setSelectedApprovedAppointmentId] = useState('');
   const [digitalNow, setDigitalNow] = useState(new Date());

   const [myConsultations, setMyConsultations] = useState([]);
   const [consultationsLoading, setConsultationsLoading] = useState(false);
   const [selectedSessionDate, setSelectedSessionDate] = useState('');

   const [jitsiUrl, setJitsiUrl] = useState('');
   const [selectedScheduleKey, setSelectedScheduleKey] = useState('');
   const [micMuted, setMicMuted] = useState(false);
   const [speakerMuted, setSpeakerMuted] = useState(false);
   const [videoMuted, setVideoMuted] = useState(false);
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

   const doctorLookup = useMemo(() => {
      const map = new Map();
      availableDoctors.forEach((d) => {
         const did = d?.id || d?.userId || d?.username;
         if (did != null) {
            map.set(String(did), d?.name || d?.fullName || d?.username || String(did));
         }
      });
      return map;
   }, [availableDoctors]);

   const visibleConsultations = useMemo(() => {
      if (!isDoctor) return myConsultations;
      if (appointmentPatientIds.size === 0 && appointmentIds.size === 0) return [];

      return myConsultations.filter((c) => {
         const consultationPatientId = c?.patientId != null ? String(c.patientId) : '';
         const consultationAppointmentId = c?.appointmentId != null ? String(c.appointmentId) : '';
         return appointmentPatientIds.has(consultationPatientId) || appointmentIds.has(consultationAppointmentId);
      });
   }, [appointmentIds, appointmentPatientIds, isDoctor, myConsultations]);

   const availableSessionDates = useMemo(() => {
      const dates = new Set();
      visibleConsultations.forEach((c) => {
         dates.add(toDateKey(c?.scheduledAt || c?.startedAt || c?.createdAt));
      });
      return Array.from(dates)
         .filter((d) => d && d !== 'unknown-date')
         .sort((a, b) => b.localeCompare(a));
   }, [visibleConsultations]);

   const dateFilteredConsultations = useMemo(() => {
      if (!selectedSessionDate) return visibleConsultations;
      return visibleConsultations.filter((c) => {
         const dayKey = toDateKey(c?.scheduledAt || c?.startedAt || c?.createdAt);
         return dayKey === selectedSessionDate;
      });
   }, [selectedSessionDate, visibleConsultations]);

   const consultationsByDate = useMemo(() => {
      const groups = new Map();
      dateFilteredConsultations.forEach((c) => {
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
   }, [dateFilteredConsultations]);

   const consultationFeed = useMemo(() => {
      const rows = [];
      consultationsByDate.forEach((group) => {
         group.list.forEach((item) => rows.push(item));
      });
      return rows.slice(0, 12);
   }, [consultationsByDate]);

   const scheduleRows = useMemo(() => {
      return consultationFeed.map((item, idx) => ({
         ...item,
         rowKey: item?.id ? String(item.id) : `${item?.appointmentId || 'na'}-${idx}`,
      }));
   }, [consultationFeed]);

   const dayFilteredScheduleRows = useMemo(() => {
      if (!selectedSessionDate) return scheduleRows;
      return scheduleRows.filter((row) => {
         const day = toDateKey(row?.scheduledAt || row?.startedAt || row?.createdAt);
         return day === selectedSessionDate;
      });
   }, [scheduleRows, selectedSessionDate]);

   const selectedSchedule = useMemo(() => {
      if (!selectedScheduleKey) return dayFilteredScheduleRows[0] || null;
      return dayFilteredScheduleRows.find((row) => row.rowKey === selectedScheduleKey) || dayFilteredScheduleRows[0] || null;
   }, [dayFilteredScheduleRows, selectedScheduleKey]);

   const selectedScheduleDateLabel = useMemo(() => {
      if (!selectedSchedule) return 'No schedule selected';
      return formatAppointmentTime(selectedSchedule?.scheduledAt || selectedSchedule?.startedAt || selectedSchedule?.createdAt);
   }, [selectedSchedule]);

   useEffect(() => {
      if (!dayFilteredScheduleRows.length) {
         setSelectedScheduleKey('');
         return;
      }

      const hasExisting = dayFilteredScheduleRows.some((row) => row.rowKey === selectedScheduleKey);
      if (!hasExisting) {
         setSelectedScheduleKey(dayFilteredScheduleRows[0].rowKey);
      }
   }, [dayFilteredScheduleRows, selectedScheduleKey]);

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
         hashParams.set('config.startWithAudioMuted', micMuted ? 'true' : 'false');
         hashParams.set('config.startWithVideoMuted', videoMuted ? 'true' : 'false');
         hashParams.set('config.disableDeepLinking', 'true');
         url.hash = hashParams.toString();
         return url.toString();
      } catch {
         return jitsiUrl;
      }
   }, [jitsiUrl, micMuted, videoMuted]);

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

   const loadDoctorsIfPatient = async () => {
      if (isDoctor) return;
      try {
         const list = await API.doctors.getAll();
         setAvailableDoctors(Array.isArray(list) ? list : []);
      } catch {
         setAvailableDoctors([]);
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
         let normalized = [];

         if (isDoctor) {
            const list = await API.telemedSessions.listForDoctor(myId);
            normalized = Array.isArray(list) ? [...list] : [];
         } else {
            const idsToQuery = patientQueryIds.length > 0 ? patientQueryIds : [String(myId)];
            const results = await Promise.allSettled(idsToQuery.map((pid) => API.telemedSessions.listForPatient(pid)));

            const merged = [];
            results.forEach((res) => {
               if (res.status === 'fulfilled' && Array.isArray(res.value)) {
                  merged.push(...res.value);
               }
            });

            const byKey = new Map();
            merged.forEach((item, idx) => {
               const key = item?.id || `${item?.appointmentId || 'na'}-${item?.roomName || item?.roomId || 'na'}-${idx}`;
               if (!byKey.has(key)) byKey.set(key, item);
            });
            normalized = Array.from(byKey.values());
         }

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
      loadDoctorsIfPatient();
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
      const selectedPatientId = resolveAppointmentPatientId(selectedApprovedAppointment);
      if (!selectedPatientId) {
         setError('Selected appointment does not include a patient id.');
         return;
      }

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

   const handleEndSession = () => {
      setJitsiUrl('');
      setSelectedScheduleKey('');
      setFrameLoaded(false);
      setEmbedStuck(false);
   };

   return (
      <div className="space-y-3 animate-in fade-in slide-in-from-bottom-8 duration-1000">
         <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div className="flex items-center space-x-3">
               <div className="h-8 w-8 bg-primary-500 rounded-lg flex items-center justify-center shadow-lg shadow-primary-500/20">
                  <VideoCameraIcon className="h-5 w-5 text-white" />
               </div>
               <div>
                  <h1 className="text-lg font-black text-primary-500 tracking-tight">Consultation Room</h1>
                  <p className="text-[#808e9b] font-black uppercase tracking-widest text-[8px]">Live collaboration</p>
               </div>
            </div>
            <div className="text-[10px] font-black px-2 py-1 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700">
               {formatDigitalTime(digitalNow)}
            </div>
         </div>

         {error ? (
            <div className="bg-rose-50 border border-rose-200 px-3 py-2 rounded-lg text-[10px] font-black text-rose-700 uppercase tracking-widest">
               {error}
            </div>
         ) : null}

         {isDoctor ? (
            <div className="bg-white border border-slate-100 p-3 rounded-xl shadow-sm">
               <div className="flex flex-col md:flex-row md:items-center gap-2 md:justify-between mb-2">
                  <h3 className="text-xs font-black uppercase tracking-widest text-primary-500">Generate Consultation Link</h3>
                  <span className="text-[9px] font-black text-[#808e9b] uppercase tracking-widest">
                     Approved {patientsLoading ? '…' : approvedAppointments.length}
                  </span>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                  <select
                     value={selectedApprovedAppointmentId}
                     onChange={(e) => setSelectedApprovedAppointmentId(e.target.value)}
                     disabled={patientsLoading || isBusy || approvedAppointments.length === 0}
                     className="md:col-span-2 w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-black text-[#1e272e]"
                  >
                     <option value="">{patientsLoading ? 'Loading appointments…' : 'Select approved appointment…'}</option>
                     {approvedAppointments.map((a) => {
                        const pid = resolveAppointmentPatientId(a) || 'N/A';
                        return (
                           <option key={a?.id} value={a?.id}>
                              #{a?.id} - Patient {pid}
                           </option>
                        );
                     })}
                  </select>
                  <div className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-black text-[#1e272e]">
                     {resolveAppointmentPatientId(selectedApprovedAppointment) || '—'}
                  </div>
                  <button
                     type="button"
                     onClick={handleGenerateLink}
                     disabled={isBusy || !selectedApprovedAppointmentId || approvedAppointments.length === 0}
                     className="px-3 py-2 text-[10px] font-black rounded-lg bg-primary-500 text-white hover:bg-primary-500/90 transition-all uppercase tracking-widest disabled:opacity-60"
                  >
                     {isBusy ? 'Generating...' : 'Generate'}
                  </button>
               </div>
            </div>
         ) : null}

         <div className="rounded-4xl border border-slate-200 bg-[#f5f7fb] p-3 shadow-xl shadow-primary-500/5 min-h-155">
            <div className="flex gap-3 h-full">
               <div className="hidden lg:flex w-14 rounded-2xl bg-white border border-slate-100 flex-col items-center py-3 justify-between">
                  <div className="space-y-2">
                     <button className="h-9 w-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400">
                        <ChatBubbleLeftRightIcon className="h-4 w-4" />
                     </button>
                     <button className="h-9 w-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400">
                        <UserGroupIcon className="h-4 w-4" />
                     </button>
                     <button className="h-9 w-9 rounded-xl bg-primary-500/10 flex items-center justify-center text-primary-500 border border-primary-100">
                        <VideoCameraIcon className="h-4 w-4" />
                     </button>
                  </div>
                  <div className="h-8 w-8 rounded-full bg-slate-200" />
               </div>

               <div className="flex-1 space-y-3">
                  <div className="rounded-2xl bg-white border border-slate-100 p-3">
                     <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 pb-2 border-b border-slate-100">
                        <p className="text-sm font-black text-primary-500">Schedules</p>
                        <div className="flex items-center gap-2">
                           <input
                              type="date"
                              value={selectedSessionDate}
                              onChange={(e) => setSelectedSessionDate(e.target.value)}
                              className="px-2 py-1.5 border border-slate-200 rounded-md text-[10px] font-black text-[#1e272e] bg-white"
                           />
                           <button
                              type="button"
                              onClick={() => setSelectedSessionDate('')}
                              className="px-2 py-1 text-[9px] font-black uppercase tracking-widest rounded-md border border-slate-200 text-[#808e9b] hover:border-primary-500 hover:text-primary-500"
                           >
                              Clear
                           </button>
                        </div>
                     </div>

                     <div className="mt-2">
                        {dayFilteredScheduleRows.length === 0 ? (
                           <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[10px] font-black text-amber-800 uppercase tracking-widest">
                              No session for selected day.
                           </div>
                        ) : (
                           <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
                              {dayFilteredScheduleRows.map((c) => {
                                 const sender = isDoctor
                                    ? patientLookup.get(String(c?.patientId || '')) || c?.patientId || 'Patient'
                                    : doctorLookup.get(String(c?.doctorId || '')) || c?.doctorId || 'Doctor';
                                 const selected = c.rowKey === selectedSchedule?.rowKey;
                                 return (
                                    <div
                                       key={c.rowKey}
                                       className={`rounded-xl px-3 py-2 border cursor-pointer transition-all ${selected ? 'bg-primary-50 border-primary-200' : 'bg-slate-50 border-slate-200 hover:border-primary-200'}`}
                                       onClick={() => {
                                          setSelectedScheduleKey(c.rowKey);
                                       }}
                                    >
                                       <p className="text-[9px] font-black text-[#808e9b] uppercase tracking-widest">{sender}</p>
                                       <p className="text-xs font-bold text-[#1e272e] mt-1">Appointment {c?.appointmentId || 'N/A'}</p>
                                       <p className="text-[10px] font-semibold text-[#808e9b] mt-1">{formatAppointmentTime(c?.scheduledAt || c?.startedAt || c?.createdAt)}</p>
                                       <button
                                          type="button"
                                          onClick={(event) => {
                                             event.stopPropagation();
                                             setSelectedScheduleKey(c.rowKey);
                                             const link = c.sessionUrl || c.jitsiUrl || '';
                                             if (link) {
                                                setJitsiUrl(link);
                                             }
                                          }}
                                          className="mt-2 px-2 py-1 text-[9px] font-black rounded-md border border-slate-200 text-primary-500 hover:border-primary-500 uppercase tracking-widest"
                                       >
                                          Join session
                                       </button>
                                    </div>
                                 );
                              })}
                           </div>
                        )}
                     </div>
                  </div>

                  <div className="rounded-2xl bg-white border border-slate-100 p-3 flex flex-col">
                     <div className="flex items-center justify-between pb-2">
                        <p className="text-sm font-black text-primary-500">Consultation Video</p>
                        <div className="text-right">
                           <span className="block text-[9px] font-black uppercase tracking-widest text-[#808e9b]">
                              {jitsiUrl ? 'Connected' : 'Waiting'}
                           </span>
                           <span className="block text-[10px] font-black text-primary-500 mt-0.5">
                              {selectedScheduleDateLabel}
                           </span>
                        </div>
                     </div>

                     <div className="relative w-full aspect-video max-h-[72vh] rounded-2xl overflow-hidden bg-slate-900">
                        {jitsiUrl ? (
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
                        ) : (
                           <div className="absolute inset-0 grid place-items-center text-center p-8">
                              <div>
                                 <VideoCameraIcon className="h-10 w-10 text-white/70 mx-auto" />
                                 <p className="mt-3 text-sm font-black text-white">No active session</p>
                                 <p className="text-xs text-white/70 mt-1">Pick a day, select schedule above, then click Join session.</p>
                              </div>
                           </div>
                        )}

                        <div className="absolute top-3 left-3 p-2 bg-white/10 backdrop-blur-md rounded-xl border border-white/15 z-10 flex items-center space-x-2">
                           <ShieldCheckIcon className="h-4 w-4 text-accent-red" />
                           <span className="text-[10px] font-black text-white uppercase tracking-widest">Secure</span>
                        </div>

                        <div className="absolute top-3 right-3 z-10 space-y-2">
                           {consultationPatients.slice(0, 4).map((p, idx) => {
                              const label = p?.name || p?.username || `P${idx + 1}`;
                              return (
                                 <div key={String(p?.id || p?.userId || idx)} className="h-12 w-12 rounded-xl border-2 border-white/80 bg-slate-200 text-[10px] font-black text-primary-500 flex items-center justify-center overflow-hidden">
                                    {String(label).slice(0, 2).toUpperCase()}
                                 </div>
                              );
                           })}
                        </div>

                        {embedStuck ? (
                           <div className="absolute bottom-3 right-3 z-10 bg-black/45 border border-white/20 rounded-md px-3 py-2 text-white text-[10px] font-black uppercase tracking-widest">
                              Loading stuck. Reload and rejoin.
                           </div>
                        ) : null}
                     </div>

                     <div className="mt-3 flex items-center justify-center gap-2">
                        <button
                           type="button"
                           onClick={() => setMicMuted((prev) => !prev)}
                           className={`h-10 w-10 rounded-full border flex items-center justify-center transition-all ${micMuted ? 'bg-amber-100 border-amber-300 text-amber-700' : 'bg-slate-100 border-slate-200 text-slate-600'}`}
                           title={micMuted ? 'Unmute microphone' : 'Mute microphone'}
                        >
                           <MicrophoneIcon className="h-5 w-5" />
                        </button>
                        <button
                           type="button"
                           onClick={() => setSpeakerMuted((prev) => !prev)}
                           className={`h-10 w-10 rounded-full border flex items-center justify-center transition-all ${speakerMuted ? 'bg-amber-100 border-amber-300 text-amber-700' : 'bg-slate-100 border-slate-200 text-slate-600'}`}
                           title={speakerMuted ? 'Unmute speaker' : 'Mute speaker'}
                        >
                           <SpeakerWaveIcon className="h-5 w-5" />
                        </button>
                        <button
                           type="button"
                           onClick={handleEndSession}
                           className="h-10 w-10 rounded-full bg-rose-500 flex items-center justify-center text-white shadow-lg shadow-rose-500/30"
                           title="End session"
                        >
                           <PhoneXMarkIcon className="h-5 w-5" />
                        </button>
                        <button
                           type="button"
                           onClick={() => setVideoMuted((prev) => !prev)}
                           className={`h-10 w-10 rounded-full border flex items-center justify-center transition-all ${videoMuted ? 'bg-amber-100 border-amber-300 text-amber-700' : 'bg-primary-500/10 border-primary-100 text-primary-500'}`}
                           title={videoMuted ? 'Turn camera on' : 'Turn camera off'}
                        >
                           <VideoCameraIcon className="h-5 w-5" />
                        </button>
                     </div>
                     <div className="mt-2 flex items-center justify-center gap-2">
                        <span className={`px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${micMuted ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                           Mic {micMuted ? 'Off' : 'On'}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${speakerMuted ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                           Speaker {speakerMuted ? 'Off' : 'On'}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${videoMuted ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                           Camera {videoMuted ? 'Off' : 'On'}
                        </span>
                     </div>
                  </div>
               </div>
            </div>
         </div>
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

function resolveAppointmentPatientId(appointment) {
   if (!appointment || typeof appointment !== 'object') return '';
   const candidate =
      appointment.patientId ||
      appointment.patientID ||
      appointment.userId ||
      appointment.patient?.id ||
      appointment.patient?.userId ||
      appointment.patient?.username ||
      appointment.patientUsername;

   return candidate == null ? '' : String(candidate).trim();
}
