import { useEffect, useState } from 'react';
import { API } from '../config/api';
import { UserCircleIcon, ExclamationTriangleIcon, CheckCircleIcon, PencilIcon, XMarkIcon } from '@heroicons/react/24/outline';

const readAuthUser = () => {
  try {
    const raw = localStorage.getItem('auth_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export default function PatientProfile() {
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
    age: '',
    gender: '',
    address: '',
    medicalHistory: ''
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
        age: currentUser.age || '',
        gender: currentUser.gender || '',
        address: currentUser.address || '',
        medicalHistory: currentUser.medicalHistory || ''
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

      // Update user via admin API (update user endpoint)
      await API.admin.updateUser(authUser.id, {
        name: formData.name,
        phone: formData.phone,
        age: formData.age ? parseInt(formData.age) : null,
        gender: formData.gender,
        address: formData.address,
        medicalHistory: formData.medicalHistory
      });

      // Update local storage
      const updatedUser = { ...authUser, ...formData, age: formData.age ? parseInt(formData.age) : null };
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
          <p className="text-[#808e9b] mt-1 font-bold">Manage your personal information</p>
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
              <h2 className="text-xl font-black">{user?.name || user?.username || 'Patient'}</h2>
              <p className="text-white/70 text-sm">{user?.email || 'No email'}</p>
              <span className="inline-flex mt-2 px-3 py-1 bg-white/20 rounded-full text-xs font-bold uppercase tracking-wider">
                Patient
              </span>
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
                  <label className="block text-sm font-bold text-[#182C61] mb-2">Age</label>
                  <input
                    type="number"
                    name="age"
                    value={formData.age}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#182C61]"
                    placeholder="Enter age"
                    min="0"
                    max="150"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-[#182C61] mb-2">Gender</label>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#182C61]"
                  >
                    <option value="">Select gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                    <option value="Prefer not to say">Prefer not to say</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-[#182C61] mb-2">Address</label>
                  <textarea
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    rows="2"
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#182C61]"
                    placeholder="Enter your address"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-[#182C61] mb-2">Medical History</label>
                  <textarea
                    name="medicalHistory"
                    value={formData.medicalHistory}
                    onChange={handleChange}
                    rows="3"
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#182C61]"
                    placeholder="Enter any relevant medical history (allergies, chronic conditions, etc.)"
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
                <p className="text-xs font-bold text-[#808e9b] uppercase tracking-wider mb-1">Age</p>
                <p className="text-sm font-bold text-[#182C61]">{user?.age || 'Not provided'}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl">
                <p className="text-xs font-bold text-[#808e9b] uppercase tracking-wider mb-1">Gender</p>
                <p className="text-sm font-bold text-[#182C61]">{user?.gender || 'Not provided'}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl">
                <p className="text-xs font-bold text-[#808e9b] uppercase tracking-wider mb-1">Member Since</p>
                <p className="text-sm font-bold text-[#182C61]">
                  {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                </p>
              </div>
              <div className="md:col-span-2 p-4 bg-slate-50 rounded-xl">
                <p className="text-xs font-bold text-[#808e9b] uppercase tracking-wider mb-1">Address</p>
                <p className="text-sm font-bold text-[#182C61]">{user?.address || 'Not provided'}</p>
              </div>
              <div className="md:col-span-2 p-4 bg-slate-50 rounded-xl">
                <p className="text-xs font-bold text-[#808e9b] uppercase tracking-wider mb-1">Medical History</p>
                <p className="text-sm font-bold text-[#182C61]">{user?.medicalHistory || 'No medical history recorded'}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
