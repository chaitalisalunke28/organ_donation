import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { AlertTriangle, Eye, Heart, Building2 } from 'lucide-react';
import { getAllocations, getAvailableOrgans } from '../../api';
import StatusBadge from '../../components/StatusBadge';
import OrganBadge from '../../components/OrganBadge';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';

export default function UnallocatedOrgans() {
  const { data: unallocatedAllocations = [], isLoading: aLoading } = useQuery({
    queryKey: ['coordinator-unallocated-allocations'],
    queryFn: () => getAllocations('UNALLOCATED').then((res) => res.data),
  });

  const { data: unallocatedOrgans = [], isLoading: oLoading } = useQuery({
    queryKey: ['coordinator-unallocated-organs'],
    queryFn: () => getAvailableOrgans({ status_filter: 'UNALLOCATED' }).then((res) => res.data),
  });

  if (aLoading || oLoading) {
    return <LoadingSpinner message="Loading unallocated organ records..." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Unallocated Organs Record</h1>
          <p className="text-sm text-gray-500 mt-1">
            Auditable log of organs where all eligible candidates were sequentially exhausted or rejected
          </p>
        </div>
        <span className="badge-unallocated text-xs px-3 py-1 font-bold">
          Candidates Exhausted
        </span>
      </div>

      <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">Clinical Audit Rule:</span> In accordance with transplant allocation policy, when all sequential priority candidates on the waiting list decline or are clinically unavailable, the organ is preserved in the database with status <code className="bg-white px-1 py-0.5 rounded font-mono font-bold">UNALLOCATED</code> alongside all mandatory rejection reasons for regulatory auditing.
        </div>
      </div>

      <div className="card space-y-4">
        {unallocatedAllocations.length === 0 && unallocatedOrgans.length === 0 ? (
          <EmptyState
            title="No Unallocated Organs"
            message="All organ match workflows have either resulted in active allocations or are still in progress."
            icon={<Heart className="w-12 h-12 text-gray-400" />}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/50">
                  <th className="table-header">Allocation UID</th>
                  <th className="table-header">Organ Type & UID</th>
                  <th className="table-header">Donor Facility</th>
                  <th className="table-header">Donor Blood Group</th>
                  <th className="table-header">Status</th>
                  <th className="table-header">Rejection Count</th>
                  <th className="table-header text-right">View Audit Dossier</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {unallocatedAllocations.map((a: any) => (
                  <tr key={a.id} className="hover:bg-gray-50/70">
                    <td className="table-cell font-mono font-bold text-rose-700">
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
                    <td className="table-cell">
                      <span className="inline-flex px-2 py-0.5 rounded bg-gray-100 font-mono font-bold text-xs">
                        {a.donor_blood_group || 'O+'}
                      </span>
                    </td>
                    <td className="table-cell">
                      <StatusBadge status={a.status} />
                    </td>
                    <td className="table-cell text-rose-600 font-bold">
                      {a.rejection_count || 1} Rejection(s)
                    </td>
                    <td className="table-cell text-right">
                      <Link
                        to={`/coordinator/allocations/${a.id}`}
                        className="btn-secondary text-2xs px-2.5 py-1 inline-flex items-center gap-1 text-rose-700"
                      >
                        <Eye className="w-3 h-3" /> Audit Dossier
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
