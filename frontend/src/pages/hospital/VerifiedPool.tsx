import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileCheck, Filter, Heart, Activity } from 'lucide-react';
import { getVerifiedPool } from '../../api';
import StatusBadge from '../../components/StatusBadge';
import OrganBadge from '../../components/OrganBadge';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function VerifiedPool() {
  const [organFilter, setOrganFilter] = useState('ALL');

  const { data, isLoading } = useQuery({
    queryKey: ['verified-pool', organFilter],
    queryFn: () => getVerifiedPool(organFilter).then((res) => res.data),
  });

  const { eligible_donors = [], eligible_receivers = [] } = data || {};

  const organOptions = ['ALL', 'KIDNEY', 'LIVER', 'HEART', 'LUNG', 'PANCREAS'];

  if (isLoading) {
    return <LoadingSpinner message="Loading verified donor & recipient pool..." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Verified Donors & Receivers</h1>
          <p className="text-sm text-gray-500 mt-1">
            Confirmed eligible patients with complete structured data and verified supporting medical reports
          </p>
        </div>

        {/* Organ Filter */}
        <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-gray-200 overflow-x-auto">
          <Filter className="w-4 h-4 text-gray-400 ml-2" />
          {organOptions.map((org) => (
            <button
              key={org}
              onClick={() => setOrganFilter(org)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                organFilter === org
                  ? 'bg-teal-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {org}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Verified Eligible Donors */}
        <div className="card space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2 font-semibold text-gray-900">
              <Heart className="w-5 h-5 text-rose-500" />
              <span>Eligible Donors ({eligible_donors.length})</span>
            </div>
            <span className="badge-eligible">Verified Pool</span>
          </div>

          {eligible_donors.length === 0 ? (
            <p className="text-xs text-gray-400 py-8 text-center">
              No eligible donors found for this organ filter.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50/50">
                    <th className="table-header">Donor ID</th>
                    <th className="table-header">Name</th>
                    <th className="table-header">Blood Group</th>
                    <th className="table-header">Organs</th>
                    <th className="table-header">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {eligible_donors.map((d: any) => (
                    <tr key={d.id} className="hover:bg-gray-50/70">
                      <td className="table-cell font-mono font-bold text-teal-700">{d.patient_uid}</td>
                      <td className="table-cell font-medium text-gray-900">{d.name}</td>
                      <td className="table-cell">
                        <span className="inline-flex px-1.5 py-0.5 rounded bg-gray-100 font-mono font-bold text-xs">
                          {d.blood_group}
                        </span>
                      </td>
                      <td className="table-cell">
                        <div className="flex flex-wrap gap-1">
                          {d.organs?.map((o: any) => (
                            <OrganBadge key={o.organ_uid} organ={o.organ_type} size="sm" />
                          ))}
                        </div>
                      </td>
                      <td className="table-cell">
                        <StatusBadge status={d.eligibility_status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Verified Eligible Receivers */}
        <div className="card space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2 font-semibold text-gray-900">
              <Activity className="w-5 h-5 text-blue-500" />
              <span>Eligible Receivers ({eligible_receivers.length})</span>
            </div>
            <span className="badge-eligible">Verified Pool</span>
          </div>

          {eligible_receivers.length === 0 ? (
            <p className="text-xs text-gray-400 py-8 text-center">
              No eligible receivers found for this organ filter.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50/50">
                    <th className="table-header">Receiver ID</th>
                    <th className="table-header">Name</th>
                    <th className="table-header">Blood Group</th>
                    <th className="table-header">Organ / Urgency</th>
                    <th className="table-header">Waiting</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {eligible_receivers.map((r: any) => (
                    <tr key={r.id} className="hover:bg-gray-50/70">
                      <td className="table-cell font-mono font-bold text-blue-700">{r.patient_uid}</td>
                      <td className="table-cell font-medium text-gray-900">{r.name}</td>
                      <td className="table-cell">
                        <span className="inline-flex px-1.5 py-0.5 rounded bg-gray-100 font-mono font-bold text-xs">
                          {r.blood_group}
                        </span>
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center gap-1.5">
                          {r.required_organ && <OrganBadge organ={r.required_organ} size="sm" />}
                          <StatusBadge status={r.urgency_level || 'MEDIUM'} />
                        </div>
                      </td>
                      <td className="table-cell font-medium text-gray-700">
                        {r.waiting_days} <span className="text-gray-400 font-normal">days</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
