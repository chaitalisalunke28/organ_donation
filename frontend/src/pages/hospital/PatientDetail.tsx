import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Heart,
  Activity,
  UploadCloud,
  FileCheck2,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Plus,
  ShieldCheck,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  getPatient,
  getPatientReports,
  getPatientOrgans,
  uploadReport,
  addOrgan,
  checkEligibility,
  verifyPatientEligibility,
  viewHospitalReportPdf,
} from '../../api';
import StatusBadge from '../../components/StatusBadge';
import OrganBadge from '../../components/OrganBadge';
import LoadingSpinner from '../../components/LoadingSpinner';
import DocumentModal from '../../components/DocumentModal';

export default function PatientDetail() {
  const { id } = useParams<{ id: string }>();
  const patientId = Number(id);
  const queryClient = useQueryClient();

  // PDF Preview State
  const [viewPdfUrl, setViewPdfUrl] = useState<string | null>(null);
  const [viewPdfTitle, setViewPdfTitle] = useState<string>('Clinical Document');

  // Report upload state
  const [reportType, setReportType] = useState('BLOOD_TEST');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Add organ state (for donors)
  const [showAddOrgan, setShowAddOrgan] = useState(false);
  const [newOrganType, setNewOrganType] = useState('KIDNEY');
  const [newOrganCondition, setNewOrganCondition] = useState('Good / Viable');

  const { data: patient, isLoading: pLoading } = useQuery({
    queryKey: ['patient', patientId],
    queryFn: () => getPatient(patientId).then((res) => res.data),
    enabled: !!patientId,
  });

  const { data: reports = [], isLoading: rLoading } = useQuery({
    queryKey: ['patient-reports', patientId],
    queryFn: () => getPatientReports(patientId).then((res) => res.data),
    enabled: !!patientId,
  });

  const { data: organs = [] } = useQuery({
    queryKey: ['patient-organs', patientId],
    queryFn: () => getPatientOrgans(patientId).then((res) => res.data),
    enabled: !!patientId && patient?.patient_type === 'DONOR',
  });

  // Mutations
  const uploadMutation = useMutation({
    mutationFn: () => {
      if (!selectedFile) throw new Error('No file selected');
      return uploadReport(patientId, reportType, selectedFile);
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['patient-reports', patientId] });
      queryClient.invalidateQueries({ queryKey: ['patient', patientId] });
      queryClient.invalidateQueries({ queryKey: ['hospital-patients'] });
      queryClient.invalidateQueries({ queryKey: ['hospital-dashboard'] });
      toast.success(
        res.data.eligibility_status === 'ELIGIBLE'
          ? 'Report uploaded & Verified! Patient is now ELIGIBLE.'
          : 'Report uploaded successfully.'
      );
      setSelectedFile(null);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || 'Failed to upload report');
    },
  });

  const organMutation = useMutation({
    mutationFn: () =>
      addOrgan(patientId, {
        organ_type: newOrganType,
        organ_condition: newOrganCondition,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient-organs', patientId] });
      queryClient.invalidateQueries({ queryKey: ['patient', patientId] });
      queryClient.invalidateQueries({ queryKey: ['hospital-dashboard'] });
      toast.success('Organ registered successfully');
      setShowAddOrgan(false);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || 'Failed to add organ');
    },
  });

  const verifyMutation = useMutation({
    mutationFn: () => verifyPatientEligibility(patientId),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['patient', patientId] });
      queryClient.invalidateQueries({ queryKey: ['hospital-patients'] });
      queryClient.invalidateQueries({ queryKey: ['hospital-dashboard'] });
      toast.success(res?.data?.message || 'Patient successfully verified and activated for matching!');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || 'Verification failed');
    },
  });

  const checkMutation = useMutation({
    mutationFn: () => checkEligibility(patientId),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['patient', patientId] });
      queryClient.invalidateQueries({ queryKey: ['hospital-patients'] });
      queryClient.invalidateQueries({ queryKey: ['hospital-dashboard'] });
      if (res.data.eligible) {
        toast.success('Patient verified as ELIGIBLE for transplant matching!');
      } else {
        toast.error(`Verification status: ${res.data.issues?.join(', ') || 'Incomplete'}`);
      }
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || 'Eligibility evaluation failed');
    },
  });

  if (pLoading || rLoading) {
    return <LoadingSpinner message="Loading patient clinical record..." />;
  }

  if (!patient) {
    return (
      <div className="card text-center py-12">
        <p className="text-red-600 font-medium">Patient record not found.</p>
        <Link to="/hospital/dashboard" className="btn-secondary mt-4 inline-flex items-center gap-1.5">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>
      </div>
    );
  }

  const isDonor = patient.patient_type === 'DONOR';
  const isEligible = patient.eligibility_status === 'ELIGIBLE';

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to={isDonor ? '/hospital/donors' : '/hospital/receivers'}
            className="btn-secondary p-2 rounded-lg text-slate-600"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900">{patient.name}</h1>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                isDonor ? 'bg-rose-100 text-rose-800' : 'bg-teal-100 text-teal-800'
              }`}>
                {patient.patient_type}
              </span>
              <StatusBadge status={patient.eligibility_status} />
            </div>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              ID: {patient.patient_uid || `PT-${patient.id}`} • Blood Group: <strong className="text-slate-800">{patient.blood_group}</strong> • Facility: <span className="text-slate-700 font-semibold">{patient.hospital_name || 'Transplant Center'}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isEligible && (
            <button
              onClick={() => verifyMutation.mutate()}
              disabled={verifyMutation.isPending}
              className="btn-success text-xs sm:text-sm shadow-xs inline-flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              {verifyMutation.isPending ? 'Certifying...' : 'Certify & Approve Candidate'}
            </button>
          )}
          <button
            onClick={() => checkMutation.mutate()}
            disabled={checkMutation.isPending}
            className="btn-secondary text-xs sm:text-sm inline-flex items-center gap-1.5"
          >
            <ShieldCheck className="w-4 h-4 text-teal-600" />
            {checkMutation.isPending ? 'Checking...' : 'Re-check Eligibility'}
          </button>
        </div>
      </div>

      {/* Verification Banner */}
      <div className={`p-4 rounded-xl border flex items-start gap-3.5 transition-all ${
        isEligible
          ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
          : 'bg-amber-50/90 border-amber-200 text-amber-900'
      }`}>
        {isEligible ? (
          <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
        ) : (
          <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
        )}
        <div className="text-xs flex-1">
          <div className="font-bold text-sm flex items-center justify-between">
            <span>
              {isEligible
                ? 'Clinical Status: Verified & Approved for Organ Allocation Matching'
                : 'Clinical Status: Pending Verification'}
            </span>
            <span className={`text-2xs font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
              isEligible ? 'bg-emerald-200/80 text-emerald-900' : 'bg-amber-200/80 text-amber-900'
            }`}>
              {patient.verification_status || 'PENDING'}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-700">
            {isEligible
              ? 'Candidate profile has met clinical criteria and is actively evaluated by the National Allocation and Matching Algorithms.'
              : 'Candidate can be verified by uploading clinical reports below or by clicking the "Certify & Approve Candidate" button above.'}
          </p>
        </div>
      </div>

      {/* Patient Information Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Clinical Demographics & History */}
        <div className="card lg:col-span-2 space-y-4">
          <h2 className="text-base font-semibold text-gray-900 pb-3 border-b border-gray-100 flex items-center gap-2">
            {isDonor ? <Heart className="w-5 h-5 text-rose-500" /> : <Activity className="w-5 h-5 text-blue-500" />}
            Clinical Data & Profile
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-xs text-gray-400 font-medium">Age & Gender</span>
              <p className="font-medium text-gray-800">{patient.age} yrs, {patient.gender}</p>
            </div>
            <div>
              <span className="text-xs text-gray-400 font-medium">ABO Blood Group</span>
              <p className="font-mono font-bold text-gray-800">{patient.blood_group}</p>
            </div>
            <div>
              <span className="text-xs text-gray-400 font-medium">Height & Weight</span>
              <p className="font-medium text-gray-800">
                {patient.height_cm ? `${patient.height_cm} cm` : '—'} / {patient.weight_kg ? `${patient.weight_kg} kg` : '—'}
                {patient.height_cm && patient.weight_kg && (
                  <span className="ml-1 text-xs text-teal-700 font-semibold">
                    (BMI: {+(patient.weight_kg / Math.pow(patient.height_cm / 100, 2)).toFixed(1)})
                  </span>
                )}
              </p>
            </div>
            <div>
              <span className="text-xs text-gray-400 font-medium">Verification</span>
              <p className="font-medium text-gray-800">{patient.verification_status}</p>
            </div>
          </div>

          <div className="pt-3 border-t border-gray-100 space-y-3">
            <div>
              <span className="text-xs text-gray-400 font-medium">Clinical Diagnosis / Cause</span>
              <p className="text-sm font-medium text-gray-800 mt-0.5">{patient.medical_condition || '—'}</p>
            </div>

            {isDonor && patient.donor_profile && (
              <div className="space-y-3 pt-2">
                {/* Comorbidities */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-md border ${
                    patient.donor_profile.hypertension
                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  }`}>
                    Hypertension: {patient.donor_profile.hypertension ? 'YES' : 'NONE'}
                  </span>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-md border ${
                    patient.donor_profile.diabetes
                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  }`}>
                    Diabetes Mellitus: {patient.donor_profile.diabetes ? 'YES' : 'NONE'}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                  <div className="p-2.5 bg-gray-50 rounded-lg border border-gray-200 text-xs">
                    <span className="font-semibold text-gray-600 block mb-1">Renal History</span>
                    <p className="text-gray-700">{patient.donor_profile.renal_history || 'No pre-existing renal disease reported'}</p>
                  </div>
                  <div className="p-2.5 bg-gray-50 rounded-lg border border-gray-200 text-xs">
                    <span className="font-semibold text-gray-600 block mb-1">Cardiac History</span>
                    <p className="text-gray-700">{patient.donor_profile.cardiac_history || 'No prior cardiac events'}</p>
                  </div>
                  <div className="p-2.5 bg-gray-50 rounded-lg border border-gray-200 text-xs">
                    <span className="font-semibold text-gray-600 block mb-1">Infection History</span>
                    <p className="text-gray-700">{patient.donor_profile.infection_history || 'Serology clean'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <span className="text-xs text-gray-400 font-medium">Infectious Disease Screening</span>
                    <p className="text-xs text-gray-700 mt-0.5">{patient.donor_profile.infectious_disease_screening || '—'}</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-400 font-medium">Relevant Lab Test Results</span>
                    <p className="text-xs text-gray-700 mt-0.5">{patient.donor_profile.relevant_test_results || '—'}</p>
                  </div>
                </div>
              </div>
            )}

            {!isDonor && patient.receiver_profile && (
              <div className="space-y-4 pt-2">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-3 bg-blue-50/50 rounded-xl border border-blue-100">
                  <div>
                    <span className="text-2xs text-gray-500 font-medium">Required Organ</span>
                    <div className="mt-1">
                      <OrganBadge organ={patient.receiver_profile.required_organ} size="sm" />
                    </div>
                  </div>
                  <div>
                    <span className="text-2xs text-gray-500 font-medium">Clinical Urgency</span>
                    <div className="mt-1">
                      <StatusBadge status={patient.receiver_profile.urgency_level} />
                    </div>
                  </div>
                  <div>
                    <span className="text-2xs text-gray-500 font-medium">Listing / Waiting Date</span>
                    <p className="text-xs font-semibold text-gray-800 mt-1">
                      {patient.receiver_profile.waiting_start_date
                        ? new Date(patient.receiver_profile.waiting_start_date).toLocaleDateString()
                        : '—'}
                    </p>
                  </div>
                  <div>
                    <span className="text-2xs text-gray-500 font-medium">Priority Tier</span>
                    <p className="text-xs font-semibold text-teal-800 mt-1">
                      {patient.receiver_profile.special_status || 'Standard'}
                    </p>
                  </div>
                </div>

                {/* Dialysis & Prior Graft Data */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <span className="text-2xs text-gray-400 font-medium block mb-1">Dialysis Modality</span>
                    <p className="text-xs font-semibold text-gray-900">{patient.receiver_profile.dialysis_status || 'Not on dialysis'}</p>
                    {patient.receiver_profile.dialysis_duration_months && (
                      <span className="text-2xs text-gray-500 mt-0.5 block">
                        Vintage: {patient.receiver_profile.dialysis_duration_months} months
                      </span>
                    )}
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <span className="text-2xs text-gray-400 font-medium block mb-1">Sensitization (PRA / CPRA)</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-purple-700">CPRA: {patient.receiver_profile.cpra ?? 0}%</span>
                      <span className="text-2xs text-gray-500">(PRA: {patient.receiver_profile.pra ?? 0}%)</span>
                    </div>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <span className="text-2xs text-gray-400 font-medium block mb-1">Crossmatch & Priority</span>
                    <p className="text-xs font-semibold text-gray-900">{patient.receiver_profile.crossmatch_result || 'Pending'}</p>
                    <div className="flex gap-1.5 mt-1">
                      {patient.receiver_profile.pediatric_status && (
                        <span className="text-3xs bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-bold">Pediatric</span>
                      )}
                      {patient.receiver_profile.prior_living_donor && (
                        <span className="text-3xs bg-green-100 text-green-800 px-1.5 py-0.5 rounded font-bold">Prior Donor</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* HLA Typing */}
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-2xs text-gray-400 font-medium block mb-0.5">Recipient HLA Typing</span>
                    <p className="font-mono text-xs text-gray-800">{patient.receiver_profile.hla_typing || 'HLA typing pending'}</p>
                  </div>
                  <div>
                    <span className="text-2xs text-gray-400 font-medium block mb-0.5">Unacceptable HLA Antibodies</span>
                    <p className="font-mono text-xs text-gray-800">{patient.receiver_profile.hla_antibodies || 'None detected'}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Organs Section for Donors */}
        {isDonor && (
          <div className="card space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-900">Donated Organs & Quality</h2>
              <button
                onClick={() => setShowAddOrgan(!showAddOrgan)}
                className="btn-secondary text-xs px-2 py-1 inline-flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Add
              </button>
            </div>

            {showAddOrgan && (
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-3">
                <div>
                  <label className="label text-xs">Organ Type</label>
                  <select
                    value={newOrganType}
                    onChange={(e) => setNewOrganType(e.target.value)}
                    className="input text-xs"
                  >
                    <option value="KIDNEY">Kidney</option>
                    <option value="LIVER">Liver</option>
                    <option value="HEART">Heart</option>
                    <option value="LUNG">Lung</option>
                    <option value="PANCREAS">Pancreas</option>
                    <option value="CORNEA">Cornea</option>
                  </select>
                </div>
                <div>
                  <label className="label text-xs">Condition</label>
                  <input
                    type="text"
                    value={newOrganCondition}
                    onChange={(e) => setNewOrganCondition(e.target.value)}
                    className="input text-xs"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setShowAddOrgan(false)}
                    className="btn-secondary text-xs px-2 py-1"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => organMutation.mutate()}
                    disabled={organMutation.isPending}
                    className="btn-primary text-xs px-2 py-1"
                  >
                    Save
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {organs.length === 0 ? (
                <p className="text-xs text-gray-400 py-4 text-center">No organs registered yet.</p>
              ) : (
                organs.map((org: any) => (
                  <div
                    key={org.id}
                    className="p-3.5 bg-gray-50/90 rounded-xl border border-gray-200 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <OrganBadge organ={org.organ_type} size="sm" />
                        <span className="text-xs font-mono font-bold text-gray-600">{org.organ_uid}</span>
                      </div>
                      <StatusBadge status={org.availability_status} />
                    </div>

                    <p className="text-xs text-gray-700">{org.organ_condition}</p>

                    {/* Kidney Specific Clinical Metrics */}
                    {org.organ_type === 'KIDNEY' && (
                      <div className="mt-2 pt-2 border-t border-gray-200 grid grid-cols-2 gap-2 text-2xs">
                        {org.donor_creatinine && (
                          <div className="bg-white p-1.5 rounded border border-gray-100">
                            <span className="text-gray-400 block">Serum Creatinine</span>
                            <span className="font-semibold text-gray-800">{org.donor_creatinine} mg/dL</span>
                          </div>
                        )}
                        {org.kidney_quality && (
                          <div className="bg-white p-1.5 rounded border border-gray-100">
                            <span className="text-gray-400 block">Quality</span>
                            <span className="font-semibold text-teal-700">{org.kidney_quality}</span>
                          </div>
                        )}
                        {org.preservation_method && (
                          <div className="col-span-2 bg-white p-1.5 rounded border border-gray-100">
                            <span className="text-gray-400 block">Preservation Protocol</span>
                            <span className="font-semibold text-gray-800">{org.preservation_method}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Supporting Medical Reports Upload & Evidence */}
      <div className="card space-y-6">
        <div className="pb-3 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <FileCheck2 className="w-5 h-5 text-teal-600" />
              Supporting Medical Evidence & Reports
            </h2>
            <p className="text-xs text-gray-500">
              Upload PDF or image evidence (Blood Test, Medical Examination) required for eligibility verification
            </p>
          </div>
        </div>

        {/* Upload Form */}
        <div className="p-4 bg-gray-50/70 rounded-xl border border-dashed border-gray-300">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <label className="label text-xs">Report Type *</label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                className="input text-xs"
              >
                <option value="BLOOD_TEST">Blood Test Report</option>
                <option value="MEDICAL_EXAMINATION">Medical Examination Report</option>
                <option value="INFECTIOUS_DISEASE_SCREENING">Infectious Disease Screening</option>
                <option value="ORGAN_ASSESSMENT">Organ Assessment Report</option>
                <option value="COMPATIBILITY_TEST">Compatibility / HLA Report</option>
                <option value="OTHER">Other Clinical Supporting Document</option>
              </select>
            </div>

            <div>
              <label className="label text-xs">Select Document / PDF *</label>
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                className="input text-xs file:mr-3 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100"
              />
            </div>

            <div>
              <button
                onClick={() => uploadMutation.mutate()}
                disabled={!selectedFile || uploadMutation.isPending}
                className="btn-primary w-full text-xs py-2.5 inline-flex items-center justify-center gap-1.5"
              >
                <UploadCloud className="w-4 h-4" />
                {uploadMutation.isPending ? 'Uploading & Verifying...' : 'Upload & Verify'}
              </button>
            </div>
          </div>
        </div>

        {/* Uploaded Reports List */}
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Uploaded Medical Evidence ({reports.length})
          </h3>

          {reports.length === 0 ? (
            <p className="text-xs text-gray-400 py-4 text-center bg-gray-50 rounded-lg">
              No reports uploaded yet. Please upload Blood Test and Medical Examination reports.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {reports.map((r: any) => (
                <div
                  key={r.id}
                  className="p-3.5 bg-white rounded-xl border border-gray-200 flex flex-col justify-between shadow-xs hover:border-teal-500 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <FileText className="w-7 h-7 text-teal-600 shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-gray-900 truncate">
                        {r.report_type?.replace(/_/g, ' ')}
                      </div>
                      <div className="text-xs text-gray-500 truncate mt-0.5 font-mono">
                        {r.original_filename || 'document.pdf'}
                      </div>
                      <div className="text-2xs text-gray-400 mt-1">
                        Uploaded {new Date(r.uploaded_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between">
                    <span className="text-2xs font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded">
                      Verified
                    </span>
                    <button
                      onClick={async () => {
                        try {
                          const url = await viewHospitalReportPdf(r.id);
                          setViewPdfUrl(url);
                          setViewPdfTitle(`${r.report_type?.replace(/_/g, ' ')} - ${patient.name}`);
                        } catch {
                          toast.error('Failed to load PDF preview');
                        }
                      }}
                      className="btn-secondary text-2xs px-2.5 py-1 inline-flex items-center gap-1 text-teal-700 hover:text-teal-800 font-semibold"
                    >
                      <FileCheck2 className="w-3 h-3" /> View PDF
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* PDF Document Viewer Modal */}
      <DocumentModal
        isOpen={!!viewPdfUrl}
        onClose={() => {
          if (viewPdfUrl) URL.revokeObjectURL(viewPdfUrl);
          setViewPdfUrl(null);
        }}
        title={viewPdfTitle}
        pdfBlobUrl={viewPdfUrl}
        downloadFilename={`${viewPdfTitle.replace(/\s+/g, '_')}.pdf`}
      />
    </div>
  );
}

