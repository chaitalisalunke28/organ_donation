import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { XCircle, AlertCircle, Building2 } from 'lucide-react';
import { getRejectionHistory } from '../../api';
import OrganBadge from '../../components/OrganBadge';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';

export default function RejectionHistory() {
  const { data: rejections = [], isLoading } = useQuery({
    queryKey: ['coordinator-rejection-history'],
    queryFn: () => getRejectionHistory().then((res) => res.data),
    refetchInterval: 10000,
  });

  if (isLoading) {
    return <LoadingSpinner message="Loading organ rejection audits..." />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Organ Offer Rejection Audit Log</h1>
        <p className="text-sm text-gray-500 mt-1">
          Historical record of declined organ offers, mandatory rejection reasons, and clinical notes across all hospitals
        </p>
      </div>

      <div className="card space-y-4">
        {rejections.length === 0 ? (
          <EmptyState
            title="No Rejections Logged"
            message="No hospital has rejected an organ offer so far."
            icon={<XCircle className="w-12 h-12 text-gray-400" />}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/50">
                  <th className="table-header">Organ</th>
                  <th className="table-header">Declining Candidate</th>
                  <th className="table-header">Hospital Facility</th>
                  <th className="table-header">Priority Rank</th>
                  <th className="table-header">Mandatory Rejection Reason</th>
                  <th className="table-header">Clinical Explanation</th>
                  <th className="table-header">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rejections.map((r: any) => (
                  <tr key={r.id} className="hover:bg-gray-50/70">
                    <td className="table-cell">
                      <div className="flex items-center gap-1.5">
                        <OrganBadge organ={r.organ_type} size="sm" />
                        <span className="font-mono text-2xs text-gray-400">{r.organ_uid}</span>
                      </div>
                    </td>
                    <td className="table-cell font-medium text-gray-900">
                      <div>{r.receiver_name}</div>
                      <div className="text-2xs text-gray-400 font-mono">{r.receiver_uid}</div>
                    </td>
                    <td className="table-cell text-gray-700">{r.hospital_name}</td>
                    <td className="table-cell">
                      <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 font-bold text-2xs border border-rose-200">
                        Priority #{r.priority_number}
                      </span>
                    </td>
                    <td className="table-cell font-semibold text-rose-700">
                      {r.rejection_reason}
                    </td>
                    <td className="table-cell text-gray-600 max-w-xs">
                      {r.rejection_notes || '—'}
                    </td>
                    <td className="table-cell text-gray-400">
                      {new Date(r.responded_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
