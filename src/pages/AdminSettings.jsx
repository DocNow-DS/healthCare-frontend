import { useMemo, useState } from 'react';
import {
  BellAlertIcon,
  CheckCircleIcon,
  Cog6ToothIcon,
  ExclamationTriangleIcon,
  KeyIcon,
  ServerStackIcon,
} from '@heroicons/react/24/outline';
import { services } from '../config/api';

const SETTINGS_KEY = 'admin_settings_v1';

const defaultSettings = {
  general: {
    maintenanceMode: false,
    allowDoctorSelfRegistration: false,
    autoVerifyDoctors: false,
  },
  security: {
    forceStrongPasswords: true,
    sessionTimeoutMinutes: 60,
    enforce2FAForAdmins: false,
  },
  notifications: {
    newDoctorRegistration: true,
    failedPayments: true,
    dailySummary: false,
  },
};

const tabs = [
  { id: 'general', label: 'General', icon: Cog6ToothIcon },
  { id: 'security', label: 'Security', icon: KeyIcon },
  { id: 'notifications', label: 'Notifications', icon: BellAlertIcon },
  { id: 'integrations', label: 'Integrations', icon: ServerStackIcon },
];

const loadSettings = () => {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return defaultSettings;
    const parsed = JSON.parse(raw);
    return {
      general: { ...defaultSettings.general, ...(parsed?.general || {}) },
      security: { ...defaultSettings.security, ...(parsed?.security || {}) },
      notifications: { ...defaultSettings.notifications, ...(parsed?.notifications || {}) },
    };
  } catch {
    return defaultSettings;
  }
};

