import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Heart, Search, Filter, GitMerge, Building2 } from 'lucide-react';
import { getEligibleDonors } from '../../api';
import StatusBadge from '../../components/StatusBadge';
import OrganBadge from '../../components/OrganBadge';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';

export default function EligibleDonors() {
  const [organFilter, setOrganFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  const { data: donors = [], isLoading } = useQuery({
    queryKey: ['coordinator-eligible-donors', organFilter],
    queryFn: () => getEligibleDonors(organFilter).then((res) => res.data),
  });

  const organOptions = ['ALL', 'KIDNEY', 'LIVER', 'HEART', 'LUNG', 'PANCREAS'];

  const filteredDonors = donors.filter(
    (d: any) =>
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.hospital_name.toLowerCase().includes(search.toLowerCase()) ||
      (d.patient_uid && d.patient_uid.toLowerCase().includes(search.toLowerCase()))
  );

  if (isLoading) {
    return <LoadingSpinner message="Loading cross-hospital eligible donors..." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Verified Eligible Donors Pool</h1>
          <p className="text-sm text-gray-500 mt-1">
            Donors across all hospitals who have verified eligibility and viable organs available for transplant
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
        <div className="flex items-center justify-between gap-4 pb-4 border-b border-gray-100">
          <div className="relative max-w-sm w-full">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search donor name, hospital, or ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-9 text-xs"
            />
          </div>
          <span className="text-xs text-gray-500">
            Showing <strong>{filteredDonors.length}</strong> eligible donor{filteredDonors.length !== 1 ? 's' : ''}
          </span>
        </div>

        {filteredDonors.length === 0 ? (
          <EmptyState
            title="No Verified Donors"
            message="No verified eligible donors found matching this criteria."
            icon={<Heart className="w-12 h-12 text-gray-400" />}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/50">
                  <th className="table-header">Donor ID</th>
                  <th className="table-header">Donor Name</th>
                  <th className="table-header">Hospital / Center</th>
                  <th className="table-header">Age & Gender</th>
                  <th className="table-header">Blood Group</th>
                  <th className="table-header">Available Organs</th>
                  <th className="table-header text-right">Matching Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredDonors.map((d: any) => (
                  <tr key={d.id} className="hover:bg-gray-50/70">
                    <td className="table-cell font-mono font-bold text-teal-700">
                      {d.patient_uid || `D-${d.id}`}
                    </td>
                    <td className="table-cell font-medium text-gray-900">{d.name}</td>
                    <td className="table-cell text-gray-700">
                      <div className="flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5 text-gray-400" />
                        <span>{d.hospital_name}</span>
                      </div>
                    </td>
                    <td className="table-cell text-gray-600">
                      {d.age} yrs • {d.gender}
                    </td>
                    <td className="table-cell">
                      <span className="inline-flex px-2 py-0.5 rounded bg-gray-100 font-mono font-bold text-xs">
                        {d.blood_group}
                      </span>
                    </td>
                    <td className="table-cell">
                      <div className="flex flex-wrap gap-1">
                        {d.organs?.map((o: any) => (
                          <div key={o.id} className="flex items-center gap-1">
                            <OrganBadge organ={o.organ_type} size="sm" />
                            <StatusBadge status={o.availability_status} size="sm" />
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="table-cell text-right">
                      {d.organs?.some((o: any) => o.availability_status === 'AVAILABLE') ? (
                        <Link
                          to={`/coordinator/matching?organ=${d.organs.find((o: any) => o.availability_status === 'AVAILABLE')?.id}`}
                          className="btn-primary text-xs px-2.5 py-1.5 inline-flex items-center gap-1.5"
                        >
                          <GitMerge className="w-3.5 h-3.5" /> Match Organ
                        </Link>
                      ) : (
                        <span className="text-2xs text-gray-400">All organs offered/allocated</span>
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
