import React, { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Activity, ArrowLeft, ShieldCheck, Clock, Dna, History, AlertCircle, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import { createPatient, uploadReport } from '../../api';

export default function AddReceiver() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // PDF Upload state
  const [bloodPdf, setBloodPdf] = useState<File | null>(null);
  const [examPdf, setExamPdf] = useState<File | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    age: '',
    gender: 'Female',
    blood_group: 'O+',
    height_cm: '162',
    weight_kg: '58',
    medical_condition: 'End-stage renal disease (ESRD) secondary to chronic glomerulonephritis.',
    required_organ: 'KIDNEY',
    urgency_level: 'HIGH',
    waiting_start_date: new Date().toISOString().split('T')[0],
    
    // Phase 2 Kidney Specific Variables
    dialysis_status: 'Hemodialysis (3x/week)',
    dialysis_start_date: new Date(Date.now() - 730 * 24 * 3600 * 1000).toISOString().split('T')[0],
    dialysis_duration_months: '24',
    previous_transplant: false,
    previous_graft_failure: false,
    number_of_previous_grafts: '0',
    pra: '15',
    cpra: '22',
    hla_typing: 'A*02, A*24, B*07, B*35, DRB1*04, DRB1*15',
    hla_antibodies: 'None detected',
    crossmatch_result: 'Negative (CDC & Flow Cytometry)',
    pediatric_status: false,
    prior_living_donor: false,
    special_status: 'Standard Waiting List',
    medical_history: 'Diagnosed CKD 3 years ago; on maintenance hemodialysis with functioning AV fistula.',
    medical_information: 'No active cardiovascular disease. Hepatitis and HIV seronegative.',
  });

  // Calculate BMI dynamically
  const bmiData = useMemo(() => {
    const h = parseFloat(formData.height_cm);
    const w = parseFloat(formData.weight_kg);
    if (!h || !w || h <= 0) return null;
    const heightInMeters = h / 100;
    const bmi = +(w / (heightInMeters * heightInMeters)).toFixed(1);
    let category = 'Normal';
    let color = 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (bmi < 18.5) {
      category = 'Underweight';
      color = 'bg-amber-50 text-amber-700 border-amber-200';
    } else if (bmi >= 25 && bmi < 30) {
      category = 'Overweight';
      color = 'bg-amber-50 text-amber-700 border-amber-200';
    } else if (bmi >= 30) {
      category = 'Obese';
      color = 'bg-rose-50 text-rose-700 border-rose-200';
    }
    return { bmi, category, color };
  }, [formData.height_cm, formData.weight_kg]);

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await createPatient({
        patient_type: 'RECEIVER',
        name: formData.name,
        age: Number(formData.age),
        gender: formData.gender,
        blood_group: formData.blood_group as any,
        height_cm: formData.height_cm ? parseFloat(formData.height_cm) : undefined,
        weight_kg: formData.weight_kg ? parseFloat(formData.weight_kg) : undefined,
        medical_condition: formData.medical_condition,
        receiver_profile: {
          required_organ: formData.required_organ as any,
          urgency_level: formData.urgency_level as any,
          waiting_start_date: new Date(formData.waiting_start_date).toISOString(),
          dialysis_status: formData.dialysis_status,
          dialysis_start_date: formData.dialysis_start_date ? new Date(formData.dialysis_start_date).toISOString() : undefined,
          dialysis_duration_months: formData.dialysis_duration_months ? parseInt(formData.dialysis_duration_months) : undefined,
          previous_transplant: formData.previous_transplant,
          previous_graft_failure: formData.previous_graft_failure,
          number_of_previous_grafts: parseInt(formData.number_of_previous_grafts) || 0,
          pra: formData.pra ? parseFloat(formData.pra) : undefined,
          cpra: formData.cpra ? parseFloat(formData.cpra) : undefined,
          hla_typing: formData.hla_typing,
          hla_antibodies: formData.hla_antibodies,
          crossmatch_result: formData.crossmatch_result,
          pediatric_status: formData.pediatric_status || Number(formData.age) < 18,
          prior_living_donor: formData.prior_living_donor,
          special_status: formData.special_status,
          medical_history: formData.medical_history,
          medical_information: formData.medical_information,
        },
      });

      const pId = res.data.id;
      if (bloodPdf) {
        try {
          await uploadReport(pId, 'BLOOD_TEST', bloodPdf);
        } catch (e) {
          console.error("Error uploading blood PDF", e);
        }
      }
      if (examPdf) {
        try {
          await uploadReport(pId, 'MEDICAL_EXAMINATION', examPdf);
        } catch (e) {
          console.error("Error uploading exam PDF", e);
        }
      }
      return res;
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['hospital-patients'] });
      queryClient.invalidateQueries({ queryKey: ['hospital-dashboard'] });
      toast.success('Recipient registered with verified PDF reports!');
      navigate(`/hospital/patients/${res.data.id}`);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || 'Failed to register recipient');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/hospital/receivers" className="btn-secondary p-2 rounded-lg text-gray-600">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Register Serious Kidney Candidate</h1>
          <p className="text-sm text-gray-500">
            Phase 2: Comprehensive recipient clinical record, dialysis history, and immunological profile
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Recipient Demographics & Anthropometrics */}
        <div className="card space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-600" />
              Patient Demographics & Anthropometrics
            </h2>
            {bmiData && (
              <div className={`px-3 py-1 rounded-full text-xs font-semibold border ${bmiData.color}`}>
                BMI: {bmiData.bmi} kg/m² ({bmiData.category})
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="label">Recipient Full Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Priya Sharma"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="label">Age *</label>
              <input
                type="number"
                required
                min={1}
                max={120}
                placeholder="e.g. 42"
                value={formData.age}
                onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                className="input"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="label">Gender *</label>
              <select
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                className="input"
              >
                <option value="Female">Female</option>
                <option value="Male">Male</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="label">ABO Blood Group *</label>
              <select
                value={formData.blood_group}
                onChange={(e) => setFormData({ ...formData, blood_group: e.target.value as any })}
                className="input font-semibold"
              >
                {['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map((bg) => (
                  <option key={bg} value={bg}>
                    {bg}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Height (cm) *</label>
              <input
                type="number"
                step="0.1"
                required
                placeholder="e.g. 162"
                value={formData.height_cm}
                onChange={(e) => setFormData({ ...formData, height_cm: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="label">Weight (kg) *</label>
              <input
                type="number"
                step="0.1"
                required
                placeholder="e.g. 58"
                value={formData.weight_kg}
                onChange={(e) => setFormData({ ...formData, weight_kg: e.target.value })}
                className="input"
              />
            </div>
          </div>

          <div>
            <label className="label">Medical Diagnosis / End-Stage Organ Failure Cause *</label>
            <textarea
              required
              rows={2}
              placeholder="e.g. End-Stage Renal Disease (ESRD) secondary to Diabetic Nephropathy; dialysis-dependent."
              value={formData.medical_condition}
              onChange={(e) => setFormData({ ...formData, medical_condition: e.target.value })}
              className="input"
            />
          </div>
        </div>

        {/* Dialysis & Prior Graft History */}
        <div className="card space-y-4">
          <h2 className="text-base font-semibold text-gray-900 pb-3 border-b border-gray-100 flex items-center gap-2">
            <History className="w-5 h-5 text-teal-600" />
            Dialysis & Prior Transplant History
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="label">Dialysis Modality Status *</label>
              <select
                value={formData.dialysis_status}
                onChange={(e) => setFormData({ ...formData, dialysis_status: e.target.value })}
                className="input font-medium"
              >
                <option value="Hemodialysis (3x/week)">Hemodialysis (3x/week)</option>
                <option value="Peritoneal Dialysis (CAPD/APD)">Peritoneal Dialysis (CAPD/APD)</option>
                <option value="Pre-emptive / Not on Dialysis">Pre-emptive / Not on Dialysis</option>
              </select>
            </div>
            <div>
              <label className="label">Dialysis Initiation Date</label>
              <input
                type="date"
                value={formData.dialysis_start_date}
                onChange={(e) => setFormData({ ...formData, dialysis_start_date: e.target.value })}
                className="input text-xs"
              />
            </div>
            <div>
              <label className="label">Total Dialysis Vintage (Months)</label>
              <input
                type="number"
                min="0"
                placeholder="e.g. 24"
                value={formData.dialysis_duration_months}
                onChange={(e) => setFormData({ ...formData, dialysis_duration_months: e.target.value })}
                className="input"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-teal-50/50 border border-teal-100">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.previous_transplant}
                onChange={(e) => setFormData({ ...formData, previous_transplant: e.target.checked })}
                className="w-4 h-4 text-teal-600 rounded border-gray-300 focus:ring-teal-500"
              />
              <div>
                <span className="text-xs font-semibold text-gray-900">Previous Transplant</span>
                <p className="text-2xs text-gray-500">History of prior organ allograft</p>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.previous_graft_failure}
                onChange={(e) => setFormData({ ...formData, previous_graft_failure: e.target.checked })}
                className="w-4 h-4 text-teal-600 rounded border-gray-300 focus:ring-teal-500"
              />
              <div>
                <span className="text-xs font-semibold text-gray-900">Previous Graft Failure</span>
                <p className="text-2xs text-gray-500">Re-listing following graft loss</p>
              </div>
            </label>

            <div>
              <label className="label text-2xs">Number of Previous Grafts</label>
              <input
                type="number"
                min="0"
                max="5"
                value={formData.number_of_previous_grafts}
                onChange={(e) => setFormData({ ...formData, number_of_previous_grafts: e.target.value })}
                className="input text-xs py-1"
              />
            </div>
          </div>
        </div>

        {/* Immunological Sensitization & Crossmatching */}
        <div className="card space-y-4">
          <h2 className="text-base font-semibold text-gray-900 pb-3 border-b border-gray-100 flex items-center gap-2">
            <Dna className="w-5 h-5 text-purple-600" />
            Immunological Profile & Sensitization (PRA / HLA)
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="label">PRA % (Panel Reactive Antibody)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                placeholder="e.g. 15.0"
                value={formData.pra}
                onChange={(e) => setFormData({ ...formData, pra: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="label">Calculated PRA (CPRA %)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                placeholder="e.g. 22.0"
                value={formData.cpra}
                onChange={(e) => setFormData({ ...formData, cpra: e.target.value })}
                className="input font-semibold text-purple-700"
              />
            </div>
            <div>
              <label className="label">Crossmatch Result</label>
              <select
                value={formData.crossmatch_result}
                onChange={(e) => setFormData({ ...formData, crossmatch_result: e.target.value })}
                className="input font-medium"
              >
                <option value="Negative (CDC & Flow Cytometry)">Negative (CDC & Flow Cytometry)</option>
                <option value="Negative (CDC only)">Negative (CDC only)</option>
                <option value="Pending">Pending</option>
                <option value="Positive (Requires Desensitization)">Positive (Requires Desensitization)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Recipient HLA Typing (A, B, DR loci)</label>
              <input
                type="text"
                placeholder="e.g. A*02, A*24, B*07, B*35, DRB1*04, DRB1*15"
                value={formData.hla_typing}
                onChange={(e) => setFormData({ ...formData, hla_typing: e.target.value })}
                className="input text-xs font-mono"
              />
            </div>
            <div>
              <label className="label">Unacceptable Donor HLA Antibodies</label>
              <input
                type="text"
                placeholder="e.g. Anti-A*01, Anti-B*08, or None detected"
                value={formData.hla_antibodies}
                onChange={(e) => setFormData({ ...formData, hla_antibodies: e.target.value })}
                className="input text-xs font-mono"
              />
            </div>
          </div>
        </div>

        {/* Transplant Waiting List & Priority Parameters */}
        <div className="card space-y-4">
          <h2 className="text-base font-semibold text-gray-900 pb-3 border-b border-gray-100 flex items-center gap-2">
            <Clock className="w-5 h-5 text-teal-600" />
            Transplant Waiting List Parameters & Priority Tier
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="label">Required Organ *</label>
              <select
                value={formData.required_organ}
                onChange={(e) => setFormData({ ...formData, required_organ: e.target.value })}
                className="input font-semibold"
              >
                <option value="KIDNEY">Kidney</option>
                <option value="LIVER">Liver</option>
                <option value="HEART">Heart</option>
                <option value="LUNG">Lung</option>
                <option value="PANCREAS">Pancreas</option>
                <option value="CORNEA">Cornea</option>
                <option value="OTHER">Other Organ</option>
              </select>
            </div>
            <div>
              <label className="label">Clinical Urgency Level *</label>
              <select
                value={formData.urgency_level}
                onChange={(e) => setFormData({ ...formData, urgency_level: e.target.value })}
                className="input font-semibold text-orange-700"
              >
                <option value="CRITICAL">Critical (40 pts)</option>
                <option value="HIGH">High Urgency (30 pts)</option>
                <option value="MEDIUM">Medium Urgency (20 pts)</option>
                <option value="LOW">Low Urgency (10 pts)</option>
              </select>
            </div>
            <div>
              <label className="label">Waiting / Listing Start Date *</label>
              <input
                type="date"
                required
                value={formData.waiting_start_date}
                onChange={(e) => setFormData({ ...formData, waiting_start_date: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="label">Special Status Category</label>
              <select
                value={formData.special_status}
                onChange={(e) => setFormData({ ...formData, special_status: e.target.value })}
                className="input text-xs"
              >
                <option value="Standard Waiting List">Standard Waiting List</option>
                <option value="Highly Sensitized (CPRA > 80%)">Highly Sensitized (CPRA &gt; 80%)</option>
                <option value="Status 1A Medical Priority">Status 1A Medical Priority</option>
                <option value="Prior Living Donor Priority">Prior Living Donor Priority</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-amber-50/50 border border-amber-200">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.pediatric_status || Number(formData.age) < 18}
                onChange={(e) => setFormData({ ...formData, pediatric_status: e.target.checked })}
                className="w-4 h-4 text-amber-600 rounded border-gray-300 focus:ring-amber-500"
              />
              <div>
                <span className="text-xs font-semibold text-gray-900">Pediatric Candidate (&lt;18 yrs)</span>
                <p className="text-2xs text-gray-500">Qualifies for pediatric organ allocation preference</p>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.prior_living_donor}
                onChange={(e) => setFormData({ ...formData, prior_living_donor: e.target.checked })}
                className="w-4 h-4 text-amber-600 rounded border-gray-300 focus:ring-amber-500"
              />
              <div>
                <span className="text-xs font-semibold text-gray-900">Prior Living Organ Donor</span>
                <p className="text-2xs text-gray-500">Highest regulatory allocation priority for living donors</p>
              </div>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Detailed Medical History</label>
              <textarea
                rows={2}
                placeholder="Etiology of ESRD, cardiovascular evaluation, past hospitalizations..."
                value={formData.medical_history}
                onChange={(e) => setFormData({ ...formData, medical_history: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="label">Transplant Coordinator Clinical Notes</label>
              <textarea
                rows={2}
                placeholder="Transplant clearance status, vascular access site, in-person consultation notes..."
                value={formData.medical_information}
                onChange={(e) => setFormData({ ...formData, medical_information: e.target.value })}
                className="input"
              />
            </div>
          </div>

          {/* PDF Medical Reports Upload (Optional) */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <span className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-teal-600" />
                Attach Medical Reports & Clinical Tests (PDF Format)
              </span>
              <span className="text-xs text-slate-600 bg-slate-200/80 px-2 py-0.5 rounded-full font-medium w-fit">
                Optional during registration
              </span>
            </div>
            <p className="text-xs text-slate-500">
              You can attach diagnostic PDFs now, or simply complete registration and upload/verify medical documents later from the Patient Verification page.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  1. Blood Test & HLA Typing Report (PDF) <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={(e) => setBloodPdf(e.target.files?.[0] || null)}
                  className="block w-full text-xs text-slate-600 file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100 cursor-pointer border border-slate-300 rounded-lg p-1 bg-white"
                />
                {bloodPdf && (
                  <span className="text-xs text-emerald-700 font-medium mt-1 inline-block">
                    ✓ Selected: {bloodPdf.name} ({(bloodPdf.size / 1024).toFixed(1)} KB)
                  </span>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  2. Medical History & Clinical Examination (PDF) <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={(e) => setExamPdf(e.target.files?.[0] || null)}
                  className="block w-full text-xs text-slate-600 file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100 cursor-pointer border border-slate-300 rounded-lg p-1 bg-white"
                />
                {examPdf && (
                  <span className="text-xs text-emerald-700 font-medium mt-1 inline-block">
                    ✓ Selected: {examPdf.name} ({(examPdf.size / 1024).toFixed(1)} KB)
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          <Link to="/hospital/receivers" className="btn-secondary">
            Cancel
          </Link>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="btn-primary inline-flex items-center gap-2"
          >
            <ShieldCheck className="w-4 h-4" />
            {mutation.isPending ? 'Registering Recipient...' : 'Complete Recipient Registration'}
          </button>
        </div>
      </form>
    </div>
  );
}