export default function AdminSettings() {
  const [activeTab, setActiveTab] = useState('general');
  const [settings, setSettings] = useState(loadSettings);
  const [status, setStatus] = useState({ type: '', message: '' });

  const isDirty = useMemo(() => {
    try {
      const current = JSON.stringify(settings);
      const stored = localStorage.getItem(SETTINGS_KEY);
      return current !== stored;
    } catch {
      return true;
    }
  }, [settings]);

  const saveSettings = () => {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
      setStatus({ type: 'success', message: 'Settings saved successfully.' });
    } catch {
      setStatus({ type: 'error', message: 'Unable to save settings in browser storage.' });
    }
  };

  const resetDefaults = () => {
    setSettings(defaultSettings);
    setStatus({ type: 'warning', message: 'Settings reset to default values. Click Save to apply.' });
  };

  const updateSetting = (group, key, value) => {
    setSettings((prev) => ({
      ...prev,
      [group]: {
        ...prev[group],
        [key]: value,
      },
    }));
  };

  const Toggle = ({ checked, onChange, label, description }) => (
    <label className="flex items-start justify-between gap-4 p-4 rounded-xl border border-slate-200 bg-white">
      <div>
        <p className="text-sm font-black text-primary-500">{label}</p>
        <p className="text-xs font-semibold text-[#808e9b] mt-1">{description}</p>
      </div>
      <button
        type="button"
        onClick={onChange}
        className={`relative inline-flex h-7 w-12 items-center rounded-full transition ${
          checked ? 'bg-primary-500' : 'bg-slate-300'
        }`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </label>
  );

  const renderGeneral = () => (
    <div className="space-y-3">
      <Toggle
        checked={settings.general.maintenanceMode}
        onChange={() => updateSetting('general', 'maintenanceMode', !settings.general.maintenanceMode)}
        label="Maintenance Mode"
        description="Show maintenance banner and pause patient-side write actions."
      />
      <Toggle
        checked={settings.general.allowDoctorSelfRegistration}
        onChange={() =>
          updateSetting('general', 'allowDoctorSelfRegistration', !settings.general.allowDoctorSelfRegistration)
        }
        label="Allow Doctor Self Registration"
        description="Allow doctors to create accounts directly from sign-up flow."
      />
      <Toggle
        checked={settings.general.autoVerifyDoctors}
        onChange={() => updateSetting('general', 'autoVerifyDoctors', !settings.general.autoVerifyDoctors)}
        label="Auto Verify Doctors"
        description="Automatically mark newly created doctor users as verified."
      />
    </div>
  );

  const renderSecurity = () => (
    <div className="space-y-4">
      <Toggle
        checked={settings.security.forceStrongPasswords}
        onChange={() => updateSetting('security', 'forceStrongPasswords', !settings.security.forceStrongPasswords)}
        label="Enforce Strong Passwords"
        description="Require mixed-case, number, and symbol for all new user passwords."
      />

      <label className="block p-4 rounded-xl border border-slate-200 bg-white">
        <p className="text-sm font-black text-primary-500">Session Timeout (minutes)</p>
        <p className="text-xs font-semibold text-[#808e9b] mt-1">Auto-expire admin sessions after inactivity.</p>
        <input
          type="number"
          min={15}
          max={240}
          value={settings.security.sessionTimeoutMinutes}
          onChange={(e) => updateSetting('security', 'sessionTimeoutMinutes', Number(e.target.value || 60))}
          className="mt-3 w-full md:w-48 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30"
        />
      </label>

      <Toggle
        checked={settings.security.enforce2FAForAdmins}
        onChange={() => updateSetting('security', 'enforce2FAForAdmins', !settings.security.enforce2FAForAdmins)}
        label="Enforce 2FA for Admins"
        description="Require second-factor challenge for all admin logins."
      />
    </div>
  );

  const renderNotifications = () => (
    <div className="space-y-3">
      <Toggle
        checked={settings.notifications.newDoctorRegistration}
        onChange={() =>
          updateSetting('notifications', 'newDoctorRegistration', !settings.notifications.newDoctorRegistration)
        }
        label="New Doctor Registrations"
        description="Get notified when a new doctor account is created."
      />
      <Toggle
        checked={settings.notifications.failedPayments}
        onChange={() => updateSetting('notifications', 'failedPayments', !settings.notifications.failedPayments)}
        label="Failed Payments"
        description="Alert admins when payment gateway reports a failure."
      />
      <Toggle
        checked={settings.notifications.dailySummary}
        onChange={() => updateSetting('notifications', 'dailySummary', !settings.notifications.dailySummary)}
        label="Daily Platform Summary"
        description="Receive a daily digest including appointments and transactions."
      />
    </div>
  );

  const renderIntegrations = () => (
    <div className="space-y-4">
      {Object.entries(services).map(([name, url]) => (
        <div key={name} className="p-4 rounded-xl border border-slate-200 bg-white">
          <p className="text-xs font-black uppercase tracking-widest text-[#808e9b]">{name} service</p>
          <p className="text-sm font-black text-primary-500 mt-1 break-all">{url}</p>
        </div>
      ))}
      <p className="text-xs font-semibold text-[#808e9b]">
        Service URLs come from frontend environment variables and are shown for quick diagnostics.
      </p>
    </div>
  );

  const renderContent = () => {
    if (activeTab === 'general') return renderGeneral();
    if (activeTab === 'security') return renderSecurity();
    if (activeTab === 'notifications') return renderNotifications();
    return renderIntegrations();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black text-primary-500">Admin Settings</h1>
          <p className="text-sm font-semibold text-[#808e9b] mt-1">Configure platform behavior and admin preferences.</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={resetDefaults}
            className="px-4 py-2 rounded-lg border border-slate-300 bg-white text-primary-500 text-sm font-black hover:bg-slate-50"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={saveSettings}
            className="px-4 py-2 rounded-lg bg-primary-500 text-white text-sm font-black hover:bg-primary-500/90"
          >
            Save Changes
          </button>
        </div>
      </div>

      {status.message ? (
        <div
          className={`rounded-xl p-3 flex items-center gap-2 text-sm font-semibold ${
            status.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : status.type === 'warning'
                ? 'bg-amber-50 border border-amber-200 text-amber-800'
                : 'bg-rose-50 border border-rose-200 text-rose-800'
          }`}
        >
          {status.type === 'success' ? <CheckCircleIcon className="h-5 w-5" /> : <ExclamationTriangleIcon className="h-5 w-5" />}
          {status.message}
        </div>
      ) : null}

      {isDirty ? (
        <div className="rounded-xl p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs font-black uppercase tracking-wider">
          You have unsaved changes.
        </div>
      ) : null}

      <div className="bg-white border-2 border-slate-50 rounded-2xl p-2 grid grid-cols-2 md:grid-cols-4 gap-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition ${
                active ? 'bg-primary-500 text-white' : 'bg-slate-50 text-primary-500 hover:bg-slate-100'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="bg-white border-2 border-slate-50 rounded-2xl p-5">{renderContent()}</div>
    </div>
  );
}
