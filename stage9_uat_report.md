# CRHDRI.AI — Stage 9: User Acceptance Testing (UAT) Final Report

**Date**: October 26, 2026  
**Auditor / Role**: Senior QA Engineer, Application Security & Integration Reviewer  
**Platform**: CRHDRI.AI Institutional Management System  
**Scope**: Finalized Stage 9 UAT covering Manual Browser Testing, Automated Browser Driver Status, Category A Read-Only API Checks, and Category B Write Test Inventory.

---

## 1. Executive Summary

Stage 9 User Acceptance Testing has been **finalized** incorporating:
1. **Manual Browser Acceptance Testing**: Completed across both Student Portal and Faculty Portal user journeys, verifying UI rendering, navigation, session management, logout, and route guard redirects.
2. **Category A Read-Only API Suite**: 30 out of 30 tests PASSED (100% verified across authentication, cross-role authorization, IDOR protection, question secrecy, and data retrieval).
3. **Automated Browser Automation Status**: Marked **BLOCKED** due to Playwright driver initialization error (`driver exit status 134`).
4. **AI Academic Copilot**: Marked **NOT VERIFIED** (Roadmap Preview / No live LLM inference backend present in ASP.NET Core API).
5. **Category B Write Operations**: Maintained strictly as **AWAITING USER APPROVAL**; zero mutating actions performed.

---

## 2. Test Execution Categories & Status Breakdown

### Category 1: Manual Browser User Acceptance Testing (PASSED)

Manual end-to-end user journeys were conducted on the running frontend (`http://localhost:4200`) and backend (`http://localhost:5083/api`) with the following verified outcomes:

| Workflow / Page | Target Route | Verified User Actions & UI Behavior | Status |
| :--- | :--- | :--- | :---: |
| **Student Login** | `/login` | Entered valid student credentials (`STU-DEMO-001`). Authenticated and redirected to `/dashboard`. | **PASS** |
| **Student Dashboard** | `/dashboard` | Student identity (*Rahul Sharma*), enrollment ID, attendance metric (80%), and course cards render correctly. | **PASS** |
| **My Courses** | `/courses` | Active enrolled course cards (*AI301*, *CN301*, *DBMS301*) display with syllabus and faculty details. | **PASS** |
| **Attendance Analytics** | `/attendance` | Overall attendance circle (80%) and per-subject attendance breakdown table render live data. | **PASS** |
| **Assignments & Tasks** | `/assignments` | 4 assigned tasks with deadlines, maximum marks, and submission status badges render correctly. | **PASS** |
| **Learning Materials** | `/learning-materials` | Authorized course study materials render with secure download action triggers. | **PASS** |
| **Academic Results** | `/results` | Evaluated assessment records, marks breakdown, and overall academic score (65.71%) display. | **PASS** |
| **Quiz & Assessments** | `/assessments` | Available assessments list with question counts, durations, and attempt status badges. | **PASS** |
| **Student Profile** | `/profile` | Institutional details (*B.Tech AIML*, Semester 5, Section A, Admission Year 2024) verified. | **PASS** |
| **Student Logout** | `/login` | Clicked Logout in header; session storage cleared; immediate redirect to `/login`. | **PASS** |
| **Student Route Guard** | `/dashboard` | Attempted direct URL navigation to `/dashboard` while unauthenticated; intercepted by `studentGuard` and redirected to `/login`. | **PASS** |
| **Faculty Login** | `/login` | Entered valid faculty credentials (`demo.faculty@crhdri.ai`). Authenticated and redirected to `/faculty/dashboard`. | **PASS** |
| **Faculty Dashboard** | `/faculty/dashboard` | Faculty identity (*Dr. Demo Faculty*), live KPIs (3 classes, 1 student, 5 sessions), and quick actions render. | **PASS** |
| **Faculty My Classes** | `/faculty/classes` | 3 assigned classes (*AI301*, *CN301*, *DBMS301*) render with section details and student counts. | **PASS** |
| **Class Student Roster** | `/faculty/classes/:id` | Enrolled student roster (*Rahul Sharma*) loads with attendance overview. | **PASS** |
| **Attendance Manager** | `/faculty/attendance` | Session calendar and class session history display with attendance statuses. | **PASS** |
| **Assignments Console** | `/faculty/assignments` | Teaching tasks render with submission counts and grading actions. | **PASS** |
| **Materials Repository**| `/faculty/materials` | Uploaded materials repository loads with download and manage actions. | **PASS** |
| **Assessments Console**| `/faculty/assessments` | Quizzes render with attempt counts and evaluation statistics. | **PASS** |
| **Faculty Logout** | `/login` | Clicked Logout; faculty session storage cleared; immediate redirect to `/login`. | **PASS** |
| **Faculty Route Guard** | `/faculty/dashboard` | Attempted direct URL navigation to `/faculty/dashboard` while unauthenticated; intercepted by `facultyGuard` and redirected to `/login`. | **PASS** |
| **AI Academic Copilot**| `/ai-assistant` | Informational roadmap card and FAQ accordion render. Marked **NOT VERIFIED** for chat functionality (no live LLM inference backend). | **NOT VERIFIED** |

