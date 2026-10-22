export interface StudentProfile {
  userId?: string;
  studentId?: string;
  fullName: string;
  email: string;
  enrollmentNumber: string;
  department: string | null;
  course?: string | null;
  courseCode?: string | null;
  courseName?: string | null;
  semester: number | null;
  section: string | null;
  academicYear: string | null;
  enrollmentStatus: string | null;
}

export interface DashboardSummary {
  totalCourses: number;
  totalClasses: number;
  attendedClasses: number;
  attendancePercentage: number;
  pendingAssignments: number;
}

export interface DashboardLatestResult {
  assessmentName: string;
  marksObtained: number;
  maxMarks: number;
  recordedAt: string;
  resultSource: string;
}

export interface DashboardResponse {
  profile: StudentProfile;
  summary: DashboardSummary;
  latestResult: DashboardLatestResult | null;
}

export interface Course {
  subjectCode: string;
  subjectName: string;
  semester: number;
  credits: number;
  courseCode: string;
  courseName: string;
  academicYear: string;
  enrollmentStatus: string;
}

export interface SubjectAttendance {
  subjectCode: string;
  subjectName: string;
  totalClasses: number;
  attendedClasses: number;
  absentClasses: number;
  attendancePercentage: number;
}

export interface AttendanceResponse {
  enrollmentNumber: string;
  totalClasses: number;
  attendedClasses: number;
  absentClasses: number;
  overallAttendancePercentage: number;
  subjects: SubjectAttendance[];
}

export interface Assignment {
  assignmentId: string;
  title: string;
  instructions: string;
  dueAt: string;
  maxMarks: number;
  submissionStatus: 'NOT_SUBMITTED' | 'SUBMITTED' | string;
  submittedAt: string | null;
  fileUrl: string | null;
  marksObtained: number | null;
  feedback: string | null;
}

export interface AssignmentSubmissionResponse {
  message: string;
  submission: {
    submissionId: string;
    assignmentId: string;
    studentId: string;
    fileUrl: string;
    submittedAt: string;
    submissionStatus: string;
    updatedAt: string;
  };
}

export interface LearningMaterial {
  materialId: string;
  title: string;
  description: string;
  materialType: string;
  resourceUrl: string;
  downloadUrl?: string;
  isExternalLink?: boolean;
  uploadedAt: string;
  subjectCode: string;
  subjectName: string;
  semester: number;
  academicYear: string;
}

export interface LearningMaterialsResponse {
  enrollmentNumber: string;
  totalMaterials: number;
  materials: LearningMaterial[];
}

export interface Assessment {
  assessmentId: string;
  assessmentName: string;
  assessmentType: string;
  maxMarks: number;
  assessmentDate: string | null;
  subjectCode: string;
  subjectName: string;
  marksObtained: number | null;
  feedback: string | null;
  evaluatedAt: string | null;
}

export interface AssessmentsResponse {
  enrollmentNumber: string;
  totalAssessments: number;
  assessments: Assessment[];
}

export interface QuizQuestion {
  questionId: string;
  questionText: string;
  options: Record<string, string>;
  marks: number;
}

export interface QuizQuestionsResponse {
  enrollmentNumber: string;
  assessmentId: string;
  assessmentName: string;
  maxMarks: number;
  totalQuestions: number;
  questions: QuizQuestion[];
}

export interface QuizSubmissionRequest {
  answers: Record<string, string>;
}

export interface QuizSubmissionResult {
  message: string;
  attemptId: string;
  enrollmentNumber: string;
  assessmentId: string;
  totalQuestions: number;
  answeredQuestions: number;
  marksObtained: number;
  maxMarks: number;
  percentage: number;
  submittedAt: string;
}

export interface StudentResult {
  recordId: string;
  resultSource: string;
  assessmentId: string;
  assessmentName: string;
  assessmentType: string;
  subjectCode: string;
  subjectName: string;
  assessmentDate: string | null;
  marksObtained: number;
  maxMarks: number;
  percentage: number;
  feedback: string | null;
  recordedAt: string;
}

export interface ResultsResponse {
  enrollmentNumber: string;
  totalResults: number;
  totalMarksObtained: number;
  totalMaximumMarks: number;
  overallPercentage: number;
  results: StudentResult[];
}
