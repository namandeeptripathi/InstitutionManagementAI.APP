# CRHDRI.AI Student Portal — Comprehensive Meeting & Architecture Guide

Welcome! If you are presenting or discussing this project in a meeting and feeling intimidated by the codebase, **do not worry**. This document explains everything about the system in simple, plain English—from what the project actually does to what every file and every API endpoint is responsible for.

---

## Table of Contents
1. [Project Overview: What is CRHDRI.AI?](#1-project-overview-what-is-crhdriai)
2. [Technology Terms Explained in Easy Words](#2-technology-terms-explained-in-easy-words)
   - [.NET & Backend Terms](#a-dotnet--backend-terms)
   - [Angular & Frontend Terms](#b-angular--frontend-terms)
   - [Database & Security Terms](#c-database--security-terms)
3. [System Architecture (How Everything Connects)](#3-system-architecture-how-everything-connects)
4. [Backend Explained: Every File in `CRHDRI.API`](#4-backend-explained-every-file-in-crhdriapi)
5. [Backend Explained: Every API Endpoint](#5-backend-explained-every-api-endpoint)
6. [Frontend Explained: Every File in `crhdri.frontend`](#6-frontend-explained-every-file-in-crhdrifrontend)
7. [The 9 Student Modules Explained](#7-the-9-student-modules-explained)
8. [Meeting Cheat-Sheet: Quick Answers to Common Questions](#8-meeting-cheat-sheet-quick-answers-to-common-questions)

---

## 1. Project Overview: What is CRHDRI.AI?

**CRHDRI.AI Student Portal** is a web-based university portal where enrolled students can log in securely to manage their academic journey.

### What can a student do here?
- **Authenticate**: Log in securely using either their **Enrollment Number** (e.g. `STU-DEMO-001`) or their **University Email** (`demo.student@crhdri.ai`).
- **Dashboard**: See an instant snapshot of attendance, enrolled courses, upcoming assignments, and semester GPA.
- **My Courses**: View all courses they are currently taking, credit hours, subject codes, and course instructors.
- **Attendance**: Track class attendance subject-by-subject with percentage progress bars.
- **Assignments**: See homework/project prompts, due dates, instructions, upload submission files (PDF, Word), and view teacher grades and feedback.
- **Learning Materials**: View and download lecture slides, syllabus documents, and reading materials uploaded by faculty.
- **Results & Transcripts**: Review official examination marks, semester grades, and cumulative GPA.
- **Assessments & Quizzes**: Take multiple-choice quizzes online and instantly get scored.
- **Student Profile**: Check university enrollment status, department, and academic records.
- **AI Assistant**: An institutional FAQ and helper hub (architected for future AI Copilot integrations).

---

## 2. Technology Terms Explained in Easy Words

If you are new to **.NET** or **Angular**, here is your vocabulary guide:

### A. .NET & Backend Terms
| Term | Plain English Explanation |
| :--- | :--- |
| **.NET 10** | A modern software development platform created by Microsoft. It runs on Windows, Mac, and Linux, and is used to build fast, robust server applications. |
| **C# (C-Sharp)** | The programming language used to write the backend code. It is strongly typed, clean, and looks similar to Java or TypeScript. |
| **ASP.NET Core Web API** | The framework inside .NET that listens for HTTP requests from the browser (e.g. "give me the student's courses") and returns data (usually in JSON format). |
| **Minimal APIs** | A modern style in ASP.NET Core where endpoints are declared directly using simple functions like `app.MapGet(...)` or `app.MapPost(...)`, without having to create dozens of bulky controller classes. |
| **CORS (Cross-Origin Resource Sharing)** | A browser security feature. Our frontend runs on port `4200` and backend runs on port `5083`. CORS is the backend's explicit permission saying: *"Yes, port 4200 is allowed to talk to me."* |
| **Dependency Injection (DI)** | A technique where instead of a function creating its own tools (like a database connection or config reader), the .NET framework automatically supplies ("injects") what it needs. |

### B. Angular & Frontend Terms
| Term | Plain English Explanation |
| :--- | :--- |
| **Angular 21** | A powerful frontend framework created by Google to build web applications. It uses **TypeScript** (JavaScript with types). |
| **SPA (Single-Page Application)** | A web app that only loads one HTML page once. When you click between "Dashboard" and "Courses", the page doesn't do a full white-screen reload; Angular just swaps out that section of the screen instantly. |
| **Standalone Components** | The newest, cleanest way to build Angular components. Unlike older Angular apps that required complicated `NgModule` files, each component manages its own dependencies directly. |
| **Signals (`signal()`, `computed()`)** | Angular's modern reactivity system. Think of a signal like an Excel cell: when cell `A1` changes, any formula or UI that depends on `A1` updates automatically in real-time. |
| **Route Guard (`authGuard`)** | A security gatekeeper in the frontend. Before Angular allows the user to see `/dashboard`, the guard checks: *"Is this user logged in?"*. If no, it kicks them back to `/login`. |
| **HTTP Interceptor (`authInterceptor`)** | An invisible post office worker in Angular. Every time the frontend makes an API call to the server, the interceptor automatically stamps the user's secret badge (**Bearer Token**) onto the envelope so the backend knows who is asking. |

### C. Database & Security Terms
| Term | Plain English Explanation |
| :--- | :--- |
| **PostgreSQL** | A rock-solid, open-source relational database. This is where the university stores tables for `students`, `courses`, `grades`, `attendance`, etc. |
| **Npgsql** | The high-performance .NET library used to run SQL queries against PostgreSQL. |
| **JWT (JSON Web Token)** | A digital "VIP wristband". When a student logs in, the backend creates a cryptographically signed token string. The browser sends this token with every request to prove identity without asking for the password again. |
| **PBKDF2 Password Hashing** | Instead of storing raw passwords (which would be catastrophic if leaked), the backend scrambles passwords using 100,000 rounds of mathematical cryptography with a random "salt". It cannot be reversed. |
| **IDOR (Insecure Direct Object Reference)** | A famous security flaw where Student A changes the URL from `students/STU-001` to `students/STU-002` to snoop on Student B's grades. **Our backend prevents this**: it checks if the token matches the URL. If someone tries to snoop, the backend blocks them with `403 Forbidden`. |

---

## 3. System Architecture (How Everything Connects)

```
[ User in Web Browser ]
         │
         ▼
[ Angular 21 Frontend ] ── (Port 4200)
         │  - HTML / CSS / TypeScript
         │  - Signals & Route Guards
         │  - Attaches Bearer JWT token to requests
         ▼  (HTTP / JSON REST APIs)
[ ASP.NET Core Backend ] ── (Port 5083)
         │  - Program.cs (Minimal APIs)
         │  - Security Middleware (JWT validation + IDOR check)
         │  - PasswordHelper (PBKDF2 cryptography)
         ▼  (SQL via Npgsql)
[ PostgreSQL Database ] ── (crhdri_institution_db)
            - users, students, courses, subjects,
            - attendance, assignments, submissions, assessments
```

1. The student opens `http://localhost:4200`.
2. Angular's `authGuard` checks if they have a session. If not, they are redirected to `/login`.
3. They submit their credentials (`STU-DEMO-001` and password).
4. Angular sends `POST /api/auth/student/login` to the ASP.NET Core API at `http://localhost:5083`.
5. The API verifies the PBKDF2 password hash against PostgreSQL.
6. The API generates a signed **JWT Access Token** valid for 60 minutes and returns it.
7. Angular stores the token in `sessionStorage` and navigates to `/dashboard`.
8. For all future requests (Courses, Grades, Attendance), the `authInterceptor` automatically attaches `Authorization: Bearer <token>`.
9. The backend security middleware validates the token, verifies the student's enrollment matches the requested URL, queries PostgreSQL, and returns the data.

---

## 4. Backend Explained: Every File in `CRHDRI.API`

The backend folder (`C:\Dev\CRHDRI.API`) is lean, clean, and modern:

| File / Folder Path | What It Is | What It Does (In Easy Words) |
| :--- | :--- | :--- |
| [`CRHDRI.API.csproj`](file:///C:/Dev/CRHDRI.API/CRHDRI.API.csproj) | Project Configuration File | Tells .NET which SDK version to use (`net10.0`) and lists external libraries (NuGet packages) such as `Npgsql` (PostgreSQL driver) and `Microsoft.AspNetCore.Authentication.JwtBearer`. |
| [`Program.cs`](file:///C:/Dev/CRHDRI.API/Program.cs) | **The Engine of the Backend** | The main entry point. It sets up CORS, configures JWT authentication, registers security middleware to prevent IDOR attacks, and defines **all 12 API endpoints** that query PostgreSQL. |
| [`Security/PasswordHelper.cs`](file:///C:/Dev/CRHDRI.API/Security/PasswordHelper.cs) | Password Cryptography | A specialized helper that hashes passwords with PBKDF2 (HMAC-SHA256, 100k rounds, 16-byte random salt) and safely verifies passwords in constant time (`FixedTimeEquals`) to eliminate timing attacks. |
| [`appsettings.json`](file:///C:/Dev/CRHDRI.API/appsettings.json) | Configuration Settings | Stores application settings, including the database connection string and JWT settings (Issuer: `CRHDRI.AI`, Audience: `CRHDRI.StudentPortal`, Secret Key, 60-minute expiry). |
| [`appsettings.Development.json`](file:///C:/Dev/CRHDRI.API/appsettings.Development.json) | Dev Overrides | Overrides settings when running locally in development mode (e.g. detailed logging). |
| [`Properties/launchSettings.json`](file:///C:/Dev/CRHDRI.API/Properties/launchSettings.json) | Local Server Profile | Tells .NET to run on `http://localhost:5083` when started via `dotnet run`. |
| [`uploads/`](file:///C:/Dev/CRHDRI.API/uploads) | File Storage Directory | The local filesystem folder where student assignment submission files (PDFs, Word documents) are safely saved and served. |

---

## 5. Backend Explained: Every API Endpoint

All endpoints live in [`Program.cs`](file:///C:/Dev/CRHDRI.API/Program.cs). Here is the complete catalog:

### 1. Authentication Endpoints
- **`POST /api/auth/student/login`**
  - **What it does**: Takes an identifier (Enrollment ID or Email) and a password. Verifies the password using PBKDF2. If valid, generates and returns a signed JWT access token and student details.
  - **Security**: If the user doesn't exist or the password is wrong, it returns the *exact same* generic message (`Invalid enrollment number/email or password`) so hackers cannot figure out which accounts exist.
- **`GET /api/auth/student/me`**
  - **What it does**: Requires an active JWT token. Reads the student's enrollment number directly from the token and returns their profile. Used by the frontend to confirm the session is valid.

### 2. System Health
- **`GET /api/health/database`**
  - **What it does**: Pings PostgreSQL with `SELECT current_database(), current_user`.
  - **Why it exists**: The frontend topbar uses this to show a real-time green/red badge indicating whether the backend database is alive.

### 3. Student Academic Records (All Protected by JWT + IDOR Checks)
- **`GET /api/students/{enrollmentNumber}/dashboard`**
  - **What it does**: Aggregates a complete summary for the dashboard in a single call: student profile, overall attendance percentage, total courses, count of pending assignments, and semester GPA.
- **`GET /api/students/{enrollmentNumber}/courses`**
  - **What it does**: Queries the `subjects` and `course_enrollments` tables to return all subjects the student is taking this semester, including subject code, credits, semester, and academic year.
- **`GET /api/students/{enrollmentNumber}/attendance`**
  - **What it does**: Calculates overall attendance percentage, total classes conducted, total attended, and breaks down attendance percentage for every single subject.
- **`GET /api/students/{enrollmentNumber}/assignments`**
  - **What it does**: Fetches all homework and project assignments given to the student's class, along with due dates, maximum marks, submission status (`NOT_SUBMITTED`, `SUBMITTED`, `GRADED`), and teacher marks/feedback.
- **`POST /api/students/{enrollmentNumber}/assignments/{assignmentId}/submit`**
  - **What it does**: Accepts an uploaded file (PDF, DOC, DOCX up to 10MB) via `multipart/form-data`. Saves the file safely into the `uploads/assignments` directory and updates the database submission record.
- **`GET /api/students/{enrollmentNumber}/assignments/{assignmentId}/submission/download`**
  - **What it does**: Allows a student to securely download their previously uploaded assignment file. Validates that the file exists and prevents directory traversal attacks.
- **`GET /api/students/{enrollmentNumber}/learning-materials`**
  - **What it does**: Lists course syllabus files, lecture notes, slide presentations, and resource links uploaded by professors for the student's active subjects.
- **`GET /api/students/{enrollmentNumber}/results`**
  - **What it does**: Retrieves the student's academic transcript, subject marks, semester percentages, grade points, and combines official exam results with completed quiz attempts.
- **`GET /api/students/{enrollmentNumber}/profile`**
  - **What it does**: Returns official institutional details: student full name, email, department, degree course, active semester, section, and enrollment status.

### 4. Interactive Quiz Center
- **`GET /api/students/{enrollmentNumber}/assessments`**
  - **What it does**: Returns available online quizzes and examinations, their duration, max marks, and whether the student has already completed them.
- **`GET /api/students/{enrollmentNumber}/assessments/{assessmentId}/questions`**
  - **What it does**: Fetches the questions and multiple-choice options for an online quiz. Does **not** send the correct answers to the browser to prevent cheating.
- **`POST /api/students/{enrollmentNumber}/assessments/{assessmentId}/submit`**
  - **What it does**: Takes the student's selected answers, scores them against the database's secret answer key within an ACID transaction, prevents duplicate attempts, records the score, and returns the calculated percentage immediately.

---

## 6. Frontend Explained: Every File in `crhdri.frontend`

The frontend is built with **Angular 21** using standalone components. Here is what every file in `src/app` does:

### Root Level
- [`src/main.ts`](file:///C:/Dev/crhdri.frontend/src/main.ts): The starting gun for the browser. It bootstraps the Angular application using `bootstrapApplication(App, appConfig)`.
- [`src/styles.css`](file:///C:/Dev/crhdri.frontend/src/styles.css): Global styling variables, custom color tokens (forest green, warm paper, tactile cards), typography, and CSS reset.
- [`src/app/app.ts`](file:///C:/Dev/crhdri.frontend/src/app/app.ts): The root application component. It observes the URL and decides whether to show the authenticated layout (sidebar + topbar) or the isolated login screen.
- [`src/app/app.html`](file:///C:/Dev/crhdri.frontend/src/app/app.html): The root template. If on `/login`, displays only `<router-outlet>`. If on a protected page, wraps the page in the sidebar and topbar layout.
- [`src/app/app.routes.ts`](file:///C:/Dev/crhdri.frontend/src/app/app.routes.ts): The traffic controller. Maps URLs (like `/courses` or `/login`) to components, lazy-loads them, and protects them with `authGuard`.
- [`src/app/app.config.ts`](file:///C:/Dev/crhdri.frontend/src/app/app.config.ts): App configuration. Registers the router, HTTP client, and attaches our `authInterceptor`.

### Core Security & Data Services (`src/app/core/`)
- [`core/guards/auth.guard.ts`](file:///C:/Dev/crhdri.frontend/src/app/core/guards/auth.guard.ts):
  - `authGuard`: Redirects unauthenticated users to `/login?returnUrl=...`.
  - `loginGuard`: Redirects already logged-in users away from the login page directly to `/dashboard`.
- [`core/interceptors/auth.interceptor.ts`](file:///C:/Dev/crhdri.frontend/src/app/core/interceptors/auth.interceptor.ts): Intercepts all outgoing HTTP calls, attaches `Authorization: Bearer <token>`, and handles `401 Unauthorized` responses by clearing the session.
- [`core/services/auth.service.ts`](file:///C:/Dev/crhdri.frontend/src/app/core/services/auth.service.ts): Manages login, logout, reading/writing `sessionStorage`, and reactive signals for `currentUser` and `isAuthenticated`.
- [`core/services/student.service.ts`](file:///C:/Dev/crhdri.frontend/src/app/core/services/student.service.ts): Holds the active student enrollment signal and communicates with the backend for Dashboard, Profile, and Health endpoints.
- [`core/services/courses.service.ts`](file:///C:/Dev/crhdri.frontend/src/app/core/services/courses.service.ts): Calls the `/courses` API to fetch enrolled subjects.
- [`core/services/attendance.service.ts`](file:///C:/Dev/crhdri.frontend/src/app/core/services/attendance.service.ts): Calls the `/attendance` API and provides analytics.
- [`core/services/assignments.service.ts`](file:///C:/Dev/crhdri.frontend/src/app/core/services/assignments.service.ts): Calls the `/assignments` API and handles multipart file uploads.
- [`core/services/learning-materials.service.ts`](file:///C:/Dev/crhdri.frontend/src/app/core/services/learning-materials.service.ts): Calls `/learning-materials` for slides and syllabus PDFs.
- [`core/services/results.service.ts`](file:///C:/Dev/crhdri.frontend/src/app/core/services/results.service.ts): Calls `/results` for semester grades and GPA.
- [`core/services/assessments.service.ts`](file:///C:/Dev/crhdri.frontend/src/app/core/services/assessments.service.ts): Calls `/assessments` to load quizzes, fetch questions, and post answers.
- [`core/services/toast.service.ts`](file:///C:/Dev/crhdri.frontend/src/app/core/services/toast.service.ts): Simple notification toast system (e.g. "Signed out safely" or "File uploaded").
- [`core/models/auth.models.ts`](file:///C:/Dev/crhdri.frontend/src/app/core/models/auth.models.ts): TypeScript interfaces for login requests, responses, and user tokens.
- [`core/models/student.models.ts`](file:///C:/Dev/crhdri.frontend/src/app/core/models/student.models.ts): TypeScript interfaces for Courses, Attendance, Assignments, Grades, and Profile.

### Layout & Shared Components (`src/app/layout/` & `src/app/shared/`)
- [`layout/topbar/topbar.component.ts`](file:///C:/Dev/crhdri.frontend/src/app/layout/topbar/topbar.component.ts): The header bar across the top. Shows dynamic breadcrumbs, live API health badge, active student chip, user avatar, and the **Sign Out** button.
- [`layout/sidebar/sidebar.component.ts`](file:///C:/Dev/crhdri.frontend/src/app/layout/sidebar/sidebar.component.ts): The navigation drawer on the left with links to all 9 modules, user initials badge, and sidebar logout button.
- [`shared/components/icon.component.ts`](file:///C:/Dev/crhdri.frontend/src/app/shared/components/icon.component.ts): Lightweight custom SVG icon component that renders clean icons (lock, eye, dashboard, book, etc.) without heavy external icon libraries.

---

## 7. The 9 Student Modules Explained

Here is what each screen in the student portal does and where its code lives:

```
src/app/features/
├── auth/login.component.ts             --> Secure Student Login screen
├── dashboard/dashboard.component.ts   --> Academic Dashboard overview
├── courses/courses.component.ts       --> My Enrolled Courses list
├── attendance/attendance.component.ts --> Attendance percentages & analytics
├── assignments/assignments.component.ts --> Assignments & File Upload
├── materials/materials.component.ts   --> Learning Materials & Syllabus
├── results/results.component.ts       --> Academic Results & Transcripts
├── assessments/assessments.component.ts --> Online Quizzes & Question Center
├── profile/profile.component.ts       --> Student Academic Profile
└── ai-assistant/ai-assistant.component.ts --> Institutional FAQ & Copilot Hub
```

1. **Login (`auth/login.component.ts`)**:
   - Institutional tactile card design.
   - Accepts either Enrollment Number or University Email.
   - Password visibility toggle (`eye` / `eye-off`).
   - Clear error banner if credentials are wrong.
2. **Dashboard (`dashboard/dashboard.component.ts`)**:
   - Welcome banner with student name and semester.
   - Quick stat tiles: Attendance rate, Courses, Pending Assignments, SGPA.
   - Quick action buttons to jump to other modules.
3. **Courses (`courses/courses.component.ts`)**:
   - Visual cards for each subject (e.g. Deep Learning, Cloud Computing, Neural Networks).
   - Displays credits, course code, semester, and academic year.
4. **Attendance (`attendance/attendance.component.ts`)**:
   - Overall percentage gauge with color coding (Green: >75%, Amber: 65-75%, Red: <65%).
   - Class-by-class breakdown (Attended vs. Conducted).
5. **Assignments (`assignments/assignments.component.ts`)**:
   - Assignment deadline tracker.
   - Drag-and-drop or click-to-upload file picker accepting `.pdf`, `.doc`, `.docx`.
   - Download link for submitted files and instructor grade/feedback display.
6. **Learning Materials (`materials/materials.component.ts`)**:
   - Search and filter documents by subject or file type.
   - Download buttons for study guides and lecture presentations.
7. **Results (`results/results.component.ts`)**:
   - Full academic score card showing marks obtained vs maximum marks.
   - Displays both evaluated exam papers and online quiz attempts.
8. **Assessments (`assessments/assessments.component.ts`)**:
   - Lists active and completed quizzes.
   - Interactive quiz mode: fetches questions, lets the student select options (A, B, C, D), and submits for instant grading.
9. **Profile (`profile/profile.component.ts`)**:
   - Displays verified student identity, enrollment ID, program, semester, and department.
10. **AI Assistant (`ai-assistant/ai-assistant.component.ts`)**:
    - Informational hub with institutional FAQ and an audit notice explaining that backend AI capabilities are planned for upcoming phases.

---

## 8. Meeting Cheat-Sheet: Quick Answers to Common Questions

If someone in your meeting asks you any of these questions, here are simple, direct answers you can give:

### Q1: "What is the tech stack?"
> **Answer**: *"The frontend is built with Angular 21 using standalone components and signals. The backend is an ASP.NET Core Web API running on .NET 10. The database is PostgreSQL. They talk to each other over REST APIs using JSON and JWT bearer authentication."*

### Q2: "How is authentication handled?"
> **Answer**: *"We use industry-standard token authentication. When the student logs in with their enrollment number or email, the backend validates their password using PBKDF2 hashing with 100,000 rounds and a cryptographic salt. Once verified, the backend issues a signed JSON Web Token (JWT) valid for 60 minutes. The frontend stores this in sessionStorage and automatically attaches it to every request."*

### Q3: "What prevents one student from snooping on another student's data?"
> **Answer**: *"We have backend IDOR (Insecure Direct Object Reference) defense built right into our security middleware. When a request comes in for `/api/students/STU-001`, the backend extracts the enrollment number cryptographically sealed inside the student's JWT token. If someone tries to change the URL to `STU-002`, the backend detects the mismatch and immediately aborts the request with `403 Forbidden` before it ever reaches the database."*

### Q4: "Do we have mock data or are we connected to real data?"
> **Answer**: *"All modules are connected to the live PostgreSQL database. When you look at courses, attendance, results, assignments, or quizzes, you are seeing real database records retrieved through the backend Web API. There is zero fake fallback data."*

### Q5: "How are files handled for assignments?"
> **Answer**: *"Students can upload PDF or Word documents up to 10MB. The backend validates file extensions and sizes, saves them into a secure directory on the server, records the file link in PostgreSQL, and provides a download endpoint that prevents path traversal attacks."*

### Q6: "Can a student take a quiz multiple times to get a higher score?"
> **Answer**: *"No. The quiz submission endpoint runs in a database transaction with a unique constraint on `(assessment_id, student_id)`. If a student has already submitted, the backend detects the conflict and rejects subsequent submissions."*

### Q7: "What are the test credentials for a demo?"
> **Answer**:
> - **Identifier**: `STU-DEMO-001` (or `demo.student@crhdri.ai`)
> - **Password**: `DemoStudent@2026`
> - **Student Name**: Rahul Sharma

---

### You are all set!
You now have the full picture of the architecture, security, API contracts, and frontend components. Good luck with your meeting!
