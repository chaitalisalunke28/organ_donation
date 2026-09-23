import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Building2, ArrowLeft, KeyRound, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { createHospital } from '../../api';

export default function AddHospital() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    hospital_id: '',
    name: '',
    address: '',
    city: '',
    state: '',
    contact: '',
    email: '',
    hospital_type: 'Government',
    verification_status: 'VERIFIED',
    user_name: '',
    user_email: '',
    user_password: '',
    confirm_password: '',
  });

  const mutation = useMutation({
    mutationFn: (payload: typeof formData) => createHospital(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-hospitals'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
      toast.success('Hospital registered successfully with login credentials');
      navigate('/admin/hospitals');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || 'Failed to add hospital');
    },
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.user_password !== formData.confirm_password) {
      toast.error('Passwords do not match');
      return;
    }
    mutation.mutate(formData);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/admin/hospitals" className="btn-secondary p-2 rounded-lg text-gray-600">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Add New Hospital</h1>
          <p className="text-sm text-gray-500">
            Register a new authorized transplant facility and create administrator credentials
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Hospital Details Card */}
        <div className="card space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-gray-100 text-gray-900 font-semibold">
            <Building2 className="w-5 h-5 text-blue-600" />
            <span>Hospital Information</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Hospital ID *</label>
              <input
                type="text"
                name="hospital_id"
                required
                placeholder="e.g. HOSP-DEL-01"
                value={formData.hospital_id}
                onChange={handleChange}
                className="input"
              />
            </div>
            <div>
              <label className="label">Hospital Name *</label>
              <input
                type="text"
                name="name"
                required
                placeholder="e.g. Metro Multispecialty Hospital"
                value={formData.name}
                onChange={handleChange}
                className="input"
              />
            </div>
          </div>

          <div>
            <label className="label">Street Address *</label>
            <textarea
              name="address"
              required
              rows={2}
              placeholder="Full street address..."
              value={formData.address}
              onChange={handleChange}
              className="input"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">City *</label>
              <input
                type="text"
                name="city"
                required
                placeholder="e.g. Mumbai"
                value={formData.city}
                onChange={handleChange}
                className="input"
              />
            </div>
            <div>
              <label className="label">State *</label>
              <input
                type="text"
                name="state"
                required
                placeholder="e.g. Maharashtra"
                value={formData.state}
                onChange={handleChange}
                className="input"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="label">Contact Phone *</label>
              <input
                type="text"
                name="contact"
                required
                placeholder="e.g. +91 9876543210"
                value={formData.contact}
                onChange={handleChange}
                className="input"
              />
            </div>
            <div>
              <label className="label">Official Email *</label>
              <input
                type="email"
                name="email"
                required
                placeholder="e.g. info@metrohospital.org"
                value={formData.email}
                onChange={handleChange}
                className="input"
              />
            </div>
            <div>
              <label className="label">Hospital Type *</label>
              <select
                name="hospital_type"
                value={formData.hospital_type}
                onChange={handleChange}
                className="input"
              >
                <option value="Government">Government / Public</option>
                <option value="Private">Private Facility</option>
                <option value="Trust / Charitable">Trust / Charitable</option>
                <option value="Academic Medical Center">Academic Medical Center</option>
              </select>
            </div>
          </div>
        </div>

        {/* Login Credentials Card */}
        <div className="card space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-gray-100 text-gray-900 font-semibold">
            <KeyRound className="w-5 h-5 text-teal-600" />
            <span>Hospital Admin Login Credentials</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Admin Contact Name *</label>
              <input
                type="text"
                name="user_name"
                required
                placeholder="e.g. Dr. Rajesh Sharma"
                value={formData.user_name}
                onChange={handleChange}
                className="input"
              />
            </div>
            <div>
              <label className="label">Admin Login Email *</label>
              <input
                type="email"
                name="user_email"
                required
                placeholder="e.g. admin@metrohospital.org"
                value={formData.user_email}
                onChange={handleChange}
                className="input"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Password *</label>
              <input
                type="password"
                name="user_password"
                required
                minLength={6}
                placeholder="••••••••"
                value={formData.user_password}
                onChange={handleChange}
                className="input"
              />
            </div>
            <div>
              <label className="label">Confirm Password *</label>
              <input
                type="password"
                name="confirm_password"
                required
                minLength={6}
                placeholder="••••••••"
                value={formData.confirm_password}
                onChange={handleChange}
                className="input"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <Link to="/admin/hospitals" className="btn-secondary">
            Cancel
          </Link>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="btn-primary inline-flex items-center gap-2"
          >
            <ShieldCheck className="w-4 h-4" />
            {mutation.isPending ? 'Registering Hospital...' : 'Register Hospital'}
          </button>
        </div>
      </form>
    </div>
  );
}
