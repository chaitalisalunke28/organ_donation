import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Inbox, Clock, CheckCircle2, XCircle, Search, Filter } from 'lucide-react';
import toast from 'react-hot-toast';
import { getOffers, expireOffer } from '../../api';
import StatusBadge from '../../components/StatusBadge';
import OrganBadge from '../../components/OrganBadge';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';

export default function ActiveOffers() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  const { data: offers = [], isLoading } = useQuery({
    queryKey: ['coordinator-offers', statusFilter],
    queryFn: () => getOffers(statusFilter !== 'ALL' ? statusFilter : undefined).then((res) => res.data),
    refetchInterval: 10000,
  });

  const expireMutation = useMutation({
    mutationFn: (offerId: number) => expireOffer(offerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coordinator-offers'] });
      queryClient.invalidateQueries({ queryKey: ['coordinator-dashboard'] });
      toast.success('Offer expired by coordinator');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || 'Failed to expire offer');
    },
  });

  const statusOptions = ['ALL', 'PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED'];

  const filteredOffers = offers.filter(
    (o: any) =>
      (o.receiver_name && o.receiver_name.toLowerCase().includes(search.toLowerCase())) ||
      (o.hospital_name && o.hospital_name.toLowerCase().includes(search.toLowerCase())) ||
      (o.organ_uid && o.organ_uid.toLowerCase().includes(search.toLowerCase()))
  );

  if (isLoading) {
    return <LoadingSpinner message="Loading central offer queue..." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sequential Organ Match Offers</h1>
          <p className="text-sm text-gray-500 mt-1">
            Real-time tracking of single-hospital sequential offers, response timeouts, and rejection audits
          </p>
        </div>

        <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-gray-200 overflow-x-auto">
          <Filter className="w-4 h-4 text-gray-400 ml-2" />
          {statusOptions.map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                statusFilter === st
                  ? 'bg-orange-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      <div className="card space-y-4">
        <div className="flex items-center justify-between gap-4 pb-4 border-b border-gray-100">
          <div className="relative max-w-sm w-full">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search candidate, hospital, organ UID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-9 text-xs"
            />
          </div>
          <span className="text-xs text-gray-500">
            Total Offers: <strong>{filteredOffers.length}</strong>
          </span>
        </div>

        {filteredOffers.length === 0 ? (
          <EmptyState
            title="No Offers Found"
            message="No sequential match offers found under this status filter."
            icon={<Inbox className="w-12 h-12 text-gray-400" />}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/50">
                  <th className="table-header">Organ</th>
                  <th className="table-header">Offered Candidate</th>
                  <th className="table-header">Candidate Hospital</th>
                  <th className="table-header">Priority Rank</th>
                  <th className="table-header">Status</th>
                  <th className="table-header">Rejection Reason / Notes</th>
                  <th className="table-header">Offered Time</th>
                  <th className="table-header text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredOffers.map((o: any) => (
                  <tr key={o.id} className="hover:bg-gray-50/70">
                    <td className="table-cell">
                      <div className="flex items-center gap-1.5">
                        <OrganBadge organ={o.organ_type} size="sm" />
                        <span className="font-mono text-2xs text-gray-400">{o.organ_uid}</span>
                      </div>
                    </td>
                    <td className="table-cell">
                      <div className="font-semibold text-gray-900">{o.receiver_name}</div>
                      <div className="text-2xs text-gray-400 font-mono">{o.receiver_uid}</div>
                    </td>
                    <td className="table-cell text-gray-700">{o.hospital_name}</td>
                    <td className="table-cell">
                      <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-bold text-2xs">
                        Priority #{o.priority_number}
                      </span>
                    </td>
                    <td className="table-cell">
                      <StatusBadge status={o.status} />
                    </td>
                    <td className="table-cell text-gray-600 max-w-xs truncate">
                      {o.rejection_reason ? (
                        <div>
                          <span className="font-semibold text-rose-700">{o.rejection_reason}</span>
                          {o.rejection_notes && <p className="text-2xs text-gray-400 mt-0.5">{o.rejection_notes}</p>}
                        </div>
                      ) : o.status === 'ACCEPTED' ? (
                        <span className="text-green-700 font-semibold">Accepted for transplant</span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="table-cell text-gray-500">
                      {new Date(o.created_at).toLocaleString()}
                    </td>
                    <td className="table-cell text-right">
                      {o.status === 'PENDING' && (
                        <button
                          onClick={() => expireMutation.mutate(o.id)}
                          disabled={expireMutation.isPending}
                          className="btn-danger text-2xs px-2 py-1 inline-flex items-center gap-1"
                        >
                          <Clock className="w-3 h-3" /> Expire
                        </button>
                      )}
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
