import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { CheckCircle2, Eye, Heart, Building2 } from 'lucide-react';
import { getAllocations } from '../../api';
import StatusBadge from '../../components/StatusBadge';
import OrganBadge from '../../components/OrganBadge';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';

export default function CompletedAllocations() {
  const { data: allocations = [], isLoading } = useQuery({
    queryKey: ['coordinator-completed-allocations'],
    queryFn: () => getAllocations('COMPLETED').then((res) => res.data),
  });

  if (isLoading) {
    return <LoadingSpinner message="Loading completed transplant records..." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Completed Transplant Allocations</h1>
          <p className="text-sm text-gray-500 mt-1">
            Archived record of all successfully coordinated and completed organ allocations
          </p>
        </div>
        <span className="badge-completed text-xs px-3 py-1 font-bold">
          {allocations.length} Transplants Finalized
        </span>
      </div>

      <div className="card space-y-4">
        {allocations.length === 0 ? (
          <EmptyState
            title="No Completed Allocations"
            message="No organ allocations have reached COMPLETED status yet."
            icon={<CheckCircle2 className="w-12 h-12 text-gray-400" />}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/50">
                  <th className="table-header">Allocation UID</th>
                  <th className="table-header">Organ</th>
                  <th className="table-header">Donor Center</th>
                  <th className="table-header">Recipient Center</th>
                  <th className="table-header">Priority Rank</th>
                  <th className="table-header">Status</th>
                  <th className="table-header">Allocated Date</th>
                  <th className="table-header">Completion Date</th>
                  <th className="table-header text-right">View</th>
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
                      <div>{a.receiver_hospital}</div>
                      <div className="text-2xs text-gray-400">Recipient: {a.receiver_name}</div>
                    </td>
                    <td className="table-cell">
                      <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-bold text-2xs">
                        Priority #{a.priority_number}
                      </span>
                    </td>
                    <td className="table-cell">
                      <StatusBadge status={a.status} />
                    </td>
                    <td className="table-cell text-gray-500">
                      {a.allocated_at ? new Date(a.allocated_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="table-cell text-gray-500">
                      {a.completed_at ? new Date(a.completed_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="table-cell text-right">
                      <Link
                        to={`/coordinator/allocations/${a.id}`}
                        className="btn-secondary text-2xs px-2.5 py-1 inline-flex items-center gap-1"
                      >
                        <Eye className="w-3 h-3" /> Record
                      </Link>
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
