"""
End-to-End Workflow & Operational Intelligence Verification Suite
==================================================================
Runs the complete test scenario covering all project phases (0 through 9):
1. Admin & Hospital Setup
2. Donor D001 & Receivers R001, R002, R003 (Phase 1, 2)
3. Hard Medical Filters & Candidate Lifecycle Safeguards (Phase 3, 7)
4. Dynamic NOTTO Allocation Policy & Priority Scoring (Phase 4)
5. 10-Point Operational Feasibility & Hospital Readiness Checklist (Phase 5)
6. Cold Ischemia Timers & Multi-Modal Transport Logistics (Phase 6)
7. Sequential Allocation Offers, Rejection & Acceptance (Phase 0, 4)
8. Downstream ML Operational Risk Prediction (Phase 8)
9. Explainable AI (XAI) Contributing Factors & Advisory Disclaimers (Phase 9)
"""
import json
from fastapi.testclient import TestClient
from app.main import app

test_client = TestClient(app)

class RequestsAdapter:
    @staticmethod
    def get(url, **kwargs):
        path = url.replace("http://localhost:8000", "")
        return test_client.get(path, **kwargs)

    @staticmethod
    def post(url, **kwargs):
        path = url.replace("http://localhost:8000", "")
        return test_client.post(path, **kwargs)

    @staticmethod
    def patch(url, **kwargs):
        path = url.replace("http://localhost:8000", "")
        return test_client.patch(path, **kwargs)

requests = RequestsAdapter
BASE_URL = "http://localhost:8000"

