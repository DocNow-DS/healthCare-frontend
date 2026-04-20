import { useEffect, useState } from 'react';
import { API } from '../config/api';
import { UserCircleIcon, ExclamationTriangleIcon, CheckCircleIcon, PencilIcon, XMarkIcon, TrashIcon } from '@heroicons/react/24/outline';
import UploadMedicalDocument from '../components/UploadMedicalDocument';
import { normalizeDocumentUrl } from '../utils/documentUrl';

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
  const [reportTab, setReportTab] = useState('submit');
  const [reports, setReports] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [reportsLoading, setReportsLoading] = useState(false);

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
      if (!authUser) {
        setError('User not authenticated');
        return;
      }

      // Prefer patient profile endpoint; fallback to local auth user if backend omits optional fields.
      const profile = await API.patients.getProfile();
      const currentUser = { ...(authUser || {}), ...(profile || {}) };
      
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

  const loadReports = async () => {
    setReportsLoading(true);
    try {
      const [reportData, prescriptionData] = await Promise.all([
        API.patients.getReports(),
        API.patients.getPrescriptions(),
      ]);
      setReports(Array.isArray(reportData) ? reportData : []);
      setPrescriptions(Array.isArray(prescriptionData) ? prescriptionData : []);
    } catch {
      setReports([]);
      setPrescriptions([]);
    } finally {
      setReportsLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
    loadReports();
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
      await API.patients.updateProfile({
        name: formData.name,
        phone: formData.phone,
        age: formData.age ? parseInt(formData.age) : null,
        gender: formData.gender,
        address: formData.address,
        medicalHistory: formData.medicalHistory
      });

      const authUser = readAuthUser() || {};
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

  const handleDeleteReport = async (reportId) => {
    if (!window.confirm('Are you sure you want to delete this report?')) return;
    setError('');
    try {
      await API.patients.deleteReport(reportId);
      setSuccess('Medical report deleted successfully.');
      await loadReports();
    } catch (err) {
      setError(err?.message || 'Failed to delete report.');
    }
  };

  const handleReportUpload = async (file, description) => {
    setError('');
    setSuccess('');
    try {
      await API.patients.uploadReport(file, description);
      setSuccess('Medical report submitted successfully.');
      setReportTab('view');
      await loadReports();
    } catch (err) {
      setError(err?.message || 'Failed to upload report.');
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
    <div className="max-w-4xl space-y-10 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-gray-900">Settings</h1>
      </div>

      {/* Alerts */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <ExclamationTriangleIcon className="h-5 w-5 text-red-600 mt-0.5" />
          <span className="text-sm font-semibold text-red-800">{error}</span>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
          <CheckCircleIcon className="h-5 w-5 text-green-600 mt-0.5" />
          <span className="text-sm font-semibold text-green-800">{success}</span>
        </div>
      )}

      <div className="flex gap-12">
        {/* Left Sidebar Menu */}
        <div className="hidden lg:block w-48 shrink-0">
          <div className="space-y-1">
            <p className="text-xs font-extrabold text-gray-400 uppercase tracking-wider mb-3">My Account</p>
            <button className="w-full text-left px-3 py-2 text-sm font-bold text-gray-900 bg-gray-50 rounded-lg">Personal Details</button>
            <button onClick={() => document.getElementById('medical-reports')?.scrollIntoView({ behavior: 'smooth' })} className="w-full text-left px-3 py-2 text-sm font-semibold text-gray-500 hover:text-gray-900 rounded-lg">Medical Reports</button>
            <button onClick={() => document.getElementById('medical-reports')?.scrollIntoView({ behavior: 'smooth' })} className="w-full text-left px-3 py-2 text-sm font-semibold text-gray-500 hover:text-gray-900 rounded-lg">Prescriptions</button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 space-y-10">
          
          <form onSubmit={handleSubmit} className="space-y-10">
            {/* Personal Details Section */}
            <div className="space-y-6">
              <div className="flex items-center gap-4 mb-8">
                <div className="h-16 w-16 bg-indigo-500 rounded-full flex items-center justify-center shrink-0">
                  <UserCircleIcon className="h-10 w-10 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{user?.name || user?.username || 'Patient Profile'}</h2>
                  <p className="text-sm text-gray-500">{user?.email}</p>
                </div>
              </div>

              <h2 className="text-lg font-bold text-gray-900 mb-6">Personal Details</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                <div>
                  <label className="block text-xs font-bold text-gray-900 mb-2">Full Name*</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-900 mb-2">Email Address*</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-500 bg-gray-50 cursor-not-allowed"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-gray-900 mb-2">Phone Number</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Enter phone number"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-900 mb-2">What should we call you?</label>
                  <input
                    type="text"
                    name="username"
                    value={user?.username || ''}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-500 bg-gray-50 cursor-not-allowed"
                    placeholder="Username"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-gray-900 mb-2">Gender</label>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                  >
                    <option value="">Select</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                    <option value="Prefer not to say">Prefer not to say</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-900 mb-2">Age / Date of Birth</label>
                  <div className="relative">
                    <input
                      type="number"
                      name="age"
                      value={formData.age}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Age"
                    />
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-900 mb-2">Address</label>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Enter your address"
                  />
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-900 mb-2">Medical History</label>
                  <textarea
                    name="medicalHistory"
                    value={formData.medicalHistory}
                    onChange={handleChange}
                    rows="4"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Enter any relevant medical history (allergies, chronic conditions, etc.)"
                  />
                </div>
              </div>
            </div>
            
            <div className="flex justify-end border-t border-gray-200 pt-6">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2 bg-indigo-500 text-white rounded-lg font-semibold text-sm hover:bg-indigo-600 transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Profile Details'}
              </button>
            </div>
          </form>

          {/* Reports Section Styled Nicely */}
          <div className="mt-12 bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
            <div className="mb-6">
              <h2 className="text-lg font-bold text-gray-900">Medical Reports & Prescriptions</h2>
              <p className="text-gray-500 mt-1 text-sm">View all uploaded reports and available prescriptions in one place.</p>
            </div>

            <div className="flex items-center gap-2 mb-6 border-b border-gray-200 pb-4">
              <button
                type="button"
                onClick={() => setReportTab('submit')}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  reportTab === 'submit'
                    ? 'bg-indigo-50 text-indigo-600'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                Submit Report
              </button>
              <button
                type="button"
                onClick={() => setReportTab('view')}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  reportTab === 'view'
                    ? 'bg-indigo-50 text-indigo-600'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                View Reports
              </button>
            </div>

            {reportTab === 'submit' ? (
              <UploadMedicalDocument onUpload={handleReportUpload} />
            ) : reportsLoading ? (
              <p className="text-sm font-semibold text-gray-500">Loading reports...</p>
            ) : reports.length === 0 && prescriptions.length === 0 ? (
              <p className="text-sm font-semibold text-gray-500 bg-gray-50 p-6 rounded-xl text-center border border-dashed border-gray-200">No uploaded reports or prescriptions yet.</p>
            ) : (
              <div className="space-y-8">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 mb-4">Uploaded Reports ({reports.length})</h3>
                  {reports.length === 0 ? (
                    <p className="text-sm font-semibold text-gray-500">No uploaded reports yet.</p>
                  ) : (
                    <div className="grid gap-4">
                      {reports.map((item, index) => (
                        <div key={item.id || index} className="p-4 rounded-xl bg-white border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-gray-300 transition-colors shadow-sm">
                          <div>
                            <p className="text-sm font-bold text-gray-900">{item.fileName || 'Medical Report'}</p>
                            <p className="text-xs text-gray-500 mt-1">{item.description || 'No description provided'}</p>
                            {item.uploadDate || item.createdAt ? (
                              <p className="text-xs text-gray-400 mt-1">
                                Uploaded: {new Date(item.uploadDate || item.createdAt).toLocaleString()}
                              </p>
                            ) : null}
                          </div>
                          <div className="flex items-center gap-3">
                            {normalizeDocumentUrl(item.filePath || item.fileUrl || item.downloadUrl)?.startsWith('http') ? (
                              <a
                                href={normalizeDocumentUrl(item.filePath || item.fileUrl || item.downloadUrl)}
                                target="_blank"
                                rel="noreferrer"
                                className="px-3 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-lg hover:bg-indigo-100 transition-colors whitespace-nowrap"
                              >
                                View report
                              </a>
                            ) : null}
                            {item.id && (
                              <button
                                type="button"
                                onClick={() => handleDeleteReport(item.id)}
                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"
                                title="Delete Report"
                              >
                                <TrashIcon className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="text-sm font-bold text-gray-900 mb-4">Prescriptions ({prescriptions.length})</h3>
                  {prescriptions.length === 0 ? (
                    <p className="text-sm font-semibold text-gray-500">No prescriptions available.</p>
                  ) : (
                    <div className="grid gap-4">
                      {prescriptions.map((item, index) => (
                        <div key={item.id || item.prescriptionId || index} className="p-4 rounded-xl bg-white border border-gray-200 flex justify-between shadow-sm">
                          <div>
                            <p className="text-sm font-bold text-gray-900">{item.title || item.fileName || 'Prescription'}</p>
                            <p className="text-xs text-gray-500 mt-1">{item.description || item.notes || 'No details provided'}</p>
                            {item.createdAt || item.uploadDate ? (
                              <p className="text-xs text-gray-400 mt-1">
                                Date: {new Date(item.createdAt || item.uploadDate).toLocaleString()}
                              </p>
                            ) : null}
                          </div>
                          <div>
                            {normalizeDocumentUrl(item.fileUrl || item.downloadUrl || item.filePath)?.startsWith('http') ? (
                              <a
                                href={normalizeDocumentUrl(item.fileUrl || item.downloadUrl || item.filePath)}
                                target="_blank"
                                rel="noreferrer"
                                className="px-3 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-lg hover:bg-indigo-100 transition-colors whitespace-nowrap"
                              >
                                View prescription
                              </a>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