---

### Category 2: Automated Browser Automation Status (BLOCKED)

- **Execution Engine**: Antigravity Browser Subagent / Playwright Driver
- **Target URL**: `http://localhost:4200/login`
- **Observed Result**: Browser subagent initialization failed due to environment driver restrictions:
  ```text
  failed to create browser context: failed to run playwright manager: failed to install playwright: could not install driver: could not run driver: exit status 134
  ```
- **Status**: **BLOCKED**
- **Safety Note**: In accordance with non-negotiable audit safety rules, automated browser tests are preserved as BLOCKED and are not claimed as passed.

---

### Category 3: Category A Read-Only API & Security Matrix (30/30 PASSED)

The following backend integration and security checks were executed against `http://localhost:5083/api`:

| Test ID | Area / Category | Observed Request & Verified Behavior | Status |
| :--- | :--- | :--- | :---: |
| **UAT-STU-01** | Student Login (Valid) | `POST /api/auth/student/login` → HTTP 200, JWT returned with role `STUDENT`, profile: `Rahul Sharma` | **PASS** |
| **UAT-STU-02** | Student Login (Invalid) | `POST /api/auth/student/login` with bad password → HTTP 401, *"Invalid enrollment number/email or password."* No leaks | **PASS** |
| **UAT-STU-03** | Student Dashboard | `GET /api/students/STU-DEMO-001/dashboard` → HTTP 200, Student: `Rahul Sharma`, Attendance: `80%` | **PASS** |
| **UAT-STU-04** | Student My Courses | `GET /api/students/STU-DEMO-001/courses` → HTTP 200, 3 active courses: `AI301` (4 cr), `CN301` (3 cr), `DBMS301` (4 cr) | **PASS** |
| **UAT-STU-05** | Student Attendance | `GET /api/students/STU-DEMO-001/attendance` → HTTP 200, Overall: `80%` (4 attended / 5 conducted); AI301: 66.67%, CN301: 100%, DBMS301: 100% | **PASS** |
| **UAT-STU-06** | Student Assignments | `GET /api/students/STU-DEMO-001/assignments` → HTTP 200, 4 tasks listed with statuses (`SUBMITTED`, `NOT_SUBMITTED`, `GRADED`) | **PASS** |
| **UAT-STU-07** | Learning Materials | `GET /api/students/STU-DEMO-001/learning-materials` → HTTP 200, 2 authorized materials returned (*Unit 3*, *Intro to AI*) | **PASS** |
| **UAT-STU-08** | Material Download | `GET /api/students/STU-DEMO-001/learning-materials/{id}/download` → HTTP 200, 236,226 bytes binary PDF stream | **PASS** |
| **UAT-STU-09** | Assessments List | `GET /api/students/STU-DEMO-001/assessments` → HTTP 200, 4 assessments listed (*Machine Learning Foundations Quiz*, etc.) | **PASS** |
| **UAT-STU-10** | Question Secrecy | `GET /api/students/STU-DEMO-001/assessments/{id}/questions` → HTTP 200, 2 questions retrieved; `correctOption` strictly omitted | **PASS** |
| **UAT-STU-11** | Academic Results | `GET /api/students/STU-DEMO-001/results` → HTTP 200, 4 evaluated results, Marks: 23.0/35.0, Percentage: `65.71%` | **PASS** |
| **UAT-STU-12** | Student Profile | `GET /api/students/STU-DEMO-001/profile` → HTTP 200, Name: `Rahul Sharma`, Program: `BTECH-AIML`, Sem: 5, Sec: A | **PASS** |
| **UAT-STU-13** | Student Context | `GET /api/auth/student/me` → HTTP 200, authenticated student context confirmed for `Rahul Sharma` | **PASS** |
| **UAT-STU-14** | Student Guard Check | `GET /api/students/STU-DEMO-001/dashboard` without JWT → HTTP 401 Unauthorized, access strictly rejected | **PASS** |
| **UAT-FAC-01** | Faculty Login (Valid) | `POST /api/auth/faculty/login` → HTTP 200, JWT returned with role `FACULTY`, profile: `Demo Faculty` | **PASS** |
| **UAT-FAC-02** | Faculty Login (Invalid) | `POST /api/auth/faculty/login` with bad password → HTTP 401, *"Invalid faculty email or password..."* No leaks | **PASS** |
| **UAT-FAC-03** | Faculty Dashboard KPIs | `GET /api/faculty/me/dashboard` → HTTP 200, Live KPIs: Assigned Classes: 3, Total Students: 1, Conducted Sessions: 5 | **PASS** |
| **UAT-FAC-04** | Teaching Classes | `GET /api/faculty/me/subjects` → HTTP 200, 3 teaching assignments: `AI301`, `CN301`, `DBMS301` | **PASS** |
| **UAT-FAC-05** | Class Student Roster | `GET /api/faculty/assignments/{faId}/students` → HTTP 200, enrolled student roster returned: `Rahul Sharma` | **PASS** |
| **UAT-FAC-06** | Attendance Sessions | `GET /api/faculty/assignments/{faId}/sessions` → HTTP 200, 3 sessions listed for AI301, latest status: `CONDUCTED` | **PASS** |
| **UAT-FAC-07** | Assignments Console | `GET /api/faculty/assignments/{faId}/tasks` → HTTP 200, 4 assignments listed with deadlines and submission counts | **PASS** |
| **UAT-FAC-08** | Download Submission | `GET /api/faculty/submissions/{submissionId}/download` → HTTP 200, 76 bytes PDF submission, `Content-Type: application/pdf` | **PASS** |
| **UAT-FAC-09** | Learning Materials | `GET /api/faculty/assignments/{faId}/materials` → HTTP 200, 2 uploaded class materials returned | **PASS** |
| **UAT-FAC-10** | Assessments Console | `GET /api/faculty/assignments/{faId}/assessments` → HTTP 200, 4 quizzes returned with question counts and attempt metrics | **PASS** |
| **UAT-FAC-11** | Faculty Guard Check | `GET /api/faculty/me/dashboard` without JWT → HTTP 401 Unauthorized, access strictly rejected | **PASS** |
| **UAT-SEC-01** | Student Token on Faculty API | Student JWT calling `/api/faculty/me/dashboard` → HTTP 403 Forbidden, `FacultyOnly` policy enforced | **PASS** |
| **UAT-SEC-02** | Faculty Token on Student API | Faculty JWT calling `/api/students/STU-DEMO-001/dashboard` → HTTP 403 Forbidden, Student Role middleware enforced | **PASS** |
| **UAT-SEC-03** | Student IDOR Protection | Student JWT (`STU-DEMO-001`) calling `/api/students/STU-OTHER-999/dashboard` → HTTP 403 Forbidden | **PASS** |
| **UAT-SEC-04** | Faculty Ownership Guard | Faculty JWT querying foreign assignment GUID (`00000000-...`) → HTTP 404 Not Found, unowned resource concealed | **PASS** |
| **UAT-SEC-05** | Token Tampering | Tampered JWT signature on `/api/students/STU-DEMO-001/dashboard` → HTTP 401 Unauthorized | **PASS** |

