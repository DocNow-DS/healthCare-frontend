import {
  CalendarIcon,
  UserGroupIcon,
  ChatBubbleBottomCenterTextIcon,
  BeakerIcon,
  PlusIcon,
  ExclamationTriangleIcon,
  VideoCameraIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API } from '../config/api';

const readAuthUser = () => {
  try {
    const userRaw = localStorage.getItem('auth_user');
    return userRaw ? JSON.parse(userRaw) : null;
  } catch {
    return null;
  }
};

const normalizeId = (value) => String(value || '').trim();

const parseSessionDate = (session) => {
  const value = session?.startedAt || session?.createdAt || session?.updatedAt || null;
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatDateTime = (value) => {
  if (!value) return 'Unknown time';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown time';
  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default function Home() {
  const navigate = useNavigate();
  const user = useMemo(() => readAuthUser() || { username: 'patient' }, []);
  const patientId = useMemo(
    () => normalizeId(user?.id || user?.userId || user?.username || user?.email),
    [user]
  );

  const [loading, setLoading] = useState(true);
  const [warning, setWarning] = useState('');
  const [stats, setStats] = useState({
    activeAppointments: 0,
    medicalReports: 0,
    assignedDoctors: 0,
    completedSessions: 0,
  });
  const [appointments, setAppointments] = useState([]);
  const [profileName, setProfileName] = useState(user?.name || user?.username || 'Patient');

  const fetchPatientDashboard = async () => {
    setLoading(true);
    setWarning('');

    let profile = null;
    let doctors = [];
    let sessions = [];
    let reports = [];
    let prescriptions = [];
    const failed = [];

    try {
      try {
        profile = await API.patients.getProfile();
      } catch {
        failed.push('profile');
      }

      try {
        doctors = await API.doctors.getAll();
      } catch {
        failed.push('doctors');
      }

      if (patientId) {
        try {
          sessions = await API.telemedSessions.listForPatient(patientId);
        } catch {
          failed.push('telemed-sessions');
        }
      }

      try {
        reports = await API.patients.getReports();
      } catch {
        failed.push('reports');
      }

      try {
        prescriptions = await API.patients.getPrescriptions();
      } catch {
        failed.push('prescriptions');
      }

      const safeDoctors = Array.isArray(doctors) ? doctors : [];
      const safeSessions = Array.isArray(sessions) ? sessions : [];
      const safeReports = Array.isArray(reports) ? reports : [];
      const safePrescriptions = Array.isArray(prescriptions) ? prescriptions : [];

      const doctorById = new Map(
        safeDoctors.map((d) => [normalizeId(d?.id || d?.userId), d])
      );

      const sortedSessions = [...safeSessions].sort((a, b) => {
        const aTime = parseSessionDate(a)?.getTime() || 0;
        const bTime = parseSessionDate(b)?.getTime() || 0;
        return bTime - aTime;
      });

      const activeAppointments = sortedSessions.filter(
        (s) => String(s?.status || '').toUpperCase() !== 'ENDED'
      ).length;

      const completedSessions = sortedSessions.filter(
        (s) => String(s?.status || '').toUpperCase() === 'ENDED'
      ).length;

      const mappedAppointments = sortedSessions.slice(0, 4).map((session, index) => {
        const doctorIdFromSession = normalizeId(session?.doctorId);
        const matchedDoctor = doctorById.get(doctorIdFromSession);
        const doctorName =
          matchedDoctor?.name ||
          matchedDoctor?.fullName ||
          matchedDoctor?.username ||
          `Doctor ${doctorIdFromSession || index + 1}`;

        return {
          id: session?.id || `${doctorIdFromSession || 'doctor'}-${index}`,
          doctorName,
          schedule: formatDateTime(session?.startedAt || session?.createdAt),
          status: String(session?.status || 'IN_SESSION').toUpperCase(),
        };
      });

      setProfileName(
        profile?.name || profile?.fullName || profile?.username || user?.name || user?.username || 'Patient'
      );

      setStats({
        activeAppointments,
        medicalReports: safeReports.length + safePrescriptions.length,
        assignedDoctors: new Set(
          safeSessions
            .map((s) => normalizeId(s?.doctorId))
            .filter(Boolean)
        ).size || safeDoctors.length,
        completedSessions,
      });

      setAppointments(mappedAppointments);

      if (failed.length > 0) {
        setWarning(`Some sections failed to load (${failed.join(', ')}). Showing available live data.`);
      }
    } catch {
      setWarning('Failed to load dashboard. Please check backend services and retry.');
      setStats({
        activeAppointments: 0,
        medicalReports: 0,
        assignedDoctors: 0,
        completedSessions: 0,
      });
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatientDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

  const dashboardStats = [
    {
      name: 'Active Appointments',
      value: String(stats.activeAppointments).padStart(2, '0'),
      icon: CalendarIcon,
      color: 'bg-[#182C61]',
    },
    {
      name: 'Medical Reports',
      value: String(stats.medicalReports).padStart(2, '0'),
      icon: DocumentTextIcon,
      color: 'bg-indigo-600',
    },
    {
      name: 'Assigned Doctors',
      value: String(stats.assignedDoctors).padStart(2, '0'),
      icon: UserGroupIcon,
      color: 'bg-emerald-600',
    },
    {
      name: 'Completed Sessions',
      value: String(stats.completedSessions).padStart(2, '0'),
      icon: VideoCameraIcon,
      color: 'bg-[#eb2f06]',
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000">
      <div className="flex items-end justify-between border-b-2 border-slate-50 pb-6">
        <div>
          <h1 className="text-3xl font-black text-[#182C61] tracking-tighter leading-none">
            Welcome, {profileName}<span className="text-[#eb2f06]">!</span>
          </h1>
          <p className="text-[#808e9b] mt-3 font-black uppercase tracking-[0.2em] text-[10px]">
            Patient Portal • <span className="text-[#eb2f06]">Live Data</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={fetchPatientDashboard}
            className="px-4 py-2 bg-[#182C61] text-white rounded-xl hover:bg-[#182C61]/85 transition-colors font-black text-sm"
          >
            Refresh
          </button>
          <div className="hidden lg:flex items-center space-x-3 bg-[#182C61] p-2 rounded-2xl shadow-lg">
            <div className="h-10 w-10 bg-white/10 rounded-xl flex items-center justify-center">
              <BeakerIcon className="h-5 w-5 text-white" />
            </div>
            <div className="pr-4">
              <p className="text-[9px] font-black text-white/50 uppercase tracking-widest">AI Hub</p>
              <p className="text-[11px] font-black text-white">Active</p>
            </div>
          </div>
        </div>
      </div>

      {warning ? (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
          <ExclamationTriangleIcon className="h-5 w-5 text-amber-600 mt-0.5" />
          <p className="text-sm font-semibold text-amber-800">{warning}</p>
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {dashboardStats.map((stat) => (
          <div key={stat.name} className="dashboard-card group">
            <div className="flex items-center justify-between mb-6">
              <div className={`p-4 rounded-xl ${stat.color} text-white shadow-lg transition-all group-hover:rotate-6`}>
                <stat.icon className="h-6 w-6" />
              </div>
              <span className="text-[9px] font-black text-[#eb2f06] uppercase tracking-widest bg-[#eb2f06]/5 px-2 py-1 rounded-full">
                live
              </span>
            </div>
            <p className="text-[9px] font-black text-[#808e9b] uppercase tracking-[0.2em] mb-1">{stat.name}</p>
            <p className="text-3xl font-black text-[#182C61] tracking-tighter">{loading ? '...' : stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border-2 border-slate-50 p-8 rounded-[2rem] shadow-xl shadow-[#182C61]/5">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-black text-[#182C61] tracking-tight">Recent Telemedicine Activity</h3>
              <button
                type="button"
                onClick={() => navigate('/dashboard/consultations')}
                className="text-[10px] font-black text-[#182C61] uppercase tracking-widest hover:text-[#eb2f06] transition-colors underline underline-offset-4 decoration-2"
              >
                Consultations
              </button>
            </div>

            <div className="space-y-4">
              {appointments.length > 0 ? (
                appointments.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center p-4 bg-slate-50/50 border-2 border-white rounded-[1.5rem] hover:border-[#182C61]/10 transition-all"
                  >
                    <div className="h-12 w-12 rounded-xl mr-4 shadow-lg bg-[#182C61] text-white flex items-center justify-center font-black">
                      {item.doctorName?.charAt(0)?.toUpperCase() || 'D'}
                    </div>
                    <div className="flex-1">
                      <p className="font-black text-[#182C61] text-base">Dr. {item.doctorName}</p>
                      <p className="text-[10px] font-bold text-[#808e9b] uppercase tracking-widest">{item.schedule}</p>
                    </div>
                    <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-white border border-slate-200 text-[#182C61]">
                      {item.status}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-[#808e9b] font-bold">No telemedicine records found yet.</p>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-[#182C61] p-8 rounded-[2rem] shadow-xl shadow-[#182C61]/15 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:rotate-45 transition-transform duration-1000">
              <ChatBubbleBottomCenterTextIcon className="h-24 w-24 text-white" />
            </div>
            <div className="relative z-10 space-y-6">
              <div>
                <p className="text-[9px] font-black text-white/50 uppercase tracking-[0.2em] mb-2">Quick Tip</p>
                <h3 className="text-2xl font-black text-white tracking-tighter leading-tight">Keep your reports updated</h3>
              </div>
              <div className="bg-white/10 backdrop-blur-xl p-4 rounded-xl border border-white/20">
                <p className="text-[11px] text-white/90 font-bold leading-relaxed">
                  Use AI symptom check before your next consultation to speed up diagnosis.
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/dashboard/ai-checker')}
                className="w-full py-4 bg-white text-[#182C61] font-black rounded-xl shadow-lg hover:scale-[1.02] transition-all uppercase tracking-widest text-[10px]"
              >
                Open AI Checker
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate('/dashboard/doctors')}
            className="w-full py-8 bg-[#eb2f06]/5 border-2 border-[#eb2f06]/10 rounded-[2rem] group hover:bg-[#eb2f06] transition-all duration-500"
          >
            <div className="flex flex-col items-center">
              <PlusIcon className="h-8 w-8 text-[#eb2f06] group-hover:text-white transition-colors mb-2" />
              <span className="text-[10px] font-black text-[#eb2f06] group-hover:text-white uppercase tracking-[0.3em]">New Booking</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
