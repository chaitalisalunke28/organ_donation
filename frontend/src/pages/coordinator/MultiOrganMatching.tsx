import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Layers,
  Sparkles,
  Heart,
  Activity,
  ArrowRight,
  ShieldCheck,
  Building2,
  Users,
  CheckCircle,
  Clock,
  RefreshCw,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getEligibleDonors, getMultiOrganDonor, matchMultiOrganBatch } from '../../api';
import { MultiOrganDonorSummary, MultiOrganBatchMatchResult } from '../../types';
import OrganBadge from '../../components/OrganBadge';
import StatusBadge from '../../components/StatusBadge';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';

export default function MultiOrganMatching() {
  const queryClient = useQueryClient();
  const [selectedDonorId, setSelectedDonorId] = useState<number | null>(null);

  // Fetch all eligible donors
  const { data: donors = [], isLoading: dLoading } = useQuery({
    queryKey: ['eligible-donors-for-multiorgan'],
    queryFn: () => getEligibleDonors().then((res) => res.data),
  });

  // Automatically select first donor if none selected
  React.useEffect(() => {
    if (donors.length > 0 && !selectedDonorId) {
      setSelectedDonorId(donors[0].id);
    }
  }, [donors, selectedDonorId]);

  // Fetch multi-organ summary for selected donor
  const { data: donorOrgans, isLoading: organsLoading } = useQuery<MultiOrganDonorSummary>({
    queryKey: ['multi-organ-donor', selectedDonorId],
    queryFn: () => getMultiOrganDonor(selectedDonorId!),
    enabled: !!selectedDonorId,
  });

  // Multi-organ batch matching mutation
  const matchBatchMutation = useMutation({
    mutationFn: (donorId: number) => matchMultiOrganBatch(donorId),
    onSuccess: (data: MultiOrganBatchMatchResult) => {
      toast.success(
        `Successfully executed concurrent matching for ${data.total_organs_evaluated} organs across NOTTO Kidney, Liver, Heart & Lung policies!`
      );
      queryClient.invalidateQueries({ queryKey: ['multi-organ-match-results', selectedDonorId] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || 'Failed to execute multi-organ batch matching');
    },
  });

  const [batchResults, setBatchResults] = useState<MultiOrganBatchMatchResult | null>(null);

  const handleRunBatch = async () => {
    if (!selectedDonorId) return;
    try {
      const res = await matchBatchMutation.mutateAsync(selectedDonorId);
      setBatchResults(res);
    } catch {
      // Error handled by mutation
    }
  };

  if (dLoading) {
    return <LoadingSpinner message="Loading multi-organ procurement donors..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-600 to-indigo-700 flex items-center justify-center text-white shadow-md">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Multi-Organ Concurrent Allocation & Procurement
              </h1>
              <p className="text-xs text-gray-500 mt-0.5">
                Phase 19 Multi-Organ Architecture • Concurrent organ-specific matching for multi-organ donors (Kidney, Liver, Heart, Lung)
              </p>
            </div>
          </div>
        </div>

        {selectedDonorId && (
          <button
            onClick={handleRunBatch}
            disabled={matchBatchMutation.isPending}
            className="btn-primary text-xs px-4 py-2 flex items-center gap-2 shadow-md hover:shadow-lg transition-all"
          >
            {matchBatchMutation.isPending ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 text-amber-300" />
            )}
            Run Concurrent Multi-Organ Matching
          </button>
        )}
      </div>

      {/* Donor Selection Bar */}
      <div className="card p-4 bg-white border border-gray-200 shadow-xs space-y-2">
        <label className="text-xs font-bold uppercase tracking-wider text-gray-600 flex items-center gap-1.5">
          <Users className="w-4 h-4 text-teal-600" /> Select Deceased Multi-Organ Donor
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {donors.map((d: any) => (
            <button
              key={d.id}
              onClick={() => {
                setSelectedDonorId(d.id);
                setBatchResults(null);
              }}
              className={`p-3 rounded-xl border text-left transition-all ${
                selectedDonorId === d.id
                  ? 'border-teal-600 bg-teal-50/70 ring-2 ring-teal-500/20'
                  : 'border-gray-200 bg-gray-50/50 hover:bg-gray-50 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-gray-900">{d.name}</span>
                <span className="font-mono text-2xs font-bold px-1.5 py-0.5 rounded bg-teal-100 text-teal-800">
                  {d.patient_uid}
                </span>
              </div>
              <div className="flex items-center gap-2 text-2xs text-gray-500 mt-1">
                <span>Blood: <strong>{d.blood_group}</strong></span>
                <span>•</span>
                <span>{d.age} yrs</span>
                <span>•</span>
                <span>{d.hospital_name || 'Hospital'}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Selected Donor Organs Overview */}
      {donorOrgans && (
        <div className="card p-5 bg-white border border-gray-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Heart className="w-4 h-4 text-rose-500" />
                Procured Organs for Donor {donorOrgans.donor_name} ({donorOrgans.donor_uid})
              </h2>
              <p className="text-2xs text-gray-500">
                Facility: {donorOrgans.donor_hospital} • Blood Group: {donorOrgans.donor_blood_group} • Total Organs: {donorOrgans.total_organs_procured}
              </p>
            </div>
            <span className="text-2xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800">
              Procurement Verified
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {donorOrgans.organs.map((org) => (
              <div
                key={org.organ_id}
                className="p-3.5 rounded-xl border border-gray-200 bg-gray-50/70 space-y-2 hover:bg-white hover:shadow-xs transition-all"
              >
                <div className="flex items-center justify-between">
                  <OrganBadge organ={org.organ_type} size="sm" />
                  <span className="font-mono text-2xs text-gray-500">{org.organ_uid}</span>
                </div>
                <p className="text-2xs text-gray-600 line-clamp-2">{org.organ_condition || 'Viable'}</p>
                <div className="flex items-center justify-between pt-1 border-t border-gray-200/60 text-2xs">
                  <span className="text-gray-400">Status:</span>
                  <StatusBadge status={org.availability_status} size="sm" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Batch Matching Results Grid */}
      {batchResults && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              Concurrent Multi-Organ Match Results ({batchResults.total_organs_evaluated} Organs Processed)
            </h2>
            <span className="text-2xs font-mono text-gray-400">
              Matched at: {new Date(batchResults.matched_at).toLocaleTimeString()}
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {batchResults.results.map((res) => (
              <div key={res.organ_id} className="card p-4 bg-white border border-gray-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                  <div className="flex items-center gap-2">
                    <OrganBadge organ={res.organ_type} size="sm" />
                    <span className="font-mono text-xs font-bold text-gray-700">{res.organ_uid}</span>
                  </div>
                  <span className="text-2xs font-mono px-2 py-0.5 rounded bg-teal-50 border border-teal-200 text-teal-800 font-semibold">
                    Policy: {res.policy_used}
                  </span>
                </div>

                {res.top_candidate ? (
                  <div className="p-3 rounded-xl bg-teal-50/60 border border-teal-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-2xs font-bold uppercase tracking-wider text-teal-900">
                        Top Ranked Match (Priority #1)
                      </span>
                      <span className="text-xs font-bold text-teal-800 font-mono">
                        Score: {res.top_candidate.total_score} pts
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-gray-900">{res.top_candidate.receiver_name}</span>
                      <span className="font-mono text-2xs text-gray-500">{res.top_candidate.receiver_uid}</span>
                    </div>

                    <div className="text-2xs text-gray-600 flex items-center gap-3">
                      <span>Hospital: <strong>{res.top_candidate.hospital_name}</strong></span>
                      <span>Blood: <strong>{res.top_candidate.receiver_blood_group}</strong></span>
                      <span>Feasibility: <strong>{res.top_candidate.readiness_status}</strong></span>
                    </div>

                    {res.top_candidate.tier_qualifications && res.top_candidate.tier_qualifications.length > 0 && (
                      <p className="text-2xs text-teal-800 italic pt-1 border-t border-teal-200/50">
                        {res.top_candidate.tier_qualifications[0]}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="p-4 text-center text-xs text-gray-400">
                    No active compatible candidates matched for this organ.
                  </div>
                )}

                <div className="flex items-center justify-between text-2xs text-gray-500 pt-1">
                  <span>Total compatible pool: <strong>{res.total_candidates_matched} candidates</strong></span>
                  <a
                    href="/coordinator/matching"
                    className="text-teal-700 hover:text-teal-900 font-semibold inline-flex items-center gap-1"
                  >
                    View Full Priority List <ArrowRight className="w-3 h-3" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
