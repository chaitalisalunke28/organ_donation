"""
Seed Demo Data
==============
Creates initial users and demo hospitals for testing the end-to-end workflow.
Run: python seed_data.py
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal, engine, Base
from app.models import *  # noqa
from app.models.enums import UserRole, HospitalStatus
from app.core.security import get_password_hash
from datetime import datetime, timezone, timedelta


def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    # ── Admin ────────────────────────────────────────────────────────────
    if not db.query(User).filter(User.email == "admin@organalloc.com").first():
        admin = User(
            name="System Admin",
            email="admin@organalloc.com",
            password_hash=get_password_hash("admin123"),
            role=UserRole.ADMIN,
            is_active=True,
        )
        db.add(admin)
        print("[OK] Admin created")

    # ── Coordinator ───────────────────────────────────────────────────────
    if not db.query(User).filter(User.email == "coordinator@organalloc.com").first():
        coord = User(
            name="Dr. Sarah Williams",
            email="coordinator@organalloc.com",
            password_hash=get_password_hash("coord123"),
            role=UserRole.COORDINATOR,
            is_active=True,
        )
        db.add(coord)
        print("[OK] Coordinator created")

    db.flush()

    # ── Hospital A ────────────────────────────────────────────────────────
    hosp_a = db.query(Hospital).filter(Hospital.hospital_id == "HOSP-A").first()
    if not hosp_a:
        hosp_a = Hospital(
            hospital_id="HOSP-A",
            name="City General Hospital",
            address="123 Medical Drive",
            city="Mumbai",
            state="Maharashtra",
            contact="9876543210",
            email="info@citygeneral.com",
            hospital_type="Government",
            verification_status="VERIFIED",
            status=HospitalStatus.ACTIVE,
        )
        db.add(hosp_a)
        db.flush()
        user_a = User(
            name="Hospital A Admin",
            email="hospitala@organalloc.com",
            password_hash=get_password_hash("hospital123"),
            role=UserRole.HOSPITAL,
            hospital_id=hosp_a.id,
            is_active=True,
        )
        db.add(user_a)
        print("[OK] Hospital A created")

    # ── Hospital B ────────────────────────────────────────────────────────
    hosp_b = db.query(Hospital).filter(Hospital.hospital_id == "HOSP-B").first()
    if not hosp_b:
        hosp_b = Hospital(
            hospital_id="HOSP-B",
            name="Apollo Medical Center",
            address="456 Health Avenue",
            city="Pune",
            state="Maharashtra",
            contact="9876543211",
            email="info@apollo.com",
            hospital_type="Private",
            verification_status="VERIFIED",
            status=HospitalStatus.ACTIVE,
        )
        db.add(hosp_b)
        db.flush()
        user_b = User(
            name="Hospital B Admin",
            email="hospitalb@organalloc.com",
            password_hash=get_password_hash("hospital123"),
            role=UserRole.HOSPITAL,
            hospital_id=hosp_b.id,
            is_active=True,
        )
        db.add(user_b)
        print("[OK] Hospital B created")

    # ── Hospital C ────────────────────────────────────────────────────────
    hosp_c = db.query(Hospital).filter(Hospital.hospital_id == "HOSP-C").first()
    if not hosp_c:
        hosp_c = Hospital(
            hospital_id="HOSP-C",
            name="Sunrise Multispeciality",
            address="789 Care Street",
            city="Nashik",
            state="Maharashtra",
            contact="9876543212",
            email="info@sunrise.com",
            hospital_type="Private",
            verification_status="VERIFIED",
            status=HospitalStatus.ACTIVE,
        )
        db.add(hosp_c)
        db.flush()
        user_c = User(
            name="Hospital C Admin",
            email="hospitalc@organalloc.com",
            password_hash=get_password_hash("hospital123"),
            role=UserRole.HOSPITAL,
            hospital_id=hosp_c.id,
            is_active=True,
        )
        db.add(user_c)
        print("[OK] Hospital C created")

    db.commit()

    # Reload after commit
    hosp_a = db.query(Hospital).filter(Hospital.hospital_id == "HOSP-A").first()
    hosp_b = db.query(Hospital).filter(Hospital.hospital_id == "HOSP-B").first()
    hosp_c = db.query(Hospital).filter(Hospital.hospital_id == "HOSP-C").first()

    # ── Demo Donor D001 (Hospital A) ──────────────────────────────────────
    if not db.query(Patient).filter(Patient.patient_uid == "D001").first():
        from app.models.enums import BloodGroup, EligibilityStatus
        donor = Patient(
            patient_uid="D001",
            hospital_id=hosp_a.id,
            patient_type="DONOR",
            name="Ramesh Kumar",
            age=35,
            gender="Male",
            blood_group=BloodGroup.O_POS,
            height_cm=175.0,
            weight_kg=74.0,
            medical_condition="Brain death confirmed. Organs viable for donation.",
            eligibility_status=EligibilityStatus.PENDING_VERIFICATION,
            verification_status="PENDING",
        )
        db.add(donor)
        db.flush()

        dp = DonorProfile(
            patient_id=donor.id,
            hypertension=False,
            diabetes=False,
            renal_history="No pre-existing renal disease or proteinuria",
            cardiac_history="Normal ECG, no prior ischemic cardiac events",
            infection_history="HIV, HBV, HCV serology negative; CMV IgG positive",
            medical_history="No significant past chronic illnesses",
            infectious_disease_screening="HIV/HBV/HCV negative, Syphilis non-reactive",
            relevant_test_results="Serum creatinine 0.92 mg/dL, normal electrolytes and urinalysis",
            medical_information="Deceased donor. Brain death declaration on file. Consents obtained.",
        )
        db.add(dp)
        db.flush()

        # Organs (Phase 19 Multi-Organ Procurement from Donor D001)
        now_utc = datetime.now(timezone.utc)
        kidney = Organ(
            organ_uid="K001",
            donor_patient_id=donor.id,
            organ_type="KIDNEY",
            organ_condition="Excellent vascular anatomy, single renal artery/vein",
            donor_creatinine=0.92,
            kidney_function="eGFR 98 mL/min/1.73m² (Normal/Optimal)",
            kidney_quality="Standard Criteria Donor (SCD)",
            retrieval_time=now_utc - timedelta(hours=3),
            preservation_start=now_utc - timedelta(hours=2, minutes=45),
            preservation_method="Hypothermic Machine Perfusion (HMP)",
            availability_status="AVAILABLE",
        )
        kidney_r = Organ(
            organ_uid="K002",
            donor_patient_id=donor.id,
            organ_type="KIDNEY",
            organ_condition="Right kidney, normal perfusion, intact capsule",
            donor_creatinine=0.92,
            kidney_function="eGFR 98 mL/min/1.73m² (Normal/Optimal)",
            kidney_quality="Standard Criteria Donor (SCD)",
            retrieval_time=now_utc - timedelta(hours=3),
            preservation_start=now_utc - timedelta(hours=2, minutes=45),
            preservation_method="Static Cold Storage (SCS)",
            availability_status="AVAILABLE",
        )
        liver = Organ(
            organ_uid="L001",
            donor_patient_id=donor.id,
            organ_type="LIVER",
            organ_condition="Good condition, smooth capsule, non-steatotic (5% macrosteatosis)",
            donor_bilirubin=0.8,
            donor_ast=32.0,
            donor_alt=28.0,
            donor_inr=1.05,
            donor_albumin=4.2,
            liver_steatosis_pct=5.0,
            liver_condition="Normal parenchyma, intact biliary anatomy",
            retrieval_time=now_utc - timedelta(hours=2),
            preservation_start=now_utc - timedelta(hours=1, minutes=45),
            preservation_method="Static Cold Storage (SCS - University of Wisconsin solution)",
            availability_status="AVAILABLE",
        )
        heart = Organ(
            organ_uid="H001",
            donor_patient_id=donor.id,
            organ_type="HEART",
            organ_condition="Normal cardiac structure, no coronary stenosis, LVEF 65%",
            donor_lvef=65.0,
            donor_inotrope_support="None",
            donor_coronary_angiogram="Normal coronary arteries, zero calcium score",
            cardiac_arrest_downtime_minutes=0,
            retrieval_time=now_utc - timedelta(hours=1),
            preservation_start=now_utc - timedelta(hours=0, minutes=45),
            preservation_method="Hypothermic Machine Perfusion (Organ Care System)",
            availability_status="AVAILABLE",
        )
        lung = Organ(
            organ_uid="LU001",
            donor_patient_id=donor.id,
            organ_type="LUNG",
            organ_condition="Clear bilateral lung fields, PaO2/FiO2 ratio 440 mmHg",
            donor_pao2_fio2_ratio=440.0,
            donor_bronchoscopy="Normal bronchial tree, minimal clear secretions",
            donor_chest_xray="Bilateral clear lung fields, no infiltrates",
            retrieval_time=now_utc - timedelta(hours=1, minutes=30),
            preservation_start=now_utc - timedelta(hours=1, minutes=15),
            preservation_method="Low-Potassium Dextran Flush (Perfadex)",
            availability_status="AVAILABLE",
        )
        db.add(kidney)
        db.add(kidney_r)
        db.add(liver)
        db.add(heart)
        db.add(lung)

        # Medical reports (generate real PDF files on disk)
        from app.services.pdf_service import generate_sample_medical_report_pdf
        demo_dir = os.path.join("uploads", "demo")
        os.makedirs(demo_dir, exist_ok=True)

        d_blood_path = os.path.join(demo_dir, "d001_blood_test.pdf")
        with open(d_blood_path, "wb") as f:
            f.write(generate_sample_medical_report_pdf("Ramesh Kumar", "D001", "BLOOD_TEST", "City General Hospital", "O+"))

        d_exam_path = os.path.join(demo_dir, "d001_exam.pdf")
        with open(d_exam_path, "wb") as f:
            f.write(generate_sample_medical_report_pdf("Ramesh Kumar", "D001", "MEDICAL_EXAMINATION", "City General Hospital", "O+"))

        r1 = MedicalReport(patient_id=donor.id, report_type="BLOOD_TEST", file_path=d_blood_path, original_filename="blood_test.pdf", verification_status="VERIFIED")
        r2 = MedicalReport(patient_id=donor.id, report_type="MEDICAL_EXAMINATION", file_path=d_exam_path, original_filename="medical_exam.pdf", verification_status="VERIFIED")
        db.add(r1)
        db.add(r2)
        db.flush()

        # Run eligibility
        from app.services.eligibility import run_eligibility_check
        result = run_eligibility_check(donor.id, db)
        print(f"[OK] Donor D001 created — eligibility: {result['status']}")

    # ── Demo Receiver R001 (Hospital B) ───────────────────────────────────
    if not db.query(Patient).filter(Patient.patient_uid == "R001").first():
        from app.models.enums import BloodGroup, EligibilityStatus, CandidateStatus
        recv1 = Patient(
            patient_uid="R001",
            hospital_id=hosp_b.id,
            patient_type="RECEIVER",
            name="Priya Sharma",
            age=42,
            gender="Female",
            blood_group=BloodGroup.O_POS,
            height_cm=162.0,
            weight_kg=58.0,
            medical_condition="Chronic Kidney Disease Stage 5. Hemodialysis dependent.",
            eligibility_status=EligibilityStatus.PENDING_VERIFICATION,
            candidate_status=CandidateStatus.ACTIVE,
            verification_status="PENDING",
        )
        db.add(recv1)
        db.flush()

        rp1 = ReceiverProfile(
            patient_id=recv1.id,
            required_organ="KIDNEY",
            urgency_level="HIGH",
            waiting_start_date=datetime.now(timezone.utc) - timedelta(days=245),
            dialysis_status="Hemodialysis (3x/week)",
            dialysis_start_date=datetime.now(timezone.utc) - timedelta(days=730),
            dialysis_duration_months=24,
            previous_transplant=False,
            previous_graft_failure=False,
            number_of_previous_grafts=0,
            pra=15.0,
            cpra=22.0,
            hla_typing="A*02, A*24, B*07, B*35, DRB1*04, DRB1*15",
            hla_antibodies="None detected",
            crossmatch_result="Negative (CDC & Flow Cytometry)",
            pediatric_status=False,
            prior_living_donor=False,
            special_status="Standard Waiting List",
            medical_history="Diagnosed CKD 3 years ago secondary to IgA nephropathy",
            medical_information="On maintenance hemodialysis via left AV fistula. Immunologically suitable.",
        )
        db.add(rp1)

        r1_blood_path = os.path.join(demo_dir, "r001_blood_test.pdf")
        with open(r1_blood_path, "wb") as f:
            f.write(generate_sample_medical_report_pdf("Priya Sharma", "R001", "BLOOD_TEST", "Apollo Medical Center", "O+"))

        r1_exam_path = os.path.join(demo_dir, "r001_exam.pdf")
        with open(r1_exam_path, "wb") as f:
            f.write(generate_sample_medical_report_pdf("Priya Sharma", "R001", "MEDICAL_EXAMINATION", "Apollo Medical Center", "O+"))

        r3 = MedicalReport(patient_id=recv1.id, report_type="BLOOD_TEST", file_path=r1_blood_path, original_filename="blood_test.pdf", verification_status="VERIFIED")
        r4 = MedicalReport(patient_id=recv1.id, report_type="MEDICAL_EXAMINATION", file_path=r1_exam_path, original_filename="medical_exam.pdf", verification_status="VERIFIED")
        db.add(r3)
        db.add(r4)
        db.flush()

        from app.services.eligibility import run_eligibility_check
        result = run_eligibility_check(recv1.id, db)
        print(f"[OK] Receiver R001 (Hospital B) created — eligibility: {result['status']}")

        # Seed Apollo readiness checklist
        readiness_b = HospitalReadiness(
            hospital_id=hosp_b.id,
            patient_id=recv1.id,
            hospital_verified=True,
            recipient_ready=True,
            icu_available=True,
            ot_available=True,
            surgeon_available=True,
            transplant_team_available=True,
            required_equipment=True,
            blood_bank_ready=True,
            recipient_present=True,
            documents_complete=True,
            readiness_status="READY",
            readiness_score=100.0,
            estimated_prep_minutes=30,
            reported_by="Apollo Transplant Coordinator",
        )
        db.add(readiness_b)

    # ── Demo Receiver R002 (Hospital C) ───────────────────────────────────
    if not db.query(Patient).filter(Patient.patient_uid == "R002").first():
        from app.models.enums import BloodGroup, EligibilityStatus, CandidateStatus
        recv2 = Patient(
            patient_uid="R002",
            hospital_id=hosp_c.id,
            patient_type="RECEIVER",
            name="Arjun Mehta",
            age=38,
            gender="Male",
            blood_group=BloodGroup.A_POS,
            height_cm=178.0,
            weight_kg=78.0,
            medical_condition="End-stage renal disease secondary to hypertension. On transplant waiting list.",
            eligibility_status=EligibilityStatus.PENDING_VERIFICATION,
            candidate_status=CandidateStatus.ACTIVE,
            verification_status="PENDING",
        )
        db.add(recv2)
        db.flush()

        rp2 = ReceiverProfile(
            patient_id=recv2.id,
            required_organ="KIDNEY",
            urgency_level="CRITICAL",
            waiting_start_date=datetime.now(timezone.utc) - timedelta(days=180),
            dialysis_status="Hemodialysis (3x/week)",
            dialysis_start_date=datetime.now(timezone.utc) - timedelta(days=420),
            dialysis_duration_months=14,
            previous_transplant=False,
            previous_graft_failure=False,
            number_of_previous_grafts=0,
            pra=5.0,
            cpra=10.0,
            hla_typing="A*01, A*03, B*08, B*44, DRB1*03, DRB1*07",
            hla_antibodies="None detected",
            crossmatch_result="Negative",
            pediatric_status=False,
            prior_living_donor=False,
            special_status="High Urgency Status",
            medical_history="ESRD secondary to hypertensive nephrosclerosis",
            medical_information="Dialysis access via right internal jugular permcath. Priority candidate.",
        )
        db.add(rp2)

        r2_blood_path = os.path.join(demo_dir, "r002_blood_test.pdf")
        with open(r2_blood_path, "wb") as f:
            f.write(generate_sample_medical_report_pdf("Arjun Mehta", "R002", "BLOOD_TEST", "Sunrise Multispeciality", "A+"))

        r2_exam_path = os.path.join(demo_dir, "r002_exam.pdf")
        with open(r2_exam_path, "wb") as f:
            f.write(generate_sample_medical_report_pdf("Arjun Mehta", "R002", "MEDICAL_EXAMINATION", "Sunrise Multispeciality", "A+"))

        r5 = MedicalReport(patient_id=recv2.id, report_type="BLOOD_TEST", file_path=r2_blood_path, original_filename="blood_test.pdf", verification_status="VERIFIED")
        r6 = MedicalReport(patient_id=recv2.id, report_type="MEDICAL_EXAMINATION", file_path=r2_exam_path, original_filename="medical_exam.pdf", verification_status="VERIFIED")
        db.add(r5)
        db.add(r6)
        db.flush()

        from app.services.eligibility import run_eligibility_check
        result = run_eligibility_check(recv2.id, db)
        print(f"[OK] Receiver R002 (Hospital C) created — eligibility: {result['status']}")

        # Seed Sunrise readiness checklist
        readiness_c = HospitalReadiness(
            hospital_id=hosp_c.id,
            patient_id=recv2.id,
            hospital_verified=True,
            recipient_ready=True,
            icu_available=True,
            ot_available=True,
            surgeon_available=True,
            transplant_team_available=True,
            required_equipment=True,
            blood_bank_ready=True,
            recipient_present=True,
            documents_complete=True,
            readiness_status="READY",
            readiness_score=100.0,
            estimated_prep_minutes=30,
            reported_by="Sunrise Chief Medical Officer",
        )
        db.add(readiness_c)

    # ── Demo Receiver R003 (Hospital B — Temporarily Unavailable Safeguard Test) ──
    if not db.query(Patient).filter(Patient.patient_uid == "R003").first():
        from app.models.enums import BloodGroup, EligibilityStatus, CandidateStatus
        recv3 = Patient(
            patient_uid="R003",
            hospital_id=hosp_b.id,
            patient_type="RECEIVER",
            name="Vikram Singh",
            age=51,
            gender="Male",
            blood_group=BloodGroup.O_POS,
            height_cm=170.0,
            weight_kg=68.0,
            medical_condition="ESRD on maintenance hemodialysis. Intercurrent acute respiratory infection.",
            eligibility_status=EligibilityStatus.PENDING_VERIFICATION,
            candidate_status=CandidateStatus.TEMPORARILY_UNAVAILABLE,  # Phase 7 safeguard
            verification_status="PENDING",
        )
        db.add(recv3)
        db.flush()

        rp3 = ReceiverProfile(
            patient_id=recv3.id,
            required_organ="KIDNEY",
            urgency_level="MEDIUM",
            waiting_start_date=datetime.now(timezone.utc) - timedelta(days=300),
            dialysis_status="Hemodialysis (3x/week)",
            dialysis_duration_months=30,
            special_status="Temporarily Paused (Fever / Active Infection)",
        )
        db.add(rp3)
        db.flush()
        print("[OK] Receiver R003 (Hospital B) created with status TEMPORARILY_UNAVAILABLE (Phase 7 Safeguard)")

        # ── Demo Liver Candidates (Phase 16) ──────────────────────────────
        if not db.query(Patient).filter(Patient.patient_uid == "R_LIV_01").first():
            recv_liv1 = Patient(
                patient_uid="R_LIV_01",
                hospital_id=hosp_b.id,
                patient_type="RECEIVER",
                name="Vijay Patel",
                age=48,
                gender="Male",
                blood_group=BloodGroup.O_POS,
                height_cm=172.0,
                weight_kg=72.0,
                medical_condition="Decompensated Cirrhosis secondary to NASH, refractory ascites.",
                eligibility_status=EligibilityStatus.ELIGIBLE,
                candidate_status=CandidateStatus.ACTIVE,
                verification_status="VERIFIED",
            )
            db.add(recv_liv1)
            db.flush()

            rp_liv1 = ReceiverProfile(
                patient_id=recv_liv1.id,
                required_organ="LIVER",
                urgency_level="HIGH",
                waiting_start_date=datetime.now(timezone.utc) - timedelta(days=180),
                liver_diagnosis="Decompensated Cirrhosis (NASH)",
                meld_score=28.0,
                receiver_bilirubin=3.8,
                receiver_inr=2.1,
                receiver_creatinine=1.9,
                receiver_sodium=132.0,
                dialysis_past_week=False,
                special_status="MELD-Na 28 Listed",
            )
            db.add(rp_liv1)
            print("[OK] Receiver R_LIV_01 (Liver - MELD 28) created")

        if not db.query(Patient).filter(Patient.patient_uid == "R_LIV_02").first():
            recv_liv2 = Patient(
                patient_uid="R_LIV_02",
                hospital_id=hosp_c.id,
                patient_type="RECEIVER",
                name="Sunita Roy",
                age=31,
                gender="Female",
                blood_group=BloodGroup.A_POS,
                height_cm=160.0,
                weight_kg=54.0,
                medical_condition="Acute Fulminant Hepatic Failure, Grade IV hepatic encephalopathy.",
                eligibility_status=EligibilityStatus.ELIGIBLE,
                candidate_status=CandidateStatus.ACTIVE,
                verification_status="VERIFIED",
            )
            db.add(recv_liv2)
            db.flush()

            rp_liv2 = ReceiverProfile(
                patient_id=recv_liv2.id,
                required_organ="LIVER",
                urgency_level="CRITICAL",
                waiting_start_date=datetime.now(timezone.utc) - timedelta(days=5),
                liver_diagnosis="Fulminant Hepatic Failure",
                meld_score=38.0,
                liver_exception_status="Status 1A Fulminant",
                receiver_bilirubin=8.5,
                receiver_inr=3.4,
                receiver_creatinine=2.4,
                receiver_sodium=130.0,
                special_status="Status 1A Emergency Override",
            )
            db.add(rp_liv2)
            print("[OK] Receiver R_LIV_02 (Liver - Status 1A Fulminant) created")

        # ── Demo Heart Candidates (Phase 17) ──────────────────────────────
        if not db.query(Patient).filter(Patient.patient_uid == "R_HRT_01").first():
            recv_hrt1 = Patient(
                patient_uid="R_HRT_01",
                hospital_id=hosp_b.id,
                patient_type="RECEIVER",
                name="Amitabh Deshmukh",
                age=54,
                gender="Male",
                blood_group=BloodGroup.O_POS,
                height_cm=176.0,
                weight_kg=78.0,
                medical_condition="End-stage Dilated Cardiomyopathy. Refractory cardiogenic shock on IABP and Dobutamine.",
                eligibility_status=EligibilityStatus.ELIGIBLE,
                candidate_status=CandidateStatus.ACTIVE,
                verification_status="VERIFIED",
            )
            db.add(recv_hrt1)
            db.flush()

            rp_hrt1 = ReceiverProfile(
                patient_id=recv_hrt1.id,
                required_organ="HEART",
                urgency_level="CRITICAL",
                waiting_start_date=datetime.now(timezone.utc) - timedelta(days=20),
                heart_failure_status="NYHA Class IV End-Stage DCM",
                heart_urgency_category="STATUS_1A",
                iabp=True,
                inotrope_support=True,
                inotrope_details="Dobutamine 10 mcg/kg/min + Milrinone 0.5 mcg/kg/min",
                cardiac_index=1.7,
                pcwp=26.0,
                special_status="Status 1A (IABP + Dual Inotropes)",
            )
            db.add(rp_hrt1)
            print("[OK] Receiver R_HRT_01 (Heart - Status 1A IABP) created")

        # ── Demo Lung Candidates (Phase 18) ───────────────────────────────
        if not db.query(Patient).filter(Patient.patient_uid == "R_LNG_01").first():
            recv_lng1 = Patient(
                patient_uid="R_LNG_01",
                hospital_id=hosp_b.id,
                patient_type="RECEIVER",
                name="Rajesh Joshi",
                age=58,
                gender="Male",
                blood_group=BloodGroup.O_POS,
                height_cm=174.0,
                weight_kg=70.0,
                medical_condition="Idiopathic Pulmonary Fibrosis (IPF). Severe respiratory failure on high-flow O2.",
                eligibility_status=EligibilityStatus.ELIGIBLE,
                candidate_status=CandidateStatus.ACTIVE,
                verification_status="VERIFIED",
            )
            db.add(recv_lng1)
            db.flush()

            rp_lng1 = ReceiverProfile(
                patient_id=recv_lng1.id,
                required_organ="LUNG",
                urgency_level="CRITICAL",
                waiting_start_date=datetime.now(timezone.utc) - timedelta(days=60),
                lung_diagnostic_group="GROUP_D",
                lung_diagnosis="Idiopathic Pulmonary Fibrosis (IPF)",
                las_score=68.5,
                assisted_ventilation="Invasive Mechanical",
                paco2=54.0,
                paco2_change_6m=7.0,
                fvc_predicted_pct=38.0,
                oxygen_requirement_rest=8.0,
                special_status="High LAS Urgency (IPF Ventilator)",
            )
            db.add(rp_lng1)
            print("[OK] Receiver R_LNG_01 (Lung - LAS 68.5 Group D) created")

        # ── Demo Multi-Organ SLK Candidate (Phase 19) ─────────────────────
        if not db.query(Patient).filter(Patient.patient_uid == "R_SLK_01").first():
            recv_slk = Patient(
                patient_uid="R_SLK_01",
                hospital_id=hosp_b.id,
                patient_type="RECEIVER",
                name="Kiran Rao",
                age=46,
                gender="Female",
                blood_group=BloodGroup.O_POS,
                height_cm=165.0,
                weight_kg=60.0,
                medical_condition="Decompensated Cirrhosis with Hepatorenal Syndrome Type 1. Dual organ candidate.",
                eligibility_status=EligibilityStatus.ELIGIBLE,
                candidate_status=CandidateStatus.ACTIVE,
                verification_status="VERIFIED",
            )
            db.add(recv_slk)
            db.flush()

            rp_slk = ReceiverProfile(
                patient_id=recv_slk.id,
                required_organ="LIVER",
                urgency_level="HIGH",
                waiting_start_date=datetime.now(timezone.utc) - timedelta(days=120),
                is_multi_organ_candidate=True,
                secondary_organ="KIDNEY",
                meld_score=32.0,
                dialysis_past_week=True,
                special_status="Simultaneous Liver-Kidney (SLK) Combined Candidate",
            )
            db.add(rp_slk)
            print("[OK] Receiver R_SLK_01 (Simultaneous Liver-Kidney SLK) created")

    # ── Allocation Rule Sets (Phase 4, 16, 17, 18) ────────────────────────
    import json
    if not db.query(AllocationRuleSet).filter(AllocationRuleSet.rule_set_id == "NOTTO_KIDNEY_2024_V1").first():
        kidney_rules = AllocationRuleSet(
            rule_set_id="NOTTO_KIDNEY_2024_V1",
            organ_type="KIDNEY",
            jurisdiction="INDIA_NATIONAL",
            policy_version="v2.4 (2024)",
            effective_from=datetime(2024, 1, 1, tzinfo=timezone.utc),
            is_active=1,
            source_reference="National Organ and Tissue Transplant Organisation (NOTTO), Directorate General of Health Services, Ministry of Health & Family Welfare, Govt. of India — Deceased Donor Kidney Allocation Guidelines (2024 Edition)",
            description="Official Indian Deceased Donor Kidney Allocation Policy prioritizing prior living donors, pediatric recipients, highly sensitized patients, verified dialysis vintage, HLA immunologic match, and geographic proximity tiers.",
            eligibility_rules=json.dumps({
                "requires_abo_compatibility": True,
                "requires_negative_crossmatch": True,
                "max_acceptable_hla_mismatches": 6,
                "pediatric_age_threshold": 18
            }),
            special_population_rules=json.dumps({
                "prior_living_donor_points": 50.0,
                "pediatric_points": 30.0,
                "highly_sensitized_points": 25.0,
                "highly_sensitized_cpra_threshold": 80.0,
                "previous_graft_failure_points": 15.0,
                "critical_urgency_points": 30.0,
                "high_urgency_points": 20.0,
                "medium_urgency_points": 10.0,
                "low_urgency_points": 5.0
            }),
            priority_rules=json.dumps({
                "dialysis_vintage_points_per_year": 10.0,
                "max_dialysis_vintage_points": 40.0,
                "hla_0_mismatch_points": 30.0,
                "hla_1_2_mismatch_points": 15.0,
                "hla_3_4_mismatch_points": 5.0,
                "hla_5_6_mismatch_points": 0.0,
                "abo_exact_match_points": 20.0,
                "abo_compatible_points": 10.0
            }),
            geographic_rules=json.dumps({
                "local_hospital_points": 15.0,
                "same_city_points": 10.0,
                "state_rotto_points": 5.0,
                "interstate_points": 0.0
            })
        )
        db.add(kidney_rules)
        print("[OK] Seeded NOTTO Kidney 2024 Allocation Rule Set")

    if not db.query(AllocationRuleSet).filter(AllocationRuleSet.rule_set_id == "NOTTO_LIVER_2024_V1").first():
        liver_rules = AllocationRuleSet(
            rule_set_id="NOTTO_LIVER_2024_V1",
            organ_type="LIVER",
            jurisdiction="INDIA_NATIONAL",
            policy_version="v2.4 (2024)",
            effective_from=datetime(2024, 1, 1, tzinfo=timezone.utc),
            is_active=1,
            source_reference="National Organ and Tissue Transplant Organisation (NOTTO) — Deceased Donor Liver Allocation Policy (MELD-Na / Status 1A Guidelines)",
            description="Deceased donor liver allocation prioritizing Status 1A Fulminant Hepatic Failure, continuous MELD-Na / PELD scores, approved exceptions, and proximity.",
            eligibility_rules=json.dumps({"requires_abo_compatibility": True}),
            special_population_rules=json.dumps({"status_1a_points": 1000.0, "pediatric_points": 30.0}),
            priority_rules=json.dumps({"meld_multiplier": 2.0, "abo_exact_match_points": 15.0}),
            geographic_rules=json.dumps({"local_hospital_points": 15.0, "same_city_points": 10.0, "state_rotto_points": 5.0})
        )
        db.add(liver_rules)
        print("[OK] Seeded NOTTO Liver 2024 Allocation Rule Set")

    if not db.query(AllocationRuleSet).filter(AllocationRuleSet.rule_set_id == "NOTTO_HEART_2024_V1").first():
        heart_rules = AllocationRuleSet(
            rule_set_id="NOTTO_HEART_2024_V1",
            organ_type="HEART",
            jurisdiction="INDIA_NATIONAL",
            policy_version="v2.4 (2024)",
            effective_from=datetime(2024, 1, 1, tzinfo=timezone.utc),
            is_active=1,
            source_reference="National Organ and Tissue Transplant Organisation (NOTTO) — Deceased Donor Thoracic Heart Allocation Guidelines",
            description="Thoracic heart allocation prioritizing Status 1A MCS / VA-ECMO, Status 1B inotrope/LVAD, strict size match, and rapid green corridor transport.",
            eligibility_rules=json.dumps({"requires_abo_compatibility": True, "strict_size_match": True}),
            special_population_rules=json.dumps({"status_1a_base": 1000.0, "status_1b_base": 500.0, "pediatric_points": 40.0}),
            priority_rules=json.dumps({"abo_exact_match_points": 20.0, "hemodynamic_points": 25.0}),
            geographic_rules=json.dumps({"local_hospital_points": 25.0, "same_city_points": 15.0, "state_rotto_points": 5.0})
        )
        db.add(heart_rules)
        print("[OK] Seeded NOTTO Heart 2024 Allocation Rule Set")

    if not db.query(AllocationRuleSet).filter(AllocationRuleSet.rule_set_id == "NOTTO_LUNG_2024_V1").first():
        lung_rules = AllocationRuleSet(
            rule_set_id="NOTTO_LUNG_2024_V1",
            organ_type="LUNG",
            jurisdiction="INDIA_NATIONAL",
            policy_version="v2.4 (2024)",
            effective_from=datetime(2024, 1, 1, tzinfo=timezone.utc),
            is_active=1,
            source_reference="National Organ and Tissue Transplant Organisation (NOTTO) — Deceased Donor Lung Allocation Guidelines (LAS Protocol)",
            description="Deceased donor lung allocation governed by the Lung Allocation Score (LAS) balancing medical urgency and post-transplant survival.",
            eligibility_rules=json.dumps({"requires_abo_compatibility": True, "height_ratio_matching": True}),
            special_population_rules=json.dumps({"pediatric_points": 30.0, "prior_living_donor_points": 30.0}),
            priority_rules=json.dumps({"las_weight": 1.0, "abo_exact_match_points": 15.0}),
            geographic_rules=json.dumps({"local_hospital_points": 20.0, "same_city_points": 12.0, "state_rotto_points": 5.0})
        )
        db.add(lung_rules)
        print("[OK] Seeded NOTTO Lung 2024 Allocation Rule Set")

    if not db.query(AllocationRuleSet).filter(AllocationRuleSet.rule_set_id == "NOTTO_GENERAL_2024_V1").first():
        general_rules = AllocationRuleSet(
            rule_set_id="NOTTO_GENERAL_2024_V1",
            organ_type="ALL",
            jurisdiction="INDIA_NATIONAL",
            policy_version="v2.4 (2024)",
            effective_from=datetime(2024, 1, 1, tzinfo=timezone.utc),
            is_active=1,
            source_reference="National Organ and Tissue Transplant Organisation (NOTTO) — Standard Multi-Organ Allocation Principles (2024)",
            description="General multi-organ deceased donor allocation standard prioritizing medical urgency, wait time, ABO match, and geographic tier.",
            eligibility_rules=json.dumps({
                "requires_abo_compatibility": True,
                "requires_negative_crossmatch": True
            }),
            special_population_rules=json.dumps({
                "prior_living_donor_points": 50.0,
                "pediatric_points": 30.0,
                "critical_urgency_points": 40.0,
                "high_urgency_points": 30.0,
                "medium_urgency_points": 20.0,
                "low_urgency_points": 10.0
            }),
            priority_rules=json.dumps({
                "waiting_time_points_per_year": 10.0,
                "max_waiting_time_points": 30.0,
                "abo_exact_match_points": 20.0,
                "abo_compatible_points": 10.0
            }),
            geographic_rules=json.dumps({
                "local_hospital_points": 15.0,
                "same_city_points": 10.0,
                "state_rotto_points": 5.0,
                "interstate_points": 0.0
            })
        )
        db.add(general_rules)
        print("[OK] Seeded NOTTO General Multi-Organ Allocation Rule Set")

    db.commit()
    print("\n[OK] Seed complete!")
    print("\nLogin Credentials:")
    print("  Admin:       admin@organalloc.com / admin123")
    print("  Coordinator: coordinator@organalloc.com / coord123")
    print("  Hospital A:  hospitala@organalloc.com / hospital123")
    print("  Hospital B:  hospitalb@organalloc.com / hospital123")
    print("  Hospital C:  hospitalc@organalloc.com / hospital123")


if __name__ == "__main__":
    seed()
    db.close()

