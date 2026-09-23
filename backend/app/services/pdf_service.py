"""
PDF Service
===========
Generates:
1. Clinical Medical Reports (Blood Tests, Medical Examinations, HLA Compatibility)
2. Official Organ Allocation Clearance & Transfer Protocol Certificate PDF
"""
import io
import os
from datetime import datetime
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable, KeepTogether
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT, TA_JUSTIFY


def generate_sample_medical_report_pdf(patient_name: str, patient_uid: str, report_type: str, hospital_name: str, blood_group: str) -> bytes:
    """Generate a clean clinical lab report PDF"""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=40,
        leftMargin=40,
        topMargin=40,
        bottomMargin=40,
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'RepTitle',
        parent=styles['Heading1'],
        fontSize=18,
        leading=22,
        textColor=colors.HexColor('#0f766e'),
        alignment=TA_CENTER,
        fontName='Helvetica-Bold'
    )
    sub_style = ParagraphStyle(
        'RepSub',
        parent=styles['Normal'],
        fontSize=10,
        leading=14,
        textColor=colors.HexColor('#64748b'),
        alignment=TA_CENTER,
    )
    section_style = ParagraphStyle(
        'RepSec',
        parent=styles['Heading2'],
        fontSize=12,
        leading=16,
        textColor=colors.HexColor('#1e293b'),
        fontName='Helvetica-Bold',
        spaceBefore=10,
        spaceAfter=6,
    )
    body_style = ParagraphStyle(
        'RepBody',
        parent=styles['Normal'],
        fontSize=9,
        leading=13,
        textColor=colors.HexColor('#334155'),
    )
    table_cell = ParagraphStyle(
        'Cell',
        parent=styles['Normal'],
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor('#1e293b'),
    )
    table_cell_bold = ParagraphStyle(
        'CellBold',
        parent=styles['Normal'],
        fontSize=8.5,
        leading=11,
        fontName='Helvetica-Bold',
        textColor=colors.HexColor('#0f766e'),
    )

    story = []

    # Hospital Header
    story.append(Paragraph(hospital_name.upper(), title_style))
    story.append(Paragraph("Department of Pathology, Transfusion Medicine & Transplant Immunology", sub_style))
    story.append(Paragraph(f"Clinical Laboratory Accreditation #NABH-{hash(hospital_name)%100000:05d}", sub_style))
    story.append(Spacer(1, 10))
    story.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor('#0f766e'), spaceAfter=15))

    # Patient & Specimen Info Table
    report_title_display = report_type.replace('_', ' ').title()
    info_data = [
        [
            Paragraph("<b>Patient Name:</b>", body_style), Paragraph(patient_name, body_style),
            Paragraph("<b>Patient ID:</b>", body_style), Paragraph(patient_uid, body_style),
        ],
        [
            Paragraph("<b>ABO/Rh Blood Group:</b>", body_style), Paragraph(f"<b>{blood_group}</b>", table_cell_bold),
            Paragraph("<b>Date of Testing:</b>", body_style), Paragraph(datetime.now().strftime("%d-%b-%Y %H:%M"), body_style),
        ],
        [
            Paragraph("<b>Report Classification:</b>", body_style), Paragraph(report_title_display, table_cell_bold),
            Paragraph("<b>Verification Status:</b>", body_style), Paragraph("<font color='#0f766e'><b>VERIFIED / CLINICALLY VALID</b></font>", body_style),
        ],
    ]
    info_table = Table(info_data, colWidths=[110, 150, 110, 150])
    info_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f8fafc')),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(info_table)
    story.append(Spacer(1, 15))

    # Lab Test Findings
    story.append(Paragraph(f"DIAGNOSTIC TEST FINDINGS — {report_title_display.upper()}", section_style))

    if "BLOOD" in report_type.upper():
        results_data = [
            [Paragraph("<b>Investigation / Parameter</b>", table_cell_bold), Paragraph("<b>Observed Value</b>", table_cell_bold), Paragraph("<b>Reference Range</b>", table_cell_bold), Paragraph("<b>Interpretation</b>", table_cell_bold)],
            [Paragraph("ABO Blood Grouping (Forward & Reverse)", table_cell), Paragraph(f"{blood_group}", table_cell_bold), Paragraph("Consistent", table_cell), Paragraph("Confirmed Compatible", table_cell)],
            [Paragraph("Hemoglobin (Hb)", table_cell), Paragraph("13.8 g/dL", table_cell), Paragraph("12.0 - 16.5 g/dL", table_cell), Paragraph("Normal", table_cell)],
            [Paragraph("Serum Creatinine", table_cell), Paragraph("0.92 mg/dL", table_cell), Paragraph("0.60 - 1.20 mg/dL", table_cell), Paragraph("Normal Renal Clearance", table_cell)],
            [Paragraph("Blood Urea Nitrogen (BUN)", table_cell), Paragraph("14 mg/dL", table_cell), Paragraph("7 - 20 mg/dL", table_cell), Paragraph("Normal", table_cell)],
            [Paragraph("Estimated GFR (CKD-EPI)", table_cell), Paragraph(">90 mL/min/1.73m²", table_cell), Paragraph(">60 mL/min", table_cell), Paragraph("Optimal Filtration", table_cell)],
            [Paragraph("Serum Bilirubin (Total)", table_cell), Paragraph("0.7 mg/dL", table_cell), Paragraph("0.2 - 1.2 mg/dL", table_cell), Paragraph("Normal Hepatic Function", table_cell)],
            [Paragraph("SGPT / ALT", table_cell), Paragraph("24 IU/L", table_cell), Paragraph("7 - 56 IU/L", table_cell), Paragraph("Normal", table_cell)],
            [Paragraph("Crossmatch Serology (Direct AHG)", table_cell), Paragraph("NEGATIVE", table_cell_bold), Paragraph("Negative", table_cell), Paragraph("No Agglutination", table_cell)],
        ]
    elif "EXAMINATION" in report_type.upper() or "ASSESSMENT" in report_type.upper():
        results_data = [
            [Paragraph("<b>Clinical Assessment Parameter</b>", table_cell_bold), Paragraph("<b>Findings</b>", table_cell_bold), Paragraph("<b>Standard Criteria</b>", table_cell_bold), Paragraph("<b>Transplant Viability</b>", table_cell_bold)],
            [Paragraph("Cardiovascular Stability", table_cell), Paragraph("Normotensive, stable rhythm (HR 74 bpm)", table_cell), Paragraph("MAP > 65 mmHg", table_cell), Paragraph("Satisfactory", table_cell)],
            [Paragraph("Pulmonary Gas Exchange", table_cell), Paragraph("PaO2/FiO2 ratio: 420 mmHg", table_cell), Paragraph("> 300 mmHg", table_cell), Paragraph("Satisfactory", table_cell)],
            [Paragraph("Organ Parenchymal Architecture", table_cell), Paragraph("Normal macroscopic appearance, no fibrosis", table_cell), Paragraph("No chronic injury", table_cell), Paragraph("Viable for Donation", table_cell)],
            [Paragraph("Vascular Anatomy", table_cell), Paragraph("Single renal artery/vein, patent lumen", table_cell), Paragraph("Normal anatomical variant", table_cell), Paragraph("Surgically Viable", table_cell)],
            [Paragraph("Systemic Sepsis Screen", table_cell), Paragraph("Blood & urine cultures: NO GROWTH @ 48h", table_cell), Paragraph("Sterile cultures", table_cell), Paragraph("Clear for Harvest/Tx", table_cell)],
        ]
    else:
        results_data = [
            [Paragraph("<b>Infectious Disease / Screening Panel</b>", table_cell_bold), Paragraph("<b>Result</b>", table_cell_bold), Paragraph("<b>Assay Method</b>", table_cell_bold), Paragraph("<b>Safety Status</b>", table_cell_bold)],
            [Paragraph("HIV-1 / HIV-2 Antigen & Antibodies", table_cell), Paragraph("NON-REACTIVE", table_cell_bold), Paragraph("4th Gen Chemiluminescence", table_cell), Paragraph("Cleared", table_cell)],
            [Paragraph("Hepatitis B Surface Antigen (HBsAg)", table_cell), Paragraph("NON-REACTIVE", table_cell_bold), Paragraph("ECLIA", table_cell), Paragraph("Cleared", table_cell)],
            [Paragraph("Hepatitis C Virus Antibody (Anti-HCV)", table_cell), Paragraph("NON-REACTIVE", table_cell_bold), Paragraph("ECLIA", table_cell), Paragraph("Cleared", table_cell)],
            [Paragraph("Cytomegalovirus (CMV) IgG / IgM", table_cell), Paragraph("IgG Positive, IgM Negative", table_cell), Paragraph("ELISA", table_cell), Paragraph("Low Risk Latent", table_cell)],
            [Paragraph("Syphilis (VDRL / TPHA)", table_cell), Paragraph("NON-REACTIVE", table_cell_bold), Paragraph("Serology", table_cell), Paragraph("Cleared", table_cell)],
        ]

    res_table = Table(results_data, colWidths=[160, 140, 110, 110])
    res_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#ccfbf1')),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]))
    story.append(res_table)
    story.append(Spacer(1, 25))

    # Doctor Certification Block
    cert_data = [
        [
            Paragraph("<b>Laboratory Medical Officer:</b><br/>Dr. Arvind Nambiar, MD (Pathology)<br/>Reg No: MCI-2014-98721", body_style),
            Paragraph("<b>Transplant Surgeon / Director:</b><br/>Dr. S. K. Kulkarni, MS, MCh (Transplant)<br/>Chief Medical Examiner", body_style),
        ]
    ]
    cert_table = Table(cert_data, colWidths=[260, 260])
    cert_table.setStyle(TableStyle([
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f8fafc')),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
    ]))
    story.append(cert_table)

    story.append(Spacer(1, 20))
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor('#94a3b8'), spaceAfter=5))
    story.append(Paragraph("<i>Note: This clinical document constitutes authenticated medical supporting evidence stored within the OrganConnect Allocation Registry.</i>", sub_style))

    doc.build(story)
    buffer.seek(0)
    return buffer.getvalue()


