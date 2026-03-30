import { useEffect, useState } from 'react';
import { API } from '../config/api';
import { UserCircleIcon, ExclamationTriangleIcon, CheckCircleIcon, PencilIcon, XMarkIcon, AcademicCapIcon, BriefcaseIcon } from '@heroicons/react/24/outline';

const readAuthUser = () => {
  try {
    const raw = localStorage.getItem('auth_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export default function DoctorProfile() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    specialty: '',
    yearsOfExperience: '',
    licenseNumber: '',
    hospitalName: '',
    department: '',
    education: '',
    qualifications: '',
    about: ''
  });

  const loadProfile = async () => {
    setLoading(true);
    setError('');
    try {
      const authUser = readAuthUser();
      if (!authUser?.id) {
        setError('User not authenticated');
        return;
      }

      // Get fresh user data from API
      const userData = await API.admin.getAllUsers?.() || [];
      const currentUser = userData.find(u => u.id === authUser.id) || authUser;
      
      setUser(currentUser);
      setFormData({
        name: currentUser.name || currentUser.username || '',
        email: currentUser.email || '',
        phone: currentUser.phone || '',
        specialty: currentUser.specialty || '',
        yearsOfExperience: currentUser.yearsOfExperience || '',
        licenseNumber: currentUser.licenseNumber || '',
        hospitalName: currentUser.hospitalName || '',
        department: currentUser.department || '',
        education: currentUser.education || '',
        qualifications: currentUser.qualifications || '',
        about: currentUser.about || ''
      });
    } catch (e) {
      setError(e?.message || 'Unable to load profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const authUser = readAuthUser();
      if (!authUser?.id) {
        setError('User not authenticated');
        return;
      }

      // Update user via admin API
      await API.admin.updateUser(authUser.id, {
        name: formData.name,
        phone: formData.phone,
        specialty: formData.specialty,
        yearsOfExperience: formData.yearsOfExperience ? parseInt(formData.yearsOfExperience) : null,
        licenseNumber: formData.licenseNumber,
        hospitalName: formData.hospitalName,
        department: formData.department,
        education: formData.education,
        qualifications: formData.qualifications,
        about: formData.about
      });

      // Update local storage
      const updatedUser = { 
        ...authUser, 
        ...formData, 
        yearsOfExperience: formData.yearsOfExperience ? parseInt(formData.yearsOfExperience) : null 
      };
      localStorage.setItem('auth_user', JSON.stringify(updatedUser));

      setSuccess('Profile updated successfully!');
      setIsEditing(false);
      loadProfile();
    } catch (e) {
      setError(e?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#182C61]"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-[#182C61]">My Profile</h1>
          <p className="text-[#808e9b] mt-1 font-bold">Manage your professional information</p>
        </div>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="inline-flex items-center px-4 py-2 bg-[#182C61] text-white text-sm font-black rounded-xl hover:bg-[#2a3d7a] transition-colors"
          >
            <PencilIcon className="h-5 w-5 mr-2" />
            Edit Profile
          </button>
        )}
      </div>

      {/* Alerts */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2">
          <ExclamationTriangleIcon className="h-5 w-5 text-red-600 mt-0.5" />
          <span className="text-sm font-semibold text-red-800">{error}</span>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-start gap-2">
          <CheckCircleIcon className="h-5 w-5 text-green-600 mt-0.5" />
          <span className="text-sm font-semibold text-green-800">{success}</span>
        </div>
      )}

      {/* Profile Card */}
      <div className="bg-white border-2 border-slate-50 rounded-2xl overflow-hidden">
        {/* Profile Header */}
        <div className="bg-[#182C61] p-6">
          <div className="flex items-center gap-4">
            <div className="h-20 w-20 bg-white rounded-full flex items-center justify-center">
              <UserCircleIcon className="h-12 w-12 text-[#182C61]" />
            </div>
            <div className="text-white">
              <h2 className="text-xl font-black">{user?.name || user?.username || 'Doctor'}</h2>
              <p className="text-white/70 text-sm">{user?.email || 'No email'}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="inline-flex px-3 py-1 bg-white/20 rounded-full text-xs font-bold uppercase tracking-wider">
                  Doctor
                </span>
                {user?.isVerified && (
                  <span className="inline-flex items-center px-2 py-1 bg-green-500/80 rounded-full text-xs font-bold">
                    <CheckCircleIcon className="h-3 w-3 mr-1" />
                    Verified
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Profile Form */}
        <div className="p-6">
          {isEditing ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-[#182C61] mb-2">Full Name</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#182C61]"
                    placeholder="Enter your full name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-[#182C61] mb-2">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    disabled
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm bg-slate-50 text-gray-500 cursor-not-allowed"
                  />
                  <p className="text-xs text-[#808e9b] mt-1">Email cannot be changed</p>
                </div>
                <div>
                  <label className="block text-sm font-bold text-[#182C61] mb-2">Phone Number</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#182C61]"
                    placeholder="Enter phone number"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-[#182C61] mb-2">Specialty</label>
                  <input
                    type="text"
                    name="specialty"
                    value={formData.specialty}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#182C61]"
                    placeholder="e.g. Cardiology"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-[#182C61] mb-2">Years of Experience</label>
                  <input
                    type="number"
                    name="yearsOfExperience"
                    value={formData.yearsOfExperience}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#182C61]"
                    placeholder="Years of experience"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-[#182C61] mb-2">License Number</label>
                  <input
                    type="text"
                    name="licenseNumber"
                    value={formData.licenseNumber}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#182C61]"
                    placeholder="Medical license number"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-[#182C61] mb-2">Hospital/Clinic Name</label>
                  <input
                    type="text"
                    name="hospitalName"
                    value={formData.hospitalName}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#182C61]"
                    placeholder="Hospital or clinic name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-[#182C61] mb-2">Department</label>
                  <input
                    type="text"
                    name="department"
                    value={formData.department}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#182C61]"
                    placeholder="Department"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-[#182C61] mb-2">Education</label>
                  <input
                    type="text"
                    name="education"
                    value={formData.education}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#182C61]"
                    placeholder="e.g. MD, Harvard Medical School"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-[#182C61] mb-2">Qualifications</label>
                  <input
                    type="text"
                    name="qualifications"
                    value={formData.qualifications}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#182C61]"
                    placeholder="Board certifications, fellowships, etc."
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-[#182C61] mb-2">About / Bio</label>
                  <textarea
                    name="about"
                    value={formData.about}
                    onChange={handleChange}
                    rows="4"
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#182C61]"
                    placeholder="Brief description about your practice and expertise"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 bg-[#182C61] text-white rounded-xl font-black text-sm hover:bg-[#2a3d7a] disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  type="button"
                  onClick={() => { setIsEditing(false); loadProfile(); }}
                  className="inline-flex items-center px-6 py-2 bg-slate-100 text-slate-700 rounded-xl font-black text-sm hover:bg-slate-200"
                >
                  <XMarkIcon className="h-4 w-4 mr-2" />
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-4 bg-slate-50 rounded-xl">
                <p className="text-xs font-bold text-[#808e9b] uppercase tracking-wider mb-1">Full Name</p>
                <p className="text-sm font-bold text-[#182C61]">{user?.name || user?.username || 'Not provided'}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl">
                <p className="text-xs font-bold text-[#808e9b] uppercase tracking-wider mb-1">Email</p>
                <p className="text-sm font-bold text-[#182C61]">{user?.email || 'Not provided'}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl">
                <p className="text-xs font-bold text-[#808e9b] uppercase tracking-wider mb-1">Phone Number</p>
                <p className="text-sm font-bold text-[#182C61]">{user?.phone || 'Not provided'}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl">
                <p className="text-xs font-bold text-[#808e9b] uppercase tracking-wider mb-1">Specialty</p>
                <div className="flex items-center gap-2">
                  <AcademicCapIcon className="h-4 w-4 text-[#182C61]" />
                  <p className="text-sm font-bold text-[#182C61]">{user?.specialty || 'Not specified'}</p>
                </div>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl">
                <p className="text-xs font-bold text-[#808e9b] uppercase tracking-wider mb-1">Experience</p>
                <div className="flex items-center gap-2">
                  <BriefcaseIcon className="h-4 w-4 text-[#182C61]" />
                  <p className="text-sm font-bold text-[#182C61]">
                    {user?.yearsOfExperience ? `${user.yearsOfExperience} years` : 'Not specified'}
                  </p>
                </div>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl">
                <p className="text-xs font-bold text-[#808e9b] uppercase tracking-wider mb-1">License Number</p>
                <p className="text-sm font-bold text-[#182C61]">{user?.licenseNumber || 'Not provided'}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl">
                <p className="text-xs font-bold text-[#808e9b] uppercase tracking-wider mb-1">Hospital/Clinic</p>
                <p className="text-sm font-bold text-[#182C61]">{user?.hospitalName || 'Not specified'}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl">
                <p className="text-xs font-bold text-[#808e9b] uppercase tracking-wider mb-1">Department</p>
                <p className="text-sm font-bold text-[#182C61]">{user?.department || 'Not specified'}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl">
                <p className="text-xs font-bold text-[#808e9b] uppercase tracking-wider mb-1">Education</p>
                <p className="text-sm font-bold text-[#182C61]">{user?.education || 'Not specified'}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl">
                <p className="text-xs font-bold text-[#808e9b] uppercase tracking-wider mb-1">Member Since</p>
                <p className="text-sm font-bold text-[#182C61]">
                  {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                </p>
              </div>
              <div className="md:col-span-2 p-4 bg-slate-50 rounded-xl">
                <p className="text-xs font-bold text-[#808e9b] uppercase tracking-wider mb-1">Qualifications</p>
                <p className="text-sm font-bold text-[#182C61]">{user?.qualifications || 'No qualifications listed'}</p>
              </div>
              <div className="md:col-span-2 p-4 bg-slate-50 rounded-xl">
                <p className="text-xs font-bold text-[#808e9b] uppercase tracking-wider mb-1">About / Bio</p>
                <p className="text-sm font-bold text-[#182C61]">{user?.about || 'No bio available'}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
