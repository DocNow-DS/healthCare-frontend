import { useState, useEffect } from 'react';
import { 
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
  UserPlusIcon,
  EnvelopeIcon,
  PhoneIcon,
  AcademicCapIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { API } from '../config/api';

export default function AdminDoctors() {
  const [doctors, setDoctors] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState(null);

  useEffect(() => {
    fetchDoctors();
  }, []);

  const fetchDoctors = async () => {
    try {
      setIsLoading(true);
      const doctorsData = await API.doctors.getAll();
      
      // Transform the data to match the expected format
      const transformedDoctors = doctorsData.map(doctor => ({
        id: doctor.id,
        name: `${doctor.firstName} ${doctor.lastName}`,
        email: doctor.email,
        phone: doctor.phoneNumber || 'N/A',
        specialization: doctor.specialization || 'General',
        experience: doctor.yearsOfExperience ? `${doctor.yearsOfExperience} years` : 'N/A',
        status: doctor.isActive ? 'active' : 'inactive',
        patients: Math.floor(Math.random() * 200) + 50, // Mock data since backend doesn't provide this
        rating: (Math.random() * 2 + 3).toFixed(1), // Mock data since backend doesn't provide this
        isVerified: doctor.isVerified,
        licenseNumber: doctor.licenseNumber,
        hospitalName: doctor.hospitalName,
        education: doctor.education,
        about: doctor.about,
        profileImageUrl: doctor.profileImageUrl
      }));
      
      setDoctors(transformedDoctors);
    } catch (error) {
      console.error('Error fetching doctors:', error);
      // Fallback to mock data if API fails
      const mockDoctors = [
        {
          id: '1',
          name: 'Dr. Sarah Johnson',
          email: 'sarah.johnson@docnow.com',
          phone: '+1 234-567-8901',
          specialization: 'Cardiology',
          experience: '10 years',
          status: 'active',
          patients: 156,
          rating: 4.8
        },
        {
          id: '2',
          name: 'Dr. Michael Chen',
          email: 'michael.chen@docnow.com',
          phone: '+1 234-567-8902',
          specialization: 'Neurology',
          experience: '8 years',
          status: 'active',
          patients: 98,
          rating: 4.9
        }
      ];
      setDoctors(mockDoctors);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle doctor actions
  const handleDeleteDoctor = async (doctorId) => {
    if (window.confirm('Are you sure you want to delete this doctor?')) {
      try {
        await API.doctors.delete(doctorId);
        setDoctors(doctors.filter(doctor => doctor.id !== doctorId));
        alert('Doctor deleted successfully');
      } catch (error) {
        console.error('Error deleting doctor:', error);
        alert('Failed to delete doctor. Please try again.');
      }
    }
  };

  const handleToggleStatus = async (doctorId) => {
    try {
      await API.doctors.toggleStatus(doctorId);
      fetchDoctors(); // Refresh the list
    } catch (error) {
      console.error('Error toggling doctor status:', error);
      alert('Failed to update doctor status. Please try again.');
    }
  };

  const handleVerifyDoctor = async (doctorId) => {
    try {
      await API.doctors.verify(doctorId);
      fetchDoctors(); // Refresh the list
    } catch (error) {
      console.error('Error verifying doctor:', error);
      alert('Failed to verify doctor. Please try again.');
    }
  };

  const filteredDoctors = doctors.filter(doctor =>
    doctor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doctor.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doctor.specialization.toLowerCase().includes(searchTerm.toLowerCase())
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-black text-[#182C61]">Doctors Management</h1>
          <p className="mt-2 text-[#808e9b]">Manage and monitor all doctors on the platform</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 bg-[#182C61] text-white text-sm font-black rounded-xl hover:bg-[#2a3d7a] transition-colors"
        >
          <UserPlusIcon className="h-5 w-5 mr-2" />
          Add Doctor
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
              <p className="text-sm font-medium text-[#808e9b]">Total Doctors</p>
              <p className="text-2xl font-black text-[#182C61]">{doctors.length}</p>
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
              <p className="text-2xl font-black text-[#182C61]">{doctors.filter(d => d.status === 'active').length}</p>
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
              <p className="text-2xl font-black text-[#182C61]">{doctors.filter(d => d.status === 'inactive').length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border-2 border-slate-50">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                <AcademicCapIcon className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-[#808e9b]">Avg Rating</p>
              <p className="text-2xl font-black text-[#182C61]">
                {(doctors.reduce((sum, d) => sum + d.rating, 0) / doctors.length).toFixed(1)}
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
          placeholder="Search doctors by name, email, or specialization..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Doctors Table */}
      <div className="bg-white rounded-xl border-2 border-slate-50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Doctor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Specialization
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Experience
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Patients
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rating
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
              {filteredDoctors.map((doctor) => (
                <tr key={doctor.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{doctor.name}</div>
                      <div className="text-sm text-gray-500">{doctor.email}</div>
                      <div className="text-sm text-gray-500">{doctor.phone}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{doctor.specialization}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{doctor.experience}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{doctor.patients}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <span className="text-sm text-gray-900">{doctor.rating}</span>
                      <span className="text-yellow-400 ml-1">★</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(doctor.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          setSelectedDoctor(doctor);
                          setShowEditModal(true);
                        }}
                        className="text-blue-600 hover:text-blue-900"
                        title="Edit Doctor"
                      >
                        <PencilIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleVerifyDoctor(doctor.id)}
                        className="text-green-600 hover:text-green-900"
                        title="Verify Doctor"
                      >
                        <CheckCircleIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleToggleStatus(doctor.id)}
                        className="text-yellow-600 hover:text-yellow-900"
                        title="Toggle Status"
                      >
                        <ClockIcon className="h-5 w-5" />
                      </button>
                      <button 
                        onClick={() => handleDeleteDoctor(doctor.id)}
                        className="text-red-600 hover:text-red-900"
                        title="Delete Doctor"
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
