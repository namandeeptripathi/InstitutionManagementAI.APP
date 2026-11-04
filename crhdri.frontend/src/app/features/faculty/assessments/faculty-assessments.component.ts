import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { FacultyService } from '../../../core/services/faculty.service';
import { ToastService } from '../../../core/services/toast.service';
import { IconComponent } from '../../../shared/components/icon.component';
import { 
  FacultyAssignedClass, 
  FacultyAssessmentItem, 
  FacultyClassAssessmentsResponse, 
  FacultyAssessmentSubmissionsResponse,
  CreateAssessmentPayload
} from '../../../core/models/faculty.models';

interface QuestionDraft {
  questionText: string;
  marks: number;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOption: 'A' | 'B' | 'C' | 'D';
}

@Component({
  selector: 'app-faculty-assessments',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  template: `
    <div class="assessments-page">
      <!-- Header Bar with Class Selector -->
      <div class="faculty-page-header">
        <div class="faculty-header-titles">
          <div class="badge-row">
            <span class="badge badge-teal badge-sm">
              <app-icon name="badge-check" [size]="12"></app-icon>
              FACULTY QUIZZES
            </span>
            <span class="meta-dot">&bull;</span>
            <span class="meta-year font-mono text-muted">AY 2026-2027</span>
          </div>
          <h2 class="faculty-page-title">Assessments & Quizzes Console</h2>
          <p class="faculty-page-subtitle">
            Create objective quizzes, schedule term examinations, and analyze student submission scores.
          </p>
        </div>

        <!-- Class Picker Tabs -->
        <div class="class-picker-wrap">
          <span class="picker-label font-mono">Assigned Class:</span>
          <div class="class-selector-box">
            @for (cls of assignedClasses(); track cls.facultyAssignmentId) {
              <button
                class="class-tab-btn"
                [class.active]="selectedClass()?.facultyAssignmentId === cls.facultyAssignmentId"
                (click)="selectClass(cls)"
                [attr.aria-label]="cls.subjectName"
              >
                <span class="tab-code font-mono">{{ cls.subjectCode }}</span>
                <span class="tab-sec">Sec {{ cls.section }}</span>
              </button>
            }
          </div>
        </div>
      </div>

      <!-- Loading / Error States -->
      @if (classesLoading()) {
        <div class="skeleton-container" aria-busy="true">
          <div class="skeleton header-skeleton"></div>
          <div class="skeleton body-skeleton"></div>
        </div>
      } @else if (classesError()) {
        <div class="error-banner card-modern" role="alert">
          <div class="error-icon-wrap">
            <app-icon name="alert" [size]="24"></app-icon>
          </div>
          <div class="error-text">
            <h3 class="error-title">Unable to Load Assigned Classes</h3>
            <p class="error-desc">{{ classesError() }}</p>
          </div>
          <button class="btn btn-primary btn-sm" (click)="loadClasses()">
            <app-icon name="refresh" [size]="14"></app-icon>
            Retry Connection
          </button>
        </div>
      } @else if (selectedClass(); as currentClass) {
        <!-- Class Hero Banner -->
        <section class="class-hero-card card-modern">
          <div class="hero-left">
            <div class="hero-subject-row">
              <span class="subject-tag font-mono">{{ currentClass.subjectCode }}</span>
              <h2 class="hero-title">{{ currentClass.subjectName }}</h2>
            </div>
            <p class="hero-course">
              {{ currentClass.courseName }}
              <span class="font-mono text-muted">({{ currentClass.courseCode }})</span>
            </p>
            <div class="cohort-badges-row">
              <span class="cohort-pill">
                <strong>Semester {{ currentClass.semester }}</strong> &bull; Section {{ currentClass.section }}
              </span>
              <span class="cohort-pill font-mono text-muted">{{ currentClass.academicYear }}</span>
              <span class="cohort-pill font-mono text-teal">{{ enrolledCount() }} Enrolled Students</span>
            </div>
          </div>

          <div class="hero-right">
            <button class="btn btn-primary btn-sm" (click)="openCreateModal()">
              <app-icon name="plus" [size]="13"></app-icon>
              <span>Create New Quiz</span>
            </button>
            <button class="btn btn-secondary btn-sm" (click)="loadAssessments()" [disabled]="assessmentsLoading()" title="Refresh List">
              <app-icon name="refresh" [size]="13" [class.spin-icon]="assessmentsLoading()"></app-icon>
              <span>Refresh</span>
            </button>
          </div>
        </section>

        <!-- Assessments Section Content -->
        @if (assessmentsLoading()) {
          <div class="assessments-skeleton-grid">
            <div class="skeleton card-skeleton"></div>
            <div class="skeleton card-skeleton"></div>
          </div>
        } @else if (assessmentsError()) {
          <div class="error-banner card-modern" role="alert">
            <div class="error-icon-wrap">
              <app-icon name="alert" [size]="24"></app-icon>
            </div>
            <div class="error-text">
              <h3 class="error-title">Error Loading Assessments</h3>
              <p class="error-desc">{{ assessmentsError() }}</p>
            </div>
            <button class="btn btn-primary btn-sm" (click)="loadAssessments()">
              <app-icon name="refresh" [size]="14"></app-icon>
              Retry
            </button>
          </div>
        } @else if (assessments().length === 0) {
          <div class="card-modern empty-assessments-card">
            <div class="empty-icon-wrap large">
              <app-icon name="assessments" [size]="36"></app-icon>
            </div>
            <h3 class="empty-title">No Assessments Published</h3>
            <p class="empty-desc">
              You have not created any quizzes or examinations for {{ currentClass.subjectName }} yet.
            </p>
            <button class="btn btn-primary btn-sm" (click)="openCreateModal()">
              <app-icon name="plus" [size]="13"></app-icon>
              <span>Create First Quiz</span>
            </button>
          </div>
        } @else {
          <!-- Assessments Grid -->
          <div class="assessments-grid">
            @for (item of assessments(); track item.assessmentId) {
              <div class="card-modern assessment-card">
                <!-- Top Tags -->
                <div class="card-top-row">
                  <div class="type-tag-wrap">
                    <span class="badge badge-teal badge-sm font-mono">{{ item.assessmentType }}</span>
                    <span class="badge badge-neutral badge-sm font-mono">Max: {{ item.maxMarks }} Marks</span>
                  </div>
                  <div class="date-tag font-mono text-muted text-xs">
                    <app-icon name="clock" [size]="12"></app-icon>
                    <span>{{ item.assessmentDate ? (item.assessmentDate | date:'mediumDate') : 'Scheduled' }}</span>
                  </div>
                </div>

                <!-- Title -->
                <div class="card-body-content">
                  <h3 class="quiz-title">{{ item.assessmentName }}</h3>
                  
                  <!-- Performance Metrics Box -->
                  <div class="stats-metrics-box">
                    <div class="metric-item">
                      <span class="metric-val font-mono">{{ item.questionCount }}</span>
                      <span class="metric-lbl">Questions</span>
                    </div>
                    <div class="metric-item">
                      <span class="metric-val font-mono">{{ item.attemptCount }} / {{ enrolledCount() }}</span>
                      <span class="metric-lbl">Submissions</span>
                    </div>
                    <div class="metric-item">
                      <span class="metric-val font-mono">{{ item.avgMarks }} / {{ item.maxMarks }}</span>
                      <span class="metric-lbl">Avg Score</span>
                    </div>
                  </div>

                  <!-- Completion Progress Bar -->
                  <div class="progress-container">
                    <div class="progress-labels font-mono">
                      <span>Completion Rate</span>
                      <strong>{{ getCompletionPercent(item.attemptCount, enrolledCount()) }}%</strong>
                    </div>
                    <div class="progress-track">
                      <div class="progress-bar-fill" [style.width.%]="getCompletionPercent(item.attemptCount, enrolledCount())"></div>
                    </div>
                  </div>
                </div>

                <!-- Footer Actions -->
                <div class="card-footer-actions">
                  <button 
                    class="btn btn-secondary btn-sm flex-1" 
                    (click)="openSubmissionsDrawer(item)"
                    title="View student scores and answer key"
                  >
                    <app-icon name="profile" [size]="13"></app-icon>
                    <span>Submissions & Answers</span>
                  </button>

                  <button 
                    class="btn btn-outline btn-sm delete-btn" 
                    (click)="confirmDeleteAssessment(item)"
                    title="Delete assessment"
                    [disabled]="deletingId() === item.assessmentId"
                  >
                    @if (deletingId() === item.assessmentId) {
                      <span class="spin-icon">&#9696;</span>
                    } @else {
                      <app-icon name="close" [size]="13"></app-icon>
                    }
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            }
          </div>
        }
      }

      <!-- CREATE ASSESSMENT MODAL -->
      @if (createModalOpen()) {
        <div class="modal-overlay" (click)="closeCreateModal()">
          <div class="modal-dialog-clean create-quiz-dialog" (click)="$event.stopPropagation()">
            <div class="modal-header-clean">
              <div class="modal-title-wrap">
                <span class="badge badge-teal badge-sm font-mono">ASSESSMENT BUILDER</span>
                <h3 id="quiz-builder-title">Create Multiple-Choice Quiz</h3>
                <p class="modal-sub">Add questions and correct answer keys for {{ selectedClass()?.subjectName }}</p>
              </div>
              <button class="btn-ghost" (click)="closeCreateModal()" [disabled]="submitting()">
                <app-icon name="close" [size]="16"></app-icon>
              </button>
            </div>

            <div class="modal-body-clean scrollable-body">
              <!-- Basic Metadata Grid -->
              <div class="form-grid">
                <div class="form-group span-2">
                  <label class="form-label font-mono">ASSESSMENT TITLE <span class="text-danger">*</span></label>
                  <input
                    type="text"
                    class="form-control"
                    [(ngModel)]="draftTitle"
                    placeholder="e.g. Mid-Term Quiz on Neural Networks & Optimization"
                    maxlength="200"
                  />
                </div>

                <div class="form-group">
                  <label class="form-label font-mono">ASSESSMENT TYPE</label>
                  <select class="form-control" [(ngModel)]="draftType">
                    <option value="QUIZ">Quiz / Quick Test</option>
                    <option value="MIDTERM">Midterm Exam</option>
                    <option value="ENDTERM">Endterm Exam</option>
                    <option value="PRACTICAL">Practical Test</option>
                    <option value="OTHER">Other Assessment</option>
                  </select>
                </div>

                <div class="form-group">
                  <label class="form-label font-mono">ASSESSMENT DATE</label>
                  <input
                    type="date"
                    class="form-control font-mono"
                    [(ngModel)]="draftDate"
                  />
                </div>
              </div>

              <!-- Questions Builder Header -->
              <div class="questions-section-header">
                <div>
                  <h4 class="questions-section-title">Multiple-Choice Questions</h4>
                  <span class="questions-stat font-mono text-muted text-xs">
                    {{ draftQuestions.length }} Questions &bull; Total Max Marks: {{ calculateTotalMarks() }}
                  </span>
                </div>
                <button type="button" class="btn btn-secondary btn-sm" (click)="addQuestion()">
                  <app-icon name="plus" [size]="12"></app-icon>
                  <span>Add Question</span>
                </button>
              </div>

              <!-- Questions List -->
              <div class="questions-builder-list">
                @for (q of draftQuestions; track $index; let qIndex = $index) {
                  <div class="question-builder-card">
                    <div class="q-header">
                      <div class="q-badge-wrap">
                        <span class="badge badge-teal badge-sm font-mono">Question {{ qIndex + 1 }}</span>
                        <div class="marks-input-wrap">
                          <label class="marks-label font-mono">Marks:</label>
                          <input 
                            type="number" 
                            class="form-control marks-input font-mono" 
                            [(ngModel)]="q.marks" 
                            min="0.5" 
                            step="0.5"
                          />
                        </div>
                      </div>

                      @if (draftQuestions.length > 1) {
                        <button 
                          type="button" 
                          class="btn-ghost remove-q-btn" 
                          (click)="removeQuestion(qIndex)"
                          title="Remove question"
                        >
                          <app-icon name="close" [size]="12"></app-icon>
                          <span>Remove</span>
                        </button>
                      }
                    </div>

                    <!-- Question Prompt -->
                    <div class="form-group">
                      <label class="form-label font-mono">QUESTION PROMPT <span class="text-danger">*</span></label>
                      <textarea
                        class="form-control"
                        [(ngModel)]="q.questionText"
                        rows="2"
                        placeholder="Enter the question text clearly..."
                      ></textarea>
                    </div>

                    <!-- 4 Options with Radio Selector for Correct Answer -->
                    <div class="options-builder-grid">
                      <div class="option-row" [class.is-correct]="q.correctOption === 'A'">
                        <label class="opt-radio-wrap" title="Mark Option A as correct answer">
                          <input type="radio" [name]="'correct_' + qIndex" value="A" [(ngModel)]="q.correctOption" />
                          <span class="opt-key font-mono">A</span>
                        </label>
                        <input
                          type="text"
                          class="form-control opt-input"
                          [(ngModel)]="q.optionA"
                          placeholder="Option A answer text..."
                        />
                      </div>

                      <div class="option-row" [class.is-correct]="q.correctOption === 'B'">
                        <label class="opt-radio-wrap" title="Mark Option B as correct answer">
                          <input type="radio" [name]="'correct_' + qIndex" value="B" [(ngModel)]="q.correctOption" />
                          <span class="opt-key font-mono">B</span>
                        </label>
                        <input
                          type="text"
                          class="form-control opt-input"
                          [(ngModel)]="q.optionB"
                          placeholder="Option B answer text..."
                        />
                      </div>

                      <div class="option-row" [class.is-correct]="q.correctOption === 'C'">
                        <label class="opt-radio-wrap" title="Mark Option C as correct answer">
                          <input type="radio" [name]="'correct_' + qIndex" value="C" [(ngModel)]="q.correctOption" />
                          <span class="opt-key font-mono">C</span>
                        </label>
                        <input
                          type="text"
                          class="form-control opt-input"
                          [(ngModel)]="q.optionC"
                          placeholder="Option C answer text..."
                        />
                      </div>

                      <div class="option-row" [class.is-correct]="q.correctOption === 'D'">
                        <label class="opt-radio-wrap" title="Mark Option D as correct answer">
                          <input type="radio" [name]="'correct_' + qIndex" value="D" [(ngModel)]="q.correctOption" />
                          <span class="opt-key font-mono">D</span>
                        </label>
                        <input
                          type="text"
                          class="form-control opt-input"
                          [(ngModel)]="q.optionD"
                          placeholder="Option D answer text..."
                        />
                      </div>
                    </div>
                  </div>
                }
              </div>

              <!-- Modal Error Banner -->
              @if (createModalError()) {
                <div class="modal-error font-mono">
                  {{ createModalError() }}
                </div>
              }
            </div>

            <!-- Modal Footer -->
            <div class="modal-footer-clean">
              <div class="footer-summary font-mono text-muted text-xs">
                Total: <strong>{{ draftQuestions.length }}</strong> questions &bull; 
                <strong>{{ calculateTotalMarks() }}</strong> Marks
              </div>
              <div class="footer-btn-group">
                <button type="button" class="btn btn-secondary btn-sm" (click)="closeCreateModal()" [disabled]="submitting()">
                  Cancel
                </button>
                <button type="button" class="btn btn-primary btn-sm" (click)="publishAssessment()" [disabled]="submitting()">
                  @if (submitting()) {
                    <span class="spin-icon">&#9696;</span>
                    <span>Publishing...</span>
                  } @else {
                    <app-icon name="badge-check" [size]="13"></app-icon>
                    <span>Publish Assessment</span>
                  }
                </button>
              </div>
            </div>
          </div>
        </div>
      }

      <!-- SUBMISSIONS & QUESTION PAPER DRAWER -->
      @if (submissionsDrawerOpen()) {
        <div class="modal-overlay" (click)="closeSubmissionsDrawer()">
          <div class="modal-dialog-clean drawer-dialog" (click)="$event.stopPropagation()">
            <!-- Drawer Header -->
            <div class="modal-header-clean">
              <div class="modal-title-wrap">
                <div class="drawer-badge-row">
                  <span class="badge badge-teal badge-sm font-mono">{{ activeSubmissionsData()?.assessment?.assessmentType }}</span>
                  <span class="badge badge-neutral badge-sm font-mono">{{ activeSubmissionsData()?.assessment?.subjectCode }}</span>
                  <span class="badge badge-neutral badge-sm font-mono">Max: {{ activeSubmissionsData()?.assessment?.maxMarks }} Marks</span>
                </div>
                <h3>{{ activeSubmissionsData()?.assessment?.assessmentName }}</h3>
                <p class="modal-sub font-mono">
                  {{ activeSubmissionsData()?.assessment?.courseName }} &bull; Sem {{ activeSubmissionsData()?.assessment?.semester }} &bull; Sec {{ activeSubmissionsData()?.assessment?.section }}
                </p>
              </div>
              <button class="btn-ghost" (click)="closeSubmissionsDrawer()">
                <app-icon name="close" [size]="16"></app-icon>
              </button>
            </div>

            <!-- Metrics Strip -->
            @if (activeSubmissionsData(); as data) {
              <div class="drawer-metric-strip">
                <div class="strip-item">
                  <span class="strip-val font-mono">{{ data.totalEnrolled }}</span>
                  <span class="strip-lbl">Enrolled</span>
                </div>
                <div class="strip-item">
                  <span class="strip-val font-mono">{{ data.totalAttempted }}</span>
                  <span class="strip-lbl">Submissions</span>
                </div>
                <div class="strip-item">
                  <span class="strip-val font-mono">{{ data.classAverageMarks }} / {{ data.assessment.maxMarks }}</span>
                  <span class="strip-lbl">Average Score</span>
                </div>
                <div class="strip-item">
                  <span class="strip-val font-mono">{{ data.completionRate }}%</span>
                  <span class="strip-lbl">Completion</span>
                </div>
              </div>

              <!-- Drawer Tabs Navigation -->
              <div class="drawer-nav-tabs">
                <button 
                  class="drawer-tab-btn" 
                  [class.active]="drawerTab() === 'roster'"
                  (click)="drawerTab.set('roster')"
                >
                  <app-icon name="profile" [size]="13"></app-icon>
                  <span>Student Submissions ({{ data.submissions.length }})</span>
                </button>
                <button 
                  class="drawer-tab-btn" 
                  [class.active]="drawerTab() === 'questions'"
                  (click)="drawerTab.set('questions')"
                >
                  <app-icon name="assessments" [size]="13"></app-icon>
                  <span>Question Paper & Key ({{ data.questions.length }})</span>
                </button>
              </div>

              <!-- Drawer Tab 1: Student Roster -->
              @if (drawerTab() === 'roster') {
                <div class="drawer-tab-body">
                  <table class="table-modern">
                    <thead>
                      <tr>
                        <th style="width: 160px;">ROLL NO</th>
                        <th>STUDENT NAME</th>
                        <th style="width: 140px;">STATUS</th>
                        <th style="width: 130px;">SCORE</th>
                        <th style="width: 180px;">SUBMITTED AT</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (s of data.submissions; track s.studentId) {
                        <tr>
                          <td class="font-mono text-bold">{{ s.enrollmentNumber }}</td>
                          <td>
                            <div class="student-name-text">{{ s.studentName }}</div>
                            <div class="student-email-text text-muted font-mono">{{ s.studentEmail }}</div>
                          </td>
                          <td>
                            @if (s.hasAttempted) {
                              <span class="badge badge-teal badge-sm font-mono">Completed</span>
                            } @else {
                              <span class="badge badge-neutral badge-sm font-mono">Not Attempted</span>
                            }
                          </td>
                          <td class="font-mono">
                            @if (s.hasAttempted && s.marksObtained !== null) {
                              <strong>{{ s.marksObtained }} / {{ data.assessment.maxMarks }}</strong>
                            } @else {
                              <span class="text-muted">—</span>
                            }
                          </td>
                          <td class="font-mono text-xs">
                            @if (s.submittedAt) {
                              {{ s.submittedAt | date:'medium' }}
                            } @else {
                              <span class="text-muted">—</span>
                            }
                          </td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              }

              <!-- Drawer Tab 2: Question Paper & Key -->
              @if (drawerTab() === 'questions') {
                <div class="drawer-tab-body questions-review-pane">
                  @for (q of data.questions; track q.questionId; let i = $index) {
                    <div class="question-review-card">
                      <div class="q-review-top">
                        <span class="badge badge-teal badge-sm font-mono">Question {{ i + 1 }}</span>
                        <span class="badge badge-neutral badge-sm font-mono">{{ q.marks }} Marks</span>
                      </div>
                      <h4 class="q-review-prompt">{{ q.questionText }}</h4>
                      
                      <div class="q-review-options">
                        @for (opt of getOptionEntries(q.options); track opt.key) {
                          <div 
                            class="review-opt-item" 
                            [class.opt-correct-highlight]="opt.key.toUpperCase() === q.correctOption.toUpperCase()"
                          >
                            <span class="rev-opt-key font-mono">{{ opt.key }}</span>
                            <span class="rev-opt-label">{{ opt.val }}</span>
                            @if (opt.key.toUpperCase() === q.correctOption.toUpperCase()) {
                              <span class="badge badge-teal badge-sm font-mono">✓ CORRECT ANSWER</span>
                            }
                          </div>
                        }
                      </div>
                    </div>
                  }
                </div>
              }
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .assessments-page {
      display: flex;
      flex-direction: column;
      gap: 20px;
      padding-bottom: 30px;
    }

    .badge-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .meta-dot {
      color: var(--border-medium);
    }

    .text-teal {
      color: var(--color-teal);
    }

    .text-danger {
      color: var(--color-danger);
    }

    .flex-1 {
      flex: 1;
    }

    /* Skeleton Loading */
    .skeleton-container {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .header-skeleton {
      height: 90px;
      border-radius: var(--radius-lg);
    }

    .body-skeleton {
      height: 480px;
      border-radius: var(--radius-lg);
    }

    .assessments-skeleton-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
      gap: 20px;
    }

    .card-skeleton {
      height: 240px;
      border-radius: var(--radius-lg);
    }

    /* Error Banner */
    .error-banner {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 20px 24px;
      border-left: 4px solid var(--color-danger);
    }

    .error-icon-wrap {
      color: var(--color-danger);
    }

    .error-text {
      flex: 1;
    }

    .error-title {
      font-size: 15px;
      font-weight: 700;
      color: var(--color-danger);
      margin-bottom: 2px;
    }

    .error-desc {
      font-size: 13.5px;
      color: var(--text-secondary);
    }

    /* Class Hero Card */
    .class-hero-card {
      padding: 22px 28px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 20px;
      flex-wrap: wrap;
    }

    .hero-left {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .hero-subject-row {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }

    .subject-tag {
      font-size: 13.5px;
      font-weight: 700;
      color: var(--color-teal);
      background: var(--color-teal-surface);
      border: 1px solid var(--color-teal-border);
      padding: 3px 10px;
      border-radius: var(--radius-md);
    }

    .hero-title {
      font-size: 19px;
      font-weight: 700;
      color: var(--text-main);
    }

    .hero-course {
      font-size: 13.5px;
      color: var(--text-secondary);
    }

    .cohort-badges-row {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 2px;
      flex-wrap: wrap;
    }

    .cohort-pill {
      font-size: 12px;
      background: var(--bg-surface-subtle);
      border: 1px solid var(--border-subtle);
      padding: 3px 10px;
      border-radius: var(--radius-sm);
    }

    .hero-right {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    /* Assessments Grid */
    .assessments-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
      gap: 20px;
    }

    .assessment-card {
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      box-shadow: var(--shadow-sm);
      transition: all var(--transition-fast);
    }

    .assessment-card:hover {
      border-color: var(--border-medium);
      box-shadow: var(--shadow-card-hover);
      transform: translateY(-2px);
    }

    .card-top-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
    }

    .type-tag-wrap {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .date-tag {
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }

    .card-body-content {
      display: flex;
      flex-direction: column;
      gap: 14px;
      flex: 1;
    }

    .quiz-title {
      font-size: 16px;
      font-weight: 700;
      color: var(--text-main);
      line-height: 1.35;
    }

    .stats-metrics-box {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
      background: var(--bg-surface-subtle);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      padding: 10px;
      text-align: center;
    }

    .metric-item {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .metric-val {
      font-size: 14px;
      font-weight: 700;
      color: var(--text-main);
    }

    .metric-lbl {
      font-size: 10.5px;
      color: var(--text-muted);
    }

    .progress-container {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .progress-labels {
      display: flex;
      justify-content: space-between;
      font-size: 11.5px;
      color: var(--text-secondary);
    }

    .progress-track {
      height: 6px;
      background: var(--bg-surface-inset);
      border-radius: var(--radius-full);
      overflow: hidden;
    }

    .progress-bar-fill {
      height: 100%;
      background: var(--color-teal);
      border-radius: var(--radius-full);
      transition: width var(--transition-normal);
    }

    .card-footer-actions {
      display: flex;
      align-items: center;
      gap: 8px;
      padding-top: 14px;
      border-top: 1px solid var(--border-subtle);
    }

    .delete-btn {
      color: var(--color-danger);
    }

    .delete-btn:hover {
      background: var(--color-danger-surface);
      border-color: var(--color-danger-border);
    }

    .empty-assessments-card {
      padding: 60px 24px;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
    }

    .empty-icon-wrap {
      width: 48px;
      height: 48px;
      border-radius: var(--radius-full);
      background: var(--bg-surface-subtle);
      border: 1px solid var(--border-subtle);
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--text-muted);
    }

    .empty-icon-wrap.large {
      width: 64px;
      height: 64px;
    }

    .empty-title {
      font-size: 16px;
      font-weight: 700;
      color: var(--text-main);
    }

    .empty-desc {
      font-size: 13.5px;
      color: var(--text-secondary);
      max-width: 420px;
    }

    /* Modal Form Styling */
    .create-quiz-dialog {
      max-width: 720px;
    }

    .drawer-dialog {
      max-width: 840px;
    }

    .scrollable-body {
      max-height: 65vh;
      overflow-y: auto;
    }

    .form-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
    }

    .span-2 {
      grid-column: span 2;
    }

    .questions-section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding-top: 12px;
      border-top: 1px solid var(--border-subtle);
    }

    .questions-section-title {
      font-size: 15px;
      font-weight: 700;
      color: var(--text-main);
    }

    .questions-builder-list {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .question-builder-card {
      background: var(--bg-surface-subtle);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .q-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .q-badge-wrap {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .marks-input-wrap {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .marks-label {
      font-size: 12px;
      color: var(--text-muted);
    }

    .marks-input {
      width: 60px;
      padding: 3px 6px;
      font-size: 12px;
    }

    .remove-q-btn {
      color: var(--color-danger);
      font-size: 12px;
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }

    .options-builder-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }

    @media (max-width: 640px) {
      .options-builder-grid {
        grid-template-columns: 1fr;
      }
    }

    .option-row {
      display: flex;
      align-items: center;
      gap: 8px;
      background: #FFFFFF;
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      padding: 4px 8px;
      transition: all var(--transition-fast);
    }

    .option-row.is-correct {
      border-color: var(--color-teal);
      background: var(--color-teal-surface);
    }

    .opt-radio-wrap {
      display: flex;
      align-items: center;
      gap: 4px;
      cursor: pointer;
    }

    .opt-key {
      font-size: 12px;
      font-weight: 700;
      color: var(--text-main);
    }

    .opt-input {
      border: none;
      background: transparent;
      padding: 4px 6px;
      font-size: 13px;
    }

    .opt-input:focus {
      box-shadow: none;
    }

    .modal-title-wrap {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .modal-sub {
      font-size: 12.5px;
      color: var(--text-secondary);
    }

    .modal-error {
      padding: 8px 12px;
      background: var(--color-danger-surface);
      border: 1px solid var(--color-danger-border);
      color: var(--color-danger);
      font-size: 12px;
      border-radius: var(--radius-sm);
    }

    .footer-btn-group {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    /* Submissions Drawer Strip */
    .drawer-badge-row {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .drawer-metric-strip {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      background: var(--bg-surface-subtle);
      border-bottom: 1px solid var(--border-subtle);
      padding: 14px 24px;
      text-align: center;
    }

    .strip-item {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .strip-val {
      font-size: 17px;
      font-weight: 700;
      color: var(--color-teal);
    }

    .strip-lbl {
      font-size: 11px;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .drawer-nav-tabs {
      display: flex;
      border-bottom: 1px solid var(--border-subtle);
      background: var(--bg-surface);
      padding: 0 24px;
      gap: 8px;
    }

    .drawer-tab-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 12px 16px;
      border: none;
      background: transparent;
      color: var(--text-secondary);
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      border-bottom: 2px solid transparent;
      transition: all var(--transition-fast);
    }

    .drawer-tab-btn:hover {
      color: var(--text-main);
    }

    .drawer-tab-btn.active {
      color: var(--color-teal);
      border-bottom-color: var(--color-teal);
      font-weight: 700;
    }

    .drawer-tab-body {
      padding: 20px 24px;
      max-height: 55vh;
      overflow-y: auto;
    }

    .student-name-text {
      font-size: 13.5px;
      font-weight: 600;
      color: var(--text-main);
    }

    .student-email-text {
      font-size: 11.5px;
    }

    .questions-review-pane {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .question-review-card {
      background: var(--bg-surface-subtle);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .q-review-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .q-review-prompt {
      font-size: 14.5px;
      font-weight: 600;
      color: var(--text-main);
      line-height: 1.4;
    }

    .q-review-options {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .review-opt-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 12px;
      background: #FFFFFF;
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      font-size: 13px;
    }

    .review-opt-item.opt-correct-highlight {
      background: var(--color-teal-surface);
      border-color: var(--color-teal);
    }

    .rev-opt-key {
      font-weight: 700;
      width: 16px;
      color: var(--color-teal);
    }

    .rev-opt-label {
      flex: 1;
      color: var(--text-main);
    }

    .spin-icon {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      100% { transform: rotate(360deg); }
    }
  `]
})
export class FacultyAssessmentsComponent implements OnInit {
  private readonly facultyService = inject(FacultyService);
  private readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  // Class State
  assignedClasses = signal<FacultyAssignedClass[]>([]);
  selectedClass = signal<FacultyAssignedClass | null>(null);
  classesLoading = signal<boolean>(true);
  classesError = signal<string | null>(null);

