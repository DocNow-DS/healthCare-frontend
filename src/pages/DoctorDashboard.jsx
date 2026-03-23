import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { API } from '../config/api';
import { 
  CalendarIcon, 
  UserGroupIcon, 
  VideoCameraIcon,
  ClockIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  PlusCircleIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';

export default function DoctorDashboard() {
  const [stats, setStats] = useState({
    todayAppointments: 0,
    totalPatients: 0,
    completedConsultations: 0,
    monthlyEarnings: 0,
    upcomingAppointments: [],
    recentPatients: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      
      // Try to fetch real data
      let patientsData = [];
      let doctorProfile = null;
      let backendError = false;
      
      try {
        patientsData = await API.patients.getAll();
      } catch (error) {
        console.log('Backend not available for patient data');
        backendError = true;
      }
      
      try {
        doctorProfile = await API.doctors.getMyProfile();
      } catch (error) {
        console.log('Backend not available for doctor profile');
        backendError = true;
      }

      if (backendError) {
        // Show error state when backend is not available
        setStats({
          todayAppointments: 0,
          totalPatients: 0,
          completedConsultations: 0,
          monthlyEarnings: 0,
          upcomingAppointments: [],
          recentPatients: [],
          backendError: true
        });
        return;
      }

      // Mock appointments data (can be replaced with real API call later)
      const upcomingAppointments = [
        {
          id: 1,
          patientName: 'John Smith',
          time: '09:00 AM',
          type: 'Consultation',
          status: 'confirmed'
        },
        {
          id: 2,
          patientName: 'Maria Garcia',
          time: '10:30 AM',
          type: 'Follow-up',
          status: 'confirmed'
        },
        {
          id: 3,
          patientName: 'Robert Wilson',
          time: '02:00 PM',
          type: 'Video Consultation',
          status: 'pending'
        }
      ];

      const recentPatients = patientsData.slice(0, 5);

      setStats({
        todayAppointments: upcomingAppointments.length,
        totalPatients: patientsData.length,
        completedConsultations: 47,
        monthlyEarnings: 8450,
        upcomingAppointments,
        recentPatients,
        backendError: false
      });
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
      // Set error state
      setStats({
        todayAppointments: 0,
        totalPatients: 0,
        completedConsultations: 0,
        monthlyEarnings: 0,
        upcomingAppointments: [],
        recentPatients: [],
        backendError: true
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
          {change && (
            <div className={`flex items-center mt-2 text-sm ${
              changeType === 'increase' ? 'text-green-600' : 'text-red-600'
            }`}>
              {changeType === 'increase' ? (
                <ArrowTrendingUpIcon className="h-4 w-4 mr-1" />
              ) : (
                <ArrowTrendingDownIcon className="h-4 w-4 mr-1" />
              )}
              {change} from last month
            </div>
          )}
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

  if (stats.backendError) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-black text-[#182C61]">Doctor Dashboard</h1>
            <p className="text-[#808e9b] mt-2 font-bold">Unable to connect to backend services</p>
          </div>
        </div>
        <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-8 text-center">
          <div className="flex flex-col items-center space-y-4">
            <div className="p-4 bg-red-100 rounded-full">
              <XCircleIcon className="h-8 w-8 text-red-600" />
            </div>
            <h3 className="text-xl font-black text-red-800">Backend Services Unavailable</h3>
            <p className="text-red-600 max-w-md">
              Unable to connect to the backend services. Please ensure that the backend servers are running and try again.
            </p>
            <button
              onClick={fetchDashboardStats}
              className="px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-black"
            >
              Retry Connection
            </button>
          </div>
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
          <p className="text-[#808e9b] mt-2 font-bold">Manage your practice and patients efficiently</p>
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

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Today's Appointments"
          value={stats.todayAppointments}
          icon={CalendarIcon}
          change="+2"
          changeType="increase"
          color="bg-blue-500"
        />
        <StatCard
          title="Total Patients"
          value={stats.totalPatients}
          icon={UserGroupIcon}
          change="+5"
          changeType="increase"
          color="bg-green-500"
        />
        <StatCard
          title="Completed Consultations"
          value={stats.completedConsultations}
          icon={CheckCircleIcon}
          change="+12"
          changeType="increase"
          color="bg-purple-500"
        />
        <StatCard
          title="Monthly Earnings"
          value={`$${stats.monthlyEarnings.toLocaleString()}`}
          icon={CurrencyDollarIcon}
          change="+18%"
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
