import os
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
)
from reportlab.pdfgen import canvas

pdf_path = "/home/rehant/Admin_GC/docs/FACULTY_EVALUATION_GUIDE.pdf"

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super(NumberedCanvas, self).__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super(NumberedCanvas, self).showPage()
        super(NumberedCanvas, self).save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748B"))
        
        # Header
        self.drawString(36, 762, "GarbageGuardian — Project Run & Evaluation Guide")
        self.drawRightString(576, 762, "Smart City IoT & Waste Management Platform")
        self.setStrokeColor(colors.HexColor("#CBD5E1"))
        self.setLineWidth(0.5)
        self.line(36, 756, 576, 756)
        
        # Footer
        self.line(36, 38, 576, 38)
        self.drawString(36, 26, "Repository: https://github.com/RAVI5216/Admin_GC")
        self.drawRightString(576, 26, f"Page {self._pageNumber} of {page_count}")
        self.restoreState()

doc = SimpleDocTemplate(
    pdf_path,
    pagesize=letter,
    leftMargin=36,
    rightMargin=36,
    topMargin=46,
    bottomMargin=46
)

styles = getSampleStyleSheet()

title_style = ParagraphStyle(
    'DocTitle',
    parent=styles['Normal'],
    fontName='Helvetica-Bold',
    fontSize=20,
    leading=24,
    textColor=colors.HexColor("#0F4C81"),
    alignment=1,
)

subtitle_style = ParagraphStyle(
    'DocSubTitle',
    parent=styles['Normal'],
    fontName='Helvetica-Bold',
    fontSize=12,
    leading=15,
    textColor=colors.HexColor("#2874A6"),
    alignment=1,
)

repo_style = ParagraphStyle(
    'DocRepo',
    parent=styles['Normal'],
    fontName='Helvetica',
    fontSize=8.5,
    leading=11,
    textColor=colors.HexColor("#475569"),
    alignment=1,
)

sec_title_style = ParagraphStyle(
    'SectionTitle',
    parent=styles['Normal'],
    fontName='Helvetica-Bold',
    fontSize=11,
    leading=14,
    textColor=colors.HexColor("#0F4C81"),
    spaceBefore=7,
    spaceAfter=3,
)

body_style = ParagraphStyle(
    'BodyTextCustom',
    parent=styles['Normal'],
    fontName='Helvetica',
    fontSize=9,
    leading=12.5,
    textColor=colors.HexColor("#1E293B"),
)

bold_style = ParagraphStyle(
    'BoldCustom',
    parent=body_style,
    fontName='Helvetica-Bold',
)

code_style = ParagraphStyle(
    'CodeSnippet',
    parent=styles['Normal'],
    fontName='Courier',
    fontSize=8,
    leading=10.5,
    textColor=colors.HexColor("#0F172A"),
)

code_bold = ParagraphStyle(
    'CodeSnippetBold',
    parent=code_style,
    fontName='Courier-Bold',
)

story = []

# Title Banner
story.append(Paragraph("GarbageGuardian", title_style))
story.append(Spacer(1, 2))
story.append(Paragraph("Project Run & Evaluation Guide", subtitle_style))
story.append(Spacer(1, 2))
story.append(Paragraph("<b>GitHub:</b> https://github.com/RAVI5216/Admin_GC", repo_style))
story.append(Spacer(1, 5))

# Overview Box
overview_html = (
    "<b>Platform Overview:</b> GarbageGuardian is a Smart City IoT fleet monitoring and automated waste operations "
    "platform. It combines live hardware telemetry, citizen complaint NLP triage (Python scikit-learn), "
    "and field work order dispatch across a modern React 18, Node.js Express, and AWS DynamoDB architecture."
)
overview_table = Table([[Paragraph(overview_html, body_style)]], colWidths=[540])
overview_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#F0F9FF")),
    ('BOX', (0, 0), (-1, -1), 0.8, colors.HexColor("#BAE6FD")),
    ('PADDING', (0, 0), (-1, -1), 6),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
]))
story.append(overview_table)
story.append(Spacer(1, 6))

