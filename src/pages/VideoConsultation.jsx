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
   const [patientsLoading, setPatientsLoading] = useState(false);
   const [patientsError, setPatientsError] = useState('');
   const [selectedPatientId, setSelectedPatientId] = useState('');
   const [scheduledDate, setScheduledDate] = useState('');
   const [scheduledTime, setScheduledTime] = useState('');

   const timeOptions = useMemo(() => {
      const options = [];
      for (let hour = 0; hour < 24; hour += 1) {
         for (let minute = 0; minute < 60; minute += 15) {
            const hh = String(hour).padStart(2, '0');
            const mm = String(minute).padStart(2, '0');
            options.push(`${hh}:${mm}`);
         }
      }
      return options;
   }, []);

   const [myConsultations, setMyConsultations] = useState([]);
   const [consultationsLoading, setConsultationsLoading] = useState(false);

   const [jitsiUrl, setJitsiUrl] = useState('');
   const [frameLoaded, setFrameLoaded] = useState(false);
   const [embedStuck, setEmbedStuck] = useState(false);
   const [isBusy, setIsBusy] = useState(false);
   const [error, setError] = useState('');

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
      // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [isDoctor]);

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
      if (!selectedPatientId) {
         setError('Select a patient');
         return;
      }
      if (!scheduledDate || !scheduledTime) {
         setError('Select date and time');
         return;
      }
      if (isBusy) return;

      const appointmentId = `${myId}-${selectedPatientId}-${scheduledDate}-${scheduledTime}`
         .toLowerCase()
         .replace(/[^a-z0-9_-]/g, '-');

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
            <div className="bg-white border border-slate-50 p-3 rounded-lg shadow-sm">
               <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-black text-primary-500 tracking-tight">Schedule Consultation</h3>
                  <span className="text-[9px] font-black text-[#808e9b] uppercase tracking-widest">
                     {patientsLoading ? 'Loading…' : `${availablePatients.length}`}
                  </span>
               </div>

               {patientsError ? (
                  <div className="text-[10px] font-bold text-accent-red mb-2">{patientsError}</div>
               ) : null}

               <div className="flex flex-col md:flex-row gap-2 md:items-center">
                  <select
                     value={selectedPatientId}
                     onChange={(e) => setSelectedPatientId(e.target.value)}
                     disabled={patientsLoading || isBusy}
                     className="flex-1 px-2 py-2 bg-slate-50 border border-transparent rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500/5 focus:border-primary-500 text-xs text-[#1e272e] font-black transition-all"
                  >
                     <option value="">{patientsLoading ? 'Loading patients…' : 'Select a patient…'}</option>
                     {availablePatients.map((p) => {
                        const pid = p?.id || p?.userId;
                        const label = `${p?.name || p?.username || 'Patient'} (ID: ${pid})`;
                        return (
                           <option key={pid} value={pid}>
                              {label}
                           </option>
                        );
                     })}
                  </select>

                  <input
                     id="scheduledDate"
                     name="scheduledDate"
                     type="date"
                     value={scheduledDate}
                     onChange={(e) => setScheduledDate(e.target.value)}
                     disabled={isBusy}
                     className="flex-1 px-2 py-2 bg-slate-50 border border-transparent rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500/5 focus:border-primary-500 text-xs text-[#1e272e] font-black transition-all"
                  />

                  <select
                     id="scheduledTime"
                     name="scheduledTime"
                     value={scheduledTime}
                     onChange={(e) => setScheduledTime(e.target.value)}
                     disabled={isBusy}
                     className="flex-1 px-2 py-2 bg-slate-50 border border-transparent rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500/5 focus:border-primary-500 text-xs text-[#1e272e] font-black transition-all"
                  >
                     <option value="">Select time…</option>
                     {timeOptions.map((t) => (
                        <option key={t} value={t}>
                           {t}
                        </option>
                     ))}
                  </select>

                  <button
                     type="button"
                     onClick={handleGenerateLink}
                     disabled={isBusy || !selectedPatientId || !scheduledDate || !scheduledTime}
                     className="px-4 py-2 text-[10px] font-black rounded-md bg-primary-500 text-white hover:bg-primary-500/90 transition-all uppercase tracking-widest disabled:opacity-60"
                  >
                     {isBusy ? 'Working…' : 'Generate Link'}
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

            <div className="space-y-2 max-h-[220px] overflow-y-auto">
               {myConsultations.map((c) => (
                  <div key={c.id} className="flex items-center justify-between px-3 py-2 rounded-md border border-slate-50">
                     <div>
                        <div className="text-[11px] font-black text-[#1e272e]">
                           {c.status}
                           {c.startedAt ? ` • ${new Date(c.startedAt).toLocaleString()}` : ''}
                        </div>
                        <div className="text-[9px] font-bold text-[#808e9b]">Room: {c.roomName || c.roomId}</div>
                     </div>
                     {(c.sessionUrl || c.jitsiUrl) ? (
                        <div className="flex items-center gap-2">
                           <button
                              type="button"
                              onClick={() => {
                                 const link = c.sessionUrl || c.jitsiUrl || '';
                                 setJitsiUrl(link);
                              }}
                              className="px-2 py-1 text-[9px] font-black rounded-md border border-slate-50 text-primary-500 hover:border-primary-500 transition-all uppercase tracking-widest"
                           >
                              Join Here
                           </button>
                        </div>
                     ) : null}
                  </div>
               ))}

               {!consultationsLoading && myConsultations.length === 0 ? (
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
