import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Heart,
  Activity,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Building2,
  Phone,
  UserCheck,
  AlertTriangle,
  History,
  Download,
  Eye,
  FileText,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  getAllocationDetail,
  confirmAllocation,
  completeAllocation,
  markUnallocated,
  downloadCoordinatorAllocationPdf,
  downloadCoordinatorRecipientDossierPdf,
} from '../../api';
import StatusBadge from '../../components/StatusBadge';
import OrganBadge from '../../components/OrganBadge';
import LoadingSpinner from '../../components/LoadingSpinner';
import DocumentModal from '../../components/DocumentModal';

export default function AllocationDetail() {
  const { id } = useParams<{ id: string }>();
  const allocationId = Number(id);
  const queryClient = useQueryClient();

  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['coordinator-allocation-detail', allocationId],
    queryFn: () => getAllocationDetail(allocationId).then((res) => res.data),
    enabled: !!allocationId,
  });

  const confirmMutation = useMutation({
    mutationFn: () => confirmAllocation(allocationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coordinator-allocation-detail', allocationId] });
      queryClient.invalidateQueries({ queryKey: ['coordinator-allocations'] });
      toast.success('Allocation confirmed by coordinator');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || 'Failed to confirm');
    },
  });

  const completeMutation = useMutation({
    mutationFn: () => completeAllocation(allocationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coordinator-allocation-detail', allocationId] });
      queryClient.invalidateQueries({ queryKey: ['coordinator-allocations'] });
      toast.success('Allocation marked as COMPLETED!');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || 'Failed to complete');
    },
  });

  const unallocatedMutation = useMutation({
    mutationFn: () => markUnallocated(allocationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coordinator-allocation-detail', allocationId] });
      queryClient.invalidateQueries({ queryKey: ['coordinator-allocations'] });
      toast.success('Organ marked as UNALLOCATED');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || 'Failed to mark unallocated');
    },
  });

  if (isLoading) {
    return <LoadingSpinner message="Loading complete allocation dossier..." />;
  }

  if (isError || !data) {
    return (
      <div className="card text-center py-12">
        <p className="text-red-600 font-medium">Allocation record not found.</p>
        <Link to="/coordinator/allocations" className="btn-secondary mt-4 inline-flex items-center gap-1.5">
          <ArrowLeft className="w-4 h-4" /> Back to Allocations
        </Link>
      </div>
    );
  }

  const { allocation, organ, donor, receiver, offers = [], history = [] } = data;

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link to="/coordinator/allocations" className="btn-secondary p-2 rounded-lg text-gray-600">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{allocation.allocation_uid}</h1>
              <StatusBadge status={allocation.status} />
              {allocation.priority_number && (
                <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-xs font-bold">
                  Priority #{allocation.priority_number}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Coordinated by: <strong>{allocation.coordinator || 'Transplant Coordinator'}</strong> • Created: {new Date(allocation.created_at).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={async () => {
              try {
                await downloadCoordinatorRecipientDossierPdf(allocationId, `Recipient_Clinical_Dossier_${allocation.allocation_uid}.pdf`);
                toast.success('Recipient Dossier PDF downloaded');
              } catch {
                toast.error('Failed to download Recipient Dossier PDF');
              }
            }}
            className="px-3 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-xs"
            title="Download Full Recipient Clinical Information Dossier PDF"
          >
            <FileText className="w-4 h-4" /> Recipient Dossier (PDF)
          </button>

          {/* Download & Preview PDF */}
          <button
            onClick={async () => {
              try {
                const res = await fetch(`/api/coordinator/allocations/${allocationId}/pdf`, {
                  headers: {
                    Authorization: `Bearer ${localStorage.getItem('access_token')}`,
                  },
                });
                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                setPdfBlobUrl(url);
              } catch {
                toast.error('Failed to load PDF preview');
              }
            }}
            className="btn-secondary text-xs px-3 py-2 inline-flex items-center gap-1.5"
          >
            <Eye className="w-4 h-4" /> View Certificate
          </button>

          <button
            onClick={async () => {
              try {
                await downloadCoordinatorAllocationPdf(allocationId, `Allocation_Certificate_${allocation.allocation_uid}.pdf`);
                toast.success('Allocation Certificate downloaded');
              } catch {
                toast.error('Failed to download PDF');
              }
            }}
            className="btn-primary text-xs px-3 py-2 inline-flex items-center gap-1.5"
          >
            <Download className="w-4 h-4" /> Certificate PDF
          </button>

          {allocation.status === 'ALLOCATED' && (
            <>
              <button
                onClick={() => confirmMutation.mutate()}
                disabled={confirmMutation.isPending}
                className="btn-primary text-xs px-3 py-2 inline-flex items-center gap-1.5"
              >
                <ShieldCheck className="w-4 h-4" /> Confirm Allocation
              </button>
              <button
                onClick={() => completeMutation.mutate()}
                disabled={completeMutation.isPending}
                className="btn-success text-xs px-3 py-2 inline-flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" /> Mark COMPLETED
              </button>
            </>
          )}

          {allocation.status === 'IN_PROGRESS' && (
            <button
              onClick={() => unallocatedMutation.mutate()}
              disabled={unallocatedMutation.isPending}
              className="btn-danger text-xs px-3 py-2 inline-flex items-center gap-1.5"
            >
              <AlertTriangle className="w-4 h-4" /> Mark UNALLOCATED
            </button>
          )}
        </div>
      </div>

      {/* Grid: Organ & Facilities */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Organ Card */}
        <div className="card space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Donated Organ</h2>
            <OrganBadge organ={organ.organ_type} size="sm" />
          </div>
          <div className="space-y-1 text-xs">
            <div>
              <span className="text-gray-400">Organ UID:</span>{' '}
              <span className="font-mono font-bold text-gray-800">{organ.organ_uid}</span>
            </div>
            <div>
              <span className="text-gray-400">Condition:</span>{' '}
              <span className="text-gray-800">{organ.organ_condition || 'Viable for transplant'}</span>
            </div>
          </div>
        </div>

        {/* Donor Hospital Card */}
        <div className="card space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Donor Facility</h2>
            <Heart className="w-4 h-4 text-rose-500" />
          </div>
          <div className="space-y-1 text-xs">
            <div>
              <span className="text-gray-400">Hospital:</span>{' '}
              <span className="font-semibold text-gray-800">{donor.hospital}</span>
            </div>
            <div>
              <span className="text-gray-400">Donor Name:</span>{' '}
              <span className="text-gray-800">{donor.name} ({donor.uid})</span>
            </div>
          </div>
        </div>

        {/* Recipient Facility Card */}
        <div className="card space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Recipient Facility</h2>
            <Activity className="w-4 h-4 text-blue-500" />
          </div>
          <div className="space-y-1 text-xs">
            <div>
              <span className="text-gray-400">Hospital:</span>{' '}
              <span className="font-semibold text-gray-800">{receiver?.hospital || 'Not Allocated'}</span>
            </div>
            <div>
              <span className="text-gray-400">Recipient:</span>{' '}
              <span className="text-gray-800">{receiver?.name ? `${receiver.name} (${receiver.uid})` : 'Awaiting Match Acceptance'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recipient Information Authorized for Donor Hospital */}
      {receiver && (
        <div className="card space-y-4 border-l-4 border-l-teal-600">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div>
              <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-teal-600" />
                <span>Recipient Clinical Information Authorized for Donor Facility</span>
              </h2>
              <p className="text-xs text-gray-500">
                Data automatically shared with the donor hospital to enable organ logistics, surgical team coordination, and dispatch
              </p>
            </div>
            <span className="text-xs font-bold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-full border border-teal-200">
              Shared with Donor Center
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-gray-400 font-medium">Recipient Name & ID</span>
              <p className="font-bold text-gray-900 mt-0.5">{receiver.name}</p>
              <p className="font-mono text-2xs text-gray-400">{receiver.uid}</p>
            </div>
            <div>
              <span className="text-gray-400 font-medium">Age & Gender</span>
              <p className="font-medium text-gray-800 mt-0.5">{receiver.age} yrs, {receiver.gender}</p>
            </div>
            <div>
              <span className="text-gray-400 font-medium">ABO Blood Group</span>
              <p className="font-mono font-bold text-teal-800 mt-0.5">{receiver.blood_group}</p>
            </div>
            <div>
              <span className="text-gray-400 font-medium">Recipient Facility Contact</span>
              <p className="font-medium text-gray-800 mt-0.5 flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-gray-400" />
                {receiver.hospital_contact || 'Standard Coordination Line'}
              </p>
            </div>
          </div>

          {receiver.medical_info && (
            <div className="pt-2 border-t border-gray-100 text-xs">
              <span className="text-gray-400 font-medium">Relevant Recipient Clinical Details:</span>
              <p className="text-gray-700 mt-1">{receiver.medical_info}</p>
            </div>
          )}
        </div>
      )}

      {/* Sequential Offer Audit Trail & Rejection History */}
      <div className="card space-y-4">
        <h2 className="text-base font-semibold text-gray-900 pb-3 border-b border-gray-100 flex items-center gap-2">
          <Clock className="w-5 h-5 text-orange-500" />
          <span>Sequential Offer History ({offers.length})</span>
        </h2>

        {offers.length === 0 ? (
          <p className="text-xs text-gray-400 py-4 text-center">No offers recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/50">
                  <th className="table-header">Priority</th>
                  <th className="table-header">Candidate</th>
                  <th className="table-header">Hospital</th>
                  <th className="table-header">Status</th>
                  <th className="table-header">Rejection Reason / Notes</th>
                  <th className="table-header">Offered At</th>
                  <th className="table-header">Responded At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {offers.map((o: any) => (
                  <tr key={o.id} className="hover:bg-gray-50/70">
                    <td className="table-cell font-bold text-teal-700">Priority #{o.priority_number}</td>
                    <td className="table-cell font-medium text-gray-900">{o.receiver_name}</td>
                    <td className="table-cell text-gray-700">{o.hospital_name}</td>
                    <td className="table-cell">
                      <StatusBadge status={o.status} />
                    </td>
                    <td className="table-cell text-gray-600 max-w-xs truncate">
                      {o.rejection_reason ? `${o.rejection_reason} ${o.rejection_notes ? `(${o.rejection_notes})` : ''}` : '—'}
                    </td>
                    <td className="table-cell text-gray-400">{new Date(o.created_at).toLocaleString()}</td>
                    <td className="table-cell text-gray-400">{o.responded_at ? new Date(o.responded_at).toLocaleString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Allocation Audit Event Log */}
      <div className="card space-y-4">
        <h2 className="text-base font-semibold text-gray-900 pb-3 border-b border-gray-100 flex items-center gap-2">
          <History className="w-5 h-5 text-gray-500" />
          <span>Allocation Audit Log & Event Timeline</span>
        </h2>

        <div className="space-y-3">
          {history.length === 0 ? (
            <p className="text-xs text-gray-400 py-4 text-center">No events logged yet.</p>
          ) : (
            history.map((h: any, i: number) => (
              <div key={i} className="flex items-start gap-3 p-3 bg-gray-50/70 rounded-lg text-xs border border-gray-100">
                <span className="w-2 h-2 rounded-full bg-teal-600 mt-1.5 shrink-0" />
                <div className="flex-1">
                  <div className="font-semibold text-gray-900">{h.event_type}</div>
                  <div className="text-gray-600 mt-0.5">{h.description}</div>
                  <div className="text-2xs text-gray-400 mt-1">
                    By {h.performed_by || 'System'} • {new Date(h.timestamp).toLocaleString()}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* PDF Document Preview Modal */}
      <DocumentModal
        isOpen={!!pdfBlobUrl}
        onClose={() => {
          if (pdfBlobUrl) URL.revokeObjectURL(pdfBlobUrl);
          setPdfBlobUrl(null);
        }}
        title={`Allocation Certificate - ${allocation?.allocation_uid}`}
        pdfBlobUrl={pdfBlobUrl}
        downloadFilename={`Allocation_Certificate_${allocation?.allocation_uid}.pdf`}
      />
    </div>
  );
}
