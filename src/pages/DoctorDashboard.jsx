import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { API } from '../config/api';
import { 
  CalendarIcon, 
  UserGroupIcon, 
  VideoCameraIcon,
  ClockIcon,
  CurrencyDollarIcon,
  ArrowTrendingUpIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

export default function DoctorDashboard() {
  const navigate = useNavigate();
  const [doctorName, setDoctorName] = useState('Doctor');
  const [warning, setWarning] = useState('');
  const [stats, setStats] = useState({
    todayAppointments: 0,
    totalPatients: 0,
    completedConsultations: 0,
    monthlyEarnings: 0,
    upcomingAppointments: [],
    recentPatients: [],
  });
  const [loading, setLoading] = useState(true);
  const [startingCallFor, setStartingCallFor] = useState(null);

  const readAuthUser = () => {
    try {
      const raw = localStorage.getItem('auth_user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  };

  const startConsultation = async (patient) => {
    const user = readAuthUser();
    const doctorId = user?.id || user?.userId || user?.username || '';
    const patientId = patient?.userId || patient?.id || '';

    if (!doctorId || !patientId) {
      alert('Missing doctorId or patientId. Please login again.');
      return;
    }

    try {
      setStartingCallFor(patientId);
      await API.telemedicine.createConsultation({ doctorId, patientId });
      // Redirect doctor into the meeting page
      navigate(`/dashboard/consultations?appointmentId=${encodeURIComponent(patientId)}`);
    } catch (e) {
      console.error('Failed to start consultation', e);
      alert(e?.message || 'Failed to start consultation');
    } finally {
      setStartingCallFor(null);
    }
  };

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const normalizeId = (value) => String(value || '').trim();
  const normalizeText = (value) => (typeof value === 'string' ? value.trim() : '');
  const hasText = (value) => normalizeText(value).length > 0;

  const resolvePatientId = (patient) =>
    normalizeId(
      patient?.id ||
        patient?.userId ||
        patient?._id ||
        patient?.username ||
        patient?.email ||
        patient?.user?.id ||
        patient?.user?._id ||
        patient?.user?.userId ||
        patient?.user?.username ||
        patient?.user?.email
    );

  const parseSessionTime = (session) => {
    const value = session?.startedAt || session?.createdAt || session?.updatedAt || null;
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  };

  const isToday = (date) => {
    if (!date) return false;
    const now = new Date();
    return (
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth() &&
      date.getDate() === now.getDate()
    );
  };

  const isCurrentMonth = (date) => {
    if (!date) return false;
    const now = new Date();
    return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
  };

  const resolvePatientDisplay = (patient) => {
    if (!patient) return 'Unknown Patient';
    const first = normalizeText(patient?.firstName || patient?.user?.firstName);
    const last = normalizeText(patient?.lastName || patient?.user?.lastName);
    const fullFromParts = `${first} ${last}`.trim();
    if (hasText(fullFromParts)) return fullFromParts;

    const direct = [
      patient?.name,
      patient?.fullName,
      patient?.displayName,
      patient?.username,
      patient?.email,
      patient?.user?.name,
      patient?.user?.fullName,
      patient?.user?.displayName,
      patient?.user?.username,
      patient?.user?.email,
    ]
      .map((value) => normalizeText(value))
      .find((value) => hasText(value) && value.toLowerCase() !== 'unknown patient' && value.toLowerCase() !== 'unknown');

    return direct || 'Unknown Patient';
  };

  const fetchDashboardStats = async () => {
    const user = readAuthUser();
    const fallbackDoctorId = normalizeId(user?.id || user?.userId || user?.username);

    try {
      setLoading(true);

      let patientsData = [];
      let doctorProfile = null;
      let doctorSessions = [];

      const errors = [];

      try {
        patientsData = await API.patients.getAll();
      } catch (error) {
        errors.push('patients');
      }

      try {
        doctorProfile = await API.doctors.getMyProfile();
      } catch (error) {
        errors.push('doctor-profile');
      }

      const doctorId = normalizeId(doctorProfile?.id || doctorProfile?.userId || fallbackDoctorId);

      if (doctorId) {
        try {
          doctorSessions = await API.telemedSessions.listForDoctor(doctorId);
        } catch (error) {
          errors.push('telemed-sessions');
        }
      }

      const safePatients = Array.isArray(patientsData) ? patientsData : [];
      const safeSessions = Array.isArray(doctorSessions) ? doctorSessions : [];

      setDoctorName(
        doctorProfile?.name ||
          doctorProfile?.fullName ||
          user?.name ||
          user?.username ||
          'Doctor'
      );

      const patientById = new Map();
      safePatients.forEach((p) => {
        const keys = [
          resolvePatientId(p),
          normalizeId(p?.id),
          normalizeId(p?.userId),
          normalizeId(p?._id),
          normalizeId(p?.username),
          normalizeId(p?.email),
          normalizeId(p?.user?.id),
          normalizeId(p?.user?._id),
          normalizeId(p?.user?.userId),
          normalizeId(p?.user?.username),
          normalizeId(p?.user?.email),
        ].filter(Boolean);
        keys.forEach((key) => {
          if (!patientById.has(key)) patientById.set(key, p);
        });
      });

      const sessionRows = safeSessions
        .map((session, index) => {
          const when = parseSessionTime(session);
          const patientId = normalizeId(session?.patientId);
          const patient = patientById.get(patientId);
          const status = String(session?.status || '').toUpperCase();
          return {
            id: session?.id || `${patientId || 'patient'}-${index}`,
            status,
            when,
            patientId,
            patientName: resolvePatientDisplay(patient),
            type: 'Telemedicine',
          };
        })
        .sort((a, b) => (b.when?.getTime() || 0) - (a.when?.getTime() || 0));

      const todayAppointments = sessionRows.filter((row) => isToday(row.when) && row.status !== 'ENDED').length;
      const completedConsultations = sessionRows.filter((row) => row.status === 'ENDED').length;
      const monthlyCompleted = sessionRows.filter((row) => row.status === 'ENDED' && isCurrentMonth(row.when)).length;
      const consultationFee = Number(doctorProfile?.consultationFee || doctorProfile?.fee || 0);
      const monthlyEarnings = Number.isFinite(consultationFee)
        ? Math.max(0, Math.round(monthlyCompleted * consultationFee))
        : 0;

      const upcomingAppointments = sessionRows
        .filter((row) => row.status !== 'ENDED')
        .slice(0, 5)
        .map((row) => ({
          id: row.id,
          patientName: row.patientName,
          time: row.when ? row.when.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Unknown time',
          type: row.type,
          status: row.status === 'IN_SESSION' ? 'confirmed' : 'pending',
        }));

      const recentPatients = Array.from(
        new Map(
          sessionRows
            .filter((row) => row.patientId)
            .map((row) => {
              const source = patientById.get(row.patientId) || {};
              return [
                row.patientId,
                {
                  id: row.patientId,
                  userId: row.patientId,
                  name: resolvePatientDisplay(source),
                  email: source?.email || 'No email',
                  lastVisit: row.when ? row.when.toISOString() : new Date().toISOString(),
                },
              ];
            })
        ).values()
      ).slice(0, 5);

      setWarning(
        errors.length
          ? `Some data could not be loaded (${errors.join(', ')}). Showing available live values.`
          : ''
      );

      setStats({
        todayAppointments,
        totalPatients: safePatients.length,
        completedConsultations,
        monthlyEarnings,
        upcomingAppointments,
        recentPatients,
      });
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
      setWarning('Unable to reach backend services. Please retry.');
      setStats({
        todayAppointments: 0,
        totalPatients: 0,
        completedConsultations: 0,
        monthlyEarnings: 0,
        upcomingAppointments: [],
        recentPatients: [],
      });
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, icon: Icon, change, changeType, color }) => (
    <div className="bg-white rounded-2xl border-2 border-slate-50 p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-[#808e9b] uppercase tracking-wider">{title}</p>
          <p className="text-3xl font-black text-[#182C61] mt-2">{loading ? '...' : value}</p>
          {change ? (
            <div className={`flex items-center mt-2 text-sm ${
              changeType === 'increase' ? 'text-green-600' : 'text-red-600'
            }`}>
              {changeType === 'increase' ? (
                <ArrowTrendingUpIcon className="h-4 w-4 mr-1" />
              ) : (
                <ArrowTrendingUpIcon className="h-4 w-4 mr-1 rotate-180" />
              )}
              {change} from last month
            </div>
          ) : null}
        </div>
        <div className={`p-3 rounded-xl ${color}`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
      </div>
    </div>
  );

  const QuickAction = ({ title, description, icon: Icon, href, color }) => (
    <Link
      to={href}
      className="block p-6 bg-white rounded-2xl border-2 border-slate-50 hover:shadow-lg transition-all hover:border-[#182C61]/20"
    >
      <div className="flex items-center">
        <div className={`p-3 rounded-xl ${color} mr-4`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-black text-[#182C61]">{title}</h3>
          <p className="text-sm text-[#808e9b] mt-1">{description}</p>
        </div>
      </div>
    </Link>
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-black text-[#182C61]">Doctor Dashboard</h1>
            <p className="text-[#808e9b] mt-2 font-bold">Loading dashboard data...</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-2xl border-2 border-slate-50 p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
              <div className="h-8 bg-gray-200 rounded w-3/4"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-black text-[#182C61]">Doctor Dashboard</h1>
          <p className="text-[#808e9b] mt-2 font-bold">Welcome back, Dr. {doctorName}</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={fetchDashboardStats}
            className="px-4 py-2 bg-[#182C61] text-white rounded-xl hover:bg-[#182C61]/80 transition-colors font-black text-sm"
          >
            Refresh Data
          </button>
        </div>
      </div>

      {warning ? (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
          <ExclamationTriangleIcon className="h-5 w-5 text-amber-600 mt-0.5" />
          <p className="text-sm font-semibold text-amber-800">{warning}</p>
        </div>
      ) : null}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Today's Appointments"
          value={stats.todayAppointments}
          icon={CalendarIcon}
          change={null}
          changeType="increase"
          color="bg-blue-500"
        />
        <StatCard
          title="Total Patients"
          value={stats.totalPatients}
          icon={UserGroupIcon}
          change={null}
          changeType="increase"
          color="bg-green-500"
        />
        <StatCard
          title="Completed Consultations"
          value={stats.completedConsultations}
          icon={CheckCircleIcon}
          change={null}
          changeType="increase"
          color="bg-purple-500"
        />
        <StatCard
          title="Monthly Earnings"
          value={`$${stats.monthlyEarnings.toLocaleString()}`}
          icon={CurrencyDollarIcon}
          change={null}
          changeType="increase"
          color="bg-orange-500"
        />
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-2xl font-black text-[#182C61] mb-6">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <QuickAction
            title="View Schedule"
            description="Manage your appointments"
            icon={CalendarIcon}
            href="/dashboard/appointments"
            color="bg-blue-500"
          />
          <QuickAction
            title="My Patients"
            description="View patient records"
            icon={UserGroupIcon}
            href="/dashboard/patients"
            color="bg-green-500"
          />
          <QuickAction
            title="Video Consultations"
            description="Start video calls"
            icon={VideoCameraIcon}
            href="/dashboard/consultations"
            color="bg-purple-500"
          />
        </div>
      </div>

      {/* Today's Schedule & Recent Patients */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Today's Appointments */}
        <div className="bg-white rounded-2xl border-2 border-slate-50 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-black text-[#182C61]">Today's Schedule</h3>
            <Link
              to="/dashboard/appointments"
              className="text-[#182C61] hover:text-[#182C61]/80 text-sm font-black"
            >
              View All
            </Link>
          </div>
          <div className="space-y-4">
            {stats.upcomingAppointments.length > 0 ? (
              stats.upcomingAppointments.map((appointment) => (
                <div key={appointment.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center">
                    <div className={`p-2 rounded-lg mr-3 ${
                      appointment.status === 'confirmed' ? 'bg-green-100' : 'bg-yellow-100'
                    }`}>
                      {appointment.status === 'confirmed' ? (
                        <CheckCircleIcon className="h-5 w-5 text-green-600" />
                      ) : (
                        <ClockIcon className="h-5 w-5 text-yellow-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-black text-[#182C61]">{appointment.patientName}</p>
                      <p className="text-sm text-[#808e9b]">{appointment.time} • {appointment.type}</p>
                    </div>
                  </div>
                  <button className="px-3 py-1 bg-[#182C61] text-white rounded-lg text-sm font-black hover:bg-[#182C61]/80">
                    Start
                  </button>
                </div>
              ))
            ) : (
              <p className="text-[#808e9b] text-center py-8">No appointments scheduled for today</p>
            )}
          </div>
        </div>

        {/* Recent Patients */}
        <div className="bg-white rounded-2xl border-2 border-slate-50 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-black text-[#182C61]">Recent Patients</h3>
            <Link
              to="/dashboard/patients"
              className="text-[#182C61] hover:text-[#182C61]/80 text-sm font-black"
            >
              View All
            </Link>
          </div>
          <div className="space-y-4">
            {stats.recentPatients.length > 0 ? (
              stats.recentPatients.map((patient) => (
                <div key={patient.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <div>
                    <p className="font-black text-[#182C61]">{patient.name}</p>
                    <p className="text-sm text-[#808e9b]">{patient.email}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-[#808e9b]">
                      Last visit: {new Date(patient.lastVisit).toLocaleDateString()}
                    </p>
                    <button
                      onClick={() => startConsultation(patient)}
                      disabled={!!startingCallFor}
                      className="mt-2 px-3 py-1 bg-[#182C61] text-white rounded-lg text-xs font-black hover:bg-[#182C61]/80 disabled:opacity-60"
                      title="Start video consultation"
                    >
                      {startingCallFor ? 'Starting…' : 'Call'}
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-[#808e9b] text-center py-8">No recent patients</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