  // Assessments State
  assessments = signal<FacultyAssessmentItem[]>([]);
  enrolledCount = signal<number>(0);
  assessmentsLoading = signal<boolean>(false);
  assessmentsError = signal<string | null>(null);

  // Create Modal State
  createModalOpen = signal<boolean>(false);
  draftTitle = '';
  draftType = 'QUIZ';
  draftDate = '';
  draftQuestions: QuestionDraft[] = [];
  createModalError = signal<string | null>(null);
  submitting = signal<boolean>(false);

  // Submissions Drawer State
  submissionsDrawerOpen = signal<boolean>(false);
  activeSubmissionsData = signal<FacultyAssessmentSubmissionsResponse | null>(null);
  drawerTab = signal<'roster' | 'questions'>('roster');

  // Delete State
  deletingId = signal<string | null>(null);

  ngOnInit(): void {
    this.draftDate = new Date().toISOString().split('T')[0];
    this.loadClasses();
  }

  loadClasses(): void {
    this.classesLoading.set(true);
    this.classesError.set(null);

    this.facultyService.getMyClasses().subscribe({
      next: (classes) => {
        this.assignedClasses.set(classes);
        this.classesLoading.set(false);

        if (classes.length > 0) {
          const routeParamId = this.route.snapshot.paramMap.get('facultyAssignmentId');
          const target = routeParamId 
            ? classes.find(c => c.facultyAssignmentId === routeParamId) || classes[0]
            : classes[0];

          this.selectClass(target);
        }
      },
      error: (err) => {
        this.classesError.set(err.message || 'Failed to load assigned classes.');
        this.classesLoading.set(false);
      }
    });
  }

