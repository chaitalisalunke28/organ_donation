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
  Hash,
  Droplet,
  Building2,
  Eye,
  Circle,
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

const REPORT_TYPES = [
  { value: 'BLOOD_TEST', label: 'Blood test' },
  { value: 'MEDICAL_EXAMINATION', label: 'Medical examination' },
  { value: 'INFECTIOUS_DISEASE_SCREENING', label: 'Infectious disease screening' },
  { value: 'ORGAN_ASSESSMENT', label: 'Organ assessment' },
  { value: 'COMPATIBILITY_TEST', label: 'Compatibility / HLA' },
  { value: 'OTHER', label: 'Other supporting document' },
];

// Mirrors DONOR/RECEIVER_REQUIRED_REPORT_TYPES in backend/app/services/eligibility.py
const REQUIRED_REPORTS = [
  { type: 'BLOOD_TEST', label: 'Blood test report' },
  { type: 'MEDICAL_EXAMINATION', label: 'Medical examination report' },
];

const formatType = (t?: string) =>
  REPORT_TYPES.find((r) => r.value === t)?.label ?? (t ? t.replace(/_/g, ' ').toLowerCase() : 'Report');

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
        <Link to="/hospital/dashboard" className="btn-secondary mt-4">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>
      </div>
    );
  }

  const isDonor = patient.patient_type === 'DONOR';
  const isEligible = patient.eligibility_status === 'ELIGIBLE';
  const bmi =
    patient.height_cm && patient.weight_kg
      ? +(patient.weight_kg / Math.pow(patient.height_cm / 100, 2)).toFixed(1)
      : null;
  const uploadedTypes = new Set(reports.map((r: any) => r.report_type));
  const checklist = REQUIRED_REPORTS.map((req) => ({ ...req, done: uploadedTypes.has(req.type) }));
  const checklistDone = checklist.filter((c) => c.done).length;

  const openReport = async (r: any) => {
    try {
      const url = await viewHospitalReportPdf(r.id);
      setViewPdfUrl(url);
      setViewPdfTitle(`${formatType(r.report_type)} · ${patient.name}`);
    } catch {
      toast.error('Could not open this report. Please try again.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <Link
            to={isDonor ? '/hospital/donors' : '/hospital/receivers'}
            className="btn-secondary mt-1 h-9 w-9 shrink-0 p-0"
            aria-label="Back"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div
            className={`hidden h-14 w-14 shrink-0 items-center justify-center rounded-2xl sm:flex ${
              isDonor ? 'bg-rose-50 text-rose-600' : 'bg-teal-50 text-teal-600'
            }`}
          >
            {isDonor ? <Heart className="h-6 w-6" /> : <Activity className="h-6 w-6" />}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="page-title truncate">{patient.name}</h1>
              <span
                className={`rounded-md px-2 py-0.5 text-2xs font-bold uppercase tracking-wider ring-1 ring-inset ${
                  isDonor ? 'bg-rose-50 text-rose-700 ring-rose-600/20' : 'bg-teal-50 text-teal-700 ring-teal-600/20'
                }`}
              >
                {isDonor ? 'Donor' : 'Receiver'}
              </span>
              <StatusBadge status={patient.eligibility_status} />
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
              <span className="inline-flex items-center gap-1.5">
                <Hash className="h-3.5 w-3.5" />
                <span className="font-mono font-medium text-gray-700">{patient.patient_uid || `PT-${patient.id}`}</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Droplet className="h-3.5 w-3.5 text-rose-500" />
                Blood group <span className="font-semibold text-gray-800">{patient.blood_group}</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5" />
                <span className="font-medium text-gray-700">{patient.hospital_name || 'Transplant Center'}</span>
              </span>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <button
            onClick={() => checkMutation.mutate()}
            disabled={checkMutation.isPending}
            className="btn-secondary"
          >
            <ShieldCheck className="h-4 w-4 text-teal-600" />
            {checkMutation.isPending ? 'Checking…' : 'Re-check eligibility'}
          </button>
          {!isEligible && (
            <button
              onClick={() => verifyMutation.mutate()}
              disabled={verifyMutation.isPending}
              className="btn-success"
            >
              <CheckCircle2 className="h-4 w-4" />
              {verifyMutation.isPending ? 'Certifying…' : 'Certify & approve'}
            </button>
          )}
        </div>
      </div>

      {/* Status banner */}
      <div
        className={`flex items-start gap-3 rounded-(--radius-card) border p-4 ${
          isEligible ? 'border-emerald-200 bg-emerald-50/70' : 'border-amber-200 bg-amber-50/70'
        }`}
      >
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
            isEligible ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
          }`}
        >
          {isEligible ? <CheckCircle2 className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-semibold ${isEligible ? 'text-emerald-900' : 'text-amber-900'}`}>
            {isEligible ? 'Verified and active in allocation matching' : 'Pending verification'}
          </p>
          <p className={`mt-0.5 text-xs ${isEligible ? 'text-emerald-800/80' : 'text-amber-800/80'}`}>
            {isEligible
              ? 'This patient meets clinical criteria and is included when the matching engine ranks candidates.'
              : 'Upload the required reports below, or certify the patient manually once clinical review is complete.'}
          </p>
        </div>
        <span
          className={`hidden shrink-0 rounded-md px-2 py-0.5 text-2xs font-bold uppercase tracking-wider sm:inline ${
            isEligible ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
          }`}
        >
          {patient.verification_status || 'PENDING'}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left column */}
        <div className="space-y-6 lg:col-span-2">
          {/* Clinical profile */}
          <section className="card">
            <h2 className="mb-5 text-base font-bold text-gray-900">Clinical profile</h2>

            <dl className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
              <Field label="Age & gender">
                {patient.age} yrs · {patient.gender}
              </Field>
              <Field label="Blood group">
                <span className="font-mono font-bold">{patient.blood_group}</span>
              </Field>
              <Field label="Height / weight">
                {patient.height_cm ? `${patient.height_cm} cm` : '—'} / {patient.weight_kg ? `${patient.weight_kg} kg` : '—'}
              </Field>
              <Field label="BMI">{bmi ?? '—'}</Field>
              <div className="col-span-2 sm:col-span-4">
                <Field label="Diagnosis / cause">{patient.medical_condition || '—'}</Field>
              </div>
            </dl>

            {isDonor && patient.donor_profile && (
              <div className="mt-6 space-y-5 border-t border-gray-100 pt-6">
                <div className="flex flex-wrap gap-2">
                  <Flag on={patient.donor_profile.hypertension} label="Hypertension" />
                  <Flag on={patient.donor_profile.diabetes} label="Diabetes mellitus" />
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <Tile label="Renal history">{patient.donor_profile.renal_history || 'No pre-existing renal disease reported'}</Tile>
                  <Tile label="Cardiac history">{patient.donor_profile.cardiac_history || 'No prior cardiac events'}</Tile>
                  <Tile label="Infection history">{patient.donor_profile.infection_history || 'Serology clean'}</Tile>
                </div>
                <dl className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <Field label="Infectious disease screening">
                    {patient.donor_profile.infectious_disease_screening || '—'}
                  </Field>
                  <Field label="Relevant lab results">{patient.donor_profile.relevant_test_results || '—'}</Field>
                </dl>
              </div>
            )}

            {!isDonor && patient.receiver_profile && (
              <div className="mt-6 space-y-5 border-t border-gray-100 pt-6">
                <dl className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
                  <Field label="Required organ">
                    <OrganBadge organ={patient.receiver_profile.required_organ} size="sm" />
                  </Field>
                  <Field label="Clinical urgency">
                    <StatusBadge status={patient.receiver_profile.urgency_level} />
                  </Field>
                  <Field label="Listed since">
                    {patient.receiver_profile.waiting_start_date
                      ? new Date(patient.receiver_profile.waiting_start_date).toLocaleDateString()
                      : '—'}
                  </Field>
                  <Field label="Priority tier">{patient.receiver_profile.special_status || 'Standard'}</Field>
                </dl>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <Tile label="Dialysis">
                    <span className="font-semibold text-gray-900">
                      {patient.receiver_profile.dialysis_status || 'Not on dialysis'}
                    </span>
                    {patient.receiver_profile.dialysis_duration_months && (
                      <span className="mt-0.5 block text-2xs text-gray-500">
                        {patient.receiver_profile.dialysis_duration_months} months vintage
                      </span>
                    )}
                  </Tile>
                  <Tile label="Sensitisation">
                    <span className="font-semibold text-violet-700">CPRA {patient.receiver_profile.cpra ?? 0}%</span>
                    <span className="ml-1.5 text-2xs text-gray-500">PRA {patient.receiver_profile.pra ?? 0}%</span>
                  </Tile>
                  <Tile label="Crossmatch">
                    <span className="font-semibold text-gray-900">
                      {patient.receiver_profile.crossmatch_result || 'Pending'}
                    </span>
                    {(patient.receiver_profile.pediatric_status || patient.receiver_profile.prior_living_donor) && (
                      <span className="mt-1 flex gap-1.5">
                        {patient.receiver_profile.pediatric_status && (
                          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-3xs font-bold text-amber-800">Pediatric</span>
                        )}
                        {patient.receiver_profile.prior_living_donor && (
                          <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-3xs font-bold text-emerald-800">Prior donor</span>
                        )}
                      </span>
                    )}
                  </Tile>
                </div>

                <dl className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <Field label="HLA typing">
                    <span className="font-mono text-xs">{patient.receiver_profile.hla_typing || 'HLA typing pending'}</span>
                  </Field>
                  <Field label="Unacceptable HLA antibodies">
                    <span className="font-mono text-xs">{patient.receiver_profile.hla_antibodies || 'None detected'}</span>
                  </Field>
                </dl>
              </div>
            )}
          </section>

          {/* Uploaded evidence */}
          <section className="card">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-gray-900">Medical evidence</h2>
                <p className="mt-0.5 text-xs text-gray-500">
                  {reports.length} document{reports.length === 1 ? '' : 's'} on file
                </p>
              </div>
            </div>

            {reports.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/60 px-4 py-10 text-center">
                <FileText className="mx-auto h-8 w-8 text-gray-300" />
                <p className="mt-2 text-sm font-medium text-gray-700">No reports uploaded yet</p>
                <p className="text-xs text-gray-500">Upload a blood test and a medical examination report to verify this patient.</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200">
                {reports.map((r: any) => (
                  <li key={r.id} className="flex items-center gap-3 bg-white px-4 py-3 transition-colors hover:bg-gray-50/70">
                    <span className="icon-tile h-9 w-9 bg-teal-50 text-teal-600">
                      <FileText className="h-[18px] w-[18px]" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-gray-900">{formatType(r.report_type)}</p>
                      <p className="truncate text-xs text-gray-500">
                        {r.original_filename || 'document.pdf'} · {new Date(r.uploaded_at).toLocaleDateString()}
                      </p>
                    </div>
                    <span className="hidden items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-2xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20 sm:inline-flex">
                      <CheckCircle2 className="h-3 w-3" /> Verified
                    </span>
                    <button onClick={() => openReport(r)} className="btn-secondary px-3 py-1.5 text-xs">
                      <Eye className="h-3.5 w-3.5" /> View
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* Right column (shown first on small screens while verification is outstanding) */}
        <div className={`space-y-6 ${isEligible ? '' : 'order-first lg:order-none'}`}>
          {/* Verification checklist + upload */}
          <section className="card">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-bold text-gray-900">Verification</h2>
              <span className="text-xs font-semibold text-gray-500">
                {checklistDone}/{checklist.length} required
              </span>
            </div>

            <ul className="mb-5 space-y-2">
              {checklist.map((c) => (
                <li
                  key={c.type}
                  className={`flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-sm ${
                    c.done ? 'border-emerald-200 bg-emerald-50/60' : 'border-gray-200 bg-white'
                  }`}
                >
                  {c.done ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                  ) : (
                    <Circle className="h-4 w-4 shrink-0 text-gray-300" />
                  )}
                  <span className={`flex-1 font-medium ${c.done ? 'text-emerald-900' : 'text-gray-700'}`}>{c.label}</span>
                  {!c.done && (
                    <label
                      htmlFor="report-file"
                      onClick={() => setReportType(c.type)}
                      className="cursor-pointer text-xs font-semibold text-teal-600 hover:text-teal-700"
                    >
                      Upload
                    </label>
                  )}
                </li>
              ))}
            </ul>

            <div className="space-y-3 border-t border-gray-100 pt-5">
              <div>
                <label className="label" htmlFor="report-type">
                  Report type
                </label>
                <select id="report-type" value={reportType} onChange={(e) => setReportType(e.target.value)} className="input">
                  {REPORT_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              <label
                htmlFor="report-file"
                className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors ${
                  selectedFile ? 'border-teal-300 bg-teal-50/50' : 'border-gray-200 hover:border-teal-300 hover:bg-gray-50'
                }`}
              >
                <UploadCloud className={`h-7 w-7 ${selectedFile ? 'text-teal-600' : 'text-gray-400'}`} />
                {selectedFile ? (
                  <>
                    <span className="mt-2 max-w-full truncate text-sm font-semibold text-gray-900">{selectedFile.name}</span>
                    <span className="text-xs text-gray-500">{(selectedFile.size / 1024).toFixed(0)} KB · click to change</span>
                  </>
                ) : (
                  <>
                    <span className="mt-2 text-sm font-semibold text-gray-700">Choose a file</span>
                    <span className="text-xs text-gray-500">PDF, PNG or JPG</span>
                  </>
                )}
                <input
                  id="report-file"
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="sr-only"
                />
              </label>

              <button
                onClick={() => uploadMutation.mutate()}
                disabled={!selectedFile || uploadMutation.isPending}
                className="btn-primary w-full"
              >
                <UploadCloud className="h-4 w-4" />
                {uploadMutation.isPending ? 'Uploading…' : 'Upload & verify'}
              </button>
            </div>
          </section>

          {/* Organs (donors) */}
          {isDonor && (
            <section className="card">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-bold text-gray-900">Donated organs</h2>
                <button onClick={() => setShowAddOrgan(!showAddOrgan)} className="btn-secondary px-2.5 py-1 text-xs">
                  <Plus className="h-3.5 w-3.5" /> Add
                </button>
              </div>

              {showAddOrgan && (
                <div className="mb-4 space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-3">
                  <div>
                    <label className="label">Organ type</label>
                    <select value={newOrganType} onChange={(e) => setNewOrganType(e.target.value)} className="input">
                      <option value="KIDNEY">Kidney</option>
                      <option value="LIVER">Liver</option>
                      <option value="HEART">Heart</option>
                      <option value="LUNG">Lung</option>
                      <option value="PANCREAS">Pancreas</option>
                      <option value="CORNEA">Cornea</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">Condition</label>
                    <input
                      type="text"
                      value={newOrganCondition}
                      onChange={(e) => setNewOrganCondition(e.target.value)}
                      className="input"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button onClick={() => setShowAddOrgan(false)} className="btn-ghost px-3 py-1.5 text-xs">
                      Cancel
                    </button>
                    <button
                      onClick={() => organMutation.mutate()}
                      disabled={organMutation.isPending}
                      className="btn-primary px-3 py-1.5 text-xs"
                    >
                      Save organ
                    </button>
                  </div>
                </div>
              )}

              {organs.length === 0 ? (
                <p className="rounded-xl border border-dashed border-gray-200 py-6 text-center text-xs text-gray-400">
                  No organs registered yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {organs.map((org: any) => (
                    <div key={org.id} className="space-y-2 rounded-xl border border-gray-200 p-3.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <OrganBadge organ={org.organ_type} size="sm" />
                          <span className="font-mono text-2xs font-semibold text-gray-500">{org.organ_uid}</span>
                        </div>
                        <StatusBadge status={org.availability_status} />
                      </div>
                      <p className="text-xs text-gray-700">{org.organ_condition}</p>

                      {org.organ_type === 'KIDNEY' &&
                        (org.donor_creatinine || org.kidney_quality || org.preservation_method) && (
                          <div className="grid grid-cols-2 gap-2 border-t border-gray-100 pt-2 text-2xs">
                            {org.donor_creatinine && (
                              <div>
                                <span className="block text-gray-400">Creatinine</span>
                                <span className="font-semibold text-gray-800">{org.donor_creatinine} mg/dL</span>
                              </div>
                            )}
                            {org.kidney_quality && (
                              <div>
                                <span className="block text-gray-400">Quality</span>
                                <span className="font-semibold text-gray-800">{org.kidney_quality}</span>
                              </div>
                            )}
                            {org.preservation_method && (
                              <div className="col-span-2">
                                <span className="block text-gray-400">Preservation</span>
                                <span className="font-semibold text-gray-800">{org.preservation_method}</span>
                              </div>
                            )}
                          </div>
                        )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
      </div>

      {/* Document viewer */}
      <DocumentModal
        isOpen={!!viewPdfUrl}
        onClose={() => {
          if (viewPdfUrl) URL.revokeObjectURL(viewPdfUrl);
          setViewPdfUrl(null);
        }}
        title={viewPdfTitle}
        pdfBlobUrl={viewPdfUrl}
        downloadFilename={`${viewPdfTitle.replace(/[^\w]+/g, '_')}.pdf`}
      />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium text-gray-500">{label}</dt>
      <dd className="mt-1 text-sm font-medium text-gray-900">{children}</dd>
    </div>
  );
}

function Tile({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-3 text-xs text-gray-700">
      <span className="mb-1 block text-2xs font-semibold uppercase tracking-wider text-gray-400">{label}</span>
      {children}
    </div>
  );
}

function Flag({ on, label }: { on?: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${
        on ? 'bg-rose-50 text-rose-700 ring-rose-600/20' : 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${on ? 'bg-rose-500' : 'bg-emerald-500'}`} />
      {label}: {on ? 'Yes' : 'None'}
    </span>
  );
}
