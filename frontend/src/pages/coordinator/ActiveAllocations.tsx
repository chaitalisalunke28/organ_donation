import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { GitMerge, CheckCircle2, Eye, ShieldCheck, Check, AlertTriangle, Building2, History, Sparkles, FileCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { getAllocations, confirmAllocation, completeAllocation, markUnallocated } from '../../api';
import StatusBadge from '../../components/StatusBadge';
import OrganBadge from '../../components/OrganBadge';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';
import { RevalidationBadge } from '../../components/RevalidationBadge';
import { DynamicEventAuditModal } from '../../components/DynamicEventAuditModal';
import { WhatIfScenarioSandboxModal } from '../../components/WhatIfScenarioSandboxModal';
import { AllocationDecisionRecordModal } from '../../components/AllocationDecisionRecordModal';

export default function ActiveAllocations() {
  const queryClient = useQueryClient();
  const [selectedAuditAlloc, setSelectedAuditAlloc] = useState<any | null>(null);
  const [selectedWhatIfAlloc, setSelectedWhatIfAlloc] = useState<any | null>(null);
  const [selectedDecisionRecordId, setSelectedDecisionRecordId] = useState<number | null>(null);

  const { data: allocations = [], isLoading } = useQuery({
    queryKey: ['coordinator-allocations'],
    queryFn: () => getAllocations().then((res) => res.data),
    refetchInterval: 10000,
  });

  const confirmMutation = useMutation({
    mutationFn: (id: number) => confirmAllocation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coordinator-allocations'] });
      queryClient.invalidateQueries({ queryKey: ['coordinator-dashboard'] });
      toast.success('Transplant allocation confirmed! Recipient medical info shared with Donor Hospital.');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || 'Failed to confirm allocation');
    },
  });

  const completeMutation = useMutation({
    mutationFn: (id: number) => completeAllocation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coordinator-allocations'] });
      queryClient.invalidateQueries({ queryKey: ['coordinator-dashboard'] });
      toast.success('Allocation process marked as COMPLETED!');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || 'Failed to complete allocation');
    },
  });

  const unallocatedMutation = useMutation({
    mutationFn: (id: number) => markUnallocated(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coordinator-allocations'] });
      queryClient.invalidateQueries({ queryKey: ['coordinator-dashboard'] });
      toast.success('Organ marked as UNALLOCATED (candidates exhausted)');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || 'Failed to mark unallocated');
    },
  });

  if (isLoading) {
    return <LoadingSpinner message="Loading central allocation records..." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Transplant Allocations Management</h1>
          <p className="text-sm text-gray-500 mt-1">
            Review hospital acceptances, authorize clinical confirmation, dispatch recipient data, and mark completed
          </p>
        </div>
      </div>

      <div className="card space-y-4">
        {allocations.length === 0 ? (
          <EmptyState
            title="No Active Allocations"
            message="No allocation workflows have been initiated yet. Match an organ to start."
            icon={<GitMerge className="w-12 h-12 text-gray-400" />}
            action={
              <Link to="/coordinator/matching" className="btn-primary text-xs inline-flex items-center gap-1.5">
                <GitMerge className="w-3.5 h-3.5" /> Run Matching Engine
              </Link>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/50">
                  <th className="table-header">Allocation UID</th>
                  <th className="table-header">Organ</th>
                  <th className="table-header">Donor Facility</th>
                  <th className="table-header">Recipient Facility</th>
                  <th className="table-header">Priority Rank</th>
                  <th className="table-header">Status</th>
                  <th className="table-header">Rejections</th>
                  <th className="table-header text-right">Coordinator Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {allocations.map((a: any) => (
                  <tr key={a.id} className="hover:bg-gray-50/70">
                    <td className="table-cell font-mono font-bold text-teal-700">
                      {a.allocation_uid}
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center gap-1">
                        <OrganBadge organ={a.organ_type} size="sm" />
                        <span className="font-mono text-2xs text-gray-400">{a.organ_uid}</span>
                      </div>
                    </td>
                    <td className="table-cell text-gray-700">
                      <div>{a.donor_hospital}</div>
                      <div className="text-2xs text-gray-400">Donor: {a.donor_name}</div>
                    </td>
                    <td className="table-cell text-gray-700">
                      <div>{a.receiver_hospital || 'Awaiting Acceptance'}</div>
                      <div className="text-2xs text-gray-400">
                        {a.receiver_name ? `Recipient: ${a.receiver_name}` : 'No accepted candidate yet'}
                      </div>
                    </td>
                    <td className="table-cell">
                      {a.priority_number ? (
                        <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-bold text-2xs">
                          Priority #{a.priority_number}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="table-cell">
                      <div className="space-y-1">
                        <StatusBadge status={a.status} />
                        {a.revalidation_status && a.revalidation_status !== 'VALID' && (
                          <div>
                            <RevalidationBadge status={a.revalidation_status} size="sm" />
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="table-cell font-medium text-gray-600">
                      {a.rejection_count > 0 ? (
                        <span className="text-rose-600 font-bold">{a.rejection_count} rejected</span>
                      ) : (
                        <span className="text-gray-400">0</span>
                      )}
                    </td>
                    <td className="table-cell text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {a.receiver_id && (
                          <button
                            onClick={() => setSelectedWhatIfAlloc(a)}
                            className="btn-secondary text-2xs px-2 py-1 inline-flex items-center gap-1 text-teal-800 hover:text-teal-950"
                            title="Run non-destructive What-If scenario simulation"
                          >
                            <Sparkles className="w-3 h-3 text-teal-600" /> What-If
                          </button>
                        )}
                        <button
                          onClick={() => setSelectedDecisionRecordId(a.id)}
                          className="btn-secondary text-2xs px-2 py-1 inline-flex items-center gap-1 text-teal-900 font-bold bg-teal-50/80 border-teal-200 hover:bg-teal-100"
                          title="View sealed permanent Allocation Decision Record (Audit Dossier)"
                        >
                          <FileCheck className="w-3 h-3 text-teal-700" /> Decision Record
                        </button>
                        <button
                          onClick={() => setSelectedAuditAlloc(a)}
                          className="btn-secondary text-2xs px-2 py-1 inline-flex items-center gap-1"
                          title="View dynamic revalidation event log and impact report"
                        >
                          <History className="w-3 h-3 text-teal-600" /> Audit Log
                        </button>
                        <Link
                          to={`/coordinator/allocations/${a.id}`}
                          className="btn-secondary text-2xs px-2 py-1 inline-flex items-center gap-1"
                        >
                          <Eye className="w-3 h-3" /> Record
                        </Link>

                        {a.status === 'ALLOCATED' && (
                          <>
                            <button
                              onClick={() => confirmMutation.mutate(a.id)}
                              disabled={confirmMutation.isPending}
                              className="btn-primary text-2xs px-2 py-1 inline-flex items-center gap-1"
                              title="Authorize clinical confirmation and share details with donor facility"
                            >
                              <ShieldCheck className="w-3 h-3" /> Confirm
                            </button>
                            <button
                              onClick={() => completeMutation.mutate(a.id)}
                              disabled={completeMutation.isPending}
                              className="btn-success text-2xs px-2 py-1 inline-flex items-center gap-1"
                              title="Mark full transplant process as Completed"
                            >
                              <CheckCircle2 className="w-3 h-3" /> Complete
                            </button>
                          </>
                        )}

                        {a.status === 'IN_PROGRESS' && a.rejection_count > 0 && (
                          <button
                            onClick={() => unallocatedMutation.mutate(a.id)}
                            disabled={unallocatedMutation.isPending}
                            className="btn-danger text-2xs px-2 py-1 inline-flex items-center gap-1"
                            title="Mark organ as Unallocated if all candidates exhausted"
                          >
                            <AlertTriangle className="w-3 h-3" /> Unallocate
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Dynamic Revalidation Audit Modal */}
      {selectedAuditAlloc && (
        <DynamicEventAuditModal
          isOpen={Boolean(selectedAuditAlloc)}
          onClose={() => setSelectedAuditAlloc(null)}
          allocationId={selectedAuditAlloc.id}
          organId={selectedAuditAlloc.organ_id}
          receiverId={selectedAuditAlloc.receiver_id}
          currentRevalidationStatus={selectedAuditAlloc.revalidation_status || 'VALID'}
        />
      )}

      {/* What-If Scenario Simulation Sandbox Modal (Phase 13) */}
      {selectedWhatIfAlloc && selectedWhatIfAlloc.receiver_id && (
        <WhatIfScenarioSandboxModal
          isOpen={Boolean(selectedWhatIfAlloc)}
          onClose={() => setSelectedWhatIfAlloc(null)}
          organId={selectedWhatIfAlloc.organ_id}
          receiverId={selectedWhatIfAlloc.receiver_id}
          organUid={selectedWhatIfAlloc.organ_uid || `ORG-${selectedWhatIfAlloc.organ_id}`}
          organType={selectedWhatIfAlloc.organ_type || 'KIDNEY'}
          receiverName={selectedWhatIfAlloc.receiver_name || 'Recipient'}
          hospitalName={selectedWhatIfAlloc.receiver_hospital || 'Facility'}
        />
      )}

      {/* Allocation Decision Record Modal (Phase 14) */}
      {selectedDecisionRecordId && (
        <AllocationDecisionRecordModal
          isOpen={Boolean(selectedDecisionRecordId)}
          onClose={() => setSelectedDecisionRecordId(null)}
          allocationId={selectedDecisionRecordId}
        />
      )}
    </div>
  );
}
