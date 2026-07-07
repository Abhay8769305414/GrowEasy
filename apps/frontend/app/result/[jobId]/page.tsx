'use client';

import { use, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  TrendingUp, 
  Zap, 
  DollarSign, 
  Clock, 
  Download, 
  Search, 
  RefreshCw,
  SlidersHorizontal,
  CircleDot
} from 'lucide-react';
import { useResult } from '@/hooks/useResult';
import { useProgress } from '@/hooks/useProgress';
import type { CrmRecord } from '@/lib/api';

function ConfidenceBadge({ score }: { score: number }) {
  const level = score >= 0.85 ? 'high' : score >= 0.60 ? 'medium' : 'low';
  const colors = {
    high:   { bg: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.3)', text: '#6ee7b7' },
    medium: { bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.3)', text: '#fcd34d' },
    low:    { bg: 'rgba(239,68,68,0.15)',  border: 'rgba(239,68,68,0.3)',  text: '#fca5a5' },
  }[level];

  return (
    <span className="text-xs px-2 py-0.5 rounded-full font-medium"
      style={{ background: colors.bg, border: `1px solid ${colors.border}`, color: colors.text }}>
      {Math.round(score * 100)}%
    </span>
  );
}

function StatusIcon({ status }: { status: CrmRecord['status'] }) {
  if (status === 'success') return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
  if (status === 'failed')  return <XCircle className="w-4 h-4 text-red-400" />;
  return <AlertTriangle className="w-4 h-4 text-amber-400" />;
}

function SummaryCard({ 
  label, 
  value, 
  icon: Icon, 
  accent, 
  isActive = false, 
  onClick 
}: { 
  label: string; 
  value: string | number; 
  icon: React.ElementType; 
  accent: string;
  isActive?: boolean;
  onClick?: () => void;
}) {
  return (
    <div 
      onClick={onClick}
      className={`glass rounded-xl p-5 flex items-center gap-4 transition-all duration-300 ${
        onClick ? 'cursor-pointer hover:scale-[1.03] select-none' : ''
      } ${isActive ? 'ring-2 ring-indigo-500 shadow-lg shadow-indigo-500/10' : ''}`}
      style={{
        border: isActive ? '1px solid rgba(99,102,241,0.4)' : '1px solid rgba(148,163,184,0.08)'
      }}
    >
      <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `${accent}22` }}>
        <Icon className="w-5 h-5" style={{ color: accent }} />
      </div>
      <div>
        <p className="text-xs text-gray-500 uppercase tracking-wider">{label}</p>
        <p className="text-xl font-bold text-white">{value}</p>
      </div>
    </div>
  );
}

