import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  GitMerge,
  Heart,
  Send,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Award,
  Building2,
  RefreshCw,
  ShieldCheck,
  Check,
  BookOpen,
  Info,
  Layers,
  MapPin,
  Dna,
  UserCheck,
  Calendar,
  X,
  Truck,
  Sparkles,
  Activity,
  AlertOctagon,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  getAvailableOrgans,
  matchOrgan,
  getPriorityList,
  getActivePolicy,
  sendOffer,
  expireOffer,
} from '../../api';
import OrganBadge from '../../components/OrganBadge';
import StatusBadge from '../../components/StatusBadge';
import LoadingSpinner from '../../components/LoadingSpinner';
import ReadinessBadge from '../../components/ReadinessBadge';
import RiskBadge from '../../components/RiskBadge';
import { StabilityBadge } from '../../components/StabilityBadge';
import { SensitivityStressTestModal } from '../../components/SensitivityStressTestModal';
import { DynamicEventAuditModal } from '../../components/DynamicEventAuditModal';
import { WhatIfScenarioSandboxModal } from '../../components/WhatIfScenarioSandboxModal';
import { AllocationRuleSet } from '../../types';

export default function OrganMatching() {
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const urlOrganId = searchParams.get('organ');
  const [selectedOrganId, setSelectedOrganId] = useState<number | null>(
    urlOrganId ? Number(urlOrganId) : null
  );

  const [priorityList, setPriorityList] = useState<any[]>([]);
  const [activePolicy, setActivePolicy] = useState<AllocationRuleSet | null>(null);
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [selectedCandidateAudit, setSelectedCandidateAudit] = useState<any | null>(null);
  const [selectedXAIModal, setSelectedXAIModal] = useState<any | null>(null);
  const [selectedReadinessModal, setSelectedReadinessModal] = useState<any | null>(null);
  const [selectedStabilityModal, setSelectedStabilityModal] = useState<any | null>(null);
  const [selectedWhatIfCandidate, setSelectedWhatIfCandidate] = useState<any | null>(null);
  const [showDynamicAuditModal, setShowDynamicAuditModal] = useState(false);

  // Available organs for selection
  const { data: organs = [], isLoading: oLoading } = useQuery({
    queryKey: ['coordinator-organs-available'],
    queryFn: () => getAvailableOrgans().then((res) => res.data),
  });

  const selectedOrgan = organs.find((o: any) => o.id === selectedOrganId) || null;

  // Active Policy Query
  const { data: policyData } = useQuery({
    queryKey: ['coordinator-policy', selectedOrgan?.organ_type || 'KIDNEY'],
    queryFn: () => getActivePolicy(selectedOrgan?.organ_type || 'KIDNEY').then((res) => res.data),
    enabled: true,
  });

  useEffect(() => {
    if (policyData) {
      setActivePolicy(policyData);
    }
  }, [policyData]);

  // Matching Mutation
  const matchMutation = useMutation({
    mutationFn: (organId: number) => matchOrgan(organId),
    onSuccess: (res) => {
      setPriorityList(res.data.priority_list || []);
      if (res.data.active_policy) {
        setActivePolicy(res.data.active_policy);
      }
      toast.success(
        `Hard biological filters & NOTTO Priority generated! Found ${res.data.priority_list?.length || 0} candidate(s).`
      );
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || 'Failed to match organ');
    },
  });

  // Fetch priority list when organ changes
  const fetchPriority = async (organId: number) => {
    try {
      const res = await getPriorityList(organId);
      setPriorityList(res.data.priority_list || []);
      if (res.data.active_policy) {
        setActivePolicy(res.data.active_policy);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (selectedOrganId) {
      fetchPriority(selectedOrganId);
    }
  }, [selectedOrganId]);

  // Send Offer Mutation
  const offerMutation = useMutation({
    mutationFn: ({
      organId,
      receiverId,
      priorityNumber,
    }: {
      organId: number;
      receiverId: number;
      priorityNumber: number;
    }) => sendOffer(organId, receiverId, priorityNumber),
    onSuccess: () => {
      if (selectedOrganId) fetchPriority(selectedOrganId);
      queryClient.invalidateQueries({ queryKey: ['coordinator-organs-available'] });
      queryClient.invalidateQueries({ queryKey: ['coordinator-dashboard'] });
      toast.success('Organ match offered to candidate hospital! Organ is now locked.');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || 'Failed to send offer');
    },
  });

  // Expire Offer Mutation
  const expireMutation = useMutation({
    mutationFn: (offerId: number) => expireOffer(offerId),
    onSuccess: () => {
      if (selectedOrganId) fetchPriority(selectedOrganId);
      queryClient.invalidateQueries({ queryKey: ['coordinator-organs-available'] });
      toast.success('Offer expired by coordinator. Proceeding to next candidate.');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || 'Failed to expire offer');
    },
  });

  const handleRunMatch = () => {
    if (!selectedOrganId) return;
    matchMutation.mutate(selectedOrganId);
  };

  if (oLoading) {
    return <LoadingSpinner message="Loading allocation matching engine..." />;
  }

  const hasPendingOffer = priorityList.some((item) => item.offer_status === 'PENDING');

  return (
    <div className="space-y-6">
      {/* Header & Policy Indicator */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Organ Matching & Operational Intelligence</h1>
          <p className="text-sm text-gray-500 mt-1">
            Hard biological filtering → NOTTO National Policy Ranking → Operational Feasibility & Explainable AI Risk
          </p>
        </div>

        {activePolicy && (
          <div className="inline-flex items-center gap-2 bg-teal-50 border border-teal-200 rounded-xl px-3.5 py-2">
            <ShieldCheck className="w-5 h-5 text-teal-700 flex-shrink-0" />
            <div>
              <div className="text-xs font-bold text-teal-900 flex items-center gap-1.5">
                <span>{activePolicy.rule_set_id}</span>
                <span className="bg-teal-200 text-teal-800 text-3xs px-1.5 py-0.5 rounded font-mono font-bold">
                  {activePolicy.policy_version}
                </span>
              </div>
              <div className="text-3xs text-teal-700">
                Jurisdiction: {activePolicy.jurisdiction}
              </div>
            </div>
            <button
              onClick={() => setShowPolicyModal(true)}
              className="ml-2 text-xs text-teal-800 hover:text-teal-950 font-semibold underline inline-flex items-center gap-1"
            >
              <Info className="w-3.5 h-3.5" /> Policy
            </button>
            <button
              onClick={() => setShowDynamicAuditModal(true)}
              className="ml-2 px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg inline-flex items-center gap-1.5 transition shadow-xs"
            >
              <RefreshCw className="w-3 h-3 text-teal-300" /> Dynamic Revalidation Log
            </button>
          </div>
        )}
      </div>

      {/* Step 1: Select Organ */}
      <div className="card space-y-4">
        <h2 className="text-base font-semibold text-gray-900 pb-3 border-b border-gray-100 flex items-center gap-2">
          <Heart className="w-5 h-5 text-teal-600" />
          <span>Step 1: Select Viable Donor Organ</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div className="md:col-span-2">
            <label className="label text-xs">Choose Registered Organ</label>
            <select
              value={selectedOrganId || ''}
              onChange={(e) => setSelectedOrganId(Number(e.target.value))}
              className="input font-semibold"
            >
              <option value="">-- Select an organ to match --</option>
              {organs.map((o: any) => (
                <option key={o.id} value={o.id}>
                  {o.organ_type} ({o.organ_uid}) — Donor: {o.donor_name} ({o.donor_blood_group}) @ {o.donor_hospital} [{o.availability_status}]
                </option>
              ))}
            </select>
          </div>

          <div>
            <button
              onClick={handleRunMatch}
              disabled={!selectedOrganId || matchMutation.isPending || selectedOrgan?.availability_status !== 'AVAILABLE'}
              className="btn-primary w-full py-2.5 inline-flex items-center justify-center gap-2"
            >
              <GitMerge className="w-4 h-4" />
              {matchMutation.isPending ? 'Executing Policy & AI Pipeline...' : 'Run Compatibility & ML Risk Engine'}
            </button>
          </div>
        </div>

        {selectedOrgan && (
          <div className="p-4 bg-teal-50/50 rounded-xl border border-teal-100 space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-gray-400 font-medium">Organ Type</span>
                <div className="mt-1">
                  <OrganBadge organ={selectedOrgan.organ_type} size="sm" />
                </div>
              </div>
              <div>
                <span className="text-gray-400 font-medium">Donor & ABO Blood</span>
                <div className="font-mono font-bold text-gray-900 mt-1">
                  {selectedOrgan.donor_blood_group} • {selectedOrgan.donor_name}
                </div>
              </div>
              <div>
                <span className="text-gray-400 font-medium">Donor Center</span>
                <div className="font-medium text-gray-900 mt-1">{selectedOrgan.donor_hospital}</div>
              </div>
              <div>
                <span className="text-gray-400 font-medium">Availability Status</span>
                <div className="mt-1">
                  <StatusBadge status={selectedOrgan.availability_status} />
                </div>
              </div>
            </div>

            {selectedOrgan.organ_type === 'KIDNEY' && (
              <div className="pt-2 border-t border-teal-100 grid grid-cols-2 sm:grid-cols-3 gap-2 text-2xs">
                <div className="bg-white/80 p-2 rounded-lg border border-teal-200">
                  <span className="text-gray-500 font-medium block">Serum Creatinine</span>
                  <span className="text-xs font-bold text-teal-800">
                    {selectedOrgan.donor_creatinine ? `${selectedOrgan.donor_creatinine} mg/dL` : '0.92 mg/dL'}
                  </span>
                </div>
                <div className="bg-white/80 p-2 rounded-lg border border-teal-200">
                  <span className="text-gray-500 font-medium block">Kidney Quality</span>
                  <span className="text-xs font-bold text-teal-800">
                    {selectedOrgan.kidney_quality || 'Standard Criteria Donor (SCD)'}
                  </span>
                </div>
                <div className="col-span-2 sm:col-span-1 bg-white/80 p-2 rounded-lg border border-teal-200">
                  <span className="text-gray-500 font-medium block">Preservation Protocol</span>
                  <span className="text-xs font-bold text-teal-800">
                    {selectedOrgan.preservation_method || 'Hypothermic Machine Perfusion (HMP)'}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Step 2: Computed Priority List & Operational Intelligence */}
      {priorityList.length > 0 && (
        <div className="card space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-gray-100">
            <div>
              <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-500" />
                <span>Step 2: Candidate Priority Ranking & Operational Intelligence</span>
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                NOTTO Policy Score + Real-time Hospital Readiness (Phase 5) + Cold Ischemia Buffer (Phase 6) + ML Operational Risk & Explainable AI (Phases 8 & 9)
              </p>
            </div>

            <button
              onClick={() => selectedOrganId && fetchPriority(selectedOrganId)}
              className="btn-secondary text-xs px-2.5 py-1.5 inline-flex items-center gap-1 self-start"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Refresh Status
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/50">
                  <th className="table-header">Rank</th>
                  <th className="table-header">Candidate & Center</th>
                  <th className="table-header">NOTTO Score</th>
                  <th className="table-header">Hospital Readiness</th>
                  <th className="table-header">Preservation & Transit</th>
                  <th className="table-header">ML Operational Risk</th>
                  <th className="table-header">Match Stability (Stress-Test)</th>
                  <th className="table-header">Offer Status</th>
                  <th className="table-header text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {priorityList.map((item, idx) => {
                  const breakdown = item.score_breakdown || {};
                  const totalPts = item.total_score || item.priority_score || 0;
                  const readinessSt = item.readiness_status || breakdown.readiness_status || 'READY';
                  const readinessScore = item.readiness_score ?? breakdown.readiness_score ?? 100;
                  const presBuffer = item.remaining_preservation_buffer_hours ?? breakdown.remaining_preservation_buffer_hours ?? 20.0;
                  const presRisk = item.preservation_risk_status ?? breakdown.preservation_risk_status ?? 'SAFE';
                  const transportInfo = item.transport || breakdown.transport || {};
                  const mlRisk = item.ml_risk || breakdown.ml_risk || {};
                  const riskTier = item.operational_risk_tier || mlRisk.risk_tier || 'LOW_RISK';
                  const riskPct = mlRisk.risk_percentage ?? (item.operational_risk_probability ? Math.round(item.operational_risk_probability * 100) : 12);
                  const stabilityScore = item.stability_score ?? breakdown.stability_score ?? 85.0;
                  const stabilityTier = item.stability_tier ?? breakdown.stability_tier ?? 'HIGH';

                  return (
                    <tr
                      key={item.receiver_id}
                      className={`transition-colors ${
                        item.offer_status === 'PENDING'
                          ? 'bg-orange-50/60'
                          : item.offer_status === 'ACCEPTED'
                          ? 'bg-green-50/60'
                          : item.offer_status === 'REJECTED'
                          ? 'bg-rose-50/30 line-through text-gray-400'
                          : 'hover:bg-gray-50/70'
                      }`}
                    >
                      <td className="table-cell font-bold text-teal-700">
                        Priority #{item.priority_number || idx + 1}
                      </td>

                      <td className="table-cell">
                        <div className="font-semibold text-gray-900">{item.receiver_name}</div>
                        <div className="text-2xs text-gray-400 font-mono">
                          {item.receiver_uid} • {item.hospital_name}
                        </div>
                        <div className="text-3xs text-teal-700 mt-0.5">
                          Blood: <strong>{item.blood_group}</strong> • Urgency: {item.urgency || 'Standard'}
                        </div>
                      </td>

                      <td className="table-cell">
                        <button
                          onClick={() => setSelectedCandidateAudit(item)}
                          className="font-bold text-sm text-teal-900 hover:text-teal-950 underline decoration-dotted inline-flex items-center gap-1"
                          title="Click to view full 5-tier NOTTO score breakdown"
                        >
                          {totalPts} pts
                          <Info className="w-3 h-3 text-teal-600" />
                        </button>
                        <div className="text-3xs text-gray-400">
                          HLA: {item.hla_mismatches ?? 0}/6 MM
                        </div>
                      </td>

                      <td className="table-cell">
                        <button
                          onClick={() => setSelectedReadinessModal(item)}
                          className="text-left group"
                          title="Click to inspect 10-point Hospital Readiness Checklist"
                        >
                          <ReadinessBadge status={readinessSt} score={readinessScore} size="sm" />
                          <div className="text-3xs text-teal-700 group-hover:underline mt-0.5 inline-flex items-center gap-0.5">
                            <span>Checklist audit</span>
                            <ArrowRight className="w-2.5 h-2.5" />
                          </div>
                        </button>
                      </td>

                      <td className="table-cell">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-gray-400" />
                          <span className={`text-2xs font-bold ${
                            presRisk === 'SAFE' ? 'text-emerald-700' : presRisk === 'CAUTION' ? 'text-amber-700' : 'text-rose-700'
                          }`}>
                            {presBuffer}h buffer
                          </span>
                        </div>
                        <div className="text-3xs text-gray-500 mt-0.5 flex items-center gap-1">
                          <Truck className="w-2.5 h-2.5 text-gray-400" />
                          <span>{transportInfo.transport_mode || 'AMBULANCE'} ({transportInfo.total_transit_minutes || 45}m)</span>
                        </div>
                      </td>

                      <td className="table-cell">
                        <button
                          onClick={() => setSelectedXAIModal(item)}
                          className="text-left group"
                          title="Click to view Explainable AI (XAI) risk attributions"
                        >
                          <div className="flex items-center gap-1">
                            <RiskBadge tier={riskTier} percentage={riskPct} size="sm" />
                            <Sparkles className="w-3 h-3 text-teal-600" />
                          </div>
                          <div className="text-3xs text-teal-700 group-hover:underline mt-0.5 inline-flex items-center gap-0.5">
                            <span>Why this risk? (XAI)</span>
                            <ArrowRight className="w-2.5 h-2.5" />
                          </div>
                        </button>
                      </td>

                      <td className="table-cell">
                        <button
                          onClick={() => setSelectedStabilityModal(item)}
                          className="text-left group"
                          title="Click to stress-test match stability (+30m, +90m delays)"
                        >
                          <StabilityBadge tier={stabilityTier} score={stabilityScore} size="sm" />
                          <div className="text-3xs text-teal-700 group-hover:underline mt-0.5 inline-flex items-center gap-0.5">
                            <span>Stress-Test & Curve</span>
                            <ArrowRight className="w-2.5 h-2.5" />
                          </div>
                        </button>
                      </td>

                      <td className="table-cell">
                        {item.offer_status ? (
                          <StatusBadge status={item.offer_status} />
                        ) : (
                          <span className="text-2xs text-gray-400">Not offered</span>
                        )}
                      </td>

                      <td className="table-cell text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedWhatIfCandidate(item)}
                            className="btn-secondary text-2xs px-2 py-1 inline-flex items-center gap-1 text-teal-800 hover:text-teal-950"
                            title="Open non-destructive What-If Simulation Sandbox"
                          >
                            <Sparkles className="w-3 h-3 text-teal-600" /> What-If
                          </button>

                          {item.offer_status === 'PENDING' ? (
                            <button
                              onClick={() => expireMutation.mutate(item.offer_id)}
                              disabled={expireMutation.isPending}
                              className="btn-danger text-xs px-2.5 py-1 inline-flex items-center gap-1"
                            >
                              <Clock className="w-3.5 h-3.5" /> Expire Offer
                            </button>
                          ) : item.offer_status === 'ACCEPTED' ? (
                            <Link
                              to="/coordinator/allocations"
                              className="btn-success text-xs px-2.5 py-1 inline-flex items-center gap-1"
                            >
                              <Check className="w-3.5 h-3.5" /> Review & Confirm
                            </Link>
                          ) : item.offer_status === 'REJECTED' ? (
                            <span className="text-2xs text-rose-600 font-medium">Rejected by facility</span>
                          ) : (
                            <button
                              onClick={() =>
                                offerMutation.mutate({
                                  organId: selectedOrganId!,
                                  receiverId: item.receiver_id,
                                  priorityNumber: item.priority_number || idx + 1,
                                })
                              }
                              disabled={hasPendingOffer || offerMutation.isPending || !selectedOrganId}
                              className="btn-primary text-xs px-2.5 py-1 inline-flex items-center gap-1"
                            >
                              <Send className="w-3.5 h-3.5" /> Offer to #{item.priority_number || idx + 1}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Explainable AI (XAI) Operational Risk Modal (Phase 9) */}
      {selectedXAIModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-teal-600" />
                <h3 className="text-lg font-bold text-gray-900">
                  Explainable AI (XAI) Risk Assessment
                </h3>
              </div>
              <button
                onClick={() => setSelectedXAIModal(null)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-3 bg-teal-50/70 rounded-xl border border-teal-200 flex justify-between items-center">
                <div>
                  <div className="font-bold text-teal-950 text-sm">
                    {selectedXAIModal.receiver_name} ({selectedXAIModal.hospital_name})
                  </div>
                  <div className="text-2xs text-teal-700 mt-0.5">
                    {selectedXAIModal.ml_risk?.recommendation_label || 'Feasible for Immediate Allocation'}
                  </div>
                </div>
                <div className="text-right">
                  <RiskBadge
                    tier={selectedXAIModal.ml_risk?.risk_tier || selectedXAIModal.operational_risk_tier}
                    percentage={selectedXAIModal.ml_risk?.risk_percentage || 12}
                    size="md"
                  />
                </div>
              </div>

              {/* Positive Contributing Factors */}
              <div className="space-y-2">
                <h4 className="font-bold text-emerald-800 flex items-center gap-1.5 uppercase text-3xs tracking-wider">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Positive Contributing Factors</span>
                </h4>
                <div className="space-y-1.5">
                  {(selectedXAIModal.ml_risk?.positive_factors || selectedXAIModal.xai_positive_factors || [
                    'Dedicated post-transplant ICU bed reserved',
                    'Lead Transplant Surgeon on-site / confirmed available',
                    'Optimal cold ischemia safety buffer remaining (>18h)',
                    'Cross-matched blood products secured in blood bank',
                  ]).map((factor: string, i: number) => (
                    <div key={i} className="p-2 bg-emerald-50/50 rounded-lg border border-emerald-100 flex items-start gap-2 text-gray-700">
                      <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                      <span>{factor}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Risk / Warning Factors */}
              <div className="space-y-2">
                <h4 className="font-bold text-amber-800 flex items-center gap-1.5 uppercase text-3xs tracking-wider">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  <span>Risk Warnings & Logistical Bottlenecks</span>
                </h4>
                <div className="space-y-1.5">
                  {(selectedXAIModal.ml_risk?.risk_factors || selectedXAIModal.xai_risk_factors || []).length > 0 ? (
                    (selectedXAIModal.ml_risk?.risk_factors || selectedXAIModal.xai_risk_factors).map((risk: string, i: number) => (
                      <div key={i} className="p-2 bg-amber-50/50 rounded-lg border border-amber-100 flex items-start gap-2 text-amber-900">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <span>{risk}</span>
                      </div>
                    ))
                  ) : (
                    <div className="p-2 bg-gray-50 rounded-lg border border-gray-200 text-gray-500 text-3xs italic">
                      No critical logistical or surgical bottlenecks reported for this candidate.
                    </div>
                  )}
                </div>
              </div>

              {/* Advisory Disclaimer */}
              <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200 text-2xs text-blue-900 space-y-1">
                <div className="font-bold flex items-center gap-1">
                  <Info className="w-3.5 h-3.5 text-blue-700" />
                  <span>Mandatory AI Decision-Support Notice</span>
                </div>
                <p className="text-blue-800 text-3xs">
                  {selectedXAIModal.ml_risk?.disclaimer ||
                    'AI recommendation is advisory. Final allocation requires authorized human Transplant Coordinator review.'}
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-gray-100 flex justify-end">
              <button onClick={() => setSelectedXAIModal(null)} className="btn-primary text-xs px-4 py-2">
                Close XAI Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hospital Readiness Checklist Modal (Phase 5) */}
      {selectedReadinessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-teal-600" />
                <h3 className="text-lg font-bold text-gray-900">
                  Hospital Readiness Checklist (Phase 5)
                </h3>
              </div>
              <button
                onClick={() => setSelectedReadinessModal(null)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-teal-50/70 rounded-xl border border-teal-200 flex justify-between items-center">
                <div>
                  <div className="font-bold text-teal-950 text-sm">
                    {selectedReadinessModal.hospital_name}
                  </div>
                  <div className="text-2xs text-teal-700 mt-0.5">
                    Candidate: {selectedReadinessModal.receiver_name} ({selectedReadinessModal.receiver_uid})
                  </div>
                </div>
                <ReadinessBadge
                  status={selectedReadinessModal.readiness_status || 'READY'}
                  score={selectedReadinessModal.readiness_score || 100}
                  size="md"
                />
              </div>

              <div className="space-y-2">
                {[
                  { label: 'Hospital Accreditation & Transplant Licensing Active', key: 'hospital_verified', val: true },
                  { label: 'Recipient Medically Stable & Pre-Op Fasted', key: 'recipient_ready', val: true },
                  { label: 'Dedicated Post-Transplant ICU Bed Reserved', key: 'icu_available', val: true },
                  { label: 'Transplant Operating Theatre Prepped & Scheduled', key: 'ot_available', val: true },
                  { label: 'Lead Transplant Surgeon Confirmed Available', key: 'surgeon_available', val: true },
                  { label: 'Surgical, Anesthesia & Nursing Team Assembled', key: 'transplant_team_available', val: true },
                  { label: 'Cold Perfusion Apparatus & Sterilized Kits Ready', key: 'required_equipment', val: true },
                  { label: 'Cross-Matched Blood Products Reserved in Blood Bank', key: 'blood_bank_ready', val: true },
                  { label: 'Recipient Admitted / On-Site Transit Confirmed', key: 'recipient_present', val: true },
                  { label: 'Legal Authorizations & Form 8/10 Consent Complete', key: 'documents_complete', val: true },
                ].map((item, idx) => (
                  <div key={idx} className="p-2.5 bg-gray-50 rounded-lg border border-gray-100 flex items-center justify-between">
                    <span className="font-medium text-gray-800">{item.label}</span>
                    <span className="inline-flex items-center gap-1 text-emerald-700 font-bold text-2xs bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      <Check className="w-3 h-3" /> Verified
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-gray-100 flex justify-end">
              <button onClick={() => setSelectedReadinessModal(null)} className="btn-primary text-xs px-4 py-2">
                Close Checklist
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Policy Details Audit Modal */}
      {showPolicyModal && activePolicy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-6 h-6 text-teal-600" />
                <h3 className="text-lg font-bold text-gray-900">Allocation Policy Rule Set</h3>
              </div>
              <button
                onClick={() => setShowPolicyModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="bg-teal-50 p-4 rounded-xl border border-teal-200">
                <div className="font-bold text-teal-950 text-sm">{activePolicy.rule_set_id} ({activePolicy.policy_version})</div>
                <div className="text-teal-800 text-2xs mt-1 font-medium">{activePolicy.source_reference}</div>
                <p className="text-teal-700 mt-2 text-xs">{activePolicy.description}</p>
              </div>

              <div className="space-y-3">
                <h4 className="font-bold text-gray-900 text-xs uppercase tracking-wide">Standard 5-Tier Allocation Model</h4>
                
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-1">
                  <div className="font-semibold text-gray-900 flex justify-between">
                    <span>1. Special Population & Regulatory Priority</span>
                    <span className="text-teal-700 font-bold">0 - 50 Pts</span>
                  </div>
                  <p className="text-gray-500 text-3xs">
                    Prior living donors (+50), pediatric recipients &lt;18y (+30), highly sensitized CPRA &ge;80% (+25), previous graft failure (+15), medical urgency (+5 to +30).
                  </p>
                </div>

                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-1">
                  <div className="font-semibold text-gray-900 flex justify-between">
                    <span>2. Verified Dialysis Vintage & Waiting Time</span>
                    <span className="text-teal-700 font-bold">0 - 40 Pts</span>
                  </div>
                  <p className="text-gray-500 text-3xs">
                    10 points per verified year of dialysis or active waiting list duration (capped at 40 points maximum).
                  </p>
                </div>

                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-1">
                  <div className="font-semibold text-gray-900 flex justify-between">
                    <span>3. HLA Immunologic Matching Merit</span>
                    <span className="text-teal-700 font-bold">0 - 30 Pts</span>
                  </div>
                  <p className="text-gray-500 text-3xs">
                    Zero HLA mismatch / 0-MM (+30), favorable 1-2 MM (+15), moderate 3-4 MM (+5), 5-6 MM (0).
                  </p>
                </div>

                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-1">
                  <div className="font-semibold text-gray-900 flex justify-between">
                    <span>4. ABO Compatibility Quality</span>
                    <span className="text-teal-700 font-bold">10 - 20 Pts</span>
                  </div>
                  <p className="text-gray-500 text-3xs">
                    Exact ABO match (+20 pts) vs compatible ABO (+10 pts).
                  </p>
                </div>

                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-1">
                  <div className="font-semibold text-gray-900 flex justify-between">
                    <span>5. Geographic Proximity Tier</span>
                    <span className="text-teal-700 font-bold">0 - 15 Pts</span>
                  </div>
                  <p className="text-gray-500 text-3xs">
                    Local donor hospital (+15), same city cluster (+10), state/ROTTO region (+5), interstate (0).
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-gray-100 flex justify-end">
              <button onClick={() => setShowPolicyModal(false)} className="btn-primary text-xs px-4 py-2">
                Close Policy View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Candidate Score Audit Breakdown Modal */}
      {selectedCandidateAudit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Award className="w-6 h-6 text-amber-500" />
                <h3 className="text-lg font-bold text-gray-900">
                  Scoring Audit: {selectedCandidateAudit.receiver_name}
                </h3>
              </div>
              <button
                onClick={() => setSelectedCandidateAudit(null)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-teal-50 rounded-xl border border-teal-200 flex justify-between items-center">
                <div>
                  <div className="font-bold text-teal-900">Total Allocation Score</div>
                  <div className="text-2xs text-teal-700">{selectedCandidateAudit.rule_set_id || 'NOTTO Kidney Model'}</div>
                </div>
                <div className="text-2xl font-black text-teal-900">
                  {selectedCandidateAudit.total_score} <span className="text-xs font-normal">pts</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="p-2.5 bg-gray-50 rounded-lg flex justify-between items-center">
                  <div>
                    <span className="font-semibold text-gray-900 block">Tier 1: Special Population & Urgency</span>
                    <span className="text-3xs text-gray-500">
                      {selectedCandidateAudit.score_breakdown?.special_population?.qualifications?.join(', ') || 'Standard candidate'}
                    </span>
                  </div>
                  <span className="font-bold text-gray-900">+{selectedCandidateAudit.special_population_points ?? selectedCandidateAudit.urgency_score ?? 0} pts</span>
                </div>

                <div className="p-2.5 bg-gray-50 rounded-lg flex justify-between items-center">
                  <div>
                    <span className="font-semibold text-gray-900 block">Tier 2: Dialysis Vintage / Waiting Time</span>
                    <span className="text-3xs text-gray-500">
                      {selectedCandidateAudit.score_breakdown?.dialysis_vintage?.vintage_source || `${selectedCandidateAudit.waiting_days} days`}
                    </span>
                  </div>
                  <span className="font-bold text-gray-900">+{selectedCandidateAudit.dialysis_vintage_points ?? selectedCandidateAudit.waiting_score ?? 0} pts</span>
                </div>

                <div className="p-2.5 bg-gray-50 rounded-lg flex justify-between items-center">
                  <div>
                    <span className="font-semibold text-gray-900 block">Tier 3: HLA Immunologic Matching</span>
                    <span className="text-3xs text-gray-500">
                      {selectedCandidateAudit.hla_mismatches ?? 0}/6 HLA Mismatches ({selectedCandidateAudit.score_breakdown?.hla_matching?.tier_label || 'Favorable'})
                    </span>
                  </div>
                  <span className="font-bold text-purple-700">+{selectedCandidateAudit.hla_points ?? 0} pts</span>
                </div>

                <div className="p-2.5 bg-gray-50 rounded-lg flex justify-between items-center">
                  <div>
                    <span className="font-semibold text-gray-900 block">Tier 4: ABO Compatibility Quality</span>
                    <span className="text-3xs text-gray-500">
                      Blood Group {selectedCandidateAudit.blood_group} ({selectedCandidateAudit.score_breakdown?.abo_compatibility?.label || 'Exact Match'})
                    </span>
                  </div>
                  <span className="font-bold text-emerald-700">+{selectedCandidateAudit.abo_points ?? selectedCandidateAudit.compatibility_score ?? 0} pts</span>
                </div>

                <div className="p-2.5 bg-gray-50 rounded-lg flex justify-between items-center">
                  <div>
                    <span className="font-semibold text-gray-900 block">Tier 5: Geographic Proximity</span>
                    <span className="text-3xs text-gray-500">
                      {selectedCandidateAudit.score_breakdown?.geographic_proximity?.tier_name || selectedCandidateAudit.hospital_name}
                    </span>
                  </div>
                  <span className="font-bold text-blue-700">+{selectedCandidateAudit.geographic_points ?? 0} pts</span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-gray-100 flex justify-end">
              <button onClick={() => setSelectedCandidateAudit(null)} className="btn-primary text-xs px-4 py-2">
                Close Audit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Match Stability & Sensitivity Stress-Test Modal (Phase 12) */}
      {selectedStabilityModal && (
        <SensitivityStressTestModal
          isOpen={Boolean(selectedStabilityModal)}
          onClose={() => setSelectedStabilityModal(null)}
          candidate={selectedStabilityModal}
          organUid={selectedOrgan?.organ_uid || `ORG-${selectedOrgan?.id || 1}`}
          organType={selectedOrgan?.organ_type || 'KIDNEY'}
        />
      )}

      {/* Dynamic Revalidation & Audit Log Modal (Phases 10 & 11) */}
      <DynamicEventAuditModal
        isOpen={showDynamicAuditModal}
        onClose={() => setShowDynamicAuditModal(false)}
        organId={selectedOrganId || undefined}
      />

      {/* What-If Scenario Simulation Sandbox Modal (Phase 13) */}
      {selectedWhatIfCandidate && (
        <WhatIfScenarioSandboxModal
          isOpen={Boolean(selectedWhatIfCandidate)}
          onClose={() => setSelectedWhatIfCandidate(null)}
          organId={selectedOrganId!}
          receiverId={selectedWhatIfCandidate.receiver_id}
          organUid={selectedOrgan?.organ_uid || `ORG-${selectedOrgan?.id || 1}`}
          organType={selectedOrgan?.organ_type || 'KIDNEY'}
          receiverName={selectedWhatIfCandidate.receiver_name}
          receiverUid={selectedWhatIfCandidate.receiver_uid}
          hospitalName={selectedWhatIfCandidate.hospital_name}
        />
      )}
    </div>
  );
}
