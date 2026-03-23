import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { API } from '../config/api';
import AdminPatients from './AdminPatients.jsx';
import AdminDoctors from './AdminDoctors.jsx';
import { 
  UserGroupIcon, 
  UserIcon,
  CreditCardIcon,
  CalendarIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  PlusCircleIcon,
  EyeIcon,
  Cog6ToothIcon,
  ShieldCheckIcon,
  Squares2X2Icon
} from '@heroicons/react/24/outline';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState({
    totalDoctors: 0,
    totalPatients: 0,
    totalAppointments: 0,
    totalRevenue: 0,
    recentRegistrations: [],
    recentAppointments: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      
      // Try to fetch real data, but use mock data if backend is not available
      let doctorsData = [];
      let patientsData = [];
      
      try {
        doctorsData = await API.doctors.getAll();
      } catch (error) {
        console.log('Backend not available, using mock doctor data');
        doctorsData = [
          { id: 1, name: 'Dr. Sarah Johnson', email: 'sarah@hospital.com', specialization: 'Cardiology' },
          { id: 2, name: 'Dr. Michael Chen', email: 'michael@hospital.com', specialization: 'Neurology' },
          { id: 3, name: 'Dr. Emily Davis', email: 'emily@hospital.com', specialization: 'Pediatrics' }
        ];
      }
      
      try {
        patientsData = await API.patients.getAll();
      } catch (error) {
        console.log('Backend not available, patients data will be empty');
        patientsData = [];
      }

      // Get recent registrations (last 5 users)
      const recentRegistrations = patientsData.slice(0, 5).map(patient => ({
        id: patient.id,
        name: patient.name,
        email: patient.email,
        registrationDate: patient.createdAt || new Date().toISOString()
      }));

      setStats({
        totalDoctors: doctorsData.length,
        totalPatients: patientsData.length,
        totalAppointments: 156,
        totalRevenue: 45678,
        recentRegistrations,
        recentAppointments: []
      });
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
      // Set fallback data
      setStats({
        totalDoctors: 0,
        totalPatients: 0,
        totalAppointments: 0,
        totalRevenue: 0,
        recentRegistrations: [],
        recentAppointments: []
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
            <h1 className="text-4xl font-black text-[#182C61]">Admin Dashboard</h1>
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

  // Tab Navigation
  const tabs = [
    { id: 'overview', name: 'Overview', icon: Squares2X2Icon },
    { id: 'doctors', name: 'Doctors', icon: UserIcon },
    { id: 'patients', name: 'Patients', icon: UserGroupIcon },
  ];

  // Render different content based on active tab
  const renderTabContent = () => {
    switch (activeTab) {
      case 'doctors':
        return <AdminDoctors />;
      case 'patients':
        return <AdminPatients />;
      case 'overview':
      default:
        return (
          <div className="space-y-8">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard
                title="Total Doctors"
                value={stats.totalDoctors}
                icon={UserIcon}
                change="+12%"
                changeType="increase"
                color="bg-blue-500"
              />
              <StatCard
                title="Total Patients"
                value={stats.totalPatients}
                icon={UserGroupIcon}
                change="+8%"
                changeType="increase"
                color="bg-green-500"
              />
              <StatCard
                title="Appointments"
                value={stats.totalAppointments}
                icon={CalendarIcon}
                change="+15%"
                changeType="increase"
                color="bg-purple-500"
              />
              <StatCard
                title="Revenue"
                value={`$${stats.totalRevenue.toLocaleString()}`}
                icon={CreditCardIcon}
                change="+23%"
                changeType="increase"
                color="bg-orange-500"
              />
            </div>

            {/* Quick Actions */}
            <div>
              <h2 className="text-2xl font-black text-[#182C61] mb-6">Quick Actions</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <QuickAction
                  title="Manage Doctors"
                  description="Add, edit, or remove doctors"
                  icon={UserIcon}
                  href="/dashboard/doctors-management"
                  color="bg-blue-500"
                />
                <QuickAction
                  title="Manage Patients"
                  description="View and manage patient records"
                  icon={UserGroupIcon}
                  href="/dashboard/patients-management"
                  color="bg-green-500"
                />
                <QuickAction
                  title="View Transactions"
                  description="Monitor payment history"
                  icon={CreditCardIcon}
                  href="/dashboard/payments"
                  color="bg-orange-500"
                />
                <QuickAction
                  title="System Settings"
                  description="Configure platform settings"
                  icon={Cog6ToothIcon}
                  href="/dashboard/settings"
                  color="bg-gray-500"
                />
                <QuickAction
                  title="Analytics"
                  description="View detailed analytics"
                  icon={ChartBarIcon}
                  href="/dashboard/analytics"
                  color="bg-purple-500"
                />
                <QuickAction
                  title="Management Hub"
                  description="Advanced management tools"
                  icon={ShieldCheckIcon}
                  href="/dashboard/management"
                  color="bg-red-500"
                />
              </div>
            </div>

            {/* Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Recent Registrations */}
              <div className="bg-white rounded-2xl border-2 border-slate-50 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-black text-[#182C61]">Recent Registrations</h3>
                  <Link
                    to="/dashboard/patients-management"
                    className="text-[#182C61] hover:text-[#182C61]/80 text-sm font-black"
                  >
                    View All
                  </Link>
                </div>
                <div className="space-y-4">
                  {stats.recentRegistrations.length > 0 ? (
                    stats.recentRegistrations.map((registration) => (
                      <div key={registration.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                        <div>
                          <p className="font-black text-[#182C61]">{registration.name}</p>
                          <p className="text-sm text-[#808e9b]">{registration.email}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-[#808e9b]">
                            {new Date(registration.registrationDate).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-[#808e9b] text-center py-8">No recent registrations</p>
                  )}
                </div>
              </div>

              {/* System Status */}
              <div className="bg-white rounded-2xl border-2 border-slate-50 p-6">
                <h3 className="text-xl font-black text-[#182C61] mb-6">System Status</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-xl">
                    <div className="flex items-center">
                      <div className="h-3 w-3 bg-green-500 rounded-full mr-3"></div>
                      <span className="font-black text-[#182C61]">Patient Service</span>
                    </div>
                    <span className="text-sm text-green-600 font-black">Operational</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-xl">
                    <div className="flex items-center">
                      <div className="h-3 w-3 bg-green-500 rounded-full mr-3"></div>
                      <span className="font-black text-[#182C61]">Doctor Service</span>
                    </div>
                    <span className="text-sm text-green-600 font-black">Operational</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-xl">
                    <div className="flex items-center">
                      <div className="h-3 w-3 bg-yellow-500 rounded-full mr-3"></div>
                      <span className="font-black text-[#182C61]">Appointment Service</span>
                    </div>
                    <span className="text-sm text-yellow-600 font-black">Maintenance</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-xl">
                    <div className="flex items-center">
                      <div className="h-3 w-3 bg-green-500 rounded-full mr-3"></div>
                      <span className="font-black text-[#182C61]">Payment Service</span>
                    </div>
                    <span className="text-sm text-green-600 font-black">Operational</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-black text-[#182C61]">Admin Dashboard</h1>
          <p className="text-[#808e9b] mt-2 font-bold">Manage your healthcare platform efficiently</p>
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

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`group inline-flex items-center py-4 px-1 border-b-2 font-black text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-[#182C61] text-[#182C61]'
                  : 'border-transparent text-[#808e9b] hover:text-[#182C61] hover:border-gray-300'
              }`}
            >
              <tab.icon
                className={`mr-2 h-5 w-5 ${
                  activeTab === tab.id ? 'text-[#182C61]' : 'text-[#808e9b] group-hover:text-[#182C61]'
                }`}
                aria-hidden="true"
              />
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {renderTabContent()}
    </div>
  );
}
