import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Inbox,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  Check,
  X,
  Building2,
  ShieldCheck,
  Activity,
  SlidersHorizontal,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  getAllocationRequests,
  respondToOffer,
  updateHospitalReadiness,
  getHospitalReadiness,
} from '../../api';
import StatusBadge from '../../components/StatusBadge';
import OrganBadge from '../../components/OrganBadge';
import LoadingSpinner from '../../components/LoadingSpinner';
import ReadinessBadge from '../../components/ReadinessBadge';

export default function AllocationRequests() {
  const queryClient = useQueryClient();

  // Reject modal state
  const [rejectingOfferId, setRejectingOfferId] = useState<number | null>(null);
  const [rejectionReason, setRejectionReason] = useState('Patient condition changed');
  const [rejectionNotes, setRejectionNotes] = useState('');

  // Accept & Readiness Modal State (Phase 5)
  const [acceptingOffer, setAcceptingOffer] = useState<any | null>(null);
  const [readinessChecklist, setReadinessChecklist] = useState({
    hospital_verified: true,
    recipient_ready: true,
    icu_available: true,
    ot_available: true,
    surgeon_available: true,
    transplant_team_available: true,
    required_equipment: true,
    blood_bank_ready: true,
    recipient_present: true,
    documents_complete: true,
    estimated_prep_minutes: 30,
    bottleneck_notes: '',
  });

  const { data: offers = [], isLoading } = useQuery({
    queryKey: ['allocation-requests'],
    queryFn: () => getAllocationRequests().then((res) => res.data),
    refetchInterval: 10000,
  });

  const respondMutation = useMutation({
    mutationFn: async ({
      offerId,
      action,
      reason,
      notes,
      readiness,
    }: {
      offerId: number;
      action: 'ACCEPT' | 'REJECT';
      reason?: string;
      notes?: string;
      readiness?: any;
    }) => {
      if (action === 'ACCEPT' && readiness && acceptingOffer) {
        await updateHospitalReadiness({
          patient_id: acceptingOffer.receiver_id,
          offer_id: offerId,
          ...readiness,
        });
      }
      return respondToOffer(offerId, action, reason, notes);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['allocation-requests'] });
      queryClient.invalidateQueries({ queryKey: ['hospital-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['hospital-patients'] });
      if (variables.action === 'ACCEPT') {
        toast.success('Organ offer ACCEPTED & 10-point Readiness Checklist verified!');
      } else {
        toast.success('Organ offer REJECTED. Recorded in allocation record and coordinator notified.');
      }
      setRejectingOfferId(null);
      setAcceptingOffer(null);
      setRejectionNotes('');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || 'Failed to submit response');
    },
  });

  const handleConfirmAccept = () => {
    if (!acceptingOffer) return;
    respondMutation.mutate({
      offerId: acceptingOffer.id,
      action: 'ACCEPT',
      readiness: readinessChecklist,
    });
  };

  const handleReject = () => {
    if (!rejectingOfferId) return;
    respondMutation.mutate({
      offerId: rejectingOfferId,
      action: 'REJECT',
      reason: rejectionReason,
      notes: rejectionNotes,
    });
  };

  const toggleChecklistItem = (key: keyof typeof readinessChecklist) => {
    setReadinessChecklist((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  if (isLoading) {
    return <LoadingSpinner message="Loading incoming organ offers..." />;
  }

  const pendingOffers = offers.filter((o: any) => o.status === 'PENDING');
  const resolvedOffers = offers.filter((o: any) => o.status !== 'PENDING');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Incoming Allocation Requests</h1>
        <p className="text-sm text-gray-500 mt-1">
          Review sequential organ match offers for your registered eligible recipients and submit operational readiness
        </p>
      </div>

      {/* Pending Offers (Action Required) */}
      <div className="card space-y-4 border-l-4 border-l-orange-500">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2 font-semibold text-gray-900">
            <Inbox className="w-5 h-5 text-orange-500" />
            <span>Active Offers Requiring Decision ({pendingOffers.length})</span>
          </div>
          <span className="text-xs text-orange-600 font-semibold bg-orange-50 px-2.5 py-1 rounded-full">
            Action Required
          </span>
        </div>

        {pendingOffers.length === 0 ? (
          <p className="text-xs text-gray-400 py-6 text-center">
            No pending organ offers at this time.
          </p>
        ) : (
          <div className="space-y-4">
            {pendingOffers.map((offer: any) => (
              <div
                key={offer.id}
                className="p-5 bg-orange-50/40 rounded-xl border border-orange-200 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <OrganBadge organ={offer.organ_type} size="sm" />
                    <span className="text-xs font-mono text-gray-500">UID: {offer.organ_uid}</span>
                    <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-xs font-bold">
                      Priority #{offer.priority_number}
                    </span>
                  </div>

                  <div className="text-sm font-semibold text-gray-900">
                    Offered for Recipient: <span className="text-teal-700">{offer.receiver_name}</span> ({offer.receiver_uid})
                  </div>

                  <div className="text-xs text-gray-600">
                    Condition: <em>{offer.organ_condition || 'Standard donor organ assessment'}</em>
                  </div>

                  <div className="text-2xs text-gray-400 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    Offer received on {new Date(offer.created_at).toLocaleString()}
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <button
                    onClick={() => setAcceptingOffer(offer)}
                    disabled={respondMutation.isPending}
                    className="btn-success text-xs px-4 py-2 inline-flex items-center gap-1.5 shadow-xs"
                  >
                    <Check className="w-4 h-4" /> Review & Accept Offer
                  </button>

                  <button
                    onClick={() => setRejectingOfferId(offer.id)}
                    disabled={respondMutation.isPending}
                    className="btn-danger text-xs px-4 py-2 inline-flex items-center gap-1.5"
                  >
                    <X className="w-4 h-4" /> Reject Organ
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Past / Resolved Offers */}
      <div className="card space-y-4">
        <h2 className="text-base font-semibold text-gray-900 pb-3 border-b border-gray-100">
          Response History ({resolvedOffers.length})
        </h2>

        {resolvedOffers.length === 0 ? (
          <p className="text-xs text-gray-400 py-6 text-center">No past responses recorded.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/50">
                  <th className="table-header">Organ</th>
                  <th className="table-header">Recipient</th>
                  <th className="table-header">Priority</th>
                  <th className="table-header">Status</th>
                  <th className="table-header">Reason / Notes</th>
                  <th className="table-header">Responded At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {resolvedOffers.map((o: any) => (
                  <tr key={o.id} className="hover:bg-gray-50/70">
                    <td className="table-cell">
                      <OrganBadge organ={o.organ_type} size="sm" />
                    </td>
                    <td className="table-cell font-medium text-gray-900">{o.receiver_name}</td>
                    <td className="table-cell">Priority #{o.priority_number}</td>
                    <td className="table-cell">
                      <StatusBadge status={o.status} />
                    </td>
                    <td className="table-cell text-gray-600 max-w-xs truncate">
                      {o.rejection_reason ? `${o.rejection_reason} ${o.rejection_notes ? `(${o.rejection_notes})` : ''}` : 'Accepted for transplant'}
                    </td>
                    <td className="table-cell text-gray-400">
                      {o.responded_at ? new Date(o.responded_at).toLocaleString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Reject Modal */}
      {rejectingOfferId && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center gap-2 text-rose-600 font-bold text-lg">
              <AlertCircle className="w-6 h-6" />
              <span>Reject Organ Offer</span>
            </div>

            <p className="text-xs text-gray-500">
              A rejection reason is mandatory. The Transplant Coordinator will be notified and the organ will automatically proceed to the next priority candidate.
            </p>

            <div className="space-y-3">
              <div>
                <label className="label text-xs">Mandatory Rejection Category *</label>
                <select
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="input text-xs"
                >
                  <option value="Patient condition changed">Patient condition changed</option>
                  <option value="Patient unavailable">Patient unavailable</option>
                  <option value="Hospital not ready">Hospital not ready / OR occupied</option>
                  <option value="Medical reason">Clinical / Crossmatch reason</option>
                  <option value="Patient declined">Patient declined offer</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="label text-xs">Clinical Explanation / Notes</label>
                <textarea
                  rows={3}
                  placeholder="Additional details regarding rejection..."
                  value={rejectionNotes}
                  onChange={(e) => setRejectionNotes(e.target.value)}
                  className="input text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setRejectingOfferId(null)}
                className="btn-secondary text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={respondMutation.isPending}
                className="btn-danger text-xs inline-flex items-center gap-1.5"
              >
                <XCircle className="w-4 h-4" />
                {respondMutation.isPending ? 'Recording...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Accept Offer & 10-Point Operational Readiness Verification Modal (Phase 5) */}
      {acceptingOffer && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2 text-teal-700 font-bold text-lg">
                <ShieldCheck className="w-6 h-6 text-teal-600" />
                <span>Operational Readiness & Offer Acceptance</span>
              </div>
              <button
                onClick={() => setAcceptingOffer(null)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-gray-600">
              Please verify your facility's 10 operational feasibility dimensions for recipient{' '}
              <strong className="text-gray-900">{acceptingOffer.receiver_name}</strong> ({acceptingOffer.receiver_uid}):
            </p>

            {/* 10-Point Checklist Form */}
            <div className="space-y-2 text-xs">
              {[
                { label: 'Hospital Accreditation & Transplant Licensing Active', key: 'hospital_verified' },
                { label: 'Recipient Medically Stable, Fasted & Cleared', key: 'recipient_ready' },
                { label: 'Dedicated Post-Op ICU Bed Reserved', key: 'icu_available' },
                { label: 'Transplant Operating Theatre Prepped & Scheduled', key: 'ot_available' },
                { label: 'Lead Transplant Surgeon Confirmed Available', key: 'surgeon_available' },
                { label: 'Surgical, Anesthesia & Nursing Team Assembled', key: 'transplant_team_available' },
                { label: 'Cold Perfusion Apparatus & Sterilized Kits Ready', key: 'required_equipment' },
                { label: 'Cross-Matched PRBCs & Platelets Reserved in Blood Bank', key: 'blood_bank_ready' },
                { label: 'Recipient Admitted / On-Site Transit Confirmed', key: 'recipient_present' },
                { label: 'Legal Authorizations & Consent Affidavits Complete', key: 'documents_complete' },
              ].map((item, idx) => {
                const isChecked = readinessChecklist[item.key as keyof typeof readinessChecklist] as boolean;
                return (
                  <label
                    key={idx}
                    className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                      isChecked
                        ? 'bg-teal-50/50 border-teal-200 text-teal-950 font-medium'
                        : 'bg-gray-50 border-gray-200 text-gray-600 opacity-70'
                    }`}
                  >
                    <span>{item.label}</span>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleChecklistItem(item.key as keyof typeof readinessChecklist)}
                      className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 border-gray-300"
                    />
                  </label>
                );
              })}
            </div>

            <div className="pt-2 border-t border-gray-100 flex items-center justify-end gap-3">
              <button
                onClick={() => setAcceptingOffer(null)}
                className="btn-secondary text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAccept}
                disabled={respondMutation.isPending}
                className="btn-success text-xs px-5 py-2 inline-flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                {respondMutation.isPending ? 'Submitting...' : 'Confirm Readiness & Accept Offer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
