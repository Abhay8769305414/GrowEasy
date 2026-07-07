'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, FileText, AlertCircle } from 'lucide-react';
import { usePreview } from '@/hooks/usePreview';
import { useImport } from '@/hooks/useImport';

const CRM_FIELD_OPTIONS = [
  '', 'name', 'email', 'phone', 'company', 'address', 'city', 'state',
  'country', 'tags', 'notes', 'lead_source', 'status', 'owner', 'website', 'created_at',
];

const CRM_FIELD_LABELS: Record<string, string> = {
  name: 'Full Name', email: 'Email', phone: 'Phone', company: 'Company',
  address: 'Address', city: 'City', state: 'State', country: 'Country',
  tags: 'Tags', notes: 'Notes', lead_source: 'Lead Source', status: 'Status',
  owner: 'Owner', website: 'Website', created_at: 'Created Date',
};

export default function PreviewPage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = use(params);
  const router = useRouter();
  const { preview, fieldMappings, updateFieldMapping } = usePreview(jobId);
  const { startImport, isStarting, error } = useImport();

  if (!preview) {
    return (
      <main className="min-h-screen flex items-center justify-center animate-fade-in">
        <div className="text-center">
          <div className="w-10 h-10 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading preview…</p>
        </div>
      </main>
    );
  }

  const mappedCount = fieldMappings.filter((m) => m.crmField !== null).length;
  const totalHeaders = fieldMappings.length;

  return (
    <main className="min-h-screen px-4 py-10 animate-fade-in">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <button
              id="preview-back-btn"
              onClick={() => router.push('/')}
              className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors mb-3"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Upload
            </button>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <FileText className="w-6 h-6 text-indigo-400" />
              CSV Preview &amp; Field Mapping
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              {preview.fileName} · {preview.totalRows.toLocaleString()} rows · {mappedCount}/{totalHeaders} fields mapped
            </p>
          </div>

          <button
            id="start-import-btn"
            onClick={startImport}
            disabled={isStarting || mappedCount === 0}
            className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', boxShadow: '0 4px 15px rgba(99,102,241,0.4)' }}
          >
            {isStarting ? (
              <>
                <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                Starting…
              </>
            ) : (
              <>
                Start AI Import
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="mb-6 flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-red-300 animate-fade-in"
            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Field Mapping Panel */}
        <div className="glass rounded-2xl p-6 mb-6">
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">
            Field Mapping
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {fieldMappings.map((mapping) => (
              <div key={mapping.csvColumn}
                className="flex flex-col gap-1.5 p-3 rounded-xl"
                style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(148,163,184,0.08)' }}>
                <span className="text-xs text-gray-500">CSV Column</span>
                <span className="text-sm font-medium text-white truncate">{mapping.csvColumn}</span>
                <span className="text-xs text-gray-600 mt-1">→ Maps to</span>
                <select
                  id={`field-mapping-${mapping.csvColumn.replace(/\s+/g, '-').toLowerCase()}`}
                  value={mapping.crmField ?? ''}
                  onChange={(e) => updateFieldMapping(mapping.csvColumn, e.target.value || null)}
                  className="text-sm rounded-lg px-2 py-1.5 outline-none w-full transition-colors"
                  style={{ background: 'rgba(30,41,59,0.8)', border: '1px solid rgba(148,163,184,0.15)', color: mapping.crmField ? '#818cf8' : '#6b7280' }}
                >
                  <option value="">— Skip this column —</option>
                  {CRM_FIELD_OPTIONS.filter(Boolean).map((field) => (
                    <option key={field} value={field}>{CRM_FIELD_LABELS[field] ?? field}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>

        {/* Preview Table */}
        <div className="glass rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b"
            style={{ borderColor: 'rgba(148,163,184,0.1)' }}>
            <h2 className="text-sm font-semibold text-gray-300">
              Preview — first {preview.preview.length} of {preview.totalRows.toLocaleString()} rows
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: 'rgba(15,23,42,0.5)' }}>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-10">#</th>
                  {preview.headers.map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.preview.map((row, i) => (
                  <tr key={i}
                    className="transition-colors hover:bg-indigo-500/5"
                    style={{ borderTop: '1px solid rgba(148,163,184,0.06)' }}>
                    <td className="px-4 py-3 text-gray-600 text-xs">{i + 1}</td>
                    {preview.headers.map((h) => (
                      <td key={h} className="px-4 py-3 text-gray-300 max-w-[200px] truncate">
                        {row[h] ?? <span className="text-gray-700 italic">—</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </main>
  );
}
