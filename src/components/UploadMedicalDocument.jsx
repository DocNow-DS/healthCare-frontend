import { useRef, useState } from 'react';

const ACCEPTED_TYPES = '.pdf,.jpg,.jpeg,.png,.doc,.docx';

export default function UploadMedicalDocument({ onUpload }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const fileInputRef = useRef(null);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage('');

    if (!selectedFile) {
      setMessage('Please select a report file first.');
      return;
    }

    try {
      setUploading(true);
      await onUpload(selectedFile, description.trim());
      setSelectedFile(null);
      setDescription('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setMessage('Report uploaded successfully.');
    } catch (error) {
      setMessage(error?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white border-2 border-slate-50 rounded-2xl p-5 space-y-3">
      <h2 className="text-lg font-black text-primary-500">Upload New Report</h2>
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_TYPES}
        onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
        className="block w-full text-sm font-semibold text-slate-700 file:mr-4 file:rounded-lg file:border-0 file:bg-primary-500 file:px-3 file:py-2 file:text-white hover:file:bg-primary-500/85"
      />
      {selectedFile ? (
        <p className="text-xs font-semibold text-slate-500">Selected: {selectedFile.name}</p>
      ) : null}
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Add a short description (optional)"
        rows={3}
        className="w-full rounded-xl border border-slate-200 p-3 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500/30"
      />
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-bold text-[#808e9b]">Allowed: PDF, JPG, PNG, DOC, DOCX (max 10MB)</p>
        <button
          type="submit"
          disabled={uploading}
          className="px-4 py-2 bg-primary-500 text-white rounded-xl font-black text-sm hover:bg-primary-500/85 disabled:opacity-60"
        >
          {uploading ? 'Uploading...' : 'Upload'}
        </button>
      </div>
      {message ? <p className="text-sm font-bold text-primary-500">{message}</p> : null}
    </form>
  );
}