# SECTION 1: How to Run the Project
story.append(Paragraph("1. How to Run the Project", sec_title_style))
story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#0F4C81"), spaceBefore=1, spaceAfter=5))
story.append(Paragraph(
    "The automated launcher script verifies system software (Node.js, npm, Python 3, venv, AWS CLI), installs dependencies, and boots all services together with a single command.",
    body_style
))
story.append(Spacer(1, 4))

cmd_data = [
    [Paragraph("<b>Operating System</b>", bold_style), Paragraph("<b>Command to Execute</b>", bold_style)],
    [
        Paragraph("<b>macOS / Linux</b><br/><font size=7.5 color='#64748B'>Terminal</font>", body_style),
        Paragraph("<font color='#0F766E'><b>git clone https://github.com/RAVI5216/Admin_GC.git<br/>cd Admin_GC<br/>./scripts/run_for_faculty.sh</b></font>", code_style)
    ],
    [
        Paragraph("<b>Windows</b><br/><font size=7.5 color='#64748B'>CMD / PowerShell</font>", body_style),
        Paragraph("<font color='#0F766E'><b>git clone https://github.com/RAVI5216/Admin_GC.git<br/>cd Admin_GC<br/>scripts\\run_for_faculty.bat</b></font>", code_style)
    ]
]
cmd_table = Table(cmd_data, colWidths=[130, 410])
cmd_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#F1F5F9")),
    ('BOX', (0, 0), (-1, -1), 0.6, colors.HexColor("#CBD5E1")),
    ('INNERGRID', (0, 0), (-1, -1), 0.4, colors.HexColor("#E2E8F0")),
    ('PADDING', (0, 0), (-1, -1), 5),
    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
]))
story.append(cmd_table)
story.append(Spacer(1, 7))

# SECTION 2: Evaluation Credentials
story.append(Paragraph("2. Required Evaluation Credentials", sec_title_style))
story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#0F4C81"), spaceBefore=1, spaceAfter=5))

story.append(Paragraph("<b>A. AWS Database Connection</b> (Requested interactively in terminal prompt):", body_style))
story.append(Spacer(1, 3))
aws_data = [
    [Paragraph("<b>Configuration Field</b>", bold_style), Paragraph("<b>Value to Enter</b>", bold_style)],
    [Paragraph("AWS Access Key ID", body_style), Paragraph("<code>[INSERT YOUR IAM ACCESS KEY HERE, e.g. AKIA...]</code>", code_bold)],
    [Paragraph("AWS Secret Access Key", body_style), Paragraph("<code>[INSERT YOUR IAM SECRET KEY HERE]</code>", code_bold)],
    [Paragraph("AWS Region", body_style), Paragraph("<code>ap-southeast-2</code> (or press Enter for default)", code_style)],
]
aws_table = Table(aws_data, colWidths=[150, 390])
aws_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#F8FAFC")),
    ('BOX', (0, 0), (-1, -1), 0.6, colors.HexColor("#CBD5E1")),
    ('INNERGRID', (0, 0), (-1, -1), 0.4, colors.HexColor("#E2E8F0")),
    ('PADDING', (0, 0), (-1, -1), 4),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
]))
story.append(aws_table)
story.append(Spacer(1, 3))
story.append(Paragraph("<font size=7.5 color='#64748B'><i>* Note: Keys are saved locally into your private apps/api/.env file and remembered for future runs.</i></font>", body_style))
story.append(Spacer(1, 5))

story.append(Paragraph("<b>B. Admin Portal Login</b> (Access at http://localhost:5173):", body_style))
story.append(Spacer(1, 3))
auth_data = [
    [Paragraph("<b>Portal Field</b>", bold_style), Paragraph("<b>Credential / Instruction</b>", bold_style)],
    [Paragraph("Portal URL", body_style), Paragraph("<b>http://localhost:5173</b>", code_style)],
    [Paragraph("Email", body_style), Paragraph("<code>[INSERT YOUR ADMIN EMAIL]</code>", code_bold)],
    [Paragraph("Password", body_style), Paragraph("<code>[INSERT YOUR ADMIN PASSWORD]</code>", code_bold)],
    [Paragraph("2FA OTP Code", body_style), Paragraph("<code>123456</code> (Email OTP is bypassed for evaluation; enter if prompted)", code_style)],
]
auth_table = Table(auth_data, colWidths=[150, 390])
auth_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#F8FAFC")),
    ('BOX', (0, 0), (-1, -1), 0.6, colors.HexColor("#CBD5E1")),
    ('INNERGRID', (0, 0), (-1, -1), 0.4, colors.HexColor("#E2E8F0")),
    ('PADDING', (0, 0), (-1, -1), 4),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
]))
story.append(auth_table)
story.append(Spacer(1, 7))