export default function ResultPage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = use(params);
  const router = useRouter();
  const progress = useProgress(jobId);
  const { data: result, isLoading, error, refetch } = useResult(jobId, progress.isDone);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'success' | 'failed' | 'skipped' | 'warnings'>('all');

  // Trigger downloads
  const downloadJson = () => {
    window.open(`/api/jobs/${jobId}/download/json`, '_blank');
  };

  const downloadCsv = () => {
    window.open(`/api/jobs/${jobId}/download/csv`, '_blank');
  };

  // Determine active timeline steps
  const steps = useMemo(() => {
    const isDone = progress.isDone || (result && result.status === 'done');
    const isProcessing = !isDone && progress.processed < progress.total;
    const hasStarted = progress.processed > 0;

    return [
      { name: 'Parsing', desc: 'CSV format parsed', status: 'completed' },
      { name: 'Field Mapping', desc: 'Fields mapped', status: 'completed' },
      { 
        name: 'AI Extraction', 
        desc: 'Gemini structured mapping', 
        status: isDone ? 'completed' : (isProcessing ? 'active' : 'pending')
      },
      { 
        name: 'Normalization', 
        desc: 'Standardizing phone & country format', 
        status: isDone ? 'completed' : (isProcessing && hasStarted ? 'active' : 'pending')
      },
      { 
        name: 'Validation', 
        desc: 'Verifying CRM schema rules', 
        status: isDone ? 'completed' : (isProcessing && hasStarted ? 'active' : 'pending')
      },
      { 
        name: 'Completed', 
        desc: 'Records successfully processed', 
        status: isDone ? 'completed' : 'pending'
      }
    ];
  }, [progress, result]);

  // Filtered Records List
  const filteredRecords = useMemo(() => {
    if (!result || !result.records) return [];

    return result.records.filter((r) => {
      const query = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !query ||
        (r.data.name && r.data.name.toLowerCase().includes(query)) ||
        (r.data.email && r.data.email.toLowerCase().includes(query)) ||
        (r.data.company && r.data.company.toLowerCase().includes(query)) ||
        r.errors.some((e) => e.message.toLowerCase().includes(query)) ||
        r.warnings.some((w) => w.message.toLowerCase().includes(query));

      let matchesStatus = true;
      if (filterStatus === 'success') matchesStatus = r.status === 'success';
      else if (filterStatus === 'failed') matchesStatus = r.status === 'failed';
      else if (filterStatus === 'skipped') matchesStatus = r.status === 'skipped';
      else if (filterStatus === 'warnings') matchesStatus = r.warnings.length > 0;

      return matchesSearch && matchesStatus;
    });
  }, [result, searchQuery, filterStatus]);

  // Show progress while processing
  if (!progress.isDone && !result) {
    return (
      <main className="min-h-screen flex flex-col lg:flex-row items-center justify-center gap-12 px-6 py-12 animate-fade-in max-w-6xl mx-auto">
        <div className="w-full lg:w-1/2 max-w-md">
          <div className="mb-8">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)' }}>
              <Zap className="w-8 h-8 text-indigo-400" />
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight">AI Importing Data…</h1>
            <p className="text-gray-400 text-sm mt-2">
              {progress.processed > 0
                ? `Processed ${progress.processed.toLocaleString()} of ${progress.total.toLocaleString()} rows`
                : 'Initializing AI pipeline…'
              }
            </p>
          </div>

          {/* Progress Bar */}
          <div className="w-full rounded-full h-3 overflow-hidden mb-2"
            style={{ background: 'rgba(30,41,59,0.8)', border: '1px solid rgba(148,163,184,0.1)' }}>
            <div
              className="h-full rounded-full transition-all duration-500 shimmer"
              style={{
                width: `${Math.max(progress.percentage, 5)}%`,
                background: 'linear-gradient(90deg, #6366f1, #8b5cf6, #c084fc)',
              }}
            />
          </div>

          <div className="flex justify-between text-xs text-gray-500">
            <span>{progress.percentage}% complete</span>
            {progress.batchId && <span>Active: {progress.batchId}</span>}
          </div>

          {progress.error && (
            <div className="mt-6 flex items-center gap-3 px-4 py-3 rounded-xl text-xs text-amber-300"
              style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' }}>
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {progress.error}
            </div>
          )}
        </div>

        {/* Stepper timeline */}
        <div className="w-full lg:w-1/2 max-w-md glass rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-6">
            Processing Pipeline
          </h2>

          <div className="relative border-l-2 border-slate-800 ml-3 space-y-6">
            {steps.map((step, idx) => (
              <div key={idx} className="relative pl-6">
                <div className={`absolute -left-[9px] top-1.5 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                  step.status === 'completed' 
                    ? 'bg-indigo-500 border-indigo-400 shadow-lg shadow-indigo-500/20' 
                    : step.status === 'active'
                    ? 'bg-slate-900 border-indigo-400 animate-pulse'
                    : 'bg-slate-950 border-slate-800'
                }`}>
                  {step.status === 'completed' && <div className="w-1 h-1 rounded-full bg-white" />}
                  {step.status === 'active' && <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />}
                </div>

                <div>
                  <h3 className={`text-sm font-semibold transition-colors duration-300 ${
                    step.status === 'completed' ? 'text-white' : step.status === 'active' ? 'text-indigo-400' : 'text-gray-600'
                  }`}>{step.name}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    );
  }

  if (isLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center animate-fade-in">
        <div className="text-center">
          <div className="w-10 h-10 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading results…</p>
        </div>
      </main>
    );
  }

  if (error || !result) {
    return (
      <main className="min-h-screen flex items-center justify-center animate-fade-in">
        <div className="text-center glass rounded-2xl p-8 max-w-sm">
          <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-white mb-2">Failed to load results</h2>
          <p className="text-gray-400 text-sm mb-6">{error instanceof Error ? error.message : 'Unknown error'}</p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => refetch()}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-slate-800 hover:bg-slate-700 flex items-center gap-2 border border-slate-700">
              <RefreshCw className="w-4 h-4" /> Retry
            </button>
            <button onClick={() => router.push('/')}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:scale-105"
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
              Start Over
            </button>
          </div>
        </div>
      </main>
    );
  }

  const { summary, metrics, records } = result;
  
  const avgConfidence = records.length > 0
    ? records.flatMap((r) => Object.values(r.fieldConfidence).map((c) => c.score)).reduce((a, b) => a + b, 0) /
      Math.max(records.flatMap((r) => Object.values(r.fieldConfidence)).length, 1)
    : 0;

  const totalWarnings = records.reduce((acc, r) => acc + r.warnings.length, 0);

  return (
    <main className="min-h-screen px-4 py-10 animate-fade-in">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <button onClick={() => router.push('/')}
              className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors mb-3"
              id="result-back-btn">
              <ArrowLeft className="w-4 h-4" /> New Import
            </button>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <CheckCircle2 className="w-7 h-7 text-emerald-400" />
              Import Dashboard
            </h1>
            <p className="text-gray-400 text-sm mt-1">Job ID: {jobId}</p>
          </div>

          <div className="flex gap-3 w-full sm:w-auto">
            <button 
              onClick={downloadJson}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-300 bg-slate-800/80 border border-slate-700 hover:bg-slate-700 transition-all hover:text-white"
            >
              <Download className="w-4 h-4" />
              JSON
            </button>
            <button 
              onClick={downloadCsv}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white transition-all duration-200 hover:scale-105"
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', boxShadow: '0 4px 15px rgba(99,102,241,0.25)' }}
            >
              <Download className="w-4 h-4" />
              CSV
            </button>
          </div>
        </div>

        {/* Summary Filters */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <SummaryCard 
            label="Total Rows" 
            value={summary.total.toLocaleString()} 
            icon={TrendingUp} 
            accent="#818cf8"
            isActive={filterStatus === 'all'}
            onClick={() => setFilterStatus('all')}
          />
          <SummaryCard 
            label="Success" 
            value={summary.success.toLocaleString()} 
            icon={CheckCircle2} 
            accent="#10b981"
            isActive={filterStatus === 'success'}
            onClick={() => setFilterStatus('success')}
          />
          <SummaryCard 
            label="Failed" 
            value={summary.failed.toLocaleString()} 
            icon={XCircle} 
            accent="#ef4444"
            isActive={filterStatus === 'failed'}
            onClick={() => setFilterStatus('failed')}
          />
          <SummaryCard 
            label="Skipped" 
            value={summary.skipped.toLocaleString()} 
            icon={CircleDot} 
            accent="#f59e0b"
            isActive={filterStatus === 'skipped'}
            onClick={() => setFilterStatus('skipped')}
          />
          <SummaryCard 
            label="Warnings" 
            value={totalWarnings.toLocaleString()} 
            icon={AlertTriangle} 
            accent="#f59e0b"
            isActive={filterStatus === 'warnings'}
            onClick={() => setFilterStatus('warnings')}
          />
        </div>

        {/* Metrics Block */}
        {metrics && (
          <div className="glass rounded-xl px-6 py-4 mb-6 flex flex-wrap gap-6 text-sm">
            {metrics.durationMs && (
              <div className="flex items-center gap-2 text-gray-400">
                <Clock className="w-4 h-4 text-indigo-400" />
                {(metrics.durationMs / 1000).toFixed(1)}s processing time
              </div>
            )}
            <div className="flex items-center gap-2 text-gray-400">
              <Zap className="w-4 h-4 text-purple-400" />
              {metrics.llmCalls} LLM calls · {metrics.totalTokens.toLocaleString()} tokens
            </div>
            <div className="flex items-center gap-2 text-gray-400">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              ~${metrics.estimatedCostUsd.toFixed(4)} estimated cost
            </div>
            <div className="flex items-center gap-2 text-gray-400 ml-auto font-medium">
              <Zap className="w-4.5 h-4.5 text-indigo-400" />
              Avg Mapping Confidence: {Math.round(avgConfidence * 100)}%
            </div>
          </div>
        )}

        {/* Search and Table Container */}
        <div className="glass rounded-2xl overflow-hidden">
          {/* Table Toolbar */}
          <div className="px-6 py-4 border-b flex flex-col md:flex-row gap-4 justify-between items-center" 
            style={{ borderColor: 'rgba(148,163,184,0.1)', background: 'rgba(15,23,42,0.2)' }}>
            
            <div className="flex items-center gap-2 text-gray-300 font-semibold text-sm">
              <SlidersHorizontal className="w-4 h-4 text-indigo-400" />
              Records Table ({filteredRecords.length} of {records.length} filtered)
            </div>

            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search name, email, company, errors..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700/60 rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition-all"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            {filteredRecords.length === 0 ? (
              <div className="text-center py-16">
                <SlidersHorizontal className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400 font-medium">No records match your filters</p>
                <p className="text-gray-600 text-xs mt-1">Try relaxing your search query or switching filters</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: 'rgba(15,23,42,0.5)' }}>
                    <th className="px-4 py-3 text-left text-xs text-gray-500 font-medium uppercase tracking-wider w-16">Row</th>
                    <th className="px-4 py-3 text-left text-xs text-gray-500 font-medium uppercase tracking-wider w-32">Status</th>
                    <th className="px-4 py-3 text-left text-xs text-gray-500 font-medium uppercase tracking-wider">Name</th>
                    <th className="px-4 py-3 text-left text-xs text-gray-500 font-medium uppercase tracking-wider">Email</th>
                    <th className="px-4 py-3 text-left text-xs text-gray-500 font-medium uppercase tracking-wider">Phone</th>
                    <th className="px-4 py-3 text-left text-xs text-gray-500 font-medium uppercase tracking-wider">Company</th>
                    <th className="px-4 py-3 text-left text-xs text-gray-500 font-medium uppercase tracking-wider">Confidence</th>
                    <th className="px-4 py-3 text-left text-xs text-gray-500 font-medium uppercase tracking-wider max-w-[250px]">Issues</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.map((record) => {
                    const avgScore = Object.values(record.fieldConfidence).reduce((a, c) => a + c.score, 0) /
                      Math.max(Object.values(record.fieldConfidence).length, 1);
                    return (
                      <tr key={record.row}
                        className="transition-colors hover:bg-indigo-500/5"
                        style={{ borderTop: '1px solid rgba(148,163,184,0.06)' }}>
                        <td className="px-4 py-3 text-gray-600 text-xs font-semibold">{record.row}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <StatusIcon status={record.status} />
                            <span className={`text-xs font-semibold uppercase ${
                              record.status === 'success' ? 'text-emerald-400' :
                              record.status === 'failed' ? 'text-red-400' : 'text-amber-400'
                            }`}>{record.status}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-200 max-w-[150px] truncate">{record.data.name ?? '—'}</td>
                        <td className="px-4 py-3 text-gray-300 max-w-[180px] truncate">{record.data.email ?? '—'}</td>
                        <td className="px-4 py-3 text-gray-300">{record.data.phone ?? '—'}</td>
                        <td className="px-4 py-3 text-gray-300 max-w-[150px] truncate">{record.data.company ?? '—'}</td>
                        <td className="px-4 py-3">
                          <ConfidenceBadge score={avgScore} />
                        </td>
                        <td className="px-4 py-3 max-w-[250px] truncate">
                          {record.errors.length > 0 ? (
                            <span className="text-xs text-red-400 flex items-center gap-1.5">
                              <XCircle className="w-3.5 h-3.5" />
                              {record.errors.map(e => e.message).join(', ')}
                            </span>
                          ) : record.warnings.length > 0 ? (
                            <span className="text-xs text-amber-400 flex items-center gap-1.5">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              {record.warnings.map(w => w.message).join(', ')}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-700">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </div>
    </main>
  );
}
