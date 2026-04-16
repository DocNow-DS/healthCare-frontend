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
  const [error, setError] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);
  const [editError, setEditError] = useState('');
  const [editDoctor, setEditDoctor] = useState(null);
  const [newDoctor, setNewDoctor] = useState({
    username: '',
    password: '',
    email: '',
    name: '',
    phone: '',
    specialty: '',
    licenseNumber: '',
    yearsOfExperience: '',
    department: '',
    qualifications: ''
  });

  useEffect(() => {
    fetchDoctors();
  }, []);

  const fetchDoctors = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const doctorsData = await API.doctors.getAll();
      
      // Transform the data to match the expected format
      const transformedDoctors = doctorsData.map(doctor => ({
        id: doctor.id,
        name: doctor.name || doctor.username || 'Unknown',
        email: doctor.email || 'N/A',
        phone: doctor.phone || 'N/A',
        specialty: doctor.specialty || 'Not specified',
        experience: doctor.yearsOfExperience ? `${doctor.yearsOfExperience} years` : 'Not specified',
        status: doctor.enabled !== false ? 'active' : 'inactive',
        isVerified: doctor.isVerified || false,
        licenseNumber: doctor.licenseNumber || 'Not provided',
        hospitalName: doctor.hospitalName || 'Not specified',
        education: doctor.education || 'Not specified',
        department: doctor.department || 'Not specified',
        qualifications: doctor.qualifications || 'Not specified'
      }));
      
      setDoctors(transformedDoctors);
    } catch (error) {
      console.error('Error fetching doctors:', error);
      setError('Unable to fetch doctor data. Please ensure backend services are running.');
      setDoctors([]);
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
      const doctor = doctors.find((d) => d.id === doctorId);
      await API.doctors.toggleStatus(doctorId, doctor);
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

  const openEditModal = (doctor) => {
    setSelectedDoctor(doctor);
    setEditDoctor({
      name: doctor.name || '',
      email: doctor.email || '',
      phone: doctor.phone || '',
      specialty: doctor.specialty || '',
      licenseNumber: doctor.licenseNumber || '',
      yearsOfExperience: doctor.experience ? String(doctor.experience).replace(/\D/g, '') : '',
      department: doctor.department || '',
      qualifications: doctor.qualifications || '',
    });
    setEditError('');
    setShowEditModal(true);
  };

  const handleEditDoctor = async (e) => {
    e.preventDefault();
    if (!selectedDoctor) return;
    setEditError('');

    try {
      setIsEditSubmitting(true);
      await API.doctors.update(selectedDoctor.id, {
        name: editDoctor.name?.trim() || null,
        email: editDoctor.email?.trim() || null,
        phone: editDoctor.phone?.trim() || null,
        specialty: editDoctor.specialty?.trim() || null,
        licenseNumber: editDoctor.licenseNumber?.trim() || null,
        yearsOfExperience: editDoctor.yearsOfExperience
          ? Number(editDoctor.yearsOfExperience)
          : null,
        department: editDoctor.department?.trim() || null,
        qualifications: editDoctor.qualifications?.trim() || null,
      });

      setShowEditModal(false);
      setSelectedDoctor(null);
      setEditDoctor(null);
      await fetchDoctors();
    } catch (err) {
      setEditError(err?.message || 'Failed to update doctor.');
    } finally {
      setIsEditSubmitting(false);
    }
  };

  const resetAddDoctorForm = () => {
    setNewDoctor({
      username: '',
      password: '',
      email: '',
      name: '',
      phone: '',
      specialty: '',
      licenseNumber: '',
      yearsOfExperience: '',
      department: '',
      qualifications: ''
    });
    setSubmitError('');
  };

  const handleAddDoctor = async (e) => {
    e.preventDefault();
    setSubmitError('');

    if (!newDoctor.username || !newDoctor.password || !newDoctor.email || !newDoctor.name) {
      setSubmitError('Username, password, email and name are required.');
      return;
    }

    try {
      setIsSubmitting(true);
      await API.auth.register({
        username: newDoctor.username.trim(),
        password: newDoctor.password,
        email: newDoctor.email.trim(),
        name: newDoctor.name.trim(),
        phone: newDoctor.phone.trim() || null,
        roles: 'DOCTOR',
        specialty: newDoctor.specialty.trim() || null,
        licenseNumber: newDoctor.licenseNumber.trim() || null,
        yearsOfExperience: newDoctor.yearsOfExperience
          ? Number(newDoctor.yearsOfExperience)
          : null,
        department: newDoctor.department.trim() || null,
        qualifications: newDoctor.qualifications.trim() || null,
      });

      setShowAddModal(false);
      resetAddDoctorForm();
      await fetchDoctors();
    } catch (err) {
      setSubmitError(err?.message || 'Failed to add doctor.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredDoctors = doctors.filter(doctor =>
    doctor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doctor.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doctor.specialty.toLowerCase().includes(searchTerm.toLowerCase())
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
            <h1 className="text-3xl font-black text-[#182C61]">Doctors Management</h1>
            <p className="mt-2 text-[#808e9b]">Manage and monitor all doctors on the platform</p>
          </div>
        </div>
        
        <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-8 text-center">
          <div className="flex flex-col items-center space-y-4">
            <div className="p-4 bg-red-100 rounded-full">
              <XCircleIcon className="h-8 w-8 text-red-600" />
            </div>
            <h3 className="text-xl font-black text-red-800">Unable to Load Doctor Data</h3>
            <p className="text-red-600 max-w-md">
              {error}
            </p>
            <button
              onClick={fetchDoctors}
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
          <h1 className="text-3xl font-black text-[#182C61]">Doctors Management</h1>
          <p className="mt-2 text-[#808e9b]">Manage and monitor all doctors on the platform</p>
        </div>
        <button
          onClick={() => {
            resetAddDoctorForm();
            setShowAddModal(true);
          }}
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
              <p className="text-sm font-medium text-[#808e9b]">Verified</p>
              <p className="text-2xl font-black text-[#182C61]">
                {doctors.filter(d => d.isVerified).length}
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
                  Specialty
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Experience
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Department
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Qualifications
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
                    <div className="text-sm text-gray-900">{doctor.specialty}</div>
                    <div className="text-xs text-gray-500">{doctor.licenseNumber}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{doctor.experience}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{doctor.department}</div>
                    <div className="text-xs text-gray-500">{doctor.hospitalName}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 max-w-[150px] truncate" title={doctor.qualifications}>{doctor.qualifications}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(doctor.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => openEditModal(doctor)}
                        className="text-blue-600 hover:text-blue-900"
                        title="Edit Doctor"
                      >
                        <PencilIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleVerifyDoctor(doctor.id)}
                        className={`${doctor.isVerified ? 'text-gray-400 cursor-not-allowed' : 'text-green-600 hover:text-green-900'}`}
                        title={doctor.isVerified ? 'Already Verified' : 'Verify Doctor'}
                        disabled={doctor.isVerified}
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

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h3 className="text-xl font-black text-[#182C61]">Add New Doctor</h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setSubmitError('');
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <XCircleIcon className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleAddDoctor} className="space-y-4 px-6 py-5">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <input
                  type="text"
                  placeholder="Username *"
                  value={newDoctor.username}
                  onChange={(e) => setNewDoctor({ ...newDoctor, username: e.target.value })}
                  className="rounded-xl border border-gray-200 px-3 py-2"
                />
                <input
                  type="password"
                  placeholder="Password *"
                  value={newDoctor.password}
                  onChange={(e) => setNewDoctor({ ...newDoctor, password: e.target.value })}
                  className="rounded-xl border border-gray-200 px-3 py-2"
                />
                <input
                  type="email"
                  placeholder="Email *"
                  value={newDoctor.email}
                  onChange={(e) => setNewDoctor({ ...newDoctor, email: e.target.value })}
                  className="rounded-xl border border-gray-200 px-3 py-2"
                />
                <input
                  type="text"
                  placeholder="Full Name *"
                  value={newDoctor.name}
                  onChange={(e) => setNewDoctor({ ...newDoctor, name: e.target.value })}
                  className="rounded-xl border border-gray-200 px-3 py-2"
                />
                <input
                  type="text"
                  placeholder="Phone"
                  value={newDoctor.phone}
                  onChange={(e) => setNewDoctor({ ...newDoctor, phone: e.target.value })}
                  className="rounded-xl border border-gray-200 px-3 py-2"
                />
                <input
                  type="text"
                  placeholder="Specialty"
                  value={newDoctor.specialty}
                  onChange={(e) => setNewDoctor({ ...newDoctor, specialty: e.target.value })}
                  className="rounded-xl border border-gray-200 px-3 py-2"
                />
                <input
                  type="text"
                  placeholder="License Number"
                  value={newDoctor.licenseNumber}
                  onChange={(e) => setNewDoctor({ ...newDoctor, licenseNumber: e.target.value })}
                  className="rounded-xl border border-gray-200 px-3 py-2"
                />
                <input
                  type="number"
                  min="0"
                  placeholder="Years of Experience"
                  value={newDoctor.yearsOfExperience}
                  onChange={(e) => setNewDoctor({ ...newDoctor, yearsOfExperience: e.target.value })}
                  className="rounded-xl border border-gray-200 px-3 py-2"
                />
                <input
                  type="text"
                  placeholder="Department"
                  value={newDoctor.department}
                  onChange={(e) => setNewDoctor({ ...newDoctor, department: e.target.value })}
                  className="rounded-xl border border-gray-200 px-3 py-2"
                />
                <input
                  type="text"
                  placeholder="Qualifications"
                  value={newDoctor.qualifications}
                  onChange={(e) => setNewDoctor({ ...newDoctor, qualifications: e.target.value })}
                  className="rounded-xl border border-gray-200 px-3 py-2"
                />
              </div>

              {submitError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {submitError}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setSubmitError('');
                  }}
                  className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-bold text-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-xl bg-[#182C61] px-4 py-2 text-sm font-black text-white disabled:opacity-60"
                >
                  {isSubmitting ? 'Adding...' : 'Add Doctor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditModal && editDoctor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h3 className="text-xl font-black text-[#182C61]">Edit Doctor</h3>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditError('');
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <XCircleIcon className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleEditDoctor} className="space-y-4 px-6 py-5">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <input
                  type="text"
                  placeholder="Full Name"
                  value={editDoctor.name}
                  onChange={(e) => setEditDoctor({ ...editDoctor, name: e.target.value })}
                  className="rounded-xl border border-gray-200 px-3 py-2"
                />
                <input
                  type="email"
                  placeholder="Email"
                  value={editDoctor.email}
                  onChange={(e) => setEditDoctor({ ...editDoctor, email: e.target.value })}
                  className="rounded-xl border border-gray-200 px-3 py-2"
                />
                <input
                  type="text"
                  placeholder="Phone"
                  value={editDoctor.phone}
                  onChange={(e) => setEditDoctor({ ...editDoctor, phone: e.target.value })}
                  className="rounded-xl border border-gray-200 px-3 py-2"
                />
                <input
                  type="text"
                  placeholder="Specialty"
                  value={editDoctor.specialty}
                  onChange={(e) => setEditDoctor({ ...editDoctor, specialty: e.target.value })}
                  className="rounded-xl border border-gray-200 px-3 py-2"
                />
                <input
                  type="text"
                  placeholder="License Number"
                  value={editDoctor.licenseNumber}
                  onChange={(e) => setEditDoctor({ ...editDoctor, licenseNumber: e.target.value })}
                  className="rounded-xl border border-gray-200 px-3 py-2"
                />
                <input
                  type="number"
                  min="0"
                  placeholder="Years of Experience"
                  value={editDoctor.yearsOfExperience}
                  onChange={(e) => setEditDoctor({ ...editDoctor, yearsOfExperience: e.target.value })}
                  className="rounded-xl border border-gray-200 px-3 py-2"
                />
                <input
                  type="text"
                  placeholder="Department"
                  value={editDoctor.department}
                  onChange={(e) => setEditDoctor({ ...editDoctor, department: e.target.value })}
                  className="rounded-xl border border-gray-200 px-3 py-2"
                />
                <input
                  type="text"
                  placeholder="Qualifications"
                  value={editDoctor.qualifications}
                  onChange={(e) => setEditDoctor({ ...editDoctor, qualifications: e.target.value })}
                  className="rounded-xl border border-gray-200 px-3 py-2"
                />
              </div>

              {editError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {editError}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditError('');
                  }}
                  className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-bold text-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isEditSubmitting}
                  className="rounded-xl bg-[#182C61] px-4 py-2 text-sm font-black text-white disabled:opacity-60"
                >
                  {isEditSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