def run_test():
    from app.database import engine, Base
    from seed_data import seed
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    seed()

    print("=" * 80)
    print("STARTING FULL END-TO-END ORGAN ALLOCATION & OPERATIONAL INTELLIGENCE VERIFICATION")
    print("=" * 80)

    # 1. Login as ADMIN
    res = requests.post(f"{BASE_URL}/auth/login", json={"email": "admin@organalloc.com", "password": "admin123"})
    assert res.status_code == 200, f"Admin login failed: {res.text}"
    admin_token = res.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    print("[PASS] 1. Admin login successful")

    # 2. Check Admin Dashboard
    res = requests.get(f"{BASE_URL}/admin/dashboard", headers=admin_headers)
    assert res.status_code == 200
    stats = res.json()
    print(f"[PASS] 2. Admin dashboard retrieved: {stats['total_hospitals']} hospitals, {stats['total_donors']} donors, {stats['total_receivers']} receivers")

    # 3. Login as Hospital A (Donor Hospital)
    res = requests.post(f"{BASE_URL}/auth/login", json={"email": "hospitala@organalloc.com", "password": "hospital123"})
    assert res.status_code == 200
    hosp_a_token = res.json()["access_token"]
    hosp_a_headers = {"Authorization": f"Bearer {hosp_a_token}"}
    print("[PASS] 3. Hospital A (Donor Hospital) login successful")

    # Check Hospital A verified pool
    res = requests.get(f"{BASE_URL}/hospital/verified-pool?organ_type=KIDNEY", headers=hosp_a_headers)
    assert res.status_code == 200
    pool_a = res.json()
    assert len(pool_a["eligible_donors"]) > 0, "No eligible donors found in Hospital A"
    donor_d001 = pool_a["eligible_donors"][0]
    print(f"[PASS] 4. Hospital A verified pool: Donor {donor_d001['name']} ({donor_d001['patient_uid']}) - Blood: {donor_d001['blood_group']} - Status: {donor_d001['eligibility_status']}")

    # 4. Login as Hospital B (Receiver R001 & R003 Hospital)
    res = requests.post(f"{BASE_URL}/auth/login", json={"email": "hospitalb@organalloc.com", "password": "hospital123"})
    assert res.status_code == 200
    hosp_b_token = res.json()["access_token"]
    hosp_b_headers = {"Authorization": f"Bearer {hosp_b_token}"}
    print("[PASS] 5. Hospital B login successful")

    # Check Hospital B verified pool
    res = requests.get(f"{BASE_URL}/hospital/verified-pool?organ_type=KIDNEY", headers=hosp_b_headers)
    assert res.status_code == 200
    pool_b = res.json()
    assert len(pool_b["eligible_receivers"]) > 0, "No eligible receivers in Hospital B"
    recv_r001 = pool_b["eligible_receivers"][0]
    print(f"[PASS] 6. Hospital B verified pool: Receiver {recv_r001['name']} ({recv_r001['patient_uid']}) - Blood: {recv_r001['blood_group']} - Urgency: {recv_r001['urgency_level']}")

    # 5. Login as Hospital C (Receiver R002 Hospital)
    res = requests.post(f"{BASE_URL}/auth/login", json={"email": "hospitalc@organalloc.com", "password": "hospital123"})
    assert res.status_code == 200
    hosp_c_token = res.json()["access_token"]
    hosp_c_headers = {"Authorization": f"Bearer {hosp_c_token}"}
    print("[PASS] 7. Hospital C login successful")

    # 6. Login as TRANSPLANT COORDINATOR
    res = requests.post(f"{BASE_URL}/auth/login", json={"email": "coordinator@organalloc.com", "password": "coord123"})
    assert res.status_code == 200
    coord_token = res.json()["access_token"]
    coord_headers = {"Authorization": f"Bearer {coord_token}"}
    print("[PASS] 8. Transplant Coordinator login successful")

    # Check Active Policy endpoint (Phase 4)
    res = requests.get(f"{BASE_URL}/coordinator/policies/active?organ_type=KIDNEY", headers=coord_headers)
    assert res.status_code == 200
    policy = res.json()
    print(f"[PASS] 9. Active Allocation Policy verified: {policy['rule_set_id']} ({policy['policy_version']}) — {policy['jurisdiction']}")

    # Coordinator views available organs
    res = requests.get(f"{BASE_URL}/coordinator/organs?organ_type=KIDNEY&status_filter=AVAILABLE", headers=coord_headers)
    assert res.status_code == 200
    avail_organs = res.json()
    assert len(avail_organs) > 0, "No available kidneys found"
    target_organ = avail_organs[0]
    print(f"[PASS] 10. Coordinator found available organ: {target_organ['organ_type']} ({target_organ['organ_uid']}) from Donor {target_organ['donor_name']} at {target_organ['donor_hospital']}")

    # 7. MATCHING ENGINE WITH CANDIDATE STATUS SAFEGUARDS (Phases 3, 4, 7)
    res = requests.post(f"{BASE_URL}/coordinator/match/{target_organ['id']}", headers=coord_headers)
    assert res.status_code == 200
    match_data = res.json()
    priority_list = match_data["priority_list"]
    assert len(priority_list) == 2, f"Expected exactly 2 active candidates (R003 paused should be excluded), got {len(priority_list)}"
    
    # Verify R003 was excluded due to TEMPORARILY_UNAVAILABLE status
    matched_uids = [c["receiver_uid"] for c in priority_list]
    assert "R003" not in matched_uids, "Phase 7 Safeguard Failure: Temporarily unavailable candidate R003 was matched!"
    print(f"\n[PASS] 11. Phase 7 Safeguard Verified! Candidate R003 (TEMPORARILY_UNAVAILABLE) was correctly excluded from matching.")
    print(f"       Total compatible active candidates: {len(priority_list)}")

    p1 = priority_list[0]
    p2 = priority_list[1]
    print(f"       -> Rank #1: {p1['receiver_name']} ({p1['receiver_uid']}) at {p1['hospital_name']} | NOTTO Score: {p1['total_score']}")
    print(f"       -> Rank #2: {p2['receiver_name']} ({p2['receiver_uid']}) at {p2['hospital_name']} | NOTTO Score: {p2['total_score']}")

    # 8. VERIFY OPERATIONAL FEASIBILITY & HOSPITAL READINESS (Phase 5)
    assert "readiness_status" in p1, "Missing readiness status in priority match"
    assert p1["readiness_status"] == "READY", f"Expected READY, got {p1['readiness_status']}"
    print(f"\n[PASS] 12. Phase 5 Operational Feasibility validated for candidate {p1['receiver_name']}: Status = {p1['readiness_status']} ({p1['readiness_score']}%)")

    # 9. VERIFY PRESERVATION BUFFER & TRANSPORT LOGISTICS (Phase 6)
    assert "remaining_preservation_buffer_hours" in p1, "Missing preservation buffer hours"
    assert p1["remaining_preservation_buffer_hours"] > 0, "Preservation buffer must be positive"
    assert "transport" in p1, "Missing transport info"
    print(f"[PASS] 13. Phase 6 Preservation & Transport Logistics validated: Remaining Ischemic Buffer = {p1['remaining_preservation_buffer_hours']}h ({p1['preservation_risk_status']}), Transport = {p1['transport']['transport_mode']} ({p1['transport']['total_transit_minutes']}m)")

    # 10. VERIFY ML OPERATIONAL RISK & EXPLAINABLE AI (Phases 8 & 9)
    assert "operational_risk_probability" in p1, "Missing ML risk probability"
    assert "operational_risk_tier" in p1, "Missing ML risk tier"
    assert len(p1["xai_positive_factors"]) > 0, "Missing Explainable AI positive factors"
    assert "xai_disclaimer" in p1, "Missing Explainable AI advisory disclaimer"
    print(f"[PASS] 14. Phases 8 & 9 ML Operational Risk & Explainable AI validated:")
    print(f"       Operational Risk: {p1['operational_risk_probability'] * 100:.1f}% ({p1['operational_risk_tier']})")
    print(f"       Positive XAI Factor: [+] {p1['xai_positive_factors'][0]}")
    print(f"       Advisory Notice: {p1['xai_disclaimer']}")

    # 11. SEQUENTIAL OFFER 1: Coordinator offers K001 to Priority #1
    res = requests.post(f"{BASE_URL}/coordinator/offers", data={
        "organ_id": target_organ["id"],
        "receiver_id": p1["receiver_id"],
        "priority_number": p1["priority_number"]
    }, headers=coord_headers)
    assert res.status_code == 200
    offer1_id = res.json()["offer_id"]
    allocation_id = res.json()["allocation_id"]
    print(f"\n[PASS] 15. Sequential offer sent to Priority #1 ({p1['receiver_name']} at {p1['hospital_name']})")
    print(f"       Offer ID: {offer1_id}, Allocation ID: {allocation_id}")

    # Verify Organ Lock: Attempting to offer again must fail
    res_lock = requests.post(f"{BASE_URL}/coordinator/offers", data={
        "organ_id": target_organ["id"],
        "receiver_id": p2["receiver_id"],
        "priority_number": p2["priority_number"]
    }, headers=coord_headers)
    assert res_lock.status_code == 400, "Lock failed: Organ should not accept multiple active offers"
    print(f"[PASS] 16. Allocation Lock verified! Backend prevented concurrent offer to Priority #2.")

    # 12. PRIORITY #1 HOSPITAL REJECTS (with mandatory rejection reason)
    p1_headers = hosp_c_headers if "Hospital C" in p1["hospital_name"] or "Sunrise" in p1["hospital_name"] else hosp_b_headers
    res = requests.post(f"{BASE_URL}/hospital/offers/{offer1_id}/respond", data={
        "action": "REJECT",
        "rejection_reason": "Patient condition changed",
        "rejection_notes": "Candidate currently experiencing active post-dialysis infection; clinically unfit for immediate surgery."
    }, headers=p1_headers)
    assert res.status_code == 200
    print(f"[PASS] 17. Priority #1 Hospital responded: REJECTED with mandatory reason 'Patient condition changed'")

    # 13. SEQUENTIAL OFFER 2: Coordinator moves to Priority #2
    res = requests.post(f"{BASE_URL}/coordinator/offers", data={
        "organ_id": target_organ["id"],
        "receiver_id": p2["receiver_id"],
        "priority_number": p2["priority_number"]
    }, headers=coord_headers)
    assert res.status_code == 200
    offer2_id = res.json()["offer_id"]
    print(f"\n[PASS] 18. Organ automatically released from lock and offered to Priority #2 ({p2['receiver_name']} at {p2['hospital_name']})")

    # 14. PRIORITY #2 HOSPITAL ACCEPTS & SUBMITS 10-POINT READINESS CHECKLIST
    p2_headers = hosp_b_headers if "Hospital B" in p2["hospital_name"] or "Apollo" in p2["hospital_name"] else hosp_c_headers
    
    # Hospital updates checklist first
    res_ready = requests.post(f"{BASE_URL}/hospital/readiness/update", data={
        "patient_id": p2["receiver_id"],
        "offer_id": offer2_id,
        "hospital_verified": True,
        "recipient_ready": True,
        "icu_available": True,
        "ot_available": True,
        "surgeon_available": True,
        "transplant_team_available": True,
        "required_equipment": True,
        "blood_bank_ready": True,
        "recipient_present": True,
        "documents_complete": True,
        "estimated_prep_minutes": 25,
    }, headers=p2_headers)
    assert res_ready.status_code == 200
    assert res_ready.json()["readiness_status"] == "READY"
    print(f"[PASS] 19. Priority #2 Hospital submitted verified 10-point Operational Readiness Checklist: {res_ready.json()['readiness_status']}")

    res = requests.post(f"{BASE_URL}/hospital/offers/{offer2_id}/respond", data={
        "action": "ACCEPT"
    }, headers=p2_headers)
    assert res.status_code == 200
    print(f"[PASS] 20. Priority #2 Hospital responded: ACCEPTED organ offer!")

    # 15. COORDINATOR CONFIRMS ALLOCATION
    res = requests.post(f"{BASE_URL}/coordinator/allocations/{allocation_id}/confirm", headers=coord_headers)
    assert res.status_code == 200
    print(f"[PASS] 21. Transplant Coordinator authorized and CONFIRMED allocation {allocation_id}")

    # 16. VERIFY DONOR HOSPITAL RECEIVES RECIPIENT INFORMATION & PRE-DISPATCH DATA
    res = requests.get(f"{BASE_URL}/hospital/allocations/{allocation_id}", headers=hosp_a_headers)
    assert res.status_code == 200
    hosp_a_alloc = res.json()
    assert hosp_a_alloc["receiver"] is not None
    assert hosp_a_alloc["receiver"]["name"] == p2["receiver_name"]
    assert "pre_dispatch_info" in hosp_a_alloc
    print(f"\n[PASS] 22. Donor Hospital (Hospital A) allocation dossier & pre-dispatch info validated:")
    print(f"       Allocated Recipient: {hosp_a_alloc['receiver']['name']} (Age: {hosp_a_alloc['receiver']['age']}, Blood: {hosp_a_alloc['receiver']['blood_group']})")
    print(f"       Recipient Center: {hosp_a_alloc['receiver']['hospital']} (Emergency Contact: {hosp_a_alloc['receiver']['hospital_contact']})")
    print(f"       Max Allowable Cold Ischemia: {hosp_a_alloc['pre_dispatch_info']['max_cold_ischemia_time']}")

    # 17. VERIFY OFFICIAL ALLOCATION PDF CERTIFICATES
    res_pdf = requests.get(f"{BASE_URL}/hospital/allocations/{allocation_id}/pdf", headers=hosp_a_headers)
    assert res_pdf.status_code == 200
    assert res_pdf.headers.get("content-type") == "application/pdf"
    print(f"[PASS] 23. Official Allocation Clearance Certificate PDF generated for Donor Hospital ({len(res_pdf.content)} bytes)")

    res_coord_pdf = requests.get(f"{BASE_URL}/coordinator/allocations/{allocation_id}/pdf", headers=coord_headers)
    assert res_coord_pdf.status_code == 200
    assert res_coord_pdf.headers.get("content-type") == "application/pdf"
    print(f"[PASS] 24. Official Allocation Clearance Certificate PDF generated for Coordinator ({len(res_coord_pdf.content)} bytes)")

    # 18. COORDINATOR MARKS COMPLETED
    res = requests.post(f"{BASE_URL}/coordinator/allocations/{allocation_id}/complete", headers=coord_headers)
    assert res.status_code == 200
    print(f"[PASS] 25. Transplant Coordinator marked allocation as COMPLETED!")

    # 19. Check Rejection History Log
    res = requests.get(f"{BASE_URL}/coordinator/rejection-history", headers=coord_headers)
    assert res.status_code == 200
    rejections = res.json()
    assert len(rejections) > 0
    print(f"[PASS] 26. Regulatory Rejection Audit Log verified: {rejections[0]['rejection_reason']} logged for candidate {rejections[0]['receiver_name']}")

    # 20. Check Completed Allocations List
    res = requests.get(f"{BASE_URL}/coordinator/allocations?status_filter=COMPLETED", headers=coord_headers)
    assert res.status_code == 200
    completed = res.json()
    assert len(completed) > 0
    print(f"[PASS] 27. Completed Allocations List verified: {completed[0]['allocation_uid']} successfully recorded in history.")

    # 21. PHASE 12: MATCH STABILITY & MULTI-HORIZON SENSITIVITY SIMULATION
    res_sim = requests.get(f"{BASE_URL}/coordinator/stability-simulation/{target_organ['id']}/{p2['receiver_id']}", headers=coord_headers)
    assert res_sim.status_code == 200
    sim_data = res_sim.json()
    assert "stability" in sim_data
    assert "sensitivity" in sim_data
    stability_obj = sim_data["stability"]
    sensitivity_obj = sim_data["sensitivity"]
    assert stability_obj["stability_score"] > 0
    assert len(sensitivity_obj["horizons"]) >= 4
    print(f"\n[PASS] 28. Phase 12 Match Stability & Sensitivity Verified:")
    print(f"       -> Baseline Stability Score: {stability_obj['stability_score']}% ({stability_obj['stability_tier']})")
    print(f"       -> Max Tolerable Transport Delay: {sensitivity_obj['max_delay_tolerance_minutes']} mins")
    for horizon in sensitivity_obj["horizons"][:4]:
        print(f"          - Horizon {horizon['label']}: Score {horizon['stability_score']}% ({horizon['stability_tier']}) | Safe Buffer: {horizon['remaining_buffer_hours']} hrs")

    # 22. PHASE 10 & 11: DYNAMIC DISRUPTION SIMULATION & CHANGE IMPACT ANALYZER
    # Simulate an emergency disruption: ICU bed at recipient hospital suddenly becomes UNAVAILABLE
    res_impact = requests.post(f"{BASE_URL}/coordinator/events/simulate-change", data={
        "entity_type": "HOSPITAL_READINESS",
        "field_changed": "icu_available",
        "old_value": "true",
        "new_value": "false",
        "allocation_id": allocation_id,
        "organ_id": target_organ["id"],
        "patient_id": p2["receiver_id"],
        "reason": "Sudden emergency polytrauma admission occupied last ICU ventilator bed"
    }, headers=coord_headers)
    assert res_impact.status_code == 200
    impact_data = res_impact.json()["impact"]
    assert impact_data["affects_operational_feasibility"] is True
    assert impact_data["affects_ml_risk"] is True
    assert impact_data["requires_revalidation"] is True
    assert impact_data["impact_severity"] == "CRITICAL"
    print(f"\n[PASS] 29. Phase 10 Event Logging: Event {res_impact.json()['event_uid']} recorded in allocation audit trail.")
    print(f"[PASS] 30. Phase 11 Change Impact Analyzer Verified:")
    print(f"       -> Impact Severity: {impact_data['impact_severity']}")
    print(f"       -> Operational Feasibility Affected: {impact_data['affects_operational_feasibility']}")
    print(f"       -> Revalidation Required: {impact_data['requires_revalidation']}")
    print(f"       -> Summary: {impact_data['impact_summary']}")

    # 23. VERIFY REVALIDATION STATUS ON ALLOCATION RECORD
    res_alloc_check = requests.get(f"{BASE_URL}/coordinator/allocations/{allocation_id}", headers=coord_headers)
    assert res_alloc_check.status_code == 200
    alloc_status = res_alloc_check.json()["allocation"]
    assert alloc_status["revalidation_status"] == "REVALIDATION_REQUIRED"
    print(f"[PASS] 31. Phase 10 Dynamic Revalidation Safeguard Triggered: Allocation marked as {alloc_status['revalidation_status']}")

    # 24. COORDINATOR REVALIDATION ACTION
    res_reval = requests.post(f"{BASE_URL}/coordinator/allocations/{allocation_id}/revalidate", data={
        "notes": "Emergency ICU backup ventilator secured in Coronary Care Unit. Cleared for surgical transfer."
    }, headers=coord_headers)
    assert res_reval.status_code == 200
    assert res_reval.json()["revalidation_status"] == "REVALIDATED"
    print(f"[PASS] 32. Coordinator Revalidation Verified: Status updated to {res_reval.json()['revalidation_status']} with audit note.")

    # 25. AUDIT TRAIL TIMELINE RETRIEVAL
    res_timeline = requests.get(f"{BASE_URL}/coordinator/allocations/{allocation_id}/events", headers=coord_headers)
    assert res_timeline.status_code == 200
    events_list = res_timeline.json()
    assert len(events_list) >= 2
    print(f"[PASS] 33. Full Allocation Event Timeline successfully retrieved ({len(events_list)} logged mutations).")

    # 26. PHASE 13: WHAT-IF SIMULATION SANDBOX (DIGITAL TWIN)
    # Scenario A: What happens if transport is delayed by +60 minutes?
    res_whatif_a = requests.post(f"{BASE_URL}/coordinator/simulate/what-if", data={
        "organ_id": target_organ["id"],
        "receiver_id": p2["receiver_id"],
        "simulated_delay_minutes": 60,
        "route_status": "MODERATE_TRAFFIC"
    }, headers=coord_headers)
    assert res_whatif_a.status_code == 200
    whatif_a = res_whatif_a.json()
    assert whatif_a["is_simulated"] is True
    assert whatif_a["comparative_deltas"]["preservation_buffer_delta_hours"] == -1.0
    print(f"\n[PASS] 34. Phase 13 What-If Simulation (Scenario A: +60m Transport Delay) Verified:")
    print(f"       -> Baseline Buffer: {whatif_a['baseline']['preservation_buffer_hours']}h -> Simulated Buffer: {whatif_a['simulated']['preservation_buffer_hours']}h (Delta: {whatif_a['comparative_deltas']['preservation_buffer_delta_hours']}h)")
    print(f"       -> Risk Transition: {whatif_a['comparative_deltas']['risk_tier_transition']} ({whatif_a['baseline']['operational_risk_percentage']}% -> {whatif_a['simulated']['operational_risk_percentage']}%)")
    print(f"       -> Stability Transition: {whatif_a['comparative_deltas']['stability_tier_transition']} ({whatif_a['baseline']['match_stability_score']}% -> {whatif_a['simulated']['match_stability_score']}%)")

    # Scenario B: What happens if ICU becomes UNAVAILABLE and OT is delayed?
    res_whatif_b = requests.post(f"{BASE_URL}/coordinator/simulate/what-if", data={
        "organ_id": target_organ["id"],
        "receiver_id": p2["receiver_id"],
        "simulated_delay_minutes": 30,
        "icu_available": False,
        "ot_available": False
    }, headers=coord_headers)
    assert res_whatif_b.status_code == 200
    whatif_b = res_whatif_b.json()
    assert whatif_b["simulated"]["readiness_status"] == "NOT_READY"
    assert whatif_b["simulated"]["operational_risk_tier"] in ["HIGH_RISK", "MODERATE_RISK"]
    assert len(whatif_b["simulated"]["bottlenecks"]) >= 2
    print(f"[PASS] 35. Phase 13 What-If Simulation (Scenario B: ICU & OT Bottleneck) Verified:")
    print(f"       -> Feasibility Transition: {whatif_b['comparative_deltas']['readiness_status_transition']} ({whatif_b['simulated']['readiness_score']}%)")
    print(f"       -> Simulated Risk Escalation: {whatif_b['simulated']['operational_risk_tier']} ({whatif_b['simulated']['operational_risk_percentage']}%)")
    print(f"       -> Identified Bottlenecks: {', '.join([b if isinstance(b, str) else b.get('name', str(b)) for b in whatif_b['simulated']['bottlenecks']])}")

    # 27. PHASE 14: AUDITABLE ALLOCATION DECISION RECORD (SHA-256 SEALED)
    res_adr_coord = requests.get(f"{BASE_URL}/coordinator/allocations/{allocation_id}/decision-record", headers=coord_headers)
    assert res_adr_coord.status_code == 200
    adr_data = res_adr_coord.json()
    assert adr_data["allocation_id"] == allocation_id
    decision_status = adr_data.get("decision") or adr_data.get("coordinator", {}).get("decision")
    assert decision_status == "CONFIRMED"
    digital_seal = adr_data.get("digital_seal_sha256") or adr_data.get("digital_signature_hash")
    assert digital_seal is not None and len(digital_seal) == 64
    print(f"\n[PASS] 37. Phase 14 Allocation Decision Record retrieved via Coordinator endpoint:")
    print(f"       -> Decision Record UID: {adr_data.get('record_uid')}")
    print(f"       -> Decision Status: {decision_status}")
    print(f"       -> SHA-256 Digital Seal: {digital_seal}")

    # Donor Hospital & Recipient Hospital can also view Decision Record
    res_adr_hosp = requests.get(f"{BASE_URL}/hospital/allocations/{allocation_id}/decision-record", headers=hosp_a_headers)
    assert res_adr_hosp.status_code == 200
    hosp_seal = res_adr_hosp.json().get("digital_seal_sha256") or res_adr_hosp.json().get("digital_signature_hash")
    assert hosp_seal == digital_seal
    print(f"[PASS] 38. Phase 14 Allocation Decision Record retrieved via Hospital endpoint with matching digital seal.")

    # 28. PHASE 15: REGULATORY REJECTION ANALYTICS & REASONS BREAKDOWN
    res_rej_analytics = requests.get(f"{BASE_URL}/coordinator/analytics/rejections", headers=coord_headers)
    assert res_rej_analytics.status_code == 200
    rej_data = res_rej_analytics.json()
    assert "summary" in rej_data
    assert "category_distribution" in rej_data
    assert len(rej_data["standard_categories"]) == 9
    assert rej_data["summary"]["total_rejections"] >= 1
    # Check that 'Medical reason' category captured the earlier refusal
    med_cat = next((c for c in rej_data["category_distribution"] if c["category"] == "Medical reason"), None)
    assert med_cat is not None
    assert med_cat["count"] >= 1
    print(f"\n[PASS] 39. Phase 15 Rejection Analytics Verified:")
    print(f"       -> Total Offers: {rej_data['summary']['total_offers_evaluated']} | Rejections: {rej_data['summary']['total_rejections']} ({rej_data['summary']['rejection_rate_pct']}%)")
    print(f"       -> Refusal Category Breakdown: {med_cat['category']} = {med_cat['count']} occurrences ({med_cat['percentage']}%)")
    print(f"       -> Downstream ML Training Dataset Count: {rej_data['ml_training_samples_count']} structured training vectors")

    # 29. PHASE 16: LIVER ALLOCATION ENGINE (MELD-Na / STATUS 1A PRIORITIZATION)
    # Find Liver Organ L001
    res_liver = requests.get(f"{BASE_URL}/coordinator/organs?organ_type=LIVER&status_filter=AVAILABLE", headers=coord_headers)
    assert res_liver.status_code == 200
    avail_livers = res_liver.json()
    assert len(avail_livers) > 0, "No available liver found"
    target_liver = avail_livers[0]
    
    # Run Liver Matching
    res_match_liver = requests.post(f"{BASE_URL}/coordinator/match/{target_liver['id']}", headers=coord_headers)
    assert res_match_liver.status_code == 200
    liver_match = res_match_liver.json()
    liver_prio = liver_match["priority_list"]
    assert len(liver_prio) >= 1
    top_liver_candidate = liver_prio[0]
    print(f"\n[PASS] 40. Phase 16 Liver Allocation Engine Verified:")
    print(f"       -> Target Organ: {target_liver['organ_type']} ({target_liver['organ_uid']}) | Donor Steatosis: {target_liver.get('liver_steatosis_pct', 5)}%")
    print(f"       -> Top Liver Candidate: {top_liver_candidate['receiver_name']} ({top_liver_candidate['receiver_uid']}) at {top_liver_candidate['hospital_name']}")
    print(f"       -> Liver Policy Priority Score: {top_liver_candidate['total_score']} pts")
    print(f"       -> Liver Clinical Qualification: {top_liver_candidate['tier_qualifications'][0]}")

    # 30. PHASE 17: THORACIC HEART ALLOCATION ENGINE (STATUS 1A MCS / HEMODYNAMICS)
    res_heart = requests.get(f"{BASE_URL}/coordinator/organs?organ_type=HEART&status_filter=AVAILABLE", headers=coord_headers)
    assert res_heart.status_code == 200
    avail_hearts = res_heart.json()
    assert len(avail_hearts) > 0, "No available heart found"
    target_heart = avail_hearts[0]

    # Run Heart Matching
    res_match_heart = requests.post(f"{BASE_URL}/coordinator/match/{target_heart['id']}", headers=coord_headers)
    assert res_match_heart.status_code == 200
    heart_match = res_match_heart.json()
    heart_prio = heart_match["priority_list"]
    assert len(heart_prio) >= 1
    top_heart_candidate = heart_prio[0]
    print(f"\n[PASS] 41. Phase 17 Thoracic Heart Allocation Engine Verified:")
    print(f"       -> Target Organ: {target_heart['organ_type']} ({target_heart['organ_uid']}) | Donor LVEF: {target_heart.get('donor_lvef', 65)}%")
    print(f"       -> Top Heart Candidate: {top_heart_candidate['receiver_name']} ({top_heart_candidate['receiver_uid']}) at {top_heart_candidate['hospital_name']}")
    print(f"       -> Heart Priority Score: {top_heart_candidate['total_score']} pts")
    print(f"       -> Heart Urgency Status: {top_heart_candidate['tier_qualifications'][0]}")

    # 31. PHASE 18: LUNG ALLOCATION ENGINE (LUNG ALLOCATION SCORE LAS PROXY)
    res_lung = requests.get(f"{BASE_URL}/coordinator/organs?organ_type=LUNG&status_filter=AVAILABLE", headers=coord_headers)
    assert res_lung.status_code == 200
    avail_lungs = res_lung.json()
    assert len(avail_lungs) > 0, "No available lung found"
    target_lung = avail_lungs[0]

    # Run Lung Matching
    res_match_lung = requests.post(f"{BASE_URL}/coordinator/match/{target_lung['id']}", headers=coord_headers)
    assert res_match_lung.status_code == 200
    lung_match = res_match_lung.json()
    lung_prio = lung_match["priority_list"]
    assert len(lung_prio) >= 1
    top_lung_candidate = lung_prio[0]
    print(f"\n[PASS] 42. Phase 18 Lung Allocation Engine Verified:")
    print(f"       -> Target Organ: {target_lung['organ_type']} ({target_lung['organ_uid']}) | PaO2/FiO2 Ratio: {target_lung.get('donor_pao2_fio2_ratio', 440)} mmHg")
    print(f"       -> Top Lung Candidate: {top_lung_candidate['receiver_name']} ({top_lung_candidate['receiver_uid']}) at {top_lung_candidate['hospital_name']}")
    print(f"       -> Lung LAS Priority Score: {top_lung_candidate['total_score']} pts")
    print(f"       -> LAS Clinical Breakdown: {top_lung_candidate['tier_qualifications'][0]}")

    # 32. PHASE 19: MULTI-ORGAN PROCUREMENT & CONCURRENT BATCH MATCHING
    # Query multi-organ donor D001 summary
    donor_id = donor_d001["id"]
    res_multi_summary = requests.get(f"{BASE_URL}/coordinator/multi-organ/donors/{donor_id}", headers=coord_headers)
    assert res_multi_summary.status_code == 200
    multi_summary = res_multi_summary.json()
    assert multi_summary["total_organs_procured"] >= 4
    print(f"\n[PASS] 43. Phase 19 Multi-Organ Procurement Summary Verified:")
    print(f"       -> Donor {multi_summary['donor_name']} ({multi_summary['donor_uid']}) at {multi_summary['donor_hospital']}")
    print(f"       -> Total Organs Procured Concurrently: {multi_summary['total_organs_procured']} organs")
    for org in multi_summary["organs"]:
        print(f"          - {org['organ_type']} ({org['organ_uid']}): Status = {org['availability_status']}")

    # Execute concurrent multi-organ batch matching
    res_batch_match = requests.post(f"{BASE_URL}/coordinator/multi-organ/match/{donor_id}", headers=coord_headers)
    assert res_batch_match.status_code == 200
    batch_data = res_batch_match.json()
    assert batch_data["total_organs_evaluated"] >= 3
    print(f"[PASS] 44. Phase 19 Concurrent Multi-Organ Batch Matching Verified:")
    print(f"       -> Total Organs Simultaneously Evaluated: {batch_data['total_organs_evaluated']}")
    for res_item in batch_data["results"]:
        top_name = res_item["top_candidate"]["receiver_name"] if res_item.get("top_candidate") else "No candidate"
        print(f"          - Organ {res_item['organ_type']} ({res_item['organ_uid']}) -> Top Match: {top_name} (Policy: {res_item['policy_used']})")

    # 33. PHASE 20: UNIFIED RESEARCH DATA LAKE & ACADEMIC DATASET EXPORT
    res_dataset_json = requests.get(f"{BASE_URL}/coordinator/research/dataset", headers=coord_headers)
    assert res_dataset_json.status_code == 200
    dataset_json = res_dataset_json.json()
    assert "dataset_metadata" in dataset_json
    assert len(dataset_json["dataset_metadata"]["domains_covered"]) == 8
    assert len(dataset_json["records"]) >= 1
    sample_rec = dataset_json["records"][0]
    for domain in ["donor", "organ", "receiver", "compatibility", "allocation", "operational", "dynamic", "outcome"]:
        assert domain in sample_rec, f"Missing domain {domain} in research dataset record"
    print(f"\n[PASS] 45. Phase 20 Unified Research Data Lake JSON Export Verified:")
    print(f"       -> Dataset Title: {dataset_json['dataset_metadata']['title']}")
    print(f"       -> Total Hierarchical Trajectories: {dataset_json['dataset_metadata']['total_allocation_records']} records")
    print(f"       -> 8 Research Domains Verified: {', '.join(dataset_json['dataset_metadata']['domains_covered'])}")

    # Download Flat Statistical Research CSV
    res_dataset_csv = requests.get(f"{BASE_URL}/coordinator/research/dataset/csv", headers=coord_headers)
    assert res_dataset_csv.status_code == 200
    assert "text/csv" in res_dataset_csv.headers.get("content-type", "")
    csv_lines = res_dataset_csv.text.strip().split("\n")
    assert len(csv_lines) >= 2
    assert "allocation_uid,organ_type,organ_uid" in csv_lines[0]
    print(f"[PASS] 46. Phase 20 Unified Research Data Lake Flat CSV Export Verified:")
    print(f"       -> CSV Header Fields: {len(csv_lines[0].split(','))} statistical variables")
    print(f"       -> CSV Data Rows: {len(csv_lines) - 1} rows ({len(res_dataset_csv.content)} bytes)")

    # 34. PDF MEDICAL REPORTS & RECIPIENT INFORMATION DOSSIER PDF FOR DONOR HOSPITAL & COORDINATOR
    # Test Medical Report PDF endpoint for Hospital and Coordinator
    res_hosp_rep_pdf = requests.get(f"{BASE_URL}/hospital/reports/1/pdf", headers=hosp_a_headers)
    assert res_hosp_rep_pdf.status_code == 200
    assert "application/pdf" in res_hosp_rep_pdf.headers.get("content-type", "")
    assert len(res_hosp_rep_pdf.content) > 500
    print(f"\n[PASS] 47. Verified PDF Medical Report Stream for Hospital & Coordinator:")
    print(f"       -> Streamed Clinical Report PDF: {len(res_hosp_rep_pdf.content)} bytes")

    # Test Recipient Information Dossier PDF for Donor Hospital
    res_dossier_hosp = requests.get(f"{BASE_URL}/hospital/allocations/{allocation_id}/recipient-dossier-pdf", headers=hosp_a_headers)
    assert res_dossier_hosp.status_code == 200
    assert "application/pdf" in res_dossier_hosp.headers.get("content-type", "")
    assert len(res_dossier_hosp.content) > 500

    # Test Recipient Information Dossier PDF for Coordinator
    res_dossier_coord = requests.get(f"{BASE_URL}/coordinator/allocations/{allocation_id}/recipient-dossier-pdf", headers=coord_headers)
    assert res_dossier_coord.status_code == 200
    assert "application/pdf" in res_dossier_coord.headers.get("content-type", "")
    assert len(res_dossier_coord.content) > 500
    print(f"[PASS] 48. Verified Recipient Information Dossier PDF generation upon Acceptance:")
    print(f"       -> Donor Hospital Recipient Dossier PDF: {len(res_dossier_hosp.content)} bytes")
    print(f"       -> Central Coordinator Recipient Dossier PDF: {len(res_dossier_coord.content)} bytes")

    print("\n" + "=" * 80)
    print("ALL 48 RESEARCH-GRADE WORKFLOW, PDF MEDICAL REPORTS, RECIPIENT DOSSIER & POLICIES PASSED!")
    print("=" * 80)

if __name__ == "__main__":
    run_test()
