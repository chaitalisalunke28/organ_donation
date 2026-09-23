import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Activity, Search, Filter, Building2, Clock } from 'lucide-react';
import { getEligibleReceivers } from '../../api';
import StatusBadge from '../../components/StatusBadge';
import OrganBadge from '../../components/OrganBadge';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';

export default function EligibleReceivers() {
  const [organFilter, setOrganFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  const { data: receivers = [], isLoading } = useQuery({
    queryKey: ['coordinator-eligible-receivers', organFilter],
    queryFn: () => getEligibleReceivers(organFilter).then((res) => res.data),
  });

  const organOptions = ['ALL', 'KIDNEY', 'LIVER', 'HEART', 'LUNG', 'PANCREAS'];

  const filteredReceivers = receivers.filter(
    (r: any) =>
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.hospital_name.toLowerCase().includes(search.toLowerCase()) ||
      (r.patient_uid && r.patient_uid.toLowerCase().includes(search.toLowerCase()))
  );

  if (isLoading) {
    return <LoadingSpinner message="Loading verified eligible recipients..." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Verified Recipient Waiting List</h1>
          <p className="text-sm text-gray-500 mt-1">
            Active verified candidates across all facilities ranked by compatibility and urgency scoring
          </p>
        </div>

        <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-gray-200 overflow-x-auto">
          <Filter className="w-4 h-4 text-gray-400 ml-2" />
          {organOptions.map((org) => (
            <button
              key={org}
              onClick={() => setOrganFilter(org)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                organFilter === org
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {org}
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
              placeholder="Search recipient name, hospital, or ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-9 text-xs"
            />
          </div>
          <span className="text-xs text-gray-500">
            Total Waiting: <strong>{filteredReceivers.length}</strong> candidates
          </span>
        </div>

        {filteredReceivers.length === 0 ? (
          <EmptyState
            title="No Eligible Recipients"
            message="No verified eligible recipients registered under this filter."
            icon={<Activity className="w-12 h-12 text-gray-400" />}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/50">
                  <th className="table-header">Recipient</th>
                  <th className="table-header">Center & ABO</th>
                  <th className="table-header">Required Organ</th>
                  <th className="table-header">Dialysis Vintage</th>
                  <th className="table-header">Sensitization (CPRA / PRA)</th>
                  <th className="table-header">Clinical Urgency</th>
                  <th className="table-header">Special Priority</th>
                  <th className="table-header">Wait Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredReceivers.map((r: any) => (
                  <tr key={r.id} className="hover:bg-gray-50/70">
                    <td className="table-cell">
                      <div className="font-semibold text-gray-900">{r.name}</div>
                      <div className="text-2xs font-mono text-blue-700">{r.patient_uid || `R-${r.id}`} • {r.age}y {r.gender}</div>
                    </td>
                    <td className="table-cell text-gray-700">
                      <div className="flex items-center gap-1 font-medium text-gray-900">
                        <Building2 className="w-3.5 h-3.5 text-gray-400" />
                        <span>{r.hospital_name}</span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="inline-flex px-1.5 py-0.2 rounded bg-gray-100 font-mono font-bold text-2xs">
                          {r.blood_group}
                        </span>
                        {r.height_cm && r.weight_kg && (
                          <span className="text-3xs text-gray-500">
                            BMI {+(r.weight_kg / Math.pow(r.height_cm / 100, 2)).toFixed(1)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="table-cell">
                      {r.required_organ && <OrganBadge organ={r.required_organ} size="sm" />}
                    </td>
                    <td className="table-cell text-gray-700">
                      <div className="font-medium text-xs">{r.dialysis_status || 'Pre-emptive'}</div>
                      {r.dialysis_duration_months && (
                        <div className="text-2xs text-gray-500">{r.dialysis_duration_months} mo vintage</div>
                      )}
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center gap-1">
                        <span className="text-2xs font-bold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-100">
                          CPRA: {r.cpra ?? 0}%
                        </span>
                        {r.pra && (
                          <span className="text-3xs text-gray-400">({r.pra}%)</span>
                        )}
                      </div>
                      {r.hla_typing && (
                        <div className="text-3xs text-gray-400 font-mono truncate max-w-xs mt-0.5">
                          {r.hla_typing}
                        </div>
                      )}
                    </td>
                    <td className="table-cell">
                      <StatusBadge status={r.urgency_level || 'MEDIUM'} />
                    </td>
                    <td className="table-cell">
                      <div className="flex flex-wrap gap-1">
                        {r.pediatric_status && (
                          <span className="text-3xs font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                            Pediatric
                          </span>
                        )}
                        {r.prior_living_donor && (
                          <span className="text-3xs font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                            Prior Donor
                          </span>
                        )}
                        <span className="text-3xs font-medium px-1.5 py-0.5 rounded bg-gray-100 text-gray-700">
                          {r.special_status || 'Standard'}
                        </span>
                      </div>
                    </td>
                    <td className="table-cell font-medium text-gray-700">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-gray-400" />
                        <span>{r.waiting_days} days</span>
                      </div>
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