  selectClass(cls: FacultyAssignedClass): void {
    this.selectedClass.set(cls);
    this.loadAssessments();
  }

  loadAssessments(): void {
    const cls = this.selectedClass();
    if (!cls) return;

    this.assessmentsLoading.set(true);
    this.assessmentsError.set(null);

    this.facultyService.getClassAssessments(cls.facultyAssignmentId).subscribe({
      next: (res) => {
        this.assessments.set(res.assessments || []);
        this.enrolledCount.set(res.enrolledStudents || 0);
        this.assessmentsLoading.set(false);
      },
      error: (err) => {
        this.assessmentsError.set(err.message || 'Failed to load assessments for this class.');
        this.assessmentsLoading.set(false);
      }
    });
  }

  getCompletionPercent(attempts: number, enrolled: number): number {
    if (!enrolled || enrolled <= 0) return 0;
    return Math.min(100, Math.round((attempts * 100) / enrolled));
  }

  openCreateModal(): void {
    this.draftTitle = '';
    this.draftType = 'QUIZ';
    this.draftDate = new Date().toISOString().split('T')[0];
    this.createModalError.set(null);
    this.submitting.set(false);

    this.draftQuestions = [
      {
        questionText: '',
        marks: 1,
        optionA: '',
        optionB: '',
        optionC: '',
        optionD: '',
        correctOption: 'A'
      }
    ];

    this.createModalOpen.set(true);
  }