# SECTION 3: Service Endpoints
story.append(Paragraph("3. Active Service Endpoints", sec_title_style))
story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#0F4C81"), spaceBefore=1, spaceAfter=5))

svc_data = [
    [Paragraph("<b>Component</b>", bold_style), Paragraph("<b>Local URL</b>", bold_style), Paragraph("<b>Function & Architecture</b>", bold_style)],
    [
        Paragraph("<b>Frontend Web</b>", body_style),
        Paragraph("http://localhost:5173", code_style),
        Paragraph("React 18, Vite, TypeScript Admin Dashboard & GIS Mapping", body_style)
    ],
    [
        Paragraph("<b>Backend API</b>", body_style),
        Paragraph("http://localhost:5000", code_style),
        Paragraph("Express REST API, Socket.IO WebSockets & DynamoDB Controller", body_style)
    ],
    [
        Paragraph("<b>ML Microservice</b>", body_style),
        Paragraph("http://localhost:5001", code_style),
        Paragraph("Python Flask + Scikit-Learn NLP Citizen Hazard Triage", body_style)
    ],
]
svc_table = Table(svc_data, colWidths=[110, 140, 290])
svc_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#F1F5F9")),
    ('BOX', (0, 0), (-1, -1), 0.6, colors.HexColor("#CBD5E1")),
    ('INNERGRID', (0, 0), (-1, -1), 0.4, colors.HexColor("#E2E8F0")),
    ('PADDING', (0, 0), (-1, -1), 4),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
]))
story.append(svc_table)
story.append(Spacer(1, 7))

# SECTION 4: Key Features to Test
story.append(Paragraph("4. Key Modules to Test in the Web Portal", sec_title_style))
story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#0F4C81"), spaceBefore=1, spaceAfter=5))

tour_items = [
    "<b>1. Executive Dashboard (<code>/</code>):</b> Real-time fleet KPI statistics, capacity meter, and live area charts with automatic idle-state detection (<code>Steady {bin.fillLevel}% • No change in {time}</code>).",
    "<b>2. Live GIS Fleet Map (<code>/map</code>):</b> Interactive Leaflet GPS map with color-coded status halos (green for normal, amber for warning, red for critical overflow) and live sensor popups.",
    "<b>3. Smart Bins Fleet Manager (<code>/bins</code>):</b> Tabular and grid telemetry diagnostics per bin (ultrasonic distance, temperature, humidity, gas concentration).",
    "<b>4. Citizen Reports & AI Classifier (<code>/reports</code>):</b> Incident complaints triaged by the Machine Learning microservice, showing predicted hazard category, urgency severity rating, confidence score, and responsible department.",
    "<b>5. Task Dispatch & Field Operations (<code>/tasks</code>):</b> Creating, assigning, and dispatching waste collection work orders to municipal personnel.",
    "<b>6. Employer Roster (<code>/employers</code>):</b> Municipal field crew registry with automated Employee ID generator (<code>EMP-XXXXX</code>)."
]

for item in tour_items:
    story.append(Paragraph(item, body_style))
    story.append(Spacer(1, 2.5))

story.append(Spacer(1, 6))

# SECTION 5: How to Stop
story.append(Paragraph("5. Stopping the Application", sec_title_style))
story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#0F4C81"), spaceBefore=1, spaceAfter=5))
story.append(Paragraph(
    "To terminate all services safely, press <b>Ctrl + C</b> in your terminal window.",
    body_style
))

# Build PDF
doc.build(story, canvasmaker=NumberedCanvas)
print("PDF build complete. File size:", os.path.getsize(pdf_path), "bytes")
