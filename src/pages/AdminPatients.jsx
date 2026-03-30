import { useState, useEffect } from 'react';
import { 
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
  UserPlusIcon,
  EnvelopeIcon,
  PhoneIcon,
  CalendarIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  HeartIcon
} from '@heroicons/react/24/outline';
import { API } from '../config/api';

export default function AdminPatients() {
  const [patients, setPatients] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const patientsData = await API.patients.getAll();
      
      // Get all users to filter patients
      const usersData = await API.admin.getAllUsers();
      const patientUsers = usersData.filter(user => 
        user.roles && user.roles.some(role => role.name === 'PATIENT')
      );
      
      // Transform and combine data
      const transformedPatients = patientsData.map((patient, index) => {
        const correspondingUser = patientUsers.find(user => user.id === patient.userId || user.id === patient.id);
        return {
          id: patient.id,
          userId: correspondingUser?.id,
          name: patient.name || correspondingUser?.username || 'Unknown',
          email: correspondingUser?.email || patient.email || 'N/A',
          phone: patient.phone || correspondingUser?.phone || 'N/A',
          age: patient.age || correspondingUser?.age || 'Not specified',
          gender: patient.gender || correspondingUser?.gender || 'Not specified',
          address: patient.address || correspondingUser?.address || 'Not provided',
          medicalHistory: patient.medicalHistory || correspondingUser?.medicalHistory || 'None',
          createdAt: correspondingUser?.createdAt || patient.createdAt,
          status: correspondingUser?.enabled !== undefined ? (correspondingUser.enabled ? 'active' : 'inactive') : 'active'
        };
      });
      
      setPatients(transformedPatients);
    } catch (error) {
      console.error('Error fetching patients:', error);
      setError('Unable to fetch patient data. Please ensure backend services are running.');
      setPatients([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle patient actions
  const handleDeletePatient = async (patientId, userId) => {
    if (window.confirm('Are you sure you want to delete this patient?')) {
      try {
        // Delete patient profile
        await API.patients.delete?.(patientId); // If delete endpoint exists
        // Delete user account
        if (userId) {
          await API.admin.deleteUser(userId);
        }
        setPatients(patients.filter(patient => patient.id !== patientId));
        alert('Patient deleted successfully');
      } catch (error) {
        console.error('Error deleting patient:', error);
        alert('Failed to delete patient. Please try again.');
      }
    }
  };

  const handleUpdatePatientStatus = async (userId, currentStatus) => {
    try {
      const newStatus = !currentStatus;
      await API.admin.updateUser(userId, { enabled: newStatus });
      fetchPatients(); // Refresh the list
    } catch (error) {
      console.error('Error updating patient status:', error);
      alert('Failed to update patient status. Please try again.');
    }
  };

  const filteredPatients = patients.filter(patient =>
    patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.medicalHistory.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'inactive':
        return <XCircleIcon className="h-5 w-5 text-red-500" />;
      case 'pending':
        return <ClockIcon className="h-5 w-5 text-yellow-500" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-red-100 text-red-800',
      pending: 'bg-yellow-100 text-yellow-800'
    };
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}>
        {getStatusIcon(status)}
        <span className="ml-1">{status.charAt(0).toUpperCase() + status.slice(1)}</span>
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#182C61]"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-black text-[#182C61]">Patients Management</h1>
            <p className="mt-2 text-[#808e9b]">Manage and monitor all patients on the platform</p>
          </div>
        </div>
        
        <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-8 text-center">
          <div className="flex flex-col items-center space-y-4">
            <div className="p-4 bg-red-100 rounded-full">
              <XCircleIcon className="h-8 w-8 text-red-600" />
            </div>
            <h3 className="text-xl font-black text-red-800">Unable to Load Patient Data</h3>
            <p className="text-red-600 max-w-md">
              {error}
            </p>
            <button
              onClick={fetchPatients}
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-black text-[#182C61]">Patients Management</h1>
          <p className="mt-2 text-[#808e9b]">Manage and monitor all patients on the platform</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 bg-[#182C61] text-white text-sm font-black rounded-xl hover:bg-[#2a3d7a] transition-colors"
        >
          <UserPlusIcon className="h-5 w-5 mr-2" />
          Add Patient
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl border-2 border-slate-50">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <UserPlusIcon className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-[#808e9b]">Total Patients</p>
              <p className="text-2xl font-black text-[#182C61]">{patients.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border-2 border-slate-50">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <CheckCircleIcon className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-[#808e9b]">Active</p>
              <p className="text-2xl font-black text-[#182C61]">{patients.filter(p => p.status === 'active').length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border-2 border-slate-50">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                <XCircleIcon className="h-6 w-6 text-red-600" />
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-[#808e9b]">Inactive</p>
              <p className="text-2xl font-black text-[#182C61]">{patients.filter(p => p.status === 'inactive').length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border-2 border-slate-50">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <HeartIcon className="h-6 w-6 text-purple-600" />
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-[#808e9b]">Avg Age</p>
              <p className="text-2xl font-black text-[#182C61]">
                {Math.round(patients.reduce((sum, p) => sum + (typeof p.age === 'number' ? p.age : 0), 0) / patients.length) || 'N/A'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <MagnifyingGlassIcon className="h-5 w-5 text-[#808e9b]" />
        </div>
        <input
          type="text"
          className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl text-sm placeholder-[#808e9b] focus:outline-none focus:ring-2 focus:ring-[#182C61] focus:border-transparent"
          placeholder="Search patients by name, email, doctor, or medical conditions..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Patients Table */}
      <div className="bg-white rounded-xl border-2 border-slate-50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Patient
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Age/Gender
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Address
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Medical History
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Registered
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredPatients.map((patient) => (
                <tr key={patient.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{patient.name}</div>
                      <div className="text-sm text-gray-500">{patient.email}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{patient.age} years</div>
                    <div className="text-sm text-gray-500">{patient.gender}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{patient.phone}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 max-w-[150px] truncate" title={patient.address}>{patient.address}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 max-w-[150px] truncate" title={patient.medicalHistory}>{patient.medicalHistory}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {patient.createdAt ? new Date(patient.createdAt).toLocaleDateString() : 'N/A'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(patient.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          setSelectedPatient(patient);
                          setShowEditModal(true);
                        }}
                        className="text-blue-600 hover:text-blue-900"
                        title="Edit Patient"
                      >
                        <PencilIcon className="h-5 w-5" />
                      </button>
                      <button className="text-green-600 hover:text-green-900" title="View Medical Records">
                        <DocumentTextIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleUpdatePatientStatus(patient.userId, patient.status === 'active')}
                        className="text-yellow-600 hover:text-yellow-900"
                        title="Toggle Status"
                      >
                        <ClockIcon className="h-5 w-5" />
                      </button>
                      <button 
                        onClick={() => handleDeletePatient(patient.id, patient.userId)}
                        className="text-red-600 hover:text-red-900"
                        title="Delete Patient"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
