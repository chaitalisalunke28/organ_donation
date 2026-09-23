import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Clock,
  Eye,
  FileText,
  Download,
  Building2,
  Heart,
  Activity,
  Phone,
  UserCheck,
  AlertTriangle,
  X,
  ShieldCheck,
  History,
  FileCheck,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  getAllocationHistory,
  getHospitalAllocationDetail,
  downloadHospitalAllocationPdf,
  downloadHospitalRecipientDossierPdf,
} from '../../api';
import StatusBadge from '../../components/StatusBadge';
import OrganBadge from '../../components/OrganBadge';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';
import DocumentModal from '../../components/DocumentModal';
import { AllocationDecisionRecordModal } from '../../components/AllocationDecisionRecordModal';

export default function AllocationHistory() {
  const [selectedAllocId, setSelectedAllocId] = useState<number | null>(null);
  const [decisionRecordAllocId, setDecisionRecordAllocId] = useState<number | null>(null);
  const [pdfModalUrl, setPdfModalUrl] = useState<string | null>(null);
  const [pdfModalTitle, setPdfModalTitle] = useState<string>('Allocation Certificate');

  const { data: history = [], isLoading } = useQuery({
    queryKey: ['hospital-allocation-history'],
    queryFn: () => getAllocationHistory().then((res) => res.data),
    refetchInterval: 10000,
  });

  const { data: detailData, isLoading: dLoading } = useQuery({
    queryKey: ['hospital-allocation-detail', selectedAllocId],
    queryFn: () => getHospitalAllocationDetail(selectedAllocId!).then((res) => res.data),
    enabled: !!selectedAllocId,
  });

  if (isLoading) {
    return <LoadingSpinner message="Loading hospital allocation history..." />;
  }

  const handleDownloadPdf = async (allocId: number, uid: string) => {
    try {
      toast.loading('Generating official allocation clearance PDF...', { id: 'pdf-toast' });
      await downloadHospitalAllocationPdf(allocId, `Allocation_Certificate_${uid}.pdf`);
      toast.success('Allocation certificate downloaded!', { id: 'pdf-toast' });
    } catch {
      toast.error('Failed to download allocation PDF', { id: 'pdf-toast' });
    }
  };

  const handleDownloadRecipientDossier = async (allocId: number, uid: string) => {
    try {
      toast.loading('Generating Recipient Information Dossier PDF...', { id: 'dossier-toast' });
      await downloadHospitalRecipientDossierPdf(allocId, `Recipient_Clinical_Dossier_${uid}.pdf`);
      toast.success('Recipient Dossier PDF downloaded!', { id: 'dossier-toast' });
    } catch {
      toast.error('Failed to download Recipient Dossier PDF', { id: 'dossier-toast' });
    }
  };

  const handlePreviewPdf = async (allocId: number, uid: string) => {
    try {
      const res = await fetch(`/api/hospital/allocations/${allocId}/pdf`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('access_token')}`,
        },
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setPdfModalUrl(url);
      setPdfModalTitle(`Allocation Certificate - ${uid}`);
    } catch {
      toast.error('Failed to preview PDF');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Hospital Allocation History & Transfer Dossiers</h1>
          <p className="text-sm text-gray-500 mt-1">
            Historical record of finalized organ allocations, recipient clinical dossiers for donor hospital, pre-dispatch protocols, and clearance PDFs
          </p>
        </div>
      </div>

      <div className="card space-y-4">
        {history.length === 0 ? (
          <EmptyState
            title="No Allocation History"
            message="No organ allocations have been finalized for this hospital yet."
            icon={<Clock className="w-12 h-12 text-gray-400" />}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/50">
                  <th className="table-header">Allocation UID</th>
                  <th className="table-header">Organ</th>
                  <th className="table-header">Hospital Role</th>
                  <th className="table-header">Donor Facility</th>
                  <th className="table-header">Recipient Facility</th>
                  <th className="table-header">Status</th>
                  <th className="table-header">Allocated At</th>
                  <th className="table-header text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {history.map((item: any) => (
                  <tr key={item.id} className="hover:bg-gray-50/70">
                    <td className="table-cell font-mono font-bold text-teal-700">
                      {item.allocation_uid}
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center gap-1">
                        <OrganBadge organ={item.organ_type} size="sm" />
                        <span className="font-mono text-2xs text-gray-400">{item.organ_uid}</span>
                      </div>
                    </td>
                    <td className="table-cell">
                      <span
                        className={`px-2 py-0.5 rounded text-2xs font-bold ${
                          item.role === 'donor_hospital'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {item.role === 'donor_hospital' ? 'Donor Hospital' : 'Recipient Hospital'}
                      </span>
                    </td>
                    <td className="table-cell text-gray-700">
                      <div>{item.donor_hospital}</div>
                      <div className="text-2xs text-gray-400">Donor: {item.donor_name}</div>
                    </td>
                    <td className="table-cell text-gray-700">
                      <div>{item.receiver_hospital || '—'}</div>
                      <div className="text-2xs text-gray-400">Recipient: {item.receiver_name || '—'}</div>
                    </td>
                    <td className="table-cell">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="table-cell text-gray-500">
                      {item.allocated_at ? new Date(item.allocated_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="table-cell text-right">
                      <div className="flex items-center justify-end gap-1.5 flex-wrap">
                        <button
                          onClick={() => handleDownloadRecipientDossier(item.id, item.allocation_uid)}
                          className="px-2.5 py-1 text-2xs font-semibold rounded-md border border-emerald-300 text-emerald-800 bg-emerald-50 hover:bg-emerald-100 inline-flex items-center gap-1 shadow-xs"
                          title="Download Recipient Clinical Information Dossier (PDF)"
                        >
                          <FileText className="w-3 h-3 text-emerald-600" /> Recipient Dossier (PDF)
                        </button>
                        <button
                          onClick={() => setDecisionRecordAllocId(item.id)}
                          className="px-2.5 py-1 text-2xs font-semibold rounded-md border border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 inline-flex items-center gap-1 shadow-xs"
                          title="View Cryptographically Signed Allocation Decision Record"
                        >
                          <FileCheck className="w-3 h-3 text-indigo-600" /> Decision Record
                        </button>
                        <button
                          onClick={() => setSelectedAllocId(item.id)}
                          className="btn-secondary text-2xs px-2.5 py-1 inline-flex items-center gap-1 text-gray-700"
                        >
                          <Eye className="w-3 h-3" /> Dossier
                        </button>
                        <button
                          onClick={() => handleDownloadPdf(item.id, item.allocation_uid)}
                          className="btn-primary text-2xs px-2.5 py-1 inline-flex items-center gap-1"
                          title="Download Official Allocation Certificate PDF"
                        >
                          <Download className="w-3 h-3" /> Certificate
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Allocation Dossier Modal */}
      {selectedAllocId && (
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-gray-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-teal-800 text-white flex-shrink-0">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-6 h-6 text-teal-300" />
                <div>
                  <h2 className="font-bold text-base">
                    {detailData?.allocation?.allocation_uid || 'Allocation Dossier'}
                  </h2>
                  <p className="text-2xs text-teal-200">
                    Official Organ Transfer Dossier • Status: {detailData?.allocation?.status}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    handleDownloadRecipientDossier(
                      selectedAllocId,
                      detailData?.allocation?.allocation_uid || `ALLOC-${selectedAllocId}`
                    )
                  }
                  className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold flex items-center gap-1.5"
                  title="Download Complete Recipient Clinical Dossier PDF"
                >
                  <FileText className="w-3.5 h-3.5" /> Recipient Dossier (PDF)
                </button>
                <button
                  onClick={() =>
                    handlePreviewPdf(
                      selectedAllocId,
                      detailData?.allocation?.allocation_uid || `ALLOC-${selectedAllocId}`
                    )
                  }
                  className="px-3 py-1.5 rounded-lg bg-teal-700 hover:bg-teal-600 text-white text-xs font-semibold flex items-center gap-1.5"
                >
                  <FileText className="w-3.5 h-3.5" /> View Certificate
                </button>
                <button
                  onClick={() =>
                    handleDownloadPdf(
                      selectedAllocId,
                      detailData?.allocation?.allocation_uid || `ALLOC-${selectedAllocId}`
                    )
                  }
                  className="px-3 py-1.5 rounded-lg bg-teal-700 hover:bg-teal-600 text-white text-xs font-semibold flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" /> Certificate PDF
                </button>
                <button
                  onClick={() => setSelectedAllocId(null)}
                  className="p-1.5 rounded-lg hover:bg-teal-700 text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {dLoading || !detailData ? (
                <LoadingSpinner message="Loading transfer dossier..." />
              ) : (
                <>
                  {/* Authorized Recipient Dossier for Donor Hospital */}
                  {detailData.receiver && (
                    <div className="p-4 rounded-xl bg-teal-50/70 border border-teal-200 space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-teal-200">
                        <div className="flex items-center gap-2 text-teal-900 font-bold text-sm">
                          <UserCheck className="w-5 h-5 text-teal-700" />
                          <span>Authorized Recipient Clinical Profile</span>
                        </div>
                        <span className="text-2xs font-bold px-2 py-0.5 rounded bg-teal-200 text-teal-900">
                          Shared with Donor Hospital Team
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        <div>
                          <span className="text-gray-500">Recipient Name & ID:</span>
                          <p className="font-bold text-gray-900 mt-0.5">{detailData.receiver.name}</p>
                          <p className="font-mono text-2xs text-gray-400">{detailData.receiver.uid}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Age & Gender:</span>
                          <p className="font-medium text-gray-900 mt-0.5">
                            {detailData.receiver.age} yrs, {detailData.receiver.gender}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-500">ABO Blood Group:</span>
                          <p className="font-mono font-bold text-teal-800 mt-0.5">
                            {detailData.receiver.blood_group}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-500">Recipient Hospital Contact:</span>
                          <p className="font-medium text-gray-900 mt-0.5 flex items-center gap-1">
                            <Phone className="w-3.5 h-3.5 text-gray-400" />
                            {detailData.receiver.hospital_contact || 'Direct Coordination Line'}
                          </p>
                        </div>
                      </div>

                      {detailData.receiver.medical_info && (
                        <div className="pt-2 border-t border-teal-200 text-xs">
                          <span className="text-gray-500 font-medium">Clinical Summary:</span>
                          <p className="text-gray-800 mt-0.5">{detailData.receiver.medical_info}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Pre-Dispatch & Cold Ischemia Logistics Advisory */}
                  <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-2">
                    <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
                      <AlertTriangle className="w-5 h-5 text-amber-600" />
                      <span>Pre-Dispatch & Cold Ischemia Time Protocol</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-amber-900 pt-1">
                      <div>
                        <span className="font-semibold">Maximum Allowable Cold Ischemia:</span>{' '}
                        <strong className="text-teal-800">{detailData.pre_dispatch_info?.max_cold_ischemia_time}</strong>
                      </div>
                      <div>
                        <span className="font-semibold">Emergency Coordinator Hotline:</span>{' '}
                        <strong>{detailData.pre_dispatch_info?.emergency_coordinator_line}</strong>
                      </div>
                      <div className="sm:col-span-2">
                        <span className="font-semibold">Packaging Protocol:</span>{' '}
                        <span>{detailData.pre_dispatch_info?.packaging_protocol}</span>
                      </div>
                      <div className="sm:col-span-2">
                        <span className="font-semibold">Required Handover Documentation:</span>{' '}
                        <span>{detailData.pre_dispatch_info?.required_documentation}</span>
                      </div>
                    </div>
                  </div>

                  {/* Facility Details */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-2 text-xs">
                      <div className="font-bold text-gray-900 flex items-center gap-1.5 pb-2 border-b border-gray-200">
                        <Heart className="w-4 h-4 text-rose-500" /> Donor Facility Information
                      </div>
                      <div><strong>Hospital:</strong> {detailData.donor?.hospital}</div>
                      <div><strong>Donor:</strong> {detailData.donor?.name} ({detailData.donor?.uid})</div>
                      <div><strong>Blood Group:</strong> {detailData.donor?.blood_group}</div>
                      <div><strong>Organ:</strong> {detailData.organ?.organ_type} ({detailData.organ?.organ_uid})</div>
                      <div><strong>Organ Viability:</strong> {detailData.organ?.organ_condition || 'Viable'}</div>
                    </div>

                    <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-2 text-xs">
                      <div className="font-bold text-gray-900 flex items-center gap-1.5 pb-2 border-b border-gray-200">
                        <Activity className="w-4 h-4 text-blue-500" /> Recipient Center Information
                      </div>
                      <div><strong>Hospital:</strong> {detailData.receiver?.hospital || 'Pending'}</div>
                      <div><strong>Recipient:</strong> {detailData.receiver?.name ? `${detailData.receiver?.name} (${detailData.receiver?.uid})` : 'Pending'}</div>
                      <div><strong>Urgency:</strong> {detailData.receiver?.urgency_level || 'HIGH'}</div>
                      <div><strong>Priority Rank:</strong> Priority #{detailData.allocation?.priority_number || 1}</div>
                    </div>
                  </div>

                  {/* Event History Timeline */}
                  {detailData.history?.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="font-semibold text-xs uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                        <History className="w-4 h-4" /> Allocation Audit Timeline
                      </h3>
                      <div className="space-y-2">
                        {detailData.history.map((h: any, idx: number) => (
                          <div key={idx} className="p-2.5 bg-gray-50 rounded-lg border border-gray-100 text-xs flex items-start gap-2.5">
                            <span className="w-2 h-2 rounded-full bg-teal-600 mt-1 shrink-0" />
                            <div className="flex-1">
                              <span className="font-semibold text-gray-900">{h.event_type}</span> — <span className="text-gray-600">{h.description}</span>
                              <div className="text-2xs text-gray-400 mt-0.5">
                                By {h.performed_by || 'System'} • {new Date(h.timestamp).toLocaleString()}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between flex-shrink-0">
              <span className="text-2xs text-gray-500">Official National Organ Allocation Record</span>
              <button
                onClick={() => setSelectedAllocId(null)}
                className="btn-secondary text-xs px-4 py-1.5"
              >
                Close Dossier
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PDF Document Preview Modal */}
      <DocumentModal
        isOpen={!!pdfModalUrl}
        onClose={() => {
          if (pdfModalUrl) URL.revokeObjectURL(pdfModalUrl);
          setPdfModalUrl(null);
        }}
        title={pdfModalTitle}
        pdfBlobUrl={pdfModalUrl}
        downloadFilename={`${pdfModalTitle.replace(/\s+/g, '_')}.pdf`}
      />

      {/* Cryptographically Signed Allocation Decision Record Modal */}
      {decisionRecordAllocId && (
        <AllocationDecisionRecordModal
          isOpen={!!decisionRecordAllocId}
          allocationId={decisionRecordAllocId}
          onClose={() => setDecisionRecordAllocId(null)}
        />
      )}
    </div>
  );
}