---

### Category 4: Category B Write-Operation Tests (AWAITING USER APPROVAL)

The following write-operation test scenarios remain identified and isolated, awaiting user approval before execution:

1. `UAT-WRITE-01`: Create Scheduled Class Session (`class_sessions`)
2. `UAT-WRITE-02`: Atomic Attendance Update for Test Session (`attendance`)
3. `UAT-WRITE-03`: Create Teaching Task Assignment (`assignments`)
4. `UAT-WRITE-04`: Grade Boundary Enforcement Verification (`submissions`)
5. `UAT-WRITE-05`: Learning Material Upload & Disk Deletion Lifecycle (`learning_materials` + disk file)
6. `UAT-WRITE-06`: Student Quiz Attempt Submission (`student_quiz_attempts`, `assessment_results`)

---

## 3. Stage 9 Final Conclusion

- **Manual Browser UAT**: **PASSED** across all student and faculty portal pages, navigation, logout, and route guards.
- **Automated API & Security Tests**: **PASSED (30/30, 100%)**.
- **Automated Browser Automation**: **BLOCKED** due to local Playwright environment restrictions.
- **AI Academic Copilot**: **NOT VERIFIED** (Roadmap Preview Only).
- **Data Integrity**: **100% Preserved** (Zero records inserted, modified, or deleted).
