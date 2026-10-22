export interface FacultyProfile {
  facultyId: string;
  employeeCode: string;
  designation: string;
  fullName: string;
  email: string;
  department: string;
}

export interface FacultyMetrics {
  totalAssignedClasses: number;
  totalStudents: number;
  pendingSubmissions: number;
  activeAssignments: number;
  conductedSessions: number;
}

export interface FacultyAssignedClass {
  facultyAssignmentId: string;
  academicYear: string;
  semester: number;
  section: string;
  courseId: string;
  courseCode: string;
  courseName: string;
  subjectId: string;
  subjectCode: string;
  subjectName: string;
  credits: number;
  enrolledStudentsCount: number;
}

export interface FacultySessionSummary {
  sessionId: string;
  sessionDate: string;
  startTime?: string | null;
  endTime?: string | null;
  sessionStatus: string;
  subjectCode: string;
  subjectName: string;
  section: string;
  semester: number;
}

export interface FacultyPendingGrading {
  submissionId: string;
  submittedAt?: string | null;
  submissionStatus: string;
  assignmentTitle: string;
  maxMarks: number;
  studentName: string;
  enrollmentNumber: string;
  subjectCode: string;
}

export interface FacultyDashboardResponse {
  faculty: FacultyProfile;
  metrics: FacultyMetrics;
  assignedClasses: FacultyAssignedClass[];
  recentSessions: FacultySessionSummary[];
  pendingGradingList: FacultyPendingGrading[];
}

export interface FacultyClassDetails {
  facultyAssignmentId: string;
  courseId: string;
  courseCode: string;
  courseName: string;
  subjectId: string;
  subjectCode: string;
  subjectName: string;
  credits: number;
  academicYear: string;
  semester: number;
  section: string;
  departmentName: string;
}

export interface FacultyClassStudent {
  studentId: string;
  enrollmentNumber: string;
  fullName: string;
  email: string;
  semester: number;
  section: string;
  admissionYear: number;
  department: string;
  enrollmentStatus: string;
  enrolledAt?: string | null;
  totalSessions: number;
  attendedSessions: number;
  attendancePercentage: number;
}

export interface FacultyClassRosterResponse {
  classDetails: FacultyClassDetails;
  totalStudents: number;
  students: FacultyClassStudent[];
}

export interface FacultySessionItem {
  sessionId: string;
  facultyAssignmentId: string;
  sessionDate: string;
  startTime?: string | null;
  endTime?: string | null;
  sessionStatus: 'SCHEDULED' | 'CONDUCTED' | 'CANCELLED' | string;
  presentCount: number;
  absentCount: number;
  totalMarked: number;
  totalEnrolled: number;
  createdAt: string;
}

export interface FacultyClassSessionsResponse {
  classDetails: FacultyClassDetails;
  totalSessions: number;
  sessions: FacultySessionItem[];
}

export interface CreateSessionRequest {
  sessionDate: string;
  startTime?: string;
  endTime?: string;
  sessionStatus?: 'SCHEDULED' | 'CONDUCTED' | 'CANCELLED' | string;
}

export interface SessionAttendanceStudent {
  studentId: string;
  enrollmentNumber: string;
  fullName: string;
  email: string;
  attendanceId?: string | null;
  attendanceStatus: 'PRESENT' | 'ABSENT' | 'NOT_MARKED' | string;
  markedAt?: string | null;
}

export interface SessionAttendanceResponse {
  sessionId: string;
  facultyAssignmentId: string;
  sessionDate: string;
  sessionStatus: string;
  subjectCode: string;
  subjectName: string;
  count: number;
  students: SessionAttendanceStudent[];
}

export interface UpdateAttendanceRecord {
  studentId: string;
  attendanceStatus: 'PRESENT' | 'ABSENT';
}

export interface UpdateSessionAttendancePayload {
  records: UpdateAttendanceRecord[];
  markSessionConducted?: boolean;
}

export interface FacultyAssignmentTask {
  assignmentId: string;
  facultyAssignmentId: string;
  title: string;
  instructions?: string | null;
  dueAt?: string | null;
  maxMarks: number;
  createdAt: string;
  submittedCount: number;
  gradedCount: number;
  totalEnrolled: number;
}