  closeCreateModal(): void {
    if (this.submitting()) return;
    this.createModalOpen.set(false);
  }

  addQuestion(): void {
    this.draftQuestions.push({
      questionText: '',
      marks: 1,
      optionA: '',
      optionB: '',
      optionC: '',
      optionD: '',
      correctOption: 'A'
    });
  }

  removeQuestion(index: number): void {
    if (this.draftQuestions.length > 1) {
      this.draftQuestions.splice(index, 1);
    }
  }

  calculateTotalMarks(): number {
    return this.draftQuestions.reduce((sum, q) => sum + (Number(q.marks) || 0), 0);
  }

  publishAssessment(): void {
    const cls = this.selectedClass();
    if (!cls) return;

    if (!this.draftTitle || !this.draftTitle.trim()) {
      this.createModalError.set('Please provide an assessment title.');
      return;
    }

    if (this.draftQuestions.length === 0) {
      this.createModalError.set('Assessment must contain at least one question.');
      return;
    }

    for (let i = 0; i < this.draftQuestions.length; i++) {
      const q = this.draftQuestions[i];
      if (!q.questionText || !q.questionText.trim()) {
        this.createModalError.set(`Question ${i + 1} prompt cannot be empty.`);
        return;
      }

      if (!q.optionA?.trim() || !q.optionB?.trim() || !q.optionC?.trim() || !q.optionD?.trim()) {
        this.createModalError.set(`Question ${i + 1} must have all 4 options (A, B, C, D) filled in.`);
        return;
      }

      if (!q.marks || q.marks <= 0) {
        this.createModalError.set(`Question ${i + 1} marks must be greater than zero.`);
        return;
      }
    }

    this.submitting.set(true);
    this.createModalError.set(null);

    const payload: CreateAssessmentPayload = {
      title: this.draftTitle.trim(),
      assessmentType: this.draftType,
      assessmentDate: this.draftDate ? this.draftDate : null,
      questions: this.draftQuestions.map(q => ({
        questionText: q.questionText.trim(),
        options: {
          A: q.optionA.trim(),
          B: q.optionB.trim(),
          C: q.optionC.trim(),
          D: q.optionD.trim()
        },
        correctOption: q.correctOption,
        marks: Number(q.marks) || 1
      }))
    };

    this.facultyService.createAssessment(cls.facultyAssignmentId, payload).subscribe({
      next: (res) => {
        this.submitting.set(false);
        this.createModalOpen.set(false);
        this.toast.success(
          `Published "${res.assessmentName}" with ${res.totalQuestions} questions (Max ${res.maxMarks} marks).`,
          'Quiz Published'
        );
        this.loadAssessments();
      },
      error: (err) => {
        this.submitting.set(false);
        this.createModalError.set(err.message || 'Failed to publish assessment.');
      }
    });
  }

