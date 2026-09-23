import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Database,
  Download,
  FileCode,
  FileSpreadsheet,
  CheckCircle2,
  Filter,
  Layers,
  Heart,
  Activity,
  ShieldCheck,
  Cpu,
  Clock,
  ExternalLink,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getResearchDataset, downloadResearchCsv } from '../../api';
import { ResearchDatasetExport } from '../../types';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';
import OrganBadge from '../../components/OrganBadge';

const DOMAIN_TABS = [
  { id: 'all', label: 'All 8 Domains' },
  { id: 'donor', label: '1. Donor' },
  { id: 'organ', label: '2. Organ' },
  { id: 'receiver', label: '3. Receiver' },
  { id: 'compatibility', label: '4. Compatibility' },
  { id: 'allocation', label: '5. Allocation' },
  { id: 'operational', label: '6. Operational' },
  { id: 'dynamic', label: '7. Dynamic' },
  { id: 'outcome', label: '8. Outcome' },
];

export default function ResearchDataLake() {
  const [organFilter, setOrganFilter] = useState<string>('ALL');
  const [activeTab, setActiveTab] = useState<string>('all');
  const [selectedRecordId, setSelectedRecordId] = useState<number | null>(null);

  const { data, isLoading } = useQuery<ResearchDatasetExport>({
    queryKey: ['research-dataset', organFilter],
    queryFn: () => getResearchDataset(organFilter),
    refetchInterval: 20000,
  });

  const handleDownloadCsv = async () => {
    try {
      toast.loading('Generating flat statistical research CSV...', { id: 'csv-toast' });
      await downloadResearchCsv(organFilter);
      toast.success('Research Data Lake CSV downloaded!', { id: 'csv-toast' });
    } catch {
      toast.error('Failed to download CSV export', { id: 'csv-toast' });
    }
  };

  if (isLoading) {
    return <LoadingSpinner message="Querying unified research data lake..." />;
  }

  const metadata = data?.dataset_metadata;
  const records = data?.records || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-700 flex items-center justify-center text-white shadow-md">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Unified Research Data Lake & Academic Dataset
              </h1>
              <p className="text-xs text-gray-500 mt-0.5">
                Phase 20 Architecture • Full 9-domain relational export for ML training, policy audit, and econometric simulation
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Organ filter */}
          <select
            value={organFilter}
            onChange={(e) => setOrganFilter(e.target.value)}
            className="text-xs font-semibold px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-700 shadow-xs focus:ring-2 focus:ring-teal-500"
          >
            <option value="ALL">All Organ Types</option>
            <option value="KIDNEY">Kidneys Only</option>
            <option value="LIVER">Livers Only</option>
            <option value="HEART">Hearts Only</option>
            <option value="LUNG">Lungs Only</option>
          </select>

          <button
            onClick={handleDownloadCsv}
            className="btn-primary text-xs px-3.5 py-2 flex items-center gap-1.5 shadow-sm"
            title="Download Flat Tabular CSV for Pandas / R / SPSS"
          >
            <Download className="w-3.5 h-3.5" />
            Download CSV Data Lake
          </button>
        </div>
      </div>

      {/* Dataset Metadata Box */}
      {metadata && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-900 to-slate-900 text-white shadow-md space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-indigo-800/60">
            <div>
              <span className="text-2xs font-mono uppercase tracking-widest text-indigo-300">
                Academic Repository
              </span>
              <h3 className="font-bold text-sm text-white">{metadata.title}</h3>
            </div>
            <span className="text-2xs font-mono font-bold px-2.5 py-1 bg-indigo-800 rounded-md text-indigo-200">
              Version: {metadata.version}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-2xs">
            <div>
              <span className="text-indigo-300">Total Allocation Records:</span>
              <p className="font-mono font-bold text-white text-xs mt-0.5">
                {metadata.total_allocation_records}
              </p>
            </div>
            <div>
              <span className="text-indigo-300">Data Domains Integrated:</span>
              <p className="font-bold text-white text-xs mt-0.5">8 Comprehensive Layers</p>
            </div>
            <div>
              <span className="text-indigo-300">Citation:</span>
              <p className="font-medium text-indigo-200 mt-0.5 truncate">{metadata.academic_citation}</p>
            </div>
            <div>
              <span className="text-indigo-300">Export Timestamp:</span>
              <p className="font-mono text-indigo-200 mt-0.5">
                {new Date(metadata.generated_at).toLocaleTimeString()}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Records Explorer */}
      <div className="card p-5 bg-white border border-gray-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div>
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-teal-600" />
              Allocation Trajectory Dossiers ({records.length} Records)
            </h2>
            <p className="text-2xs text-gray-500">
              Select an allocation to inspect all 8 clinical and operational research domains
            </p>
          </div>
        </div>

        {records.length === 0 ? (
          <EmptyState
            title="No Research Records Found"
            message="No finalized or active allocation records match the current filter."
          />
        ) : (
          <div className="space-y-4">
            {records.map((rec) => (
              <div
                key={rec.allocation_id}
                className="p-4 rounded-xl border border-gray-200 bg-gray-50/60 space-y-3 text-xs"
              >
                {/* Record Header */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-gray-200/70">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-teal-800 text-sm">
                      {rec.allocation.allocation_uid}
                    </span>
                    <OrganBadge organ={rec.organ.organ_type} size="sm" />
                    <span className="font-mono text-2xs text-gray-400">
                      Donor: {rec.donor.donor_uid} → Recipient: {rec.receiver.receiver_uid}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-2xs font-mono font-semibold bg-indigo-50 border border-indigo-200 text-indigo-800">
                      Policy: {rec.allocation.policy_rule_set_id}
                    </span>
                    <span className="px-2 py-0.5 rounded text-2xs font-bold bg-emerald-100 text-emerald-800">
                      {rec.outcome.final_status}
                    </span>
                  </div>
                </div>

                {/* 8-Domain Compact Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 text-2xs pt-1">
                  {/* Domain 1: Donor */}
                  <div className="p-2 rounded-lg bg-white border border-gray-200/80 space-y-0.5">
                    <span className="font-bold text-gray-800 uppercase block tracking-wider">1. Donor</span>
                    <p className="text-gray-600">Age: {rec.donor.age}, {rec.donor.blood_group}</p>
                    <p className="text-gray-400 truncate">{rec.donor.hospital_name}</p>
                  </div>

                  {/* Domain 2: Organ */}
                  <div className="p-2 rounded-lg bg-white border border-gray-200/80 space-y-0.5">
                    <span className="font-bold text-gray-800 uppercase block tracking-wider">2. Organ</span>
                    <p className="text-gray-600">{rec.organ.organ_type}</p>
                    <p className="text-gray-400 truncate">{rec.organ.preservation_method}</p>
                  </div>

                  {/* Domain 3: Receiver */}
                  <div className="p-2 rounded-lg bg-white border border-gray-200/80 space-y-0.5">
                    <span className="font-bold text-gray-800 uppercase block tracking-wider">3. Receiver</span>
                    <p className="text-gray-600">Age: {rec.receiver.age}, {rec.receiver.blood_group}</p>
                    <p className="text-gray-400">Urgency: {rec.receiver.urgency_level}</p>
                  </div>

                  {/* Domain 4: Compatibility */}
                  <div className="p-2 rounded-lg bg-white border border-gray-200/80 space-y-0.5">
                    <span className="font-bold text-gray-800 uppercase block tracking-wider">4. Compat</span>
                    <p className="text-emerald-700 font-bold">{rec.compatibility.abo_compatibility}</p>
                    <p className="text-gray-400">Size: {rec.compatibility.size_compatibility}</p>
                  </div>

                  {/* Domain 5: Allocation */}
                  <div className="p-2 rounded-lg bg-white border border-gray-200/80 space-y-0.5">
                    <span className="font-bold text-gray-800 uppercase block tracking-wider">5. Allocation</span>
                    <p className="font-bold text-gray-900">Rank #{rec.allocation.priority_number}</p>
                    <p className="text-gray-400">{rec.allocation.priority_score} pts</p>
                  </div>

                  {/* Domain 6: Operational */}
                  <div className="p-2 rounded-lg bg-white border border-gray-200/80 space-y-0.5">
                    <span className="font-bold text-gray-800 uppercase block tracking-wider">6. Operational</span>
                    <p className="text-blue-700 font-bold">{rec.operational.readiness_status}</p>
                    <p className="text-gray-400">{rec.operational.transit_minutes}m transit</p>
                  </div>

                  {/* Domain 7: Dynamic */}
                  <div className="p-2 rounded-lg bg-white border border-gray-200/80 space-y-0.5">
                    <span className="font-bold text-gray-800 uppercase block tracking-wider">7. Dynamic</span>
                    <p className="text-indigo-700 font-bold">Stab: {rec.dynamic.match_stability_score}%</p>
                    <p className="text-gray-400">{rec.dynamic.operational_risk_tier}</p>
                  </div>

                  {/* Domain 8: Outcome */}
                  <div className="p-2 rounded-lg bg-white border border-gray-200/80 space-y-0.5">
                    <span className="font-bold text-gray-800 uppercase block tracking-wider">8. Outcome</span>
                    <p className="font-mono text-2xs text-gray-500 truncate" title={rec.outcome.digital_seal_sha256}>
                      SHA: {rec.outcome.digital_seal_sha256 ? rec.outcome.digital_seal_sha256.slice(0, 8) + '...' : 'Sealed'}
                    </p>
                    <p className="text-emerald-700 font-semibold">{rec.outcome.decision_status}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
