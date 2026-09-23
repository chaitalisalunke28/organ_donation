import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Heart, Plus, Search, Eye, FileText, CheckCircle2 } from 'lucide-react';
import { getPatients } from '../../api';
import { Patient } from '../../types';
import StatusBadge from '../../components/StatusBadge';
import OrganBadge from '../../components/OrganBadge';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';

export default function Donors() {
  const [tab, setTab] = useState<'ALL' | 'ELIGIBLE' | 'NOT_ELIGIBLE'>('ALL');
  const [search, setSearch] = useState('');

  const { data: patients = [], isLoading } = useQuery<Patient[]>({
    queryKey: ['hospital-patients', 'DONOR'],
    queryFn: () => getPatients({ patient_type: 'DONOR' }).then((res) => res.data),
  });

  const filteredPatients = patients
    .filter((p) => {
      if (tab === 'ELIGIBLE') return p.eligibility_status === 'ELIGIBLE';
      if (tab === 'NOT_ELIGIBLE') return p.eligibility_status !== 'ELIGIBLE';
      return true;
    })
    .filter(
      (p) =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.patient_uid && p.patient_uid.toLowerCase().includes(search.toLowerCase())) ||
        (p.medical_condition && p.medical_condition.toLowerCase().includes(search.toLowerCase()))
    );

  if (isLoading) {
    return <LoadingSpinner message="Loading registered donors..." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Hospital Donor Roster</h1>
          <p className="text-sm text-gray-500 mt-1">
            Registered organ donors, clinical conditions, organ viability, and eligibility status
          </p>
        </div>
        <Link to="/hospital/add-donor" className="btn-primary inline-flex items-center gap-1.5">
          <Plus className="w-4 h-4" /> Register New Donor
        </Link>
      </div>

      <div className="card space-y-4">
        {/* Filters & Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTab('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                tab === 'ALL' ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              All Donors ({patients.length})
            </button>
            <button
              onClick={() => setTab('ELIGIBLE')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                tab === 'ELIGIBLE' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Eligible ({patients.filter((p) => p.eligibility_status === 'ELIGIBLE').length})
            </button>
            <button
              onClick={() => setTab('NOT_ELIGIBLE')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                tab === 'NOT_ELIGIBLE' ? 'bg-rose-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Non-Eligible / Incomplete ({patients.filter((p) => p.eligibility_status !== 'ELIGIBLE').length})
            </button>
          </div>

          <div className="relative max-w-xs w-full">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search donor name or ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-9 text-xs"
            />
          </div>
        </div>

        {filteredPatients.length === 0 ? (
          <EmptyState
            title="No Donors Found"
            message={search ? 'No donor matches your search query.' : 'No donors registered under this filter category.'}
            icon={<Heart className="w-12 h-12 text-gray-400" />}
            action={
              <Link to="/hospital/add-donor" className="btn-primary text-xs inline-flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5" /> Register Donor
              </Link>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/50">
                  <th className="table-header">Donor ID</th>
                  <th className="table-header">Name & Age</th>
                  <th className="table-header">Blood Group</th>
                  <th className="table-header">Condition / Cause</th>
                  <th className="table-header">Eligibility</th>
                  <th className="table-header text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredPatients.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50/70 transition-colors">
                    <td className="table-cell font-mono text-xs font-bold text-teal-700">
                      {p.patient_uid || `D-${p.id}`}
                    </td>
                    <td className="table-cell">
                      <div className="font-medium text-gray-900">{p.name}</div>
                      <div className="text-xs text-gray-400">
                        {p.age} yrs • {p.gender}
                      </div>
                    </td>
                    <td className="table-cell">
                      <span className="inline-flex px-2 py-0.5 rounded bg-gray-100 font-mono font-bold text-xs">
                        {p.blood_group}
                      </span>
                    </td>
                    <td className="table-cell text-gray-600 max-w-xs truncate">
                      {p.medical_condition || '—'}
                    </td>
                    <td className="table-cell">
                      <StatusBadge status={p.eligibility_status} />
                    </td>
                    <td className="table-cell text-right">
                      <Link
                        to={`/hospital/patients/${p.id}`}
                        className="btn-secondary text-xs px-2.5 py-1.5 inline-flex items-center gap-1.5"
                      >
                        <Eye className="w-3.5 h-3.5 text-gray-500" /> View / Reports
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
