import React from 'react';
import {
  X,
  FileCheck,
  ShieldCheck,
  Building2,
  User,
  Heart,
  Calendar,
  CheckCircle2,
  Award,
  Hash,
  Clock,
  Printer,
  History,
  AlertOctagon,
  Lock,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getAllocationDecisionRecord } from '../api';
import { AllocationDecisionRecord } from '../types';
import { StabilityBadge } from './StabilityBadge';
import RiskBadge from './RiskBadge';
import ReadinessBadge from './ReadinessBadge';
import OrganBadge from './OrganBadge';

interface AllocationDecisionRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  allocationId: number;
}

export const AllocationDecisionRecordModal: React.FC<AllocationDecisionRecordModalProps> = ({
  isOpen,
  onClose,
  allocationId,
}) => {
  const { data: record, isLoading, error } = useQuery<AllocationDecisionRecord>({
    queryKey: ['allocationDecisionRecord', allocationId],
    queryFn: () => getAllocationDecisionRecord(allocationId),
    enabled: isOpen && Boolean(allocationId),
  });

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-4 print:p-0 print:bg-white">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full overflow-hidden border border-slate-200 print:border-none print:shadow-none">
        {/* Modal Header */}
        <div className="px-6 py-5 bg-gray-900 text-white flex justify-between items-center print:hidden">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-teal-800/50 rounded-xl border border-teal-500/30">
              <FileCheck className="w-6 h-6 text-teal-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold">Allocation Decision Record (Audit Dossier)</h3>
                <span className="px-2.5 py-0.5 text-xs bg-emerald-500/20 text-emerald-300 font-bold rounded-full border border-emerald-400/40">
                  Phase 14 Sealed
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Permanent, legally auditable rationale justifying confirmed transplant allocation
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition"
            >
              <Printer className="w-3.5 h-3.5" /> Print / PDF
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body / Decision Document */}
        <div className="p-6 md:p-8 space-y-6 max-h-[82vh] overflow-y-auto print:max-h-none print:p-4">
          {isLoading ? (
            <div className="text-center py-12 text-xs text-slate-500">
              Loading immutable allocation decision record...
            </div>
          ) : error || !record ? (
            <div className="text-center py-12 text-xs text-rose-600 space-y-2">
              <AlertOctagon className="w-8 h-8 mx-auto text-rose-500" />
              <p className="font-bold">Allocation Decision Record not found or not yet confirmed.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Document Official Banner */}
              <div className="p-5 bg-teal-50/60 rounded-2xl border border-teal-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <div className="text-[10px] font-extrabold uppercase tracking-widest text-teal-800">
                    NATIONAL ORGAN ALLOCATION & TRANSPLANT REGISTRY
                  </div>
                  <h2 className="text-xl font-black text-slate-900 mt-0.5 flex items-center gap-2">
                    <span>ALLOCATION DECISION RECORD</span>
                    <span className="text-xs font-mono font-bold bg-teal-800 text-teal-100 px-2.5 py-0.5 rounded-full">
                      {record.record_uid}
                    </span>
                  </h2>
                  <div className="text-xs text-slate-600 mt-1 flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      Timestamp: <strong>{record.timestamp_formatted || record.timestamp}</strong>
                    </span>
                    <span>•</span>
                    <span>Allocation ID: <strong>{record.allocation_uid}</strong></span>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1.5">
                  <div className="px-4 py-1.5 bg-emerald-600 text-white font-extrabold text-xs tracking-wider rounded-xl uppercase shadow-xs flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    DECISION: {record.coordinator.decision}
                  </div>
                  <div className="text-[10px] text-slate-500 flex items-center gap-1">
                    <Lock className="w-3 h-3 text-slate-400" />
                    Digitally Sealed Audit Record
                  </div>
                </div>
              </div>

              {/* Organ, Donor & Recipient Matrix */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Organ Card */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Heart className="w-3.5 h-3.5 text-rose-500" />
                    <span>Allocated Organ</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <OrganBadge organ={record.organ.organ_type} size="md" />
                    <span className="font-mono font-bold text-xs text-slate-800">
                      {record.organ.organ_uid || `ORG-${record.organ.organ_id}`}
                    </span>
                  </div>
                  <div className="text-xs text-slate-600 pt-1">
                    Safe Ischemic Reserve: <strong>{record.operational_feasibility.remaining_preservation_buffer_hours}h buffer</strong>
                  </div>
                </div>

                {/* Donor Card */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-teal-600" />
                    <span>Verified Donor</span>
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-900">{record.donor.donor_name}</div>
                    <div className="text-2xs font-mono text-slate-500">{record.donor.donor_uid}</div>
                  </div>
                  <div className="text-xs text-slate-600">
                    Facility: <strong>{record.donor.donor_hospital}</strong>
                  </div>
                </div>

                {/* Recipient Card */}
                <div className="bg-teal-50/70 p-4 rounded-xl border border-teal-200 space-y-2">
                  <div className="text-[11px] font-bold text-teal-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-teal-600" />
                    <span>Selected Recipient</span>
                  </div>
                  <div>
                    <div className="text-sm font-bold text-teal-950">{record.receiver.receiver_name}</div>
                    <div className="text-2xs font-mono text-teal-700">{record.receiver.receiver_uid}</div>
                  </div>
                  <div className="text-xs text-teal-800">
                    Facility: <strong>{record.receiver.receiver_hospital}</strong>
                  </div>
                </div>
              </div>

              {/* 4 Pillars of Confirmed Decision (Compatibility, Policy Priority, Operational Risk, Match Stability) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. Biological Compatibility */}
                <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs space-y-2.5">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Biological Compatibility</span>
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <span className="text-slate-400 block text-[10px]">Overall Status</span>
                      <span className="font-bold text-emerald-700">{record.compatibility.overall_compatibility}</span>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <span className="text-slate-400 block text-[10px]">Crossmatch</span>
                      <span className="font-bold text-slate-800">{record.compatibility.crossmatch_result}</span>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <span className="text-slate-400 block text-[10px]">Size Match</span>
                      <span className="font-bold text-slate-800">{record.compatibility.size_compatibility}</span>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <span className="text-slate-400 block text-[10px]">HLA Mismatches</span>
                      <span className="font-bold text-purple-700">{record.compatibility.hla_mismatches}/6 MM</span>
                    </div>
                  </div>
                </div>

                {/* 2. Policy & National Priority Ranking */}
                <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs space-y-2.5">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-blue-600" />
                    <span>Allocation Policy & Priority Rank</span>
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <span className="text-slate-400 block text-[10px]">Applicable Policy</span>
                      <span className="font-bold text-slate-800">{record.policy.rule_set_id} ({record.policy.policy_version})</span>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <span className="text-slate-400 block text-[10px]">Confirmed Rank</span>
                      <span className="font-bold text-blue-800">Priority #{record.policy.priority_number}</span>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <span className="text-slate-400 block text-[10px]">NOTTO Priority Score</span>
                      <span className="font-bold text-teal-800 font-mono">{record.policy.priority_score} pts</span>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <span className="text-slate-400 block text-[10px]">Rule Verification</span>
                      <span className="font-bold text-emerald-700">Validated & Approved</span>
                    </div>
                  </div>
                </div>

                {/* 3. Operational Risk (ML) */}
                <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs space-y-2.5">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <RiskBadge tier={record.operational_feasibility.operational_risk_tier} size="sm" />
                    <span>Machine Learning Operational Risk</span>
                  </h4>
                  <div className="text-xs text-slate-600 space-y-1">
                    <div className="flex justify-between">
                      <span>Execution Risk:</span>
                      <strong className="text-slate-900 font-mono">{record.operational_feasibility.operational_risk_tier} ({(record.operational_feasibility.operational_risk_probability * 100).toFixed(1)}%)</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Advisory Nature:</span>
                      <span className="text-slate-500">Decision-Support Verified</span>
                    </div>
                  </div>
                </div>

                {/* 4. Match Stability & Facility Readiness */}
                <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs space-y-2.5">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <StabilityBadge tier={record.operational_feasibility.match_stability_tier} score={record.operational_feasibility.match_stability_score} size="sm" />
                    <span>Match Stability & Readiness</span>
                  </h4>
                  <div className="text-xs text-slate-600 space-y-1">
                    <div className="flex justify-between">
                      <span>Hospital Readiness:</span>
                      <strong className="text-slate-900 font-mono">{record.operational_feasibility.readiness_status} ({record.operational_feasibility.readiness_score}%)</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Stability Score:</span>
                      <strong className="text-slate-900 font-mono">{record.operational_feasibility.match_stability_score}% ({record.operational_feasibility.match_stability_tier})</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Prior Candidate Rejection Audit Log */}
              {record.rejection_audit_trail && (
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                  <div className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5 text-slate-500" />
                    <span>Prior Candidate Rejection Audit History</span>
                  </div>
                  <p className="text-xs text-slate-600 font-mono bg-white p-2.5 rounded-lg border border-slate-200">
                    {record.rejection_audit_trail}
                  </p>
                </div>
              )}

              {/* Official Clinical Justification */}
              <div className="p-4 bg-teal-50/80 rounded-xl border border-teal-200 space-y-1.5">
                <div className="text-xs font-bold text-teal-900 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-teal-700" />
                  <span>Clinical & Policy Justification</span>
                </div>
                <p className="text-xs text-teal-950 font-medium leading-relaxed">
                  "{record.coordinator.clinical_justification}"
                </p>
              </div>

              {/* Official Coordinator Sign-Off & Cryptographic Seal */}
              <div className="p-4 bg-slate-900 text-white rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider">Authorized Sign-off</div>
                  <div className="text-sm font-bold text-teal-300">{record.coordinator.coordinator_name}</div>
                  <div className="text-xs text-slate-400">Certified Transplant Coordinator • National Registry ID: #{record.coordinator.coordinator_id}</div>
                </div>

                <div className="text-left md:text-right font-mono">
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider">SHA-256 Digital Verification Seal</div>
                  <div className="text-2xs text-teal-300 break-all max-w-sm">
                    {record.digital_signature_hash}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center print:hidden">
          <div className="text-2xs text-slate-500 font-mono">
            {record?.record_uid} • Permanent Medical Audit Dossier
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold transition"
          >
            Close Dossier
          </button>
        </div>
      </div>
    </div>
  );
};
