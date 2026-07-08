'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Zap, Shield, BarChart3 } from 'lucide-react';
import { useUpload } from '@/hooks/useUpload';

const FEATURES = [
  { icon: Zap, title: 'AI Field Detection', desc: 'Gemini 2.5 Flash auto-maps your columns' },
  { icon: Shield, title: 'Smart Validation', desc: 'Every record validated before import' },
  { icon: BarChart3, title: 'Confidence Scores', desc: 'Know exactly how sure the AI is' },
];

export default function UploadPage() {
  const { upload, isUploading, error } = useUpload();
  const [isDragActive, setIsDragActive] = useState(false);

  const onDrop = useCallback(
    (files: File[]) => {
      if (files[0]) upload(files[0]);
    },
    [upload]
  );

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: { 'text/csv': ['.csv'], 'application/vnd.ms-excel': ['.csv'] },
    maxFiles: 1,
    maxSize: 50 * 1024 * 1024,
    onDragEnter: () => setIsDragActive(true),
    onDragLeave: () => setIsDragActive(false),
    onDropAccepted: () => setIsDragActive(false),
    onDropRejected: () => setIsDragActive(false),
    disabled: isUploading,
  });

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-16 animate-fade-in">
      {/* Hero */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-6"
          style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', color: '#818cf8' }}>
          <span className="pulse-dot w-2 h-2 rounded-full bg-indigo-400 inline-block" />
          Powered by Gemini 2.5 Flash
        </div>

        <h1 className="text-5xl font-bold tracking-tight mb-4">
          <span className="gradient-text">AI CSV Importer</span>
        </h1>
        <p className="text-gray-400 text-lg max-w-md mx-auto">
          Upload any CSV. AI maps your fields, extracts CRM data, and validates every record — automatically.
        </p>
      </div>

      {/* Dropzone */}
      <div
        {...getRootProps()}
        id="csv-dropzone"
        className={`w-full max-w-xl cursor-pointer rounded-2xl p-12 text-center transition-all duration-300 ${
          isDragActive
            ? 'glow-indigo scale-[1.02]'
            : 'hover:glow-indigo hover:scale-[1.01]'
        } ${isUploading ? 'opacity-60 cursor-not-allowed' : ''}`}
        style={{
          background: isDragActive
            ? 'rgba(99,102,241,0.12)'
            : 'rgba(30, 41, 59, 0.6)',
          border: `2px dashed ${isDragActive ? 'rgba(129,140,248,0.7)' : 'rgba(148,163,184,0.2)'}`,
          backdropFilter: 'blur(16px)',
        }}
      >
        <input {...getInputProps()} id="csv-file-input" />

        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ background: isDragActive ? 'rgba(99,102,241,0.3)' : 'rgba(99,102,241,0.1)' }}>
            {isUploading ? (
              <div className="w-8 h-8 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin" />
            ) : (
              <Upload className="w-8 h-8 text-indigo-400" />
            )}
          </div>

          {isUploading ? (
            <div>
              <p className="text-white font-semibold text-lg">Uploading & analyzing…</p>
              <p className="text-gray-500 text-sm mt-1">Parsing your CSV with AI</p>
            </div>
          ) : isDragActive ? (
            <div>
              <p className="text-indigo-300 font-semibold text-lg">Drop it here!</p>
              <p className="text-gray-500 text-sm mt-1">Release to start analysis</p>
            </div>
          ) : (
            <div>
              <p className="text-white font-semibold text-lg">Drop your CSV here</p>
              <p className="text-gray-500 text-sm mt-1">or <span className="text-indigo-400 underline underline-offset-2">browse files</span></p>
              <p className="text-gray-600 text-xs mt-3">CSV up to 50 MB · Any column structure</p>
            </div>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mt-4 px-4 py-3 rounded-xl text-sm text-red-300 animate-fade-in"
          style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
          {error}
        </div>
      )}

      {/* Feature cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-12 w-full max-w-xl">
        {FEATURES.map(({ icon: Icon, title, desc }) => (
          <div key={title} className="glass rounded-xl p-4 text-center">
            <Icon className="w-5 h-5 text-indigo-400 mx-auto mb-2" />
            <p className="text-sm font-medium text-white">{title}</p>
            <p className="text-xs text-gray-500 mt-1">{desc}</p>
          </div>
        ))}
      </div>

      {/* Footer note */}
      <p className="text-gray-600 text-xs mt-10">
        GrowEasy · No data stored permanently · Jobs expire after 1 hour
      </p>
    </main>
  );
}
