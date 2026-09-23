import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Building2, Users, Heart, Activity, Mail, Phone, MapPin } from 'lucide-react';
import { getHospitalDetails } from '../../api';
import StatusBadge from '../../components/StatusBadge';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function HospitalDetail() {
  const { id } = useParams<{ id: string }>();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['hospital-detail', id],
    queryFn: () => getHospitalDetails(Number(id)).then((res) => res.data),
    enabled: !!id,
  });

  if (isLoading) {
    return <LoadingSpinner message="Loading hospital details..." />;
  }

  if (isError || !data) {
    return (
      <div className="card text-center py-12">
        <p className="text-red-600 font-medium">Failed to load hospital details.</p>
        <Link to="/admin/hospitals" className="btn-secondary mt-4 inline-flex items-center gap-1.5">
          <ArrowLeft className="w-4 h-4" /> Back to Hospitals
        </Link>
      </div>
    );
  }

  const { hospital, stats, users } = data;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/admin/hospitals" className="btn-secondary p-2 rounded-lg text-gray-600">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{hospital.name}</h1>
            <StatusBadge status={hospital.status} />
          </div>
          <p className="text-sm text-gray-500 font-mono mt-0.5">ID: {hospital.hospital_id}</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Total Donors</span>
            <Heart className="w-5 h-5 text-rose-500" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats.total_donors}</div>
          <div className="text-xs text-green-600 font-medium mt-1">
            {stats.eligible_donors} Eligible
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Total Receivers</span>
            <Activity className="w-5 h-5 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats.total_receivers}</div>
          <div className="text-xs text-green-600 font-medium mt-1">
            {stats.eligible_receivers} Eligible
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Facility Type</span>
            <Building2 className="w-5 h-5 text-teal-500" />
          </div>
          <div className="text-lg font-bold text-gray-900">{hospital.hospital_type}</div>
          <div className="text-xs text-gray-400 mt-1">Transplant Facility</div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Staff Users</span>
            <Users className="w-5 h-5 text-purple-500" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{users.length}</div>
          <div className="text-xs text-gray-400 mt-1">Associated login accounts</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Hospital Contact Info */}
        <div className="card lg:col-span-2 space-y-4">
          <h2 className="text-base font-semibold text-gray-900 pb-3 border-b border-gray-100">
            Hospital Information & Location
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div className="space-y-1">
              <span className="text-xs text-gray-400 font-medium">Facility Name</span>
              <p className="font-medium text-gray-800">{hospital.name}</p>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-gray-400 font-medium">Facility ID</span>
              <p className="font-medium text-blue-600 font-mono">{hospital.hospital_id}</p>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-gray-400 font-medium flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-gray-400" /> Phone Contact
              </span>
              <p className="font-medium text-gray-800">{hospital.contact}</p>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-gray-400 font-medium flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 text-gray-400" /> Email Address
              </span>
              <p className="font-medium text-gray-800">{hospital.email}</p>
            </div>
            <div className="space-y-1 sm:col-span-2">
              <span className="text-xs text-gray-400 font-medium flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-gray-400" /> Complete Address
              </span>
              <p className="font-medium text-gray-800">
                {hospital.address}, {hospital.city}, {hospital.state}
              </p>
            </div>
          </div>
        </div>

        {/* Associated Staff / Users */}
        <div className="card space-y-4">
          <h2 className="text-base font-semibold text-gray-900 pb-3 border-b border-gray-100">
            Associated User Accounts
          </h2>

          <div className="space-y-3">
            {users.map((u: any) => (
              <div key={u.id} className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                <div className="font-medium text-gray-900 text-sm">{u.name}</div>
                <div className="text-xs text-gray-500">{u.email}</div>
                <span className="inline-block mt-2 px-2 py-0.5 bg-teal-100 text-teal-800 rounded text-xs font-semibold">
                  {u.role}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
