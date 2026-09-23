import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Building2, Plus, Search, Eye, Power } from 'lucide-react';
import toast from 'react-hot-toast';
import { getHospitals, updateHospitalStatus } from '../../api';
import { Hospital } from '../../types';
import StatusBadge from '../../components/StatusBadge';
import ConfirmDialog from '../../components/ConfirmDialog';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';

export default function AdminHospitals() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedHospital, setSelectedHospital] = useState<{ id: number; name: string; currentStatus: string } | null>(null);

  const { data: hospitals = [], isLoading } = useQuery<Hospital[]>({
    queryKey: ['admin-hospitals'],
    queryFn: () => getHospitals().then((res) => res.data),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => updateHospitalStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-hospitals'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
      toast.success('Hospital status updated successfully');
      setSelectedHospital(null);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || 'Failed to update hospital status');
    },
  });

  const filteredHospitals = hospitals.filter(
    (h) =>
      h.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      h.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
      h.hospital_id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleToggleStatus = (hospital: Hospital) => {
    const nextStatus = hospital.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    setSelectedHospital({
      id: hospital.id,
      name: hospital.name,
      currentStatus: hospital.status,
    });
  };

  const confirmToggleStatus = () => {
    if (!selectedHospital) return;
    const nextStatus = selectedHospital.currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    statusMutation.mutate({ id: selectedHospital.id, status: nextStatus });
  };

  if (isLoading) {
    return <LoadingSpinner message="Loading registered hospitals..." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Hospital Management</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage participating hospitals, verification status, and credentials
          </p>
        </div>
        <Link to="/admin/hospitals/add" className="btn-primary inline-flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Add Hospital
        </Link>
      </div>

      <div className="card">
        <div className="flex items-center gap-3 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name, ID, or city..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-9"
            />
          </div>
          <span className="text-sm text-gray-500">
            Total: <strong>{filteredHospitals.length}</strong> hospital{filteredHospitals.length !== 1 ? 's' : ''}
          </span>
        </div>

        {filteredHospitals.length === 0 ? (
          <EmptyState
            title="No Hospitals Found"
            message={searchTerm ? 'No hospitals match your search criteria.' : 'No hospitals have been registered yet.'}
            icon={<Building2 className="w-12 h-12 text-gray-400" />}
            action={
              !searchTerm ? (
                <Link to="/admin/hospitals/add" className="btn-primary text-sm inline-flex items-center gap-1.5">
                  <Plus className="w-4 h-4" /> Add First Hospital
                </Link>
              ) : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/50">
                  <th className="table-header">Hospital ID</th>
                  <th className="table-header">Name</th>
                  <th className="table-header">Location</th>
                  <th className="table-header">Type</th>
                  <th className="table-header">Contact / Email</th>
                  <th className="table-header">Status</th>
                  <th className="table-header text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredHospitals.map((h) => (
                  <tr key={h.id} className="hover:bg-gray-50/70 transition-colors">
                    <td className="table-cell font-mono text-xs font-semibold text-blue-600">
                      {h.hospital_id}
                    </td>
                    <td className="table-cell font-medium text-gray-900">{h.name}</td>
                    <td className="table-cell text-gray-600">
                      {h.city}, {h.state}
                    </td>
                    <td className="table-cell text-gray-600">
                      <span className="inline-flex px-2 py-0.5 rounded text-xs bg-gray-100 font-medium">
                        {h.hospital_type}
                      </span>
                    </td>
                    <td className="table-cell text-gray-600">
                      <div>{h.contact}</div>
                      <div className="text-xs text-gray-400">{h.email}</div>
                    </td>
                    <td className="table-cell">
                      <StatusBadge status={h.status} />
                    </td>
                    <td className="table-cell text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          to={`/admin/hospitals/${h.id}`}
                          className="btn-secondary text-xs px-2.5 py-1.5 inline-flex items-center gap-1 text-gray-700"
                        >
                          <Eye className="w-3.5 h-3.5" /> Details
                        </Link>
                        <button
                          onClick={() => handleToggleStatus(h)}
                          className={`text-xs px-2.5 py-1.5 rounded-lg font-medium transition-colors inline-flex items-center gap-1 ${
                            h.status === 'ACTIVE'
                              ? 'bg-red-50 text-red-700 hover:bg-red-100'
                              : 'bg-green-50 text-green-700 hover:bg-green-100'
                          }`}
                        >
                          <Power className="w-3.5 h-3.5" />
                          {h.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={!!selectedHospital}
        title={`${selectedHospital?.currentStatus === 'ACTIVE' ? 'Deactivate' : 'Activate'} Hospital`}
        message={`Are you sure you want to ${
          selectedHospital?.currentStatus === 'ACTIVE' ? 'deactivate' : 'activate'
        } "${selectedHospital?.name}"? ${
          selectedHospital?.currentStatus === 'ACTIVE'
            ? 'Users belonging to this hospital will not be able to login.'
            : 'Associated users will regain access to login.'
        }`}
        confirmText={selectedHospital?.currentStatus === 'ACTIVE' ? 'Deactivate' : 'Activate'}
        confirmVariant={selectedHospital?.currentStatus === 'ACTIVE' ? 'danger' : 'primary'}
        onConfirm={confirmToggleStatus}
        onCancel={() => setSelectedHospital(null)}
      />
    </div>
  );
}