export interface FacultyClassTasksResponse {
  classDetails: FacultyClassDetails;
  totalAssignments: number;
  assignments: FacultyAssignmentTask[];
}

export interface CreateAssignmentPayload {
  title: string;
  instructions?: string;
  dueAt?: string;
  maxMarks: number;
}

export interface FacultySubmissionItem {
  studentId: string;
  enrollmentNumber: string;
  fullName: string;
  email: string;
  submissionId?: string | null;
  hasSubmission: boolean;
  fileUrl?: string | null;
  submittedAt?: string | null;
  submissionStatus: 'PENDING' | 'SUBMITTED' | 'LATE' | 'GRADED' | string;
  marksObtained?: number | null;
  feedback?: string | null;
  updatedAt?: string | null;
}

export interface FacultyAssignmentSubmissionsResponse {
  assignment: {
    assignmentId: string;
    facultyAssignmentId: string;
    title: string;
    instructions?: string | null;
    dueAt?: string | null;
    maxMarks: number;
    createdAt: string;
    subjectCode: string;
    subjectName: string;
    courseName: string;
    courseCode: string;
    semester: number;
    section: string;
    academicYear: string;
  };
  totalStudents: number;
  submissions: FacultySubmissionItem[];
}

export interface GradeSubmissionPayload {
  marksObtained: number;
  feedback?: string;
}

export interface FacultyLearningMaterialItem {
  materialId: string;
  facultyAssignmentId: string;
  title: string;
  description?: string | null;
  materialType: 'PDF' | 'DOCUMENT' | 'PRESENTATION' | 'VIDEO' | 'LINK' | 'OTHER' | string;
  resourceUrl: string;
  uploadedAt: string;
  isExternalLink: boolean;
}

export interface FacultyClassMaterialsResponse {
  classDetails: FacultyClassDetails;
  totalMaterials: number;
  materials: FacultyLearningMaterialItem[];
}

// ======================================================
// STAGE 7: FACULTY ASSESSMENTS & QUIZZES MODELS
// ======================================================

export interface FacultyAssessmentItem {
  assessmentId: string;
  subjectId: string;
  assessmentName: string;
  assessmentType: 'QUIZ' | 'MIDTERM' | 'ENDTERM' | 'PRACTICAL' | 'OTHER' | string;
  maxMarks: number;
  assessmentDate?: string | null;
  createdAt: string;
  subjectCode: string;
  subjectName: string;
  facultyAssignmentId?: string;
  semester?: number;
  section?: string;
  courseCode?: string;
  courseName?: string;
  questionCount: number;
  attemptCount: number;
  avgMarks: number;
}

export interface FacultyClassAssessmentsResponse {
  classDetails: FacultyClassDetails;
  enrolledStudents: number;
  totalAssessments: number;
  assessments: FacultyAssessmentItem[];
}

export interface CreateQuestionPayload {
  questionText: string;
  options: Record<string, string>;
  correctOption: string;
  marks: number;
}

export interface CreateAssessmentPayload {
  title: string;
  assessmentType?: string;
  assessmentDate?: string | null;
  questions: CreateQuestionPayload[];
}

export interface FacultyAssessmentQuestion {
  questionId: string;
  questionText: string;
  options: Record<string, string>;
  correctOption: string;
  marks: number;
}

export interface FacultyQuizSubmissionItem {
  studentId: string;
  enrollmentNumber: string;
  studentName: string;
  studentEmail: string;
  hasAttempted: boolean;
  attemptId?: string | null;
  submittedAt?: string | null;
  marksObtained?: number | null;
  feedback?: string | null;
  evaluatedAt?: string | null;
  answers?: Record<string, string> | null;
}

export interface FacultyAssessmentSubmissionsResponse {
  assessment: {
    assessmentId: string;
    assessmentName: string;
    assessmentType: string;
    maxMarks: number;
    assessmentDate?: string | null;
    createdAt: string;
    subjectCode: string;
    subjectName: string;
    facultyAssignmentId: string;
    courseName: string;
    courseCode: string;
    semester: number;
    section: string;
  };
  questions: FacultyAssessmentQuestion[];
  totalEnrolled: number;
  totalAttempted: number;
  classAverageMarks: number;
  completionRate: number;
  submissions: FacultyQuizSubmissionItem[];
}