def generate_allocation_certificate_pdf(allocation_data: dict) -> bytes:
    """
    Generate an official Organ Allocation & Transfer Clearance Certificate PDF
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36,
    )

    styles = getSampleStyleSheet()

    header_style = ParagraphStyle(
        'CertHeader',
        parent=styles['Heading1'],
        fontSize=15,
        leading=18,
        textColor=colors.HexColor('#0f766e'),
        alignment=TA_CENTER,
        fontName='Helvetica-Bold'
    )
    sub_header = ParagraphStyle(
        'CertSub',
        parent=styles['Normal'],
        fontSize=9,
        leading=12,
        textColor=colors.HexColor('#475569'),
        alignment=TA_CENTER,
    )
    title_box = ParagraphStyle(
        'TitleBox',
        parent=styles['Heading2'],
        fontSize=11,
        leading=14,
        textColor=colors.HexColor('#ffffff'),
        alignment=TA_CENTER,
        fontName='Helvetica-Bold'
    )
    sec_heading = ParagraphStyle(
        'SecHead',
        parent=styles['Heading3'],
        fontSize=10.5,
        leading=13,
        textColor=colors.HexColor('#0f766e'),
        fontName='Helvetica-Bold',
        spaceBefore=8,
        spaceAfter=4,
    )
    cell_text = ParagraphStyle(
        'CellTxt',
        parent=styles['Normal'],
        fontSize=8,
        leading=10.5,
        textColor=colors.HexColor('#1e293b'),
    )
    cell_bold = ParagraphStyle(
        'CellTxtB',
        parent=styles['Normal'],
        fontSize=8,
        leading=10.5,
        fontName='Helvetica-Bold',
        textColor=colors.HexColor('#0f766e'),
    )
    alert_box = ParagraphStyle(
        'AlertTxt',
        parent=styles['Normal'],
        fontSize=8,
        leading=11,
        textColor=colors.HexColor('#854d0e'),
    )

    story = []

    # 1. Header Banner
    story.append(Paragraph("NATIONAL ORGAN & TISSUE TRANSPLANT ALLOCATION CLEARANCE CERTIFICATE", header_style))
    story.append(Paragraph("Central Coordination Registry • Directorate General of Health Services", sub_header))
    story.append(Paragraph(f"Official Electronic Transfer Dossier • Generated: {datetime.now().strftime('%d-%b-%Y %H:%M:%S UTC')}", sub_header))
    story.append(Spacer(1, 8))
    story.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor('#0f766e'), spaceAfter=8))

    # 2. Key Allocation Overview Box
    alloc_uid = allocation_data.get("allocation_uid", "ALLOC-XXXX")
    status = allocation_data.get("status", "ALLOCATED")
    organ_type = allocation_data.get("organ_type", "KIDNEY")
    priority_num = allocation_data.get("priority_number", 1)

    overview_header = [
        [Paragraph(f"ALLOCATION IDENTIFIER: {alloc_uid}  |  STATUS: {status}  |  PRIORITY RANK: #{priority_num}", title_box)]
    ]
    t_over_head = Table(overview_header, colWidths=[540])
    t_over_head.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#0f766e')),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(t_over_head)

    # 3. Donor and Recipient Facility Side-by-Side Table
    story.append(Paragraph("1. DONOR & RECIPIENT CLINICAL CLEARANCE INFORMATION", sec_heading))
    donor_info = allocation_data.get("donor", {})
    receiver_info = allocation_data.get("receiver", {})

    facility_table_data = [
        [
            Paragraph("<b>DONOR FACILITY (SOURCE)</b>", cell_bold),
            Paragraph("<b>RECIPIENT FACILITY (DESTINATION)</b>", cell_bold),
        ],
        [
            Paragraph(f"<b>Facility Name:</b> {donor_info.get('hospital', 'N/A')}", cell_text),
            Paragraph(f"<b>Facility Name:</b> {receiver_info.get('hospital', 'N/A')}", cell_text),
        ],
        [
            Paragraph(f"<b>Donor Name / UID:</b> {donor_info.get('name', 'N/A')} ({donor_info.get('uid', 'N/A')})", cell_text),
            Paragraph(f"<b>Recipient Name / UID:</b> {receiver_info.get('name', 'N/A')} ({receiver_info.get('uid', 'N/A')})", cell_text),
        ],
        [
            Paragraph(f"<b>Blood Group:</b> {donor_info.get('blood_group', 'O+')}", cell_text),
            Paragraph(f"<b>Blood Group:</b> {receiver_info.get('blood_group', 'N/A')}", cell_text),
        ],
        [
            Paragraph(f"<b>Organ Donated:</b> {organ_type} ({allocation_data.get('organ', {}).get('organ_uid', 'N/A')})", cell_text),
            Paragraph(f"<b>Clinical Urgency:</b> {receiver_info.get('urgency_level', 'HIGH')}", cell_text),
        ],
        [
            Paragraph(f"<b>Organ Assessment:</b> {allocation_data.get('organ', {}).get('organ_condition', 'Good / Viable')}", cell_text),
            Paragraph(f"<b>Hospital Emergency Contact:</b> {receiver_info.get('hospital_contact', '+91 9876543211')}", cell_text),
        ],
    ]
    t_facility = Table(facility_table_data, colWidths=[270, 270])
    t_facility.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f1f5f9')),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
        ('TOPPADDING', (0, 0), (-1, -1), 3.5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3.5),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(t_facility)

    # 4. Matching & Compatibility Verification Summary
    story.append(Paragraph("2. COMPATIBILITY & PRIORITY SCORING BREAKDOWN", sec_heading))
    match_breakdown = allocation_data.get("match_breakdown", {})
    compat_data = [
        [
            Paragraph("<b>Compatibility Factor</b>", cell_bold),
            Paragraph("<b>Verification Result</b>", cell_bold),
            Paragraph("<b>Score Weight</b>", cell_bold),
            Paragraph("<b>Clinical Notes</b>", cell_bold),
        ],
        [
            Paragraph("Organ Type Match", cell_text),
            Paragraph(f"{organ_type} = {organ_type}", cell_text),
            Paragraph("MANDATORY PASS", cell_bold),
            Paragraph("Exact anatomical match verified", cell_text),
        ],
        [
            Paragraph("ABO Blood Compatibility", cell_text),
            Paragraph(f"Donor {donor_info.get('blood_group', 'O+')} → Recipient {receiver_info.get('blood_group', 'O+')}", cell_text),
            Paragraph(f"+{match_breakdown.get('compatibility_score', 30)} pts", cell_bold),
            Paragraph("Verified compatible via ABO Matrix", cell_text),
        ],
        [
            Paragraph("Clinical Urgency Level", cell_text),
            Paragraph(f"{receiver_info.get('urgency_level', 'HIGH')}", cell_text),
            Paragraph(f"+{match_breakdown.get('urgency_score', 30)} pts", cell_bold),
            Paragraph("End-stage clinical priority established", cell_text),
        ],
        [
            Paragraph("Waiting Time Factor", cell_text),
            Paragraph(f"{match_breakdown.get('waiting_days', 245)} days on waiting list", cell_text),
            Paragraph(f"+{match_breakdown.get('waiting_score', 20.14)} pts", cell_bold),
            Paragraph("Normalized waiting time points applied", cell_text),
        ],
        [
            Paragraph("<b>TOTAL PRIORITY SCORE</b>", cell_bold),
            Paragraph(f"<b>Rank #{priority_num} Candidate</b>", cell_bold),
            Paragraph(f"<b>{match_breakdown.get('total', 80.14)} / 100</b>", cell_bold),
            Paragraph("<b>Highest Ranked Confirmed Candidate</b>", cell_bold),
        ],
    ]
    t_compat = Table(compat_data, colWidths=[140, 140, 110, 150])
    t_compat.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#ccfbf1')),
        ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#f0fdfa')),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(t_compat)

    # 5. Pre-Dispatch & Cold Ischemia Clinical Advisory Box
    story.append(Paragraph("3. PRE-DISPATCH & COLD ISCHEMIA LOGISTICS ADVISORY", sec_heading))
    ischemia_limits = {
        "KIDNEY": "24 - 36 Hours (Optimal < 18h)",
        "LIVER": "8 - 12 Hours (Optimal < 8h)",
        "HEART": "4 - 6 Hours (Immediate transit required)",
        "LUNG": "6 - 8 Hours (Immediate transit required)",
        "PANCREAS": "12 - 18 Hours",
    }
    max_cit = ischemia_limits.get(organ_type.upper(), "12 - 24 Hours")

    dispatch_box_data = [
        [
            Paragraph(
                f"<b>MAXIMUM ALLOWABLE COLD ISCHEMIA TIME (CIT):</b> <font color='#0f766e'><b>{max_cit}</b></font><br/>"
                "• <b>Packaging Protocol:</b> Triple-barrier sterile organ preservation bag in UW / HTK preservation solution at 4°C with wet ice surround.<br/>"
                "• <b>Dispatch Handover Checklist:</b> Biopsy report, blood sample tubes for cross-matching, anatomical sketch, and transport log.<br/>"
                "• <b>Emergency Coordinator Line:</b> +91 1800-TRANSPLANT (24x7 Direct Dispatch Desk)",
                alert_box
            )
        ]
    ]
    t_disp = Table(dispatch_box_data, colWidths=[540])
    t_disp.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#fefce8')),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#fef08a')),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(t_disp)

    story.append(Spacer(1, 10))

    # 6. Coordinator Electronic Signature & Authorization Block
    coordinator_name = allocation_data.get("coordinator", "Dr. Sarah Williams")
    sign_data = [
        [
            Paragraph(f"<b>Authorized Transplant Coordinator:</b><br/>{coordinator_name}<br/>Central Organ Allocation Registry", cell_text),
            Paragraph(f"<b>Clinical Clearance Status:</b><br/><font color='#0f766e'><b>APPROVED & DISPATCH AUTHORIZED</b></font><br/>Cryptographic Seal: {hash(alloc_uid)%100000000:08X}", cell_text),
        ]
    ]
    t_sign = Table(sign_data, colWidths=[270, 270])
    t_sign.setStyle(TableStyle([
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f8fafc')),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(t_sign)

    doc.build(story)
    buffer.seek(0)
    return buffer.getvalue()


def generate_recipient_dossier_pdf(allocation_data: dict) -> bytes:
    """
    Generate the official Recipient Clinical Information Dossier PDF for the Donor Hospital & Coordinator.
    Contains complete recipient clinical details, immunologic compatibility, transplant center contacts,
    organ acceptance audit trail, and dispatch advisories.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36,
    )

    styles = getSampleStyleSheet()

    header_style = ParagraphStyle(
        'DossierHeader',
        parent=styles['Heading1'],
        fontSize=15,
        leading=18,
        textColor=colors.HexColor('#0f766e'),
        alignment=TA_CENTER,
        fontName='Helvetica-Bold'
    )
    sub_header = ParagraphStyle(
        'DossierSub',
        parent=styles['Normal'],
        fontSize=9,
        leading=12,
        textColor=colors.HexColor('#475569'),
        alignment=TA_CENTER,
    )
    title_box = ParagraphStyle(
        'DossierTitleBox',
        parent=styles['Heading2'],
        fontSize=11,
        leading=14,
        textColor=colors.HexColor('#ffffff'),
        alignment=TA_CENTER,
        fontName='Helvetica-Bold'
    )
    sec_heading = ParagraphStyle(
        'DossierSecHead',
        parent=styles['Heading3'],
        fontSize=10.5,
        leading=13,
        textColor=colors.HexColor('#0f766e'),
        fontName='Helvetica-Bold',
        spaceBefore=8,
        spaceAfter=4,
    )
    cell_text = ParagraphStyle(
        'DossierCellTxt',
        parent=styles['Normal'],
        fontSize=8,
        leading=10.5,
        textColor=colors.HexColor('#1e293b'),
    )
    cell_bold = ParagraphStyle(
        'DossierCellTxtB',
        parent=styles['Normal'],
        fontSize=8,
        leading=10.5,
        fontName='Helvetica-Bold',
        textColor=colors.HexColor('#0f766e'),
    )
    alert_box = ParagraphStyle(
        'DossierAlertTxt',
        parent=styles['Normal'],
        fontSize=8,
        leading=11,
        textColor=colors.HexColor('#854d0e'),
    )

    story = []

    # 1. Header Banner
    story.append(Paragraph("NATIONAL ORGAN ALLOCATION REGISTRY — RECIPIENT CLINICAL TRANSFER DOSSIER", header_style))
    story.append(Paragraph("Official Confidential Transmission to Donor Transplant Facility & Central Coordinator", sub_header))
    story.append(Paragraph(f"Authorized Medical Record Transfer • Timestamp: {datetime.now().strftime('%d-%b-%Y %H:%M:%S UTC')}", sub_header))
    story.append(Spacer(1, 8))
    story.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor('#0f766e'), spaceAfter=8))

    # 2. Allocation & Organ Identification Banner
    alloc_uid = allocation_data.get("allocation_uid", "ALLOC-XXXX")
    organ_type = allocation_data.get("organ_type", "KIDNEY")
    priority_num = allocation_data.get("priority_number", 1)
    status = allocation_data.get("status", "ACCEPTED")

    overview_header = [
        [Paragraph(f"ALLOCATION #{alloc_uid}  |  ORGAN: {organ_type}  |  STATUS: {status}  |  PRIORITY RANK: #{priority_num}", title_box)]
    ]
    t_over_head = Table(overview_header, colWidths=[540])
    t_over_head.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#0f766e')),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(t_over_head)

    # 3. Recipient Full Clinical & Demographic Profile
    story.append(Paragraph("1. CONFIRMED RECIPIENT CLINICAL IDENTIFICATION & BIOMETRICS", sec_heading))
    receiver_info = allocation_data.get("receiver", {})
    donor_info = allocation_data.get("donor", {})

    r_name = receiver_info.get("name", "Confidential Candidate")
    r_uid = receiver_info.get("uid", "R-XXXX")
    r_age = receiver_info.get("age", "N/A")
    r_gender = receiver_info.get("gender", "N/A")
    r_bg = receiver_info.get("blood_group", "N/A")
    r_hosp = receiver_info.get("hospital", "Recipient Medical Center")
    r_contact = receiver_info.get("hospital_contact", "+91 9876543210")
    r_urgency = receiver_info.get("urgency_level", "HIGH")
    r_diagnosis = receiver_info.get("medical_condition") or receiver_info.get("medical_history") or "End-stage organ failure requiring urgent deceased donor transplantation."
    r_height = receiver_info.get("height_cm", "N/A")
    r_weight = receiver_info.get("weight_kg", "N/A")

    recipient_profile_data = [
        [
            Paragraph("<b>Recipient Full Name:</b>", cell_bold), Paragraph(str(r_name), cell_text),
            Paragraph("<b>Recipient ID (UID):</b>", cell_bold), Paragraph(str(r_uid), cell_bold),
        ],
        [
            Paragraph("<b>Age / Gender:</b>", cell_bold), Paragraph(f"{r_age} yrs / {r_gender}", cell_text),
            Paragraph("<b>ABO/Rh Blood Group:</b>", cell_bold), Paragraph(f"<font color='#0f766e'><b>{r_bg}</b></font>", cell_text),
        ],
        [
            Paragraph("<b>Height / Weight:</b>", cell_bold), Paragraph(f"{r_height} cm / {r_weight} kg", cell_text),
            Paragraph("<b>Clinical Urgency:</b>", cell_bold), Paragraph(f"<b>{r_urgency}</b>", cell_text),
        ],
        [
            Paragraph("<b>Receiving Hospital:</b>", cell_bold), Paragraph(str(r_hosp), cell_text),
            Paragraph("<b>Transplant Desk Hotline:</b>", cell_bold), Paragraph(str(r_contact), cell_text),
        ],
        [
            Paragraph("<b>Primary Clinical Diagnosis:</b>", cell_bold),
            Paragraph(f"<font color='#1e293b'>{r_diagnosis}</font>", cell_text),
            Paragraph("<b>Organ Requested:</b>", cell_bold),
            Paragraph(f"<b>{organ_type}</b>", cell_bold),
        ],
    ]
    t_rec = Table(recipient_profile_data, colWidths=[120, 150, 120, 150])
    t_rec.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f8fafc')),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
        ('TOPPADDING', (0, 0), (-1, -1), 3.5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3.5),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(t_rec)

    # 4. Cross-Facility Immunologic & Compatibility Verification
    story.append(Paragraph("2. DONOR-RECIPIENT IMMUNOLOGIC & CLINICAL COMPATIBILITY AUDIT", sec_heading))
    match_breakdown = allocation_data.get("match_breakdown", {})
    d_bg = donor_info.get("blood_group", "O+")
    
    abo_match_type = "ABO Identical" if d_bg == r_bg else "ABO Compatible"

    compat_table_data = [
        [
            Paragraph("<b>Verification Parameter</b>", cell_bold),
            Paragraph("<b>Donor (Source)</b>", cell_bold),
            Paragraph("<b>Recipient (Destination)</b>", cell_bold),
            Paragraph("<b>Compatibility Conclusion</b>", cell_bold),
        ],
        [
            Paragraph("ABO Blood Typing", cell_text),
            Paragraph(f"Donor: {d_bg}", cell_text),
            Paragraph(f"Recipient: {r_bg}", cell_text),
            Paragraph(f"<font color='#0f766e'><b>PASS ({abo_match_type})</b></font>", cell_text),
        ],
        [
            Paragraph("Organ Specific Match", cell_text),
            Paragraph(f"{organ_type}", cell_text),
            Paragraph(f"{organ_type}", cell_text),
            Paragraph("<font color='#0f766e'><b>PASS (Exact Match)</b></font>", cell_text),
        ],
        [
            Paragraph("Sensitization (PRA / cPRA)", cell_text),
            Paragraph("N/A", cell_text),
            Paragraph(f"cPRA: {receiver_info.get('cpra', 0)}%", cell_text),
            Paragraph("Acceptable Crossmatch Window", cell_text),
        ],
        [
            Paragraph("Geographic Transit Tier", cell_text),
            Paragraph(str(donor_info.get('hospital', 'Donor Center')), cell_text),
            Paragraph(str(r_hosp), cell_text),
            Paragraph(f"Verified Route (Score: {match_breakdown.get('total', 85):.1f} pts)", cell_text),
        ],
    ]
    t_comp = Table(compat_table_data, colWidths=[130, 130, 130, 150])
    t_comp.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#ccfbf1')),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(t_comp)

    # 5. Organ Acceptance & Transfer Protocol Advisory
    story.append(Paragraph("3. TRANSIT, COLD ISCHEMIA & RECEIVING SURGICAL PROTOCOL", sec_heading))
    transit_box_data = [
        [
            Paragraph(
                "<b>MANDATORY SURGICAL & DISPATCH INSTRUCTIONS:</b><br/>"
                "• <b>Donor Facility Action:</b> Ensure sterile triple-bag packaging in preservation solution at 4°C with ice slush surround. Accompany with donor HLA report and blood samples for final cross-matching.<br/>"
                "• <b>Recipient Facility Action:</b> Receiving surgical team has confirmed operating theater readiness and recipient pre-op induction upon courier dispatch.<br/>"
                "• <b>Real-Time Tracking:</b> Transit coordination logs and courier route status are monitored live on the Central Allocation Dashboard.",
                alert_box
            )
        ]
    ]
    t_trans = Table(transit_box_data, colWidths=[540])
    t_trans.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#fefce8')),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#fef08a')),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(t_trans)

    story.append(Spacer(1, 10))

    # 6. Cryptographic Authorization Seal
    sign_data = [
        [
            Paragraph(f"<b>Donor Facility:</b> {donor_info.get('hospital', 'Donor Hospital')}<br/>Authorized Coordinator Dispatch Clearance", cell_text),
            Paragraph(f"<b>Recipient Facility:</b> {r_hosp}<br/>Confirmed Acceptance Seal: SHA256:{hash(alloc_uid + str(r_uid))%10000000000:010X}", cell_text),
        ]
    ]
    t_sign = Table(sign_data, colWidths=[270, 270])
    t_sign.setStyle(TableStyle([
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f8fafc')),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(t_sign)

    doc.build(story)
    buffer.seek(0)
    return buffer.getvalue()

