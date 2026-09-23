import React, { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Heart, ArrowLeft, Plus, CheckCircle2, FileText, Activity, ShieldAlert, Clock, Stethoscope } from 'lucide-react';
import toast from 'react-hot-toast';
import { createPatient, addOrgan, uploadReport } from '../../api';

export default function AddDonor() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<'patient' | 'organs'>('patient');
  const [createdPatientId, setCreatedPatientId] = useState<number | null>(null);

  // Patient Form State
  const [patientData, setPatientData] = useState({
    name: '',
    age: '',
    gender: 'Male',
    blood_group: 'O+',
    height_cm: '175',
    weight_kg: '74',
    medical_condition: 'Brain death confirmed by clinical and EEG criteria. Hemodynamically maintained.',
    hypertension: false,
    diabetes: false,
    renal_history: 'No pre-existing renal disease, proteinuria, or nephrolithiasis.',
    cardiac_history: 'Normal ECG, no prior ischemic cardiac events, ejection fraction 60%.',
    infection_history: 'HIV, HBV, HCV serology negative; CMV IgG positive.',
    medical_history: 'No significant past chronic medical illnesses or trauma.',
    infectious_disease_screening: 'Screening negative for HIV 1/2, HBV, HCV, Syphilis.',
    relevant_test_results: 'Serum creatinine 0.92 mg/dL, normal electrolytes, urine output >100 mL/hr.',
    medical_information: 'Deceased donor. Brain death declaration and legal consent verified.',
  });

  // Calculate BMI dynamically
  const bmiData = useMemo(() => {
    const h = parseFloat(patientData.height_cm);
    const w = parseFloat(patientData.weight_kg);
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
  }, [patientData.height_cm, patientData.weight_kg]);

  // Organs Form State with Kidney Dataset extensions
  const [organs, setOrgans] = useState<Array<{
    organ_type: string;
    organ_condition: string;
    donor_creatinine?: string;
    kidney_function?: string;
    kidney_quality?: string;
    preservation_method?: string;
    retrieval_time?: string;
    preservation_start?: string;
  }>>([
    {
      organ_type: 'KIDNEY',
      organ_condition: 'Excellent vascular anatomy, both kidneys viable and perfused',
      donor_creatinine: '0.92',
      kidney_function: 'eGFR 98 mL/min/1.73m² (Normal/Optimal)',
      kidney_quality: 'Standard Criteria Donor (SCD)',
      preservation_method: 'Hypothermic Machine Perfusion (HMP)',
      retrieval_time: new Date().toISOString().slice(0, 16),
      preservation_start: new Date().toISOString().slice(0, 16),
    },
  ]);

  // PDF Upload state
  const [bloodPdf, setBloodPdf] = useState<File | null>(null);
  const [examPdf, setExamPdf] = useState<File | null>(null);

  const patientMutation = useMutation({
    mutationFn: async () => {
      const res = await createPatient({
        patient_type: 'DONOR',
        name: patientData.name,
        age: Number(patientData.age),
        gender: patientData.gender,
        blood_group: patientData.blood_group as any,
        height_cm: patientData.height_cm ? parseFloat(patientData.height_cm) : undefined,
        weight_kg: patientData.weight_kg ? parseFloat(patientData.weight_kg) : undefined,
        medical_condition: patientData.medical_condition,
        donor_profile: {
          hypertension: patientData.hypertension,
          diabetes: patientData.diabetes,
          renal_history: patientData.renal_history,
          cardiac_history: patientData.cardiac_history,
          infection_history: patientData.infection_history,
          medical_history: patientData.medical_history,
          infectious_disease_screening: patientData.infectious_disease_screening,
          relevant_test_results: patientData.relevant_test_results,
          medical_information: patientData.medical_information,
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
      const pId = res.data.id;
      setCreatedPatientId(pId);
      setStep('organs');
      toast.success('Donor profile registered & PDF reports attached! Now specify organ attributes.');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || 'Failed to register donor');
    },
  });

  const parseSafeIsoDate = (val?: string) => {
    if (!val || typeof val !== 'string' || !val.trim()) return undefined;
    const d = new Date(val);
    return isNaN(d.getTime()) ? undefined : d.toISOString();
  };

  const organMutation = useMutation({
    mutationFn: async () => {
      if (!createdPatientId) return;
      for (const organ of organs) {
        const creatinineNum = organ.donor_creatinine && !isNaN(parseFloat(organ.donor_creatinine))
          ? parseFloat(organ.donor_creatinine)
          : undefined;

        await addOrgan(createdPatientId, {
          organ_type: organ.organ_type as any,
          organ_condition: organ.organ_condition || undefined,
          donor_creatinine: creatinineNum,
          kidney_function: organ.kidney_function || undefined,
          kidney_quality: organ.kidney_quality || undefined,
          preservation_method: organ.preservation_method || undefined,
          retrieval_time: parseSafeIsoDate(organ.retrieval_time),
          preservation_start: parseSafeIsoDate(organ.preservation_start),
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hospital-patients'] });
      queryClient.invalidateQueries({ queryKey: ['hospital-dashboard'] });
      toast.success('Donor & organ data saved successfully!');
      navigate(`/hospital/patients/${createdPatientId}`);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.detail 
        || (typeof err?.message === 'string' ? err.message : 'Failed to register organs');
      toast.error(msg);
    },
  });

  const handlePatientSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    patientMutation.mutate();
  };

  const handleAddOrganField = () => {
    setOrgans((prev) => [
      ...prev,
      {
        organ_type: 'LIVER',
        organ_condition: 'Good condition, homogeneous parenchyma',
        donor_creatinine: '',
        kidney_function: '',
        kidney_quality: '',
        preservation_method: '',
        retrieval_time: '',
        preservation_start: '',
      },
    ]);
  };

  const handleRemoveOrganField = (index: number) => {
    if (organs.length <= 1) return;
    setOrgans((prev) => prev.filter((_, i) => i !== index));
  };

  const handleOrganChange = (index: number, field: string, value: any) => {
    setOrgans((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/hospital/donors" className="btn-secondary p-2 rounded-lg text-gray-600">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Register Serious Organ Donor</h1>
          <p className="text-sm text-gray-500">
            Phase 1 Kidney Dataset: Detailed clinical, comorbidity, preservation & biomarker parameters
          </p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center gap-4 bg-white p-4 rounded-xl border border-gray-200">
        <div className={`flex items-center gap-2 ${step === 'patient' ? 'text-teal-600 font-bold' : 'text-gray-500'}`}>
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs ${step === 'patient' ? 'bg-teal-600 text-white' : 'bg-gray-100'}`}>
            1
          </div>
          <span>Donor Clinical & Comorbidity Profile</span>
        </div>
        <div className="h-0.5 w-12 bg-gray-200" />
        <div className={`flex items-center gap-2 ${step === 'organs' ? 'text-teal-600 font-bold' : 'text-gray-400'}`}>
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs ${step === 'organs' ? 'bg-teal-600 text-white' : 'bg-gray-100'}`}>
            2
          </div>
          <span>Viable Organs & Preservation Protocol</span>
        </div>
      </div>

      {step === 'patient' ? (
        <form onSubmit={handlePatientSubmit} className="space-y-6">
          {/* Demographics & Biometrics */}
          <div className="card space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <Heart className="w-5 h-5 text-rose-500" />
                Donor Demographics & Anthropometrics
              </h2>
              {bmiData && (
                <div className={`px-3 py-1 rounded-full text-xs font-semibold border ${bmiData.color}`}>
                  BMI: {bmiData.bmi} kg/m² ({bmiData.category})
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="label">Donor Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={patientData.name}
                  onChange={(e) => setPatientData({ ...patientData, name: e.target.value })}
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
                  placeholder="e.g. 35"
                  value={patientData.age}
                  onChange={(e) => setPatientData({ ...patientData, age: e.target.value })}
                  className="input"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="label">Gender *</label>
                <select
                  value={patientData.gender}
                  onChange={(e) => setPatientData({ ...patientData, gender: e.target.value })}
                  className="input"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="label">ABO Blood Group *</label>
                <select
                  value={patientData.blood_group}
                  onChange={(e) => setPatientData({ ...patientData, blood_group: e.target.value as any })}
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
                  placeholder="e.g. 175"
                  value={patientData.height_cm}
                  onChange={(e) => setPatientData({ ...patientData, height_cm: e.target.value })}
                  className="input"
                />
              </div>
              <div>
                <label className="label">Weight (kg) *</label>
                <input
                  type="number"
                  step="0.1"
                  required
                  placeholder="e.g. 74"
                  value={patientData.weight_kg}
                  onChange={(e) => setPatientData({ ...patientData, weight_kg: e.target.value })}
                  className="input"
                />
              </div>
            </div>

            <div>
              <label className="label">Brain Death Etiology / Medical Diagnosis *</label>
              <textarea
                required
                rows={2}
                placeholder="e.g. Severe traumatic brain injury; brain death declared by authorized committee."
                value={patientData.medical_condition}
                onChange={(e) => setPatientData({ ...patientData, medical_condition: e.target.value })}
                className="input"
              />
            </div>
          </div>

          {/* Phase 1 Comorbidities & Organ-Specific Medical History */}
          <div className="card space-y-4">
            <h2 className="text-base font-semibold text-gray-900 pb-3 border-b border-gray-100 flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-indigo-600" />
              Donor Clinical Comorbidities & Medical History
            </h2>

            {/* Checkbox Comorbidities */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-indigo-50/50 border border-indigo-100">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={patientData.hypertension}
                  onChange={(e) => setPatientData({ ...patientData, hypertension: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                />
                <div>
                  <span className="text-sm font-semibold text-gray-900">Hypertension</span>
                  <p className="text-xs text-gray-500">History of elevated blood pressure or antihypertensive therapy</p>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={patientData.diabetes}
                  onChange={(e) => setPatientData({ ...patientData, diabetes: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                />
                <div>
                  <span className="text-sm font-semibold text-gray-900">Diabetes Mellitus</span>
                  <p className="text-xs text-gray-500">Documented Type 1 / Type 2 diabetes or insulin treatment</p>
                </div>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="label">Renal History</label>
                <textarea
                  rows={2}
                  placeholder="Pre-existing renal disease, proteinuria, acute kidney injury..."
                  value={patientData.renal_history}
                  onChange={(e) => setPatientData({ ...patientData, renal_history: e.target.value })}
                  className="input text-xs"
                />
              </div>
              <div>
                <label className="label">Cardiac History</label>
                <textarea
                  rows={2}
                  placeholder="Prior CAD, MI, arrhythmias, ejection fraction..."
                  value={patientData.cardiac_history}
                  onChange={(e) => setPatientData({ ...patientData, cardiac_history: e.target.value })}
                  className="input text-xs"
                />
              </div>
              <div>
                <label className="label">Infection History</label>
                <textarea
                  rows={2}
                  placeholder="Sepsis, bacteremia, serology (CMV, EBV, HIV, HCV)..."
                  value={patientData.infection_history}
                  onChange={(e) => setPatientData({ ...patientData, infection_history: e.target.value })}
                  className="input text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Infectious Disease Screening Summary</label>
                <textarea
                  rows={2}
                  value={patientData.infectious_disease_screening}
                  onChange={(e) => setPatientData({ ...patientData, infectious_disease_screening: e.target.value })}
                  className="input"
                />
              </div>
              <div>
                <label className="label">Relevant Lab Results & Baseline Creatinine</label>
                <textarea
                  rows={2}
                  value={patientData.relevant_test_results}
                  onChange={(e) => setPatientData({ ...patientData, relevant_test_results: e.target.value })}
                  className="input"
                />
              </div>
            </div>

            <div>
              <label className="label">Additional Clinical Notes</label>
              <textarea
                rows={2}
                placeholder="Hemodynamic stability, inotrope support, urine output..."
                value={patientData.medical_information}
                onChange={(e) => setPatientData({ ...patientData, medical_information: e.target.value })}
                className="input"
              />
            </div>

            {/* PDF Medical Reports Upload (Optional) */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <span className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-teal-600" />
                  Attach Medical Reports & Clinical Descriptions (PDF Format)
                </span>
                <span className="text-xs text-slate-600 bg-slate-200/80 px-2 py-0.5 rounded-full font-medium w-fit">
                  Optional during registration
                </span>
              </div>
              <p className="text-xs text-slate-500">
                You can attach diagnostic PDFs now, or complete registration and attach/verify supporting reports later from the Patient Verification page.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    1. Blood Test & ABO Typing Report (PDF) <span className="text-slate-400 font-normal">(Optional)</span>
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
                    2. Medical Examination & Clinical History (PDF) <span className="text-slate-400 font-normal">(Optional)</span>
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
            <Link to="/hospital/donors" className="btn-secondary">
              Cancel
            </Link>
            <button
              type="submit"
              disabled={patientMutation.isPending}
              className="btn-primary"
            >
              {patientMutation.isPending ? 'Saving Profile...' : 'Next: Specify Organs & Kidney Data →'}
            </button>
          </div>
        </form>
      ) : (
        /* Step 2: Organs Form */
        <div className="card space-y-6">
          <div className="pb-3 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Organs to be Donated & Preservation Parameters</h2>
              <p className="text-xs text-gray-500">Deep kidney biomarker and preservation profile for allocation precision</p>
            </div>
            <button
              type="button"
              onClick={handleAddOrganField}
              className="btn-secondary text-xs inline-flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Add Another Organ
            </button>
          </div>

          <div className="space-y-6">
            {organs.map((organ, index) => (
              <div key={index} className="p-5 rounded-xl bg-gray-50 border border-gray-200 space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                  <span className="text-xs font-bold uppercase tracking-wider text-teal-800 bg-teal-100 px-2.5 py-1 rounded-md">
                    Organ #{index + 1}: {organ.organ_type}
                  </span>
                  {organs.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveOrganField(index)}
                      className="text-xs text-red-600 hover:underline font-medium"
                    >
                      Remove Organ
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Organ Type *</label>
                    <select
                      value={organ.organ_type}
                      onChange={(e) => handleOrganChange(index, 'organ_type', e.target.value)}
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
                    <label className="label">Organ Condition / Morphologic Assessment</label>
                    <input
                      type="text"
                      placeholder="e.g. Normal morphology, bilateral viable"
                      value={organ.organ_condition}
                      onChange={(e) => handleOrganChange(index, 'organ_condition', e.target.value)}
                      className="input"
                    />
                  </div>
                </div>

                {/* Specialized Kidney Dataset Fields */}
                {organ.organ_type === 'KIDNEY' && (
                  <div className="p-4 rounded-xl bg-white border border-teal-200 space-y-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-teal-900 border-b border-teal-100 pb-2">
                      <Activity className="w-4 h-4 text-teal-600" />
                      Kidney Clinical Biomarkers & Quality Classification
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="label">Donor Serum Creatinine (mg/dL) *</label>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="e.g. 0.92"
                          value={organ.donor_creatinine || ''}
                          onChange={(e) => handleOrganChange(index, 'donor_creatinine', e.target.value)}
                          className="input font-medium"
                        />
                      </div>
                      <div>
                        <label className="label">Estimated Kidney Function / eGFR</label>
                        <input
                          type="text"
                          placeholder="e.g. eGFR 98 mL/min/1.73m² (Normal)"
                          value={organ.kidney_function || ''}
                          onChange={(e) => handleOrganChange(index, 'kidney_function', e.target.value)}
                          className="input"
                        />
                      </div>
                      <div>
                        <label className="label">Donor Quality Category</label>
                        <select
                          value={organ.kidney_quality || 'Standard Criteria Donor (SCD)'}
                          onChange={(e) => handleOrganChange(index, 'kidney_quality', e.target.value)}
                          className="input font-medium"
                        >
                          <option value="Standard Criteria Donor (SCD)">Standard Criteria Donor (SCD)</option>
                          <option value="Expanded Criteria Donor (ECD)">Expanded Criteria Donor (ECD)</option>
                          <option value="Donation after Circulatory Death (DCD)">Donation after Circulatory Death (DCD)</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-sm font-semibold text-teal-900 border-b border-teal-100 pb-2 pt-2">
                      <Clock className="w-4 h-4 text-teal-600" />
                      Preservation & Cold Ischemia Timing
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="label">Preservation Method</label>
                        <select
                          value={organ.preservation_method || 'Hypothermic Machine Perfusion (HMP)'}
                          onChange={(e) => handleOrganChange(index, 'preservation_method', e.target.value)}
                          className="input font-medium"
                        >
                          <option value="Hypothermic Machine Perfusion (HMP)">Hypothermic Machine Perfusion (HMP)</option>
                          <option value="Static Cold Storage (SCS)">Static Cold Storage (SCS)</option>
                          <option value="Normothermic Machine Perfusion (NMP)">Normothermic Machine Perfusion (NMP)</option>
                        </select>
                      </div>
                      <div>
                        <label className="label">Retrieval Time (Cross-Clamp)</label>
                        <input
                          type="datetime-local"
                          value={organ.retrieval_time || ''}
                          onChange={(e) => handleOrganChange(index, 'retrieval_time', e.target.value)}
                          className="input text-xs"
                        />
                      </div>
                      <div>
                        <label className="label">Preservation Perfusion Start</label>
                        <input
                          type="datetime-local"
                          value={organ.preservation_start || ''}
                          onChange={(e) => handleOrganChange(index, 'preservation_start', e.target.value)}
                          className="input text-xs"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={() => organMutation.mutate()}
              disabled={organMutation.isPending}
              className="btn-primary inline-flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              {organMutation.isPending ? 'Registering Organs...' : 'Complete Donor Registration'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

