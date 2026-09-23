import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Activity, Plus, Search, Eye } from 'lucide-react';
import { getPatients } from '../../api';
import { Patient } from '../../types';
import StatusBadge from '../../components/StatusBadge';
import OrganBadge from '../../components/OrganBadge';
import CandidateStatusBadge from '../../components/CandidateStatusBadge';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';

export default function Receivers() {
  const [tab, setTab] = useState<'ALL' | 'ELIGIBLE' | 'NOT_ELIGIBLE'>('ALL');
  const [search, setSearch] = useState('');

  const { data: patients = [], isLoading } = useQuery<Patient[]>({
    queryKey: ['hospital-patients', 'RECEIVER'],
    queryFn: () => getPatients({ patient_type: 'RECEIVER' }).then((res) => res.data),
  });

  const getWaitingDays = (dateStr?: string) => {
    if (!dateStr) return 0;
    const start = new Date(dateStr);
    const now = new Date();
    return Math.max(0, Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
  };

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
        (p.receiver_profile?.required_organ &&
          p.receiver_profile.required_organ.toLowerCase().includes(search.toLowerCase()))
    );

  if (isLoading) {
    return <LoadingSpinner message="Loading recipient waiting list..." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Recipient Waiting List</h1>
          <p className="text-sm text-gray-500 mt-1">
            Registered patients waiting for organ transplant, clinical urgency, and verification status
          </p>
        </div>
        <Link to="/hospital/add-receiver" className="btn-primary inline-flex items-center gap-1.5">
          <Plus className="w-4 h-4" /> Add Recipient
        </Link>
      </div>

      <div className="card space-y-4">
        {/* Filters & Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTab('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                tab === 'ALL' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              All Receivers ({patients.length})
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
              Non-Eligible ({patients.filter((p) => p.eligibility_status !== 'ELIGIBLE').length})
            </button>
          </div>

          <div className="relative max-w-xs w-full">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search name, organ, or ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-9 text-xs"
            />
          </div>
        </div>

        {filteredPatients.length === 0 ? (
          <EmptyState
            title="No Recipients Found"
            message={search ? 'No receiver matches your search query.' : 'No recipients under this filter category.'}
            icon={<Activity className="w-12 h-12 text-gray-400" />}
            action={
              <Link to="/hospital/add-receiver" className="btn-primary text-xs inline-flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5" /> Register Recipient
              </Link>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/50">
                  <th className="table-header">Recipient ID</th>
                  <th className="table-header">Name & Age</th>
                  <th className="table-header">Blood Group</th>
                  <th className="table-header">Required Organ</th>
                  <th className="table-header">Urgency</th>
                  <th className="table-header">Candidate Status</th>
                  <th className="table-header">Waiting Time</th>
                  <th className="table-header">Eligibility</th>
                  <th className="table-header text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredPatients.map((p) => {
                  const days = getWaitingDays(p.receiver_profile?.waiting_start_date);
                  return (
                    <tr key={p.id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="table-cell font-mono text-xs font-bold text-blue-700">
                        {p.patient_uid || `R-${p.id}`}
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
                      <td className="table-cell">
                        {p.receiver_profile?.required_organ ? (
                          <OrganBadge organ={p.receiver_profile.required_organ} size="sm" />
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="table-cell">
                        <StatusBadge status={p.receiver_profile?.urgency_level || 'MEDIUM'} />
                      </td>
                      <td className="table-cell">
                        <CandidateStatusBadge status={p.candidate_status || 'ACTIVE'} size="sm" />
                      </td>
                      <td className="table-cell font-medium text-gray-700">
                        {days} <span className="text-xs font-normal text-gray-400">days</span>
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
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