  confirmDeleteAssessment(item: FacultyAssessmentItem): void {
    if (item.attemptCount > 0) {
      this.toast.error(
        `Cannot delete "${item.assessmentName}" because ${item.attemptCount} student(s) have already submitted attempts. Assessment records must be preserved for institutional academic integrity.`,
        'Deletion Disallowed'
      );
      return;
    }

    const confirmed = window.confirm(`Are you sure you want to delete "${item.assessmentName}"? This action cannot be undone.`);
    if (!confirmed) return;

    this.deletingId.set(item.assessmentId);
    this.facultyService.deleteAssessment(item.assessmentId).subscribe({
      next: () => {
        this.deletingId.set(null);
        this.toast.success(`Assessment "${item.assessmentName}" deleted successfully.`, 'Deleted');
        this.loadAssessments();
      },
      error: (err) => {
        this.deletingId.set(null);
        this.toast.error(err.message || 'Failed to delete assessment.', 'Delete Error');
      }
    });
  }

  openSubmissionsDrawer(item: FacultyAssessmentItem): void {
    this.drawerTab.set('roster');
    this.facultyService.getAssessmentSubmissions(item.assessmentId).subscribe({
      next: (data) => {
        this.activeSubmissionsData.set(data);
        this.submissionsDrawerOpen.set(true);
      },
      error: (err) => {
        this.toast.error(err.message || 'Unable to load assessment submissions.', 'Error');
      }
    });
  }

  closeSubmissionsDrawer(): void {
    this.submissionsDrawerOpen.set(false);
    this.activeSubmissionsData.set(null);
  }

  getOptionEntries(options: Record<string, string> | any): { key: string; val: string }[] {
    if (!options || typeof options !== 'object') return [];
    return Object.keys(options).map(key => ({
      key,
      val: options[key]
    }));
  }
}
