import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Heart, Activity, UserPlus, FileCheck, Inbox, CheckCircle2, Clock, Droplets } from 'lucide-react';
import { getHospitalDashboard } from '../../api';
import OrganBadge from '../../components/OrganBadge';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function HospitalDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['hospital-dashboard'],
    queryFn: () => getHospitalDashboard().then((res) => res.data),
  });

  if (isLoading) {
    return <LoadingSpinner message="Loading hospital dashboard..." />;
  }

  const { donors = {}, receivers = {}, organs = {}, active_allocation_requests = 0, completed_allocations = 0 } = data || {};

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Hospital Transplant Portal</h1>
          <p className="text-sm text-gray-500 mt-1">
            Register donors, manage recipient waiting lists, upload reports, and respond to organ offers
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/hospital/add-donor" className="btn-primary text-sm inline-flex items-center gap-1.5">
            <Heart className="w-4 h-4" /> Add Donor
          </Link>
          <Link to="/hospital/add-receiver" className="btn-secondary text-sm inline-flex items-center gap-1.5">
            <Activity className="w-4 h-4" /> Add Receiver
          </Link>
        </div>
      </div>

      {/* Primary KPI Stats */}
      <div>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Donor & Receiver Metrics
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="stat-card border-l-4 border-l-emerald-500">
            <div className="flex items-center justify-between text-gray-500 mb-1">
              <span className="text-xs font-medium uppercase">Total Donors</span>
              <Heart className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{donors.total || 0}</div>
            <div className="flex items-center gap-2 mt-2 text-xs font-medium">
              <span className="text-green-600">{donors.eligible || 0} Eligible</span>
              <span className="text-gray-300">•</span>
              <span className="text-rose-500">{donors.not_eligible || 0} Ineligible</span>
            </div>
          </div>

          <div className="stat-card border-l-4 border-l-blue-500">
            <div className="flex items-center justify-between text-gray-500 mb-1">
              <span className="text-xs font-medium uppercase">Total Receivers</span>
              <Activity className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{receivers.total || 0}</div>
            <div className="flex items-center gap-2 mt-2 text-xs font-medium">
              <span className="text-green-600">{receivers.eligible || 0} Eligible</span>
              <span className="text-gray-300">•</span>
              <span className="text-rose-500">{receivers.not_eligible || 0} Ineligible</span>
            </div>
          </div>

          <div className="stat-card border-l-4 border-l-orange-500">
            <div className="flex items-center justify-between text-gray-500 mb-1">
              <span className="text-xs font-medium uppercase">Active Offers</span>
              <Inbox className="w-4 h-4 text-orange-500" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{active_allocation_requests}</div>
            <div className="text-xs text-orange-600 mt-2 font-medium">
              {active_allocation_requests > 0 ? 'Requires Hospital Decision' : 'No pending offers'}
            </div>
          </div>

          <div className="stat-card border-l-4 border-l-purple-500">
            <div className="flex items-center justify-between text-gray-500 mb-1">
              <span className="text-xs font-medium uppercase">Transplants Done</span>
              <CheckCircle2 className="w-4 h-4 text-purple-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{completed_allocations}</div>
            <div className="text-xs text-gray-400 mt-2">Completed Allocations</div>
          </div>
        </div>
      </div>

      {/* Organ Availability Counts */}
      <div className="card space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Available Organs from Verified Donors</h2>
            <p className="text-xs text-gray-500">Organs currently registered and eligible for matching</p>
          </div>
          <Link to="/hospital/verified-pool" className="text-xs font-semibold text-teal-600 hover:text-teal-700">
            View Verified Pool &rarr;
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {['kidney', 'liver', 'heart', 'lung'].map((organ) => {
            const count = organs[organ] || 0;
            return (
              <div key={organ} className="p-4 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-between">
                <div>
                  <OrganBadge organ={organ.toUpperCase()} size="sm" />
                  <div className="text-2xl font-bold text-gray-900 mt-2">{count}</div>
                  <span className="text-xs text-gray-500">Available</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          to="/hospital/verified-pool"
          className="card p-5 hover:border-teal-500 hover:shadow-md transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-teal-50 text-teal-600 group-hover:bg-teal-600 group-hover:text-white transition-colors">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 text-sm">Verified Pool</h3>
              <p className="text-xs text-gray-500 mt-0.5">View verified eligible donors & receivers</p>
            </div>
          </div>
        </Link>

        <Link
          to="/hospital/allocation-requests"
          className="card p-5 hover:border-orange-500 hover:shadow-md transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-orange-50 text-orange-600 group-hover:bg-orange-600 group-hover:text-white transition-colors">
              <Inbox className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 text-sm">Allocation Requests</h3>
              <p className="text-xs text-gray-500 mt-0.5">Accept or reject organ offers for patients</p>
            </div>
          </div>
        </Link>

        <Link
          to="/hospital/allocation-history"
          className="card p-5 hover:border-purple-500 hover:shadow-md transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-purple-50 text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 text-sm">Allocation History</h3>
              <p className="text-xs text-gray-500 mt-0.5">Track past donor and receiver allocations</p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
