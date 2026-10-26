import { useState } from 'react';
import {
  X,
  FileSpreadsheet,
  FileText,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  Printer,
  Sparkles,
} from 'lucide-react';
import type { Timeframe } from '../utils/exportUtils';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  recordCount: number;
  onExportCsv: (timeframe: Timeframe) => void;
  onExportPdf: (timeframe: Timeframe) => void;
  defaultTimeframe?: Timeframe;
}

export default function ExportModal({
  isOpen,
  onClose,
  title,
  description,
  recordCount,
  onExportCsv,
  onExportPdf,
  defaultTimeframe = 'month',
}: ExportModalProps) {
  const [selectedTimeframe, setSelectedTimeframe] = useState<Timeframe>(defaultTimeframe);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCsv = () => {
    onExportCsv(selectedTimeframe);
    setExportNotice('CSV file downloaded to your device.');
    setTimeout(() => setExportNotice(null), 3000);
  };

  const handlePdf = () => {
    onExportPdf(selectedTimeframe);
    setExportNotice('PDF document generated! Opening print/save dialog.');
    setTimeout(() => setExportNotice(null), 3500);
  };

  const timeframeOptions: Array<{ id: Timeframe; label: string; sub: string }> = [
    { id: 'week', label: 'Last 7 Days', sub: 'Past 1 week activity' },
    { id: 'month', label: 'Last 30 Days', sub: 'Monthly audit period' },
    { id: 'year', label: 'Last 1 Year', sub: 'Annual operational log' },
    { id: 'all', label: 'All Records', sub: 'Complete historical database' },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-3xl border border-white/10 bg-slate-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-white/10 p-6 bg-slate-950/50">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-300 ring-1 ring-cyan-500/20 mb-2">
              <Download size={13} />
              Export & Compliance Center
            </div>
            <h3 className="text-xl font-bold text-white">{title}</h3>
            <p className="mt-1 text-xs text-slate-400">{description}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-white/10 hover:text-white transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6">
          {/* Timeframe Selection */}
          <div>
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 mb-3">
              <Calendar size={14} className="text-brand-400" />
              Select Time Range:
            </label>

            <div className="grid grid-cols-2 gap-2.5">
              {timeframeOptions.map((opt) => {
                const isSelected = selectedTimeframe === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setSelectedTimeframe(opt.id)}
                    className={`flex flex-col items-start p-3 rounded-2xl border text-left transition ${
                      isSelected
                        ? 'border-brand-500/60 bg-brand-500/15 shadow-sm'
                        : 'border-white/5 bg-slate-950/40 hover:bg-white/[0.04]'
                    }`}
                  >
                    <span className={`text-xs font-bold ${isSelected ? 'text-brand-300' : 'text-slate-200'}`}>
                      {opt.label}
                    </span>
                    <span className="text-[10px] text-slate-500 mt-0.5">{opt.sub}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Records Indicator */}
          <div className="flex items-center justify-between rounded-2xl border border-white/5 bg-white/[0.02] px-4 py-3 text-xs">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Clock size={13} className="text-slate-500" /> Selected Period:
            </span>
            <span className="font-semibold text-white">
              {timeframeOptions.find((t) => t.id === selectedTimeframe)?.label} ({recordCount} records available)
            </span>
          </div>

          {exportNotice && (
            <div className="flex items-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-300">
              <CheckCircle2 size={15} className="shrink-0" />
              <span>{exportNotice}</span>
            </div>
          )}

          {/* Export Action Buttons */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            {/* CSV Option */}
            <button
              type="button"
              onClick={handleCsv}
              className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-300 hover:bg-emerald-500/20 transition shadow-sm group"
            >
              <FileSpreadsheet size={22} className="group-hover:scale-110 transition-transform" />
              <div className="text-center">
                <span className="block text-xs font-bold text-white">Download CSV</span>
                <span className="block text-[10px] text-emerald-400 mt-0.5">Spreadsheet / Excel</span>
              </div>
            </button>

            {/* PDF Option */}
            <button
              type="button"
              onClick={handlePdf}
              className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-purple-500/30 bg-purple-500/10 p-4 text-purple-300 hover:bg-purple-500/20 transition shadow-sm group"
            >
              <FileText size={22} className="group-hover:scale-110 transition-transform" />
              <div className="text-center">
                <span className="block text-xs font-bold text-white">Download as PDF</span>
                <span className="block text-[10px] text-purple-300 mt-0.5">Executive Document</span>
              </div>
            </button>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="border-t border-white/5 bg-slate-950/40 px-6 py-3.5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-1.5 text-xs font-medium text-slate-400 hover:text-white transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
