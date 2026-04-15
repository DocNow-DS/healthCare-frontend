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
  const [saving, setSaving] = useState(false);
  const [addForm, setAddForm] = useState({
    username: '',
    email: '',
    password: '',
    specialty: '',
    licenseNumber: '',
    yearsOfExperience: '',
    qualifications: '',
    department: '',
  });
  const [editForm, setEditForm] = useState({
    email: '',
    specialty: '',
    licenseNumber: '',
    yearsOfExperience: '',
    qualifications: '',
    department: '',
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
        id: doctor.id || doctor.userId || doctor._id || doctor.username,
        name: doctor.name || doctor.username || 'Unknown',
        username: doctor.username || '',
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
        qualifications: doctor.qualifications || 'Not specified',
        enabled: doctor.enabled !== false,
        roles: Array.isArray(doctor.roles) ? doctor.roles : [],
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
        await API.admin.deleteUser(doctorId);
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
      const user = await API.auth.getUserById(doctorId);
      await API.admin.updateUser(doctorId, {
        email: user?.email || '',
        roles: user?.roles || ['DOCTOR'],
        enabled: !(user?.enabled !== false),
      });
      fetchDoctors(); // Refresh the list
    } catch (error) {
      console.error('Error toggling doctor status:', error);
      alert('Failed to update doctor status. Please try again.');
    }
  };

  const handleVerifyDoctor = async (doctorId) => {
    try {
      await API.auth.updateUserById(doctorId, { isVerified: true });
      fetchDoctors(); // Refresh the list
    } catch (error) {
      console.error('Error verifying doctor:', error);
      alert('Failed to verify doctor. Please try again.');
    }
  };

  const openEditModal = async (doctor) => {
    setSelectedDoctor(doctor);
    setEditForm({
      email: doctor.email === 'N/A' ? '' : doctor.email,
      specialty: doctor.specialty === 'Not specified' ? '' : doctor.specialty,
      licenseNumber: doctor.licenseNumber === 'Not provided' ? '' : doctor.licenseNumber,
      yearsOfExperience: doctor.experience === 'Not specified' ? '' : String(doctor.experience).replace(' years', ''),
      qualifications: doctor.qualifications === 'Not specified' ? '' : doctor.qualifications,
      department: doctor.department === 'Not specified' ? '' : doctor.department,
    });
    setShowEditModal(true);
  };

  const handleAddDoctor = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await API.auth.register({
        username: addForm.username.trim(),
        email: addForm.email.trim(),
        password: addForm.password,
        roles: 'DOCTOR',
        specialty: addForm.specialty.trim(),
        licenseNumber: addForm.licenseNumber.trim(),
        yearsOfExperience: addForm.yearsOfExperience ? Number(addForm.yearsOfExperience) : null,
        qualifications: addForm.qualifications.trim(),
        department: addForm.department.trim(),
      });
      setShowAddModal(false);
      setAddForm({
        username: '',
        email: '',
        password: '',
        specialty: '',
        licenseNumber: '',
        yearsOfExperience: '',
        qualifications: '',
        department: '',
      });
      await fetchDoctors();
      alert('Doctor added successfully');
    } catch (error) {
      console.error('Error adding doctor:', error);
      alert(error?.message || 'Failed to add doctor. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleEditDoctor = async (e) => {
    e.preventDefault();
    if (!selectedDoctor?.id) return;
    try {
      setSaving(true);
      await API.auth.updateUserById(selectedDoctor.id, {
        email: editForm.email.trim(),
        specialty: editForm.specialty.trim(),
        licenseNumber: editForm.licenseNumber.trim(),
        yearsOfExperience: editForm.yearsOfExperience ? Number(editForm.yearsOfExperience) : null,
        qualifications: editForm.qualifications.trim(),
        department: editForm.department.trim(),
      });
      setShowEditModal(false);
      setSelectedDoctor(null);
      await fetchDoctors();
      alert('Doctor updated successfully');
    } catch (error) {
      console.error('Error updating doctor:', error);
      alert(error?.message || 'Failed to update doctor. Please try again.');
    } finally {
      setSaving(false);
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

      {showAddModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 border-2 border-slate-100">
            <h3 className="text-xl font-black text-[#182C61] mb-4">Add Doctor</h3>
            <form onSubmit={handleAddDoctor} className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input required placeholder="Username" value={addForm.username} onChange={(e) => setAddForm((p) => ({ ...p, username: e.target.value }))} className="border rounded-xl px-3 py-2" />
              <input required type="email" placeholder="Email" value={addForm.email} onChange={(e) => setAddForm((p) => ({ ...p, email: e.target.value }))} className="border rounded-xl px-3 py-2" />
              <input required type="password" placeholder="Password" value={addForm.password} onChange={(e) => setAddForm((p) => ({ ...p, password: e.target.value }))} className="border rounded-xl px-3 py-2" />
              <input required placeholder="Specialty" value={addForm.specialty} onChange={(e) => setAddForm((p) => ({ ...p, specialty: e.target.value }))} className="border rounded-xl px-3 py-2" />
              <input placeholder="License Number" value={addForm.licenseNumber} onChange={(e) => setAddForm((p) => ({ ...p, licenseNumber: e.target.value }))} className="border rounded-xl px-3 py-2" />
              <input type="number" min="0" placeholder="Years of Experience" value={addForm.yearsOfExperience} onChange={(e) => setAddForm((p) => ({ ...p, yearsOfExperience: e.target.value }))} className="border rounded-xl px-3 py-2" />
              <input placeholder="Department" value={addForm.department} onChange={(e) => setAddForm((p) => ({ ...p, department: e.target.value }))} className="border rounded-xl px-3 py-2" />
              <input placeholder="Qualifications" value={addForm.qualifications} onChange={(e) => setAddForm((p) => ({ ...p, qualifications: e.target.value }))} className="border rounded-xl px-3 py-2" />
              <div className="md:col-span-2 flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 rounded-xl border">Cancel</button>
                <button type="submit" disabled={saving} className="px-4 py-2 rounded-xl bg-[#182C61] text-white font-black disabled:opacity-60">{saving ? 'Saving...' : 'Add Doctor'}</button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {showEditModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 border-2 border-slate-100">
            <h3 className="text-xl font-black text-[#182C61] mb-4">Edit Doctor</h3>
            <form onSubmit={handleEditDoctor} className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input type="email" placeholder="Email" value={editForm.email} onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))} className="border rounded-xl px-3 py-2" />
              <input placeholder="Specialty" value={editForm.specialty} onChange={(e) => setEditForm((p) => ({ ...p, specialty: e.target.value }))} className="border rounded-xl px-3 py-2" />
              <input placeholder="License Number" value={editForm.licenseNumber} onChange={(e) => setEditForm((p) => ({ ...p, licenseNumber: e.target.value }))} className="border rounded-xl px-3 py-2" />
              <input type="number" min="0" placeholder="Years of Experience" value={editForm.yearsOfExperience} onChange={(e) => setEditForm((p) => ({ ...p, yearsOfExperience: e.target.value }))} className="border rounded-xl px-3 py-2" />
              <input placeholder="Department" value={editForm.department} onChange={(e) => setEditForm((p) => ({ ...p, department: e.target.value }))} className="border rounded-xl px-3 py-2" />
              <input placeholder="Qualifications" value={editForm.qualifications} onChange={(e) => setEditForm((p) => ({ ...p, qualifications: e.target.value }))} className="border rounded-xl px-3 py-2" />
              <div className="md:col-span-2 flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowEditModal(false)} className="px-4 py-2 rounded-xl border">Cancel</button>
                <button type="submit" disabled={saving} className="px-4 py-2 rounded-xl bg-[#182C61] text-white font-black disabled:opacity-60">{saving ? 'Saving...' : 'Save Changes'}</button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
