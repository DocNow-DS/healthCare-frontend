import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { API } from '../config/api';
import {
   VideoCameraIcon,
   MicrophoneIcon,
   ChatBubbleBottomCenterIcon,
   PhoneXMarkIcon,
   ShieldCheckIcon,
   UserIcon,
   VideoCameraSlashIcon,
} from '@heroicons/react/24/solid';
import { MicrophoneIcon as MicrophoneOffIcon } from '@heroicons/react/24/outline';

export default function VideoConsultation() {
   const [searchParams] = useSearchParams();

   const initialAppointmentId = useMemo(() => {
      const raw = searchParams.get('appointmentId');
      return typeof raw === 'string' ? raw : '';
   }, [searchParams]);

   const [appointmentId, setAppointmentId] = useState(initialAppointmentId);
   const [session, setSession] = useState(null);
   const [jitsiUrl, setJitsiUrl] = useState('');
   const [peerPatientId, setPeerPatientId] = useState('');
   const [copied, setCopied] = useState(false);
   const [checkingMedia, setCheckingMedia] = useState(false);
   const [mediaReady, setMediaReady] = useState(false);
   const [isBusy, setIsBusy] = useState(false);
   const [error, setError] = useState('');
   const [isMicEnabled, setIsMicEnabled] = useState(true);
   const [isVideoEnabled, setIsVideoEnabled] = useState(true);
   const [logs, setLogs] = useState(() => [
      'Ready',
      initialAppointmentId ? `Loaded appointment ${initialAppointmentId}` : 'Enter an appointment ID to start',
   ]);
   const localVideoRef = useRef(null);
   const mainVideoRef = useRef(null);
   const previewPanelVideoRef = useRef(null);
   const previewStreamRef = useRef(null);

   const embedUrl = useMemo(() => {
      if (!jitsiUrl) return '';
      // Force camera/mic ON by default in the embedded conference.
      return `${jitsiUrl}#config.startWithAudioMuted=false&config.startWithVideoMuted=false&config.prejoinPageEnabled=false`;
   }, [jitsiUrl]);

   const pushLog = (message) => {
      setLogs((prev) => [...prev.slice(-24), message]);
   };

   const stopPreviewStream = () => {
      if (previewStreamRef.current) {
         previewStreamRef.current.getTracks().forEach((track) => track.stop());
         previewStreamRef.current = null;
      }
      if (localVideoRef.current) {
         localVideoRef.current.srcObject = null;
      }
      if (mainVideoRef.current) {
         mainVideoRef.current.srcObject = null;
      }
      if (previewPanelVideoRef.current) {
         previewPanelVideoRef.current.srcObject = null;
      }
   };

   const attachPreviewStream = useCallback(async (stream) => {
      const targets = [localVideoRef.current, mainVideoRef.current, previewPanelVideoRef.current].filter(Boolean);
      targets.forEach((el) => {
         el.srcObject = stream;
      });
      await Promise.all(targets.map((el) => el.play().catch(() => undefined)));
   }, []);

   const normalizedAppointmentId = useMemo(() => appointmentId.trim(), [appointmentId]);

   useEffect(() => {
      if (initialAppointmentId && initialAppointmentId !== appointmentId) {
         setAppointmentId(initialAppointmentId);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [initialAppointmentId]);

   useEffect(() => {
      return () => {
         stopPreviewStream();
      };
   }, []);

   useEffect(() => {
      if (previewStreamRef.current && mediaReady) {
         attachPreviewStream(previewStreamRef.current);
      }
   }, [mediaReady, attachPreviewStream]);

   useEffect(() => {
      if (previewStreamRef.current && mediaReady && isVideoEnabled) {
         attachPreviewStream(previewStreamRef.current);
      }
   }, [isVideoEnabled, mediaReady, attachPreviewStream]);

   const checkMediaDevices = async () => {
      if (checkingMedia) return mediaReady;

      setCheckingMedia(true);
      setError('');
      try {
         stopPreviewStream();
         pushLog('Checking camera and microphone…');
         const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
         previewStreamRef.current = stream;
         await attachPreviewStream(stream);

         const hasLiveVideo = stream.getVideoTracks().some((track) => track.readyState === 'live' && track.enabled);
         const hasLiveAudio = stream.getAudioTracks().some((track) => track.readyState === 'live' && track.enabled);

         if (!hasLiveVideo || !hasLiveAudio) {
            throw new Error('Camera or microphone is not active');
         }

         setMediaReady(true);
         setIsMicEnabled(true);
         setIsVideoEnabled(true);
         pushLog('Mic and camera check passed');
         return true;
      } catch (e) {
         setMediaReady(false);
         const message = e?.message || 'Unable to access camera and microphone';
         setError(message);
         pushLog(`Media check failed: ${message}`);
         return false;
      } finally {
         setCheckingMedia(false);
      }
   };

   const ensureAppointmentId = () => {
      if (!normalizedAppointmentId) {
         setError('Appointment ID is required');
         pushLog('Missing appointment ID');
         return null;
      }
      return normalizedAppointmentId;
   };

   const handleCreateSession = async () => {
      const patientId = ensureAppointmentId();
      if (!patientId || isBusy) return;

      const mediaOk = await checkMediaDevices();
      if (!mediaOk) return;

      setIsBusy(true);
      setError('');
      try {
         pushLog('Creating patient session…');
         const created = await API.telemedicine.createPatientSession(patientId);
         setSession(created);
         setJitsiUrl(created?.jitsiUrl || '');
         pushLog('Session active');
      } catch (e) {
         const status = e?.status;
         const message = status === 404
            ? 'Telemedicine endpoint not found (404). Restart telemedicine-service on port 8083 to load latest routes.'
            : (e?.message || 'Failed to create session');
         setError(message);
         pushLog(`Error: ${message}`);
      } finally {
         setIsBusy(false);
      }
   };

   const handleJoinSession = async () => {
      const apptId = ensureAppointmentId();
      if (!apptId || isBusy) return;

      setIsBusy(true);
      setError('');
      try {
         pushLog('Joining session…');
         const joined = await API.telemedicine.joinSession(apptId);
         setJitsiUrl(joined?.jitsiUrl || '');
         pushLog('Joined');
      } catch (e) {
         const message = e?.message || 'Failed to join session';
         setError(message);
         pushLog(`Error: ${message}`);
      } finally {
         setIsBusy(false);
      }
   };

   const handleEndSession = async () => {
      const apptId = ensureAppointmentId();
      if (!apptId || isBusy) return;

      setIsBusy(true);
      setError('');
      try {
         pushLog('Ending session…');
         const ended = await API.telemedicine.endSession(apptId);
         setSession(ended);
         setJitsiUrl('');
         pushLog('Session ended');
      } catch (e) {
         const message = e?.message || 'Failed to end session';
         setError(message);
         pushLog(`Error: ${message}`);
      } finally {
         setIsBusy(false);
      }
   };

   const handleDirectCall = async () => {
      const primary = normalizedAppointmentId;
      const peer = peerPatientId.trim();
      if (!primary || !peer) {
         setError('Both Patient IDs are required for direct call');
         pushLog('Missing patient IDs for direct call');
         return;
      }
      if (isBusy) return;

      const mediaOk = await checkMediaDevices();
      if (!mediaOk) return;

      setIsBusy(true);
      setError('');
      setCopied(false);
      try {
         pushLog('Creating direct patient call…');
         const created = await API.telemedicine.createDirectSession({
            patientId: primary,
            peerPatientId: peer,
         });
         setSession(created);
         setJitsiUrl(created?.jitsiUrl || '');
         pushLog('Direct session active');
      } catch (e) {
         const status = e?.status;
         const message = status === 404
            ? 'Telemedicine endpoint not found (404). Restart telemedicine-service on port 8083 to load latest routes.'
            : (e?.message || 'Failed to create direct session');
         setError(message);
         pushLog(`Error: ${message}`);
      } finally {
         setIsBusy(false);
      }
   };

   const handleCopyLink = async () => {
      if (!jitsiUrl) return;
      try {
         await navigator.clipboard.writeText(jitsiUrl);
         setCopied(true);
         pushLog('Join link copied');
      } catch {
         setError('Failed to copy link');
      }
   };

   const toggleMicrophone = async () => {
      if (!mediaReady) {
         await checkMediaDevices();
         return;
      }
      if (previewStreamRef.current) {
         const audioTracks = previewStreamRef.current.getAudioTracks();
         audioTracks.forEach(track => {
            track.enabled = !track.enabled;
         });
         setIsMicEnabled(!isMicEnabled);
         pushLog(isMicEnabled ? 'Microphone muted' : 'Microphone unmuted');
      }
   };

   const toggleVideo = async () => {
      if (!mediaReady) {
         await checkMediaDevices();
         return;
      }
      if (previewStreamRef.current) {
         const videoTracks = previewStreamRef.current.getVideoTracks();
         videoTracks.forEach(track => {
            track.enabled = !track.enabled;
         });
         setIsVideoEnabled(!isVideoEnabled);
         pushLog(isVideoEnabled ? 'Camera off' : 'Camera on');
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
        <div className="hidden lg:flex items-center space-x-2 bg-white border border-slate-50 px-3 py-1.5 rounded-lg shadow-sm">
           <div className="text-right">
              <p className="text-[7px] font-black text-[#808e9b] uppercase tracking-widest">Consultant</p>
                     <p className="text-[11px] font-black text-primary-500">Dr. Sarah Wilson</p>
           </div>
           <div className="h-6 w-6 rounded-lg bg-slate-100 overflow-hidden ml-2">
              <img src="https://i.pravatar.cc/150?u=1" alt="doc" />
           </div>
        </div>
      </div>

         <div className="bg-white border border-slate-50 px-3 py-2 rounded-lg shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <div className="flex items-center gap-2 flex-1">
               <label className="text-[9px] font-black text-[#808e9b] uppercase tracking-widest whitespace-nowrap">
                  Patient ID
               </label>
               <input
                  value={appointmentId}
                  onChange={(e) => setAppointmentId(e.target.value)}
                  placeholder="e.g. 123"
                    className="flex-1 min-w-0 px-2 py-1.5 bg-slate-50 border border-transparent rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500/5 focus:border-primary-500 text-xs text-[#1e272e] font-black transition-all"
               />
            </div>

            <div className="flex items-center gap-2 flex-1">
               <label className="text-[9px] font-black text-[#808e9b] uppercase tracking-widest whitespace-nowrap">
                  Peer ID
               </label>
               <input
                  value={peerPatientId}
                  onChange={(e) => setPeerPatientId(e.target.value)}
                  placeholder="peer id"
                  className="flex-1 min-w-0 px-2 py-1.5 bg-slate-50 border border-transparent rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500/5 focus:border-primary-500 text-xs text-[#1e272e] font-black transition-all"
               />
            </div>

            <div className="flex items-center gap-1.5">
               <button
                  type="button"
                  onClick={checkMediaDevices}
                  disabled={isBusy || checkingMedia}
                  className="px-3 py-1.5 text-[9px] font-black rounded-md border border-slate-50 text-primary-500 hover:border-primary-500 transition-all uppercase tracking-widest disabled:opacity-60"
               >
                  {checkingMedia ? 'Checking…' : 'Check'}
               </button>
               <button
                  type="button"
                  onClick={handleCreateSession}
                  disabled={isBusy}
                  className="btn-primary px-3 py-1.5 text-[9px] disabled:opacity-60"
               >
                  {isBusy ? 'Working…' : 'Start'}
               </button>
               <button
                  type="button"
                  onClick={handleDirectCall}
                  disabled={isBusy}
                  className="px-3 py-1.5 text-[9px] font-black rounded-md border border-slate-50 text-primary-500 hover:border-primary-500 transition-all uppercase tracking-widest disabled:opacity-60"
               >
                  Direct
               </button>
               <button
                  type="button"
                  onClick={handleJoinSession}
                  disabled={isBusy}
                  className="px-3 py-1.5 text-[9px] font-black rounded-md border border-slate-50 text-primary-500 hover:border-primary-500 transition-all uppercase tracking-widest disabled:opacity-60"
               >
                  Join
               </button>
               <button
                  type="button"
                  onClick={handleEndSession}
                  disabled={isBusy}
                  className="px-3 py-1.5 text-[9px] font-black rounded-md border border-slate-50 text-accent-red hover:border-accent-red transition-all uppercase tracking-widest disabled:opacity-60"
               >
                  End
               </button>
            </div>

            <div className="flex items-center gap-3">
               <div className="text-[9px] font-black uppercase tracking-widest text-[#808e9b]">
                  Media: {mediaReady ? '✓ Ready' : 'Not checked'}
               </div>
               {mediaReady && (
                  <div className="flex items-center gap-2">
                     <span className={`text-[8px] font-black uppercase tracking-widest ${isMicEnabled ? 'text-green-600' : 'text-red-600'}`}>
                        Mic: {isMicEnabled ? 'ON' : 'OFF'}
                     </span>
                     <span className={`text-[8px] font-black uppercase tracking-widest ${isVideoEnabled ? 'text-green-600' : 'text-red-600'}`}>
                        Cam: {isVideoEnabled ? 'ON' : 'OFF'}
                     </span>
                  </div>
               )}
            </div>

            {error ? (
               <div className="text-[9px] font-black text-accent-red uppercase tracking-widest">
                  {error}
               </div>
            ) : null}

            {jitsiUrl ? (
               <div className="flex items-center gap-1.5">
                  <button
                     type="button"
                     onClick={handleCopyLink}
                     className="px-2 py-1 text-[9px] font-black rounded-md border border-slate-50 text-primary-500 hover:border-primary-500 transition-all uppercase tracking-widest"
                  >
                     {copied ? 'Copied' : 'Copy Link'}
                  </button>
                  <a
                     href={jitsiUrl}
                     target="_blank"
                     rel="noreferrer"
                     className="px-2 py-1 text-[9px] font-black rounded-md border border-slate-50 text-primary-500 hover:border-primary-500 transition-all uppercase tracking-widest"
                  >
                     Open Call
                  </a>
               </div>
            ) : null}

            {/* Hidden video element for stream attachment */}
            <video ref={previewPanelVideoRef} autoPlay muted playsInline className="hidden" />
         </div>

      <div className="flex-1 flex gap-4 min-h-0 relative">
        {/* Main Video Area */}
      <div className="flex-1 bg-slate-900 rounded-4xl shadow-xl relative overflow-hidden ring-4 ring-white group">
               {/* Main Feed */}
               {jitsiUrl ? (
                  <iframe
                     title="Telemedicine session"
                     src={embedUrl}
                     className="absolute inset-0 w-full h-full"
                     style={{ border: 0 }}
                     allow="camera; microphone; fullscreen; display-capture; autoplay"
                  />
               ) : (
                  <>
                     <video
                        ref={mainVideoRef}
                        autoPlay
                        muted
                        playsInline
                        className={`absolute inset-0 w-full h-full object-cover ${mediaReady && isVideoEnabled ? 'block' : 'hidden'}`}
                     />
                     <div className={`absolute inset-0 flex items-center justify-center opacity-40 ${mediaReady && isVideoEnabled ? 'hidden' : 'flex'}`}>
                        {mediaReady && !isVideoEnabled ? (
                           <div className="flex flex-col items-center space-y-4">
                              <VideoCameraSlashIcon className="h-32 w-32 text-white/20" />
                              <p className="text-white/40 text-sm font-black uppercase tracking-widest">Camera is off</p>
                           </div>
                        ) : (
                           <UserIcon className="h-48 w-48 text-white/10" />
                        )}
                     </div>
                  </>
               )}

          {/* Self Feed - only show during active session */}
          {jitsiUrl && (
             <div className="absolute top-6 right-6 w-48 h-32 bg-slate-800 rounded-2xl border-2 border-white/10 shadow-xl z-20 overflow-hidden">
                      <video
                         ref={localVideoRef}
                         autoPlay
                         muted
                         playsInline
                         className={`absolute inset-0 w-full h-full object-cover ${mediaReady && isVideoEnabled ? 'block' : 'hidden'}`}
                      />
                      {mediaReady && !isVideoEnabled && (
                         <div className="absolute inset-0 flex items-center justify-center bg-slate-800">
                            <VideoCameraSlashIcon className="h-12 w-12 text-white/20" />
                         </div>
                      )}
                <p className="absolute bottom-2 left-4 text-[8px] font-black text-white/50 uppercase tracking-widest">Self View</p>
                {mediaReady && (
                   <div className="absolute top-2 right-2 flex items-center space-x-1">
                      <div className={`p-1 rounded ${isMicEnabled ? 'bg-green-500/30' : 'bg-red-500/30'}`}>
                         {isMicEnabled ? (
                            <MicrophoneIcon className="h-2.5 w-2.5 text-green-400" />
                         ) : (
                            <MicrophoneOffIcon className="h-2.5 w-2.5 text-red-400" />
                         )}
                      </div>
                      <div className={`p-1 rounded ${isVideoEnabled ? 'bg-green-500/30' : 'bg-red-500/30'}`}>
                         {isVideoEnabled ? (
                            <VideoCameraIcon className="h-2.5 w-2.5 text-green-400" />
                         ) : (
                            <VideoCameraSlashIcon className="h-2.5 w-2.5 text-red-400" />
                         )}
                      </div>
                   </div>
                )}
             </div>
          )}

          {/* Controls */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center space-x-4 z-30">
             <button
               type="button"
               onClick={toggleMicrophone}
               disabled={isBusy || checkingMedia}
               className={`p-4 rounded-xl backdrop-blur-md border border-white/10 hover:scale-105 transition-all ${
                  isMicEnabled
                     ? 'bg-white/10 text-white'
                     : 'bg-accent-red text-white'
               } disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100`}
               title={isMicEnabled ? 'Mute microphone' : 'Unmute microphone'}
             >
                {isMicEnabled ? (
                   <MicrophoneIcon className="h-5 w-5" />
                ) : (
                   <MicrophoneOffIcon className="h-5 w-5" />
                )}
             </button>

             <button
               type="button"
               onClick={toggleVideo}
               disabled={isBusy || checkingMedia}
               className={`p-4 rounded-xl backdrop-blur-md border border-white/10 hover:scale-105 transition-all ${
                  isVideoEnabled
                     ? 'bg-white/10 text-white'
                     : 'bg-accent-red text-white'
               } disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100`}
               title={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
             >
                {isVideoEnabled ? (
                   <VideoCameraIcon className="h-5 w-5" />
                ) : (
                   <VideoCameraSlashIcon className="h-5 w-5" />
                )}
             </button>

             <button
               type="button"
               className="p-4 rounded-xl bg-white/10 text-white backdrop-blur-md border border-white/10 hover:scale-105 transition-all opacity-60"
               title="Chat (coming soon)"
             >
                <ChatBubbleBottomCenterIcon className="h-5 w-5" />
             </button>

             <button
               type="button"
               onClick={handleEndSession}
               disabled={isBusy}
               className="p-6 rounded-2xl bg-accent-red text-white shadow-lg hover:scale-105 transition-all disabled:opacity-70 disabled:hover:scale-100"
               title="End call"
             >
                <PhoneXMarkIcon className="h-6 w-6" />
             </button>
          </div>

          {/* Overlays */}
          <div className="absolute top-6 left-6 p-4 bg-white/10 backdrop-blur-md rounded-xl border border-white/10 z-10 flex items-center space-x-2">
             <ShieldCheckIcon className="h-4 w-4 text-accent-red" />
             <span className="text-[10px] font-black text-white uppercase tracking-widest">Secure</span>
          </div>
        </div>

        {/* Action Panel */}
        <div className="w-64 hidden xl:flex flex-col gap-4">
           <div className="bg-white border border-slate-50 p-4 rounded-2xl shadow-sm flex-1">
              <div className="flex items-center justify-between mb-3">
                 <h3 className="text-sm font-black text-primary-500 tracking-tight">Log</h3>
              </div>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                 {logs.map((log, i) => (
                    <div key={i} className="flex items-start space-x-2 opacity-50">
                       <div className="h-1 w-1 rounded-full bg-primary-500 mt-1"></div>
                       <p className="text-[10px] font-bold text-[#808e9b]">{log}</p>
                    </div>
                 ))}
              </div>
           </div>

           <div className="bg-primary-500 p-4 rounded-2xl shadow-lg shadow-primary-500/20">
              <h3 className="text-white font-black text-sm mb-2">Support</h3>
              <button className="w-full py-2 bg-white text-primary-500 font-black rounded-lg hover:bg-accent-red hover:text-white transition-all uppercase tracking-widest text-[8px]">
                Support Portal
              </button>
           </div>
        </div>
      </div>
    </div>
  );
}
