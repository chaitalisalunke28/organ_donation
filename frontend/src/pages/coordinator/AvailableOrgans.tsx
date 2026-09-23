import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Heart, Search, Filter, GitMerge, Building2 } from 'lucide-react';
import { getAvailableOrgans } from '../../api';
import StatusBadge from '../../components/StatusBadge';
import OrganBadge from '../../components/OrganBadge';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';

export default function AvailableOrgans() {
  const [organFilter, setOrganFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('AVAILABLE');
  const [search, setSearch] = useState('');

  const { data: organs = [], isLoading } = useQuery({
    queryKey: ['coordinator-available-organs', organFilter, statusFilter],
    queryFn: () =>
      getAvailableOrgans({
        organ_type: organFilter !== 'ALL' ? organFilter : undefined,
        status_filter: statusFilter !== 'ALL' ? statusFilter : undefined,
      }).then((res) => res.data),
  });

  const organOptions = ['ALL', 'KIDNEY', 'LIVER', 'HEART', 'LUNG', 'PANCREAS'];
  const statusOptions = ['ALL', 'AVAILABLE', 'OFFERED', 'ALLOCATED', 'COMPLETED', 'UNALLOCATED'];

  const filteredOrgans = organs.filter(
    (o: any) =>
      (o.donor_name && o.donor_name.toLowerCase().includes(search.toLowerCase())) ||
      (o.donor_hospital && o.donor_hospital.toLowerCase().includes(search.toLowerCase())) ||
      (o.organ_uid && o.organ_uid.toLowerCase().includes(search.toLowerCase()))
  );

  if (isLoading) {
    return <LoadingSpinner message="Loading central organ registry..." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Central Organ Registry</h1>
          <p className="text-sm text-gray-500 mt-1">
            Registered donated organs, availability status, and one-click compatibility matching
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
                  ? 'bg-teal-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {org}
            </button>
          ))}
        </div>
      </div>

      <div className="card space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-2 overflow-x-auto">
            <span className="text-xs text-gray-400 font-medium mr-1">Status:</span>
            {statusOptions.map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded-lg text-2xs font-bold transition-colors ${
                  statusFilter === st
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          <div className="relative max-w-xs w-full">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search donor, hospital, organ UID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-9 text-xs"
            />
          </div>
        </div>

        {filteredOrgans.length === 0 ? (
          <EmptyState
            title="No Organs Found"
            message="No organs match the selected filter combination."
            icon={<Heart className="w-12 h-12 text-gray-400" />}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/50">
                  <th className="table-header">Organ UID</th>
                  <th className="table-header">Type</th>
                  <th className="table-header">Donor & Center</th>
                  <th className="table-header">ABO / BMI</th>
                  <th className="table-header">Kidney & Clinical Quality</th>
                  <th className="table-header">Preservation</th>
                  <th className="table-header">Status</th>
                  <th className="table-header text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredOrgans.map((o: any) => (
                  <tr key={o.id} className="hover:bg-gray-50/70">
                    <td className="table-cell font-mono font-bold text-teal-700">{o.organ_uid}</td>
                    <td className="table-cell">
                      <OrganBadge organ={o.organ_type} size="sm" />
                    </td>
                    <td className="table-cell text-gray-700">
                      <div className="font-semibold text-gray-900">{o.donor_hospital}</div>
                      <div className="text-2xs text-gray-400">Donor: {o.donor_name} ({o.donor_uid})</div>
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center gap-1.5">
                        <span className="inline-flex px-1.5 py-0.5 rounded bg-gray-100 font-mono font-bold text-xs">
                          {o.donor_blood_group}
                        </span>
                        {o.donor_height_cm && o.donor_weight_kg && (
                          <span className="text-2xs text-gray-500">
                            BMI {+(o.donor_weight_kg / Math.pow(o.donor_height_cm / 100, 2)).toFixed(1)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="table-cell max-w-xs">
                      <div className="text-gray-900 font-medium truncate">{o.organ_condition || 'Normal viable'}</div>
                      {o.organ_type === 'KIDNEY' && (
                        <div className="flex items-center gap-1 mt-0.5">
                          {o.donor_creatinine && (
                            <span className="text-2xs bg-teal-50 text-teal-800 px-1.5 py-0.5 rounded border border-teal-100 font-medium">
                              Cr: {o.donor_creatinine} mg/dL
                            </span>
                          )}
                          {o.kidney_quality && (
                            <span className="text-2xs bg-indigo-50 text-indigo-800 px-1.5 py-0.5 rounded border border-indigo-100 font-medium">
                              {o.kidney_quality.includes('SCD') ? 'SCD' : o.kidney_quality.includes('ECD') ? 'ECD' : o.kidney_quality}
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="table-cell text-gray-600">
                      {o.preservation_method ? (
                        <span className="text-2xs font-semibold px-2 py-0.5 rounded bg-sky-50 text-sky-800 border border-sky-100">
                          {o.preservation_method}
                        </span>
                      ) : (
                        <span className="text-2xs text-gray-400">Standard Cold Storage</span>
                      )}
                    </td>
                    <td className="table-cell">
                      <StatusBadge status={o.availability_status} />
                    </td>
                    <td className="table-cell text-right">
                      {o.availability_status === 'AVAILABLE' ? (
                        <Link
                          to={`/coordinator/matching?organ=${o.id}`}
                          className="btn-primary text-xs px-2.5 py-1.5 inline-flex items-center gap-1.5"
                        >
                          <GitMerge className="w-3.5 h-3.5" /> Match Organ
                        </Link>
                      ) : (
                        <span className="text-2xs text-gray-400 font-medium">Locked ({o.availability_status})</span>
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
