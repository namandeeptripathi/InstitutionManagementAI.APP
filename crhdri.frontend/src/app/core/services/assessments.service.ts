import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AssessmentsResponse,
  QuizQuestionsResponse,
  QuizSubmissionRequest,
  QuizSubmissionResult
} from '../models/student.models';
import { StudentService } from './student.service';

@Injectable({
  providedIn: 'root'
})
export class AssessmentsService {
  private readonly http = inject(HttpClient);
  private readonly studentService = inject(StudentService);
  private readonly baseUrl = environment.apiBaseUrl;

  getAssessments(enrollment?: string): Observable<AssessmentsResponse> {
    const enroll = enrollment || this.studentService.activeEnrollmentNumber();
    const url = `${this.baseUrl}/students/${encodeURIComponent(enroll)}/assessments`;

    return this.http.get<AssessmentsResponse>(url).pipe(
      catchError((error: HttpErrorResponse) => {
        const msg = error.error?.message || `Failed to load assessments for ${enroll}.`;
        return throwError(() => new Error(msg));
      })
    );
  }

  getQuizQuestions(assessmentId: string, enrollment?: string): Observable<QuizQuestionsResponse> {
    const enroll = enrollment || this.studentService.activeEnrollmentNumber();
    const url = `${this.baseUrl}/students/${encodeURIComponent(enroll)}/assessments/${assessmentId}/questions`;

    return this.http.get<QuizQuestionsResponse>(url).pipe(
      catchError((error: HttpErrorResponse) => {
        const msg = error.error?.message || 'Failed to load quiz questions.';
        return throwError(() => new Error(msg));
      })
    );
  }

  submitQuiz(
    assessmentId: string,
    answers: Record<string, string>,
    enrollment?: string
  ): Observable<QuizSubmissionResult> {
    const enroll = enrollment || this.studentService.activeEnrollmentNumber();
    const url = `${this.baseUrl}/students/${encodeURIComponent(enroll)}/assessments/${assessmentId}/submit`;

    const body: QuizSubmissionRequest = { answers };

    return this.http.post<QuizSubmissionResult>(url, body).pipe(
      catchError((error: HttpErrorResponse) => {
        let msg = 'Failed to submit quiz.';
        if (error.status === 409) {
          msg = 'You have already submitted this quiz.';
        } else if (error.error && error.error.message) {
          msg = error.error.message;
        }
        return throwError(() => new Error(msg));
      })
    );
  }
}
