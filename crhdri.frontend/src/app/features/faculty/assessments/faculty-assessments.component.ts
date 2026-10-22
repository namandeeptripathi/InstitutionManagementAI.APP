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
      <div class="page-header card-tactile">
        <div class="header-titles">
          <div class="badge-row">
            <span class="badge badge-forest font-mono">STAGE 7 &bull; FACULTY QUIZZES</span>
            <span class="meta-dot">&bull;</span>
            <span class="meta-year font-mono">AY 2026-2027</span>
          </div>
          <h2 class="page-title font-editorial">Assessments & Quizzes Console</h2>
          <p class="page-subtitle">
            Create multiple-choice quizzes, schedule exams, monitor student submissions in real-time, and analyze class performance.
          </p>
        </div>

        <!-- Class Picker Tabs -->
        <div class="class-picker-wrap">
          <label class="picker-label font-mono">ASSIGNED CLASS:</label>
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
        <div class="error-banner card-tactile" role="alert">
          <div class="error-icon-wrap">
            <app-icon name="alert" [size]="28"></app-icon>
          </div>
          <div class="error-text">
            <h3 class="error-title">Unable to Load Assigned Classes</h3>
            <p class="error-desc">{{ classesError() }}</p>
          </div>
          <button class="btn btn-primary" (click)="loadClasses()">
            <app-icon name="refresh" [size]="16"></app-icon>
            Retry Connection
          </button>
        </div>
      } @else if (selectedClass(); as currentClass) {
        <!-- Class Hero Banner -->
        <section class="class-hero-card card-tactile">
          <div class="hero-left">
            <div class="hero-subject-row">
              <span class="subject-tag font-mono">{{ currentClass.subjectCode }}</span>
              <h2 class="hero-title font-editorial">{{ currentClass.subjectName }}</h2>
            </div>
            <p class="hero-course">
              {{ currentClass.courseName }}
              <span class="font-mono">({{ currentClass.courseCode }})</span>
            </p>
            <div class="cohort-badges-row">
              <span class="cohort-pill">
                <strong>Semester {{ currentClass.semester }}</strong> &bull; Section {{ currentClass.section }}
              </span>
              <span class="cohort-pill font-mono">{{ currentClass.academicYear }}</span>
              <span class="cohort-pill font-mono">{{ enrolledCount() }} Enrolled Students</span>
            </div>
          </div>

          <div class="hero-right">
            <button class="btn btn-primary create-btn" (click)="openCreateModal()">
              <app-icon name="assessments" [size]="16"></app-icon>
              <span>Create New Quiz</span>
            </button>
            <button class="btn btn-outline refresh-btn" (click)="loadAssessments()" [disabled]="assessmentsLoading()" title="Refresh List">
              <app-icon name="refresh" [size]="15" [class.spin-icon]="assessmentsLoading()"></app-icon>
              <span>Refresh</span>
            </button>
          </div>
        </section>

        <!-- Assessments Section Content -->
        @if (assessmentsLoading()) {
          <div class="skeleton-container" aria-busy="true">
            <div class="skeleton table-skeleton"></div>
          </div>
        } @else if (assessmentsError()) {
          <div class="error-banner card-tactile" role="alert">
            <div class="error-icon-wrap">
              <app-icon name="alert" [size]="28"></app-icon>
            </div>
            <div class="error-text">
              <h3 class="error-title">Error Loading Assessments</h3>
              <p class="error-desc">{{ assessmentsError() }}</p>
            </div>
            <button class="btn btn-primary" (click)="loadAssessments()">
              <app-icon name="refresh" [size]="16"></app-icon>
              Retry
            </button>
          </div>
        } @else if (assessments().length === 0) {
          <div class="card-tactile empty-state">
            <app-icon name="assessments" [size]="48" class="empty-icon"></app-icon>
            <h3 class="empty-title font-editorial">No Assessments Published</h3>
            <p class="empty-subtitle">
              You have not created any quizzes or examinations for {{ currentClass.subjectName }} yet.
            </p>
            <button class="btn btn-primary" (click)="openCreateModal()">
              <app-icon name="assessments" [size]="16"></app-icon>
              Create First Quiz
            </button>
          </div>
        } @else {
          <!-- Assessments Grid -->
          <div class="assessments-grid">
            @for (item of assessments(); track item.assessmentId) {
              <div class="card-tactile assessment-card">
                <!-- Top Tags -->
                <div class="card-top-row">
                  <div class="type-tag-wrap">
                    <span class="badge badge-forest font-mono">{{ item.assessmentType }}</span>
                    <span class="max-marks-pill font-mono">Max: {{ item.maxMarks }} Marks</span>
                  </div>
                  <div class="date-tag font-mono">
                    <app-icon name="clock" [size]="13"></app-icon>
                    <span>{{ item.assessmentDate ? (item.assessmentDate | date:'mediumDate') : 'Scheduled' }}</span>
                  </div>
                </div>

                <!-- Title -->
                <div class="card-body-content">
                  <h3 class="quiz-title font-editorial">{{ item.assessmentName }}</h3>
                  
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
                      <div class="progress-bar" [style.width.%]="getCompletionPercent(item.attemptCount, enrolledCount())"></div>
                    </div>
                  </div>
                </div>

                <!-- Footer Actions -->
                <div class="card-footer-actions">
                  <button 
                    class="btn btn-secondary btn-sm roster-btn" 
                    (click)="openSubmissionsDrawer(item)"
                    title="View student scores and answer key"
                  >
                    <app-icon name="profile" [size]="14"></app-icon>
                    <span>Submissions & Answers</span>
                  </button>

                  <button 
                    class="btn btn-outline btn-sm delete-btn" 
                    (click)="confirmDeleteAssessment(item)"
                    title="Delete assessment"
                    [disabled]="deletingId() === item.assessmentId"
                  >
                    <app-icon name="close" [size]="14"></app-icon>
                    <span>{{ deletingId() === item.assessmentId ? 'Deleting...' : 'Delete' }}</span>
                  </button>
                </div>
              </div>
            }
          </div>
        }
      }

      <!-- CREATE ASSESSMENT MODAL -->
      @if (createModalOpen()) {
        <div class="modal-backdrop" (click)="closeCreateModal()">
          <div class="modal-dialog card-tactile" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <div class="modal-header-meta">
                <span class="badge badge-forest font-mono">ASSESSMENT BUILDER</span>
                <h3 class="modal-title font-editorial">Create Multiple-Choice Quiz</h3>
                <p class="modal-subtitle">
                  Configure quiz parameters and add objective questions for {{ selectedClass()?.subjectName }}.
                </p>
              </div>
              <button class="dialog-close btn-ghost" (click)="closeCreateModal()" [disabled]="submitting()">✕</button>
            </div>

            <div class="modal-body">
              <!-- Basic Metadata Grid -->
              <div class="form-grid">
                <div class="form-group span-2">
                  <label class="form-label font-mono">ASSESSMENT TITLE *</label>
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
                  <h4 class="questions-section-title font-editorial">Multiple-Choice Questions</h4>
                  <span class="questions-stat font-mono">
                    {{ draftQuestions.length }} Questions &bull; Total Max Marks: {{ calculateTotalMarks() }}
                  </span>
                </div>
                <button type="button" class="btn btn-secondary btn-sm" (click)="addQuestion()">
                  <span>+ Add Question</span>
                </button>
              </div>

              <!-- Questions List -->
              <div class="questions-builder-list">
                @for (q of draftQuestions; track $index; let qIndex = $index) {
                  <div class="question-builder-card card-tactile">
                    <div class="q-header">
                      <div class="q-badge-wrap">
                        <span class="q-num-badge font-mono">Question {{ qIndex + 1 }}</span>
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
                          ✕ Remove
                        </button>
                      }
                    </div>

                    <!-- Question Prompt -->
                    <div class="form-group">
                      <label class="form-label font-mono">QUESTION PROMPT *</label>
                      <textarea
                        class="form-control prompt-textarea"
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
                <div class="modal-error-banner">
                  <app-icon name="alert" [size]="16"></app-icon>
                  <span>{{ createModalError() }}</span>
                </div>
              }
            </div>

            <!-- Modal Footer -->
            <div class="modal-footer">
              <div class="footer-summary font-mono">
                Total: <strong>{{ draftQuestions.length }}</strong> questions &bull; 
                <strong>{{ calculateTotalMarks() }}</strong> Marks
              </div>
              <div class="footer-btn-group">
                <button type="button" class="btn btn-secondary" (click)="closeCreateModal()" [disabled]="submitting()">
                  Cancel
                </button>
                <button type="button" class="btn btn-primary" (click)="publishAssessment()" [disabled]="submitting()">
                  <app-icon name="check" [size]="16"></app-icon>
                  <span>{{ submitting() ? 'Publishing...' : 'Publish Assessment' }}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      }

      <!-- SUBMISSIONS & QUESTION PAPER DRAWER -->
      @if (submissionsDrawerOpen()) {
        <div class="modal-backdrop" (click)="closeSubmissionsDrawer()">
          <div class="drawer-dialog card-tactile" (click)="$event.stopPropagation()">
            <!-- Drawer Header -->
            <div class="drawer-header">
              <div class="drawer-header-meta">
                <div class="drawer-badge-row">
                  <span class="badge badge-forest font-mono">{{ activeSubmissionsData()?.assessment?.assessmentType }}</span>
                  <span class="subject-tag font-mono">{{ activeSubmissionsData()?.assessment?.subjectCode }}</span>
                  <span class="max-badge font-mono">Max: {{ activeSubmissionsData()?.assessment?.maxMarks }} Marks</span>
                </div>
                <h3 class="drawer-title font-editorial">{{ activeSubmissionsData()?.assessment?.assessmentName }}</h3>
                <p class="drawer-subtitle font-mono">
                  {{ activeSubmissionsData()?.assessment?.courseName }} &bull; Sem {{ activeSubmissionsData()?.assessment?.semester }} &bull; Sec {{ activeSubmissionsData()?.assessment?.section }}
                </p>
              </div>
              <button class="dialog-close btn-ghost" (click)="closeSubmissionsDrawer()">✕</button>
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
                  <app-icon name="profile" [size]="14"></app-icon>
                  <span>Student Submissions ({{ data.submissions.length }})</span>
                </button>
                <button 
                  class="drawer-tab-btn" 
                  [class.active]="drawerTab() === 'questions'"
                  (click)="drawerTab.set('questions')"
                >
                  <app-icon name="assessments" [size]="14"></app-icon>
                  <span>Question Paper & Answer Key ({{ data.questions.length }})</span>
                </button>
              </div>

              <!-- Drawer Tab 1: Student Roster -->
              @if (drawerTab() === 'roster') {
                <div class="drawer-tab-body">
                  <table class="roster-table">
                    <thead>
                      <tr>
                        <th class="font-mono">ROLL NO</th>
                        <th>STUDENT NAME</th>
                        <th>STATUS</th>
                        <th class="font-mono">SCORE</th>
                        <th class="font-mono">SUBMITTED AT</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (s of data.submissions; track s.studentId) {
                        <tr [class.row-attempted]="s.hasAttempted">
                          <td class="font-mono roll-cell">{{ s.enrollmentNumber }}</td>
                          <td>
                            <div class="student-name-text">{{ s.studentName }}</div>
                            <div class="student-email-text font-mono">{{ s.studentEmail }}</div>
                          </td>
                          <td>
                            @if (s.hasAttempted) {
                              <span class="badge badge-forest font-mono">Completed</span>
                            } @else {
                              <span class="badge badge-secondary font-mono">Not Attempted</span>
                            }
                          </td>
                          <td class="font-mono score-cell">
                            @if (s.hasAttempted && s.marksObtained !== null) {
                              <strong>{{ s.marksObtained }} / {{ data.assessment.maxMarks }}</strong>
                            } @else {
                              <span class="text-muted">—</span>
                            }
                          </td>
                          <td class="font-mono date-cell">
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
                    <div class="card-tactile question-review-card">
                      <div class="q-review-top">
                        <span class="badge badge-forest font-mono">Question {{ i + 1 }}</span>
                        <span class="font-mono max-badge">{{ q.marks }} Marks</span>
                      </div>
                      <h4 class="q-review-prompt font-editorial">{{ q.questionText }}</h4>
                      
                      <div class="q-review-options">
                        @for (opt of getOptionEntries(q.options); track opt.key) {
                          <div 
                            class="review-opt-item" 
                            [class.opt-correct-highlight]="opt.key.toUpperCase() === q.correctOption.toUpperCase()"
                          >
                            <span class="rev-opt-key font-mono">{{ opt.key }}</span>
                            <span class="rev-opt-label">{{ opt.val }}</span>
                            @if (opt.key.toUpperCase() === q.correctOption.toUpperCase()) {
                              <span class="correct-badge font-mono">✓ CORRECT ANSWER</span>
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
      gap: 24px;
      padding-bottom: 60px;
    }

    /* Page Header */
    .page-header {
      display: flex;
      flex-direction: column;
      gap: 20px;
      padding: 24px;
      background: var(--surface);
      border-radius: var(--radius-lg);
    }
    @media (min-width: 900px) {
      .page-header {
        flex-direction: row;
        justify-content: space-between;
        align-items: flex-start;
      }
    }
    .badge-row {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
    }
    .meta-dot {
      color: var(--text-tertiary);
    }
    .meta-year {
      font-size: 12px;
      color: var(--text-tertiary);
    }
    .page-title {
      font-size: 26px;
      color: var(--text-primary);
      margin: 0 0 6px 0;
    }
    .page-subtitle {
      font-size: 14px;
      color: var(--text-secondary);
      margin: 0;
      max-width: 650px;
      line-height: 1.5;
    }

    /* Class Picker Tabs */
    .class-picker-wrap {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .picker-label {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.5px;
      color: var(--text-tertiary);
    }
    .class-selector-box {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }
    .class-tab-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      border-radius: var(--radius-md);
      background: var(--surface-secondary);
      border: 1px solid var(--border-color);
      color: var(--text-secondary);
      font-size: 13px;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .class-tab-btn:hover {
      background: var(--surface-tertiary);
      border-color: var(--forest);
      color: var(--text-primary);
    }
    .class-tab-btn.active {
      background: var(--forest-muted);
      border-color: var(--forest);
      color: var(--forest);
      font-weight: 600;
    }
    .tab-sec {
      font-size: 11px;
      padding: 2px 6px;
      background: rgba(0, 0, 0, 0.05);
      border-radius: var(--radius-sm);
    }

    /* Class Hero Card */
    .class-hero-card {
      display: flex;
      flex-direction: column;
      gap: 20px;
      padding: 24px;
      background: var(--surface);
      border-radius: var(--radius-lg);
    }
    @media (min-width: 900px) {
      .class-hero-card {
        flex-direction: row;
        justify-content: space-between;
        align-items: center;
      }
    }
    .hero-subject-row {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
      margin-bottom: 6px;
    }
    .subject-tag {
      font-size: 13px;
      font-weight: 700;
      color: var(--forest);
      background: var(--forest-muted);
      padding: 3px 10px;
      border-radius: var(--radius-sm);
    }
    .hero-title {
      font-size: 22px;
      margin: 0;
      color: var(--text-primary);
    }
    .hero-course {
      font-size: 14px;
      color: var(--text-secondary);
      margin: 0 0 10px 0;
    }
    .cohort-badges-row {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }
    .cohort-pill {
      font-size: 12px;
      color: var(--text-secondary);
      background: var(--surface-secondary);
      padding: 4px 10px;
      border-radius: var(--radius-sm);
      border: 1px solid var(--border-color);
    }
    .hero-right {
      display: flex;
      gap: 12px;
      align-items: center;
    }

    /* Assessments Grid */
    .assessments-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
      gap: 20px;
    }
    .assessment-card {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 20px;
      background: var(--surface);
      border-radius: var(--radius-lg);
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }
    .assessment-card:hover {
      transform: translateY(-2px);
      box-shadow: var(--shadow-md);
    }
    .card-top-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 14px;
    }
    .type-tag-wrap {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .max-marks-pill {
      font-size: 11px;
      font-weight: 600;
      color: var(--text-secondary);
      background: var(--surface-secondary);
      padding: 3px 8px;
      border-radius: var(--radius-sm);
      border: 1px solid var(--border-color);
    }
    .date-tag {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: var(--text-tertiary);
    }
    .quiz-title {
      font-size: 18px;
      color: var(--text-primary);
      margin: 0 0 14px 0;
      line-height: 1.35;
    }

    /* Metrics Box */
    .stats-metrics-box {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
      padding: 12px;
      background: var(--surface-secondary);
      border-radius: var(--radius-md);
      margin-bottom: 14px;
      text-align: center;
    }
    .metric-val {
      display: block;
      font-size: 15px;
      font-weight: 700;
      color: var(--text-primary);
    }
    .metric-lbl {
      display: block;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--text-tertiary);
      margin-top: 2px;
    }

    /* Progress Track */
    .progress-container {
      margin-bottom: 16px;
    }
    .progress-labels {
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      color: var(--text-secondary);
      margin-bottom: 4px;
    }
    .progress-track {
      width: 100%;
      height: 6px;
      background: var(--surface-tertiary);
      border-radius: 999px;
      overflow: hidden;
    }
    .progress-bar {
      height: 100%;
      background: var(--forest);
      border-radius: 999px;
      transition: width 0.4s ease;
    }

    /* Card Footer Actions */
    .card-footer-actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 14px;
      border-top: 1px solid var(--border-color);
    }
    .roster-btn {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .delete-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      color: #dc2626;
      border-color: rgba(220, 38, 38, 0.25);
    }
    .delete-btn:hover {
      background: rgba(220, 38, 38, 0.08);
      border-color: #dc2626;
    }

    /* Empty States */
    .empty-state {
      padding: 60px 24px;
      text-align: center;
      background: var(--surface);
      border-radius: var(--radius-lg);
    }
    .empty-icon {
      color: var(--forest);
      margin-bottom: 16px;
    }
    .empty-title {
      font-size: 20px;
      margin: 0 0 8px 0;
      color: var(--text-primary);
    }
    .empty-subtitle {
      font-size: 14px;
      color: var(--text-secondary);
      max-width: 450px;
      margin: 0 auto 20px auto;
    }

    /* Modals & Backdrop */
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.6);
      backdrop-filter: blur(4px);
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .modal-dialog {
      background: var(--surface);
      border-radius: var(--radius-xl);
      width: 100%;
      max-width: 780px;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3);
    }
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 20px 24px;
      border-bottom: 1px solid var(--border-color);
    }
    .modal-title {
      font-size: 20px;
      margin: 6px 0 2px 0;
      color: var(--text-primary);
    }
    .modal-subtitle {
      font-size: 13px;
      color: var(--text-secondary);
      margin: 0;
    }
    .dialog-close {
      font-size: 18px;
      color: var(--text-tertiary);
      cursor: pointer;
      padding: 4px 8px;
      border-radius: var(--radius-sm);
    }
    .dialog-close:hover {
      color: var(--text-primary);
      background: var(--surface-secondary);
    }
    .modal-body {
      padding: 24px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .form-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }
    .span-2 {
      grid-column: span 2;
    }
    .form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .form-label {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.5px;
      color: var(--text-tertiary);
    }
    .form-control {
      padding: 10px 14px;
      background: var(--surface-secondary);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      font-size: 14px;
      color: var(--text-primary);
      outline: none;
      transition: border-color 0.2s ease;
    }
    .form-control:focus {
      border-color: var(--forest);
    }
    .prompt-textarea {
      resize: vertical;
      font-family: inherit;
    }

    /* Questions Section */
    .questions-section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 16px;
      border-top: 1px solid var(--border-color);
    }
    .questions-section-title {
      font-size: 16px;
      margin: 0 0 2px 0;
      color: var(--text-primary);
    }
    .questions-stat {
      font-size: 12px;
      color: var(--forest);
      font-weight: 600;
    }
    .questions-builder-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .question-builder-card {
      background: var(--surface-secondary);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-lg);
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .q-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .q-badge-wrap {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .q-num-badge {
      font-size: 12px;
      font-weight: 700;
      color: var(--forest);
      background: var(--forest-muted);
      padding: 2px 8px;
      border-radius: var(--radius-sm);
    }
    .marks-input-wrap {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .marks-label {
      font-size: 11px;
      color: var(--text-tertiary);
    }
    .marks-input {
      width: 70px;
      padding: 4px 8px;
      font-size: 13px;
    }
    .remove-q-btn {
      color: #dc2626;
      font-size: 12px;
      cursor: pointer;
    }

    /* Options Builder */
    .options-builder-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }
    @media (max-width: 600px) {
      .options-builder-grid {
        grid-template-columns: 1fr;
      }
    }
    .option-row {
      display: flex;
      align-items: center;
      gap: 8px;
      background: var(--surface);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      padding: 6px 10px;
      transition: all 0.2s ease;
    }
    .option-row.is-correct {
      border-color: var(--forest);
      background: var(--forest-muted);
    }
    .opt-radio-wrap {
      display: flex;
      align-items: center;
      gap: 6px;
      cursor: pointer;
    }
    .opt-key {
      font-size: 12px;
      font-weight: 700;
      color: var(--text-primary);
    }
    .opt-input {
      flex: 1;
      padding: 6px 8px;
      font-size: 13px;
      border: none;
      background: transparent;
    }
    .opt-input:focus {
      outline: none;
    }

    /* Modal Error & Footer */
    .modal-error-banner {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 14px;
      background: rgba(220, 38, 38, 0.1);
      border: 1px solid rgba(220, 38, 38, 0.3);
      color: #dc2626;
      border-radius: var(--radius-md);
      font-size: 13px;
    }
    .modal-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 24px;
      border-top: 1px solid var(--border-color);
      background: var(--surface-secondary);
    }
    .footer-summary {
      font-size: 13px;
      color: var(--text-secondary);
    }
    .footer-btn-group {
      display: flex;
      gap: 10px;
    }

    /* Submissions Drawer Dialog */
    .drawer-dialog {
      background: var(--surface);
      border-radius: var(--radius-xl);
      width: 100%;
      max-width: 900px;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3);
    }
    .drawer-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 20px 24px;
      border-bottom: 1px solid var(--border-color);
    }
    .drawer-badge-row {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 6px;
    }
    .drawer-title {
      font-size: 22px;
      margin: 0 0 4px 0;
      color: var(--text-primary);
    }
    .drawer-subtitle {
      font-size: 12px;
      color: var(--text-tertiary);
      margin: 0;
    }
    .drawer-metric-strip {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      padding: 16px 24px;
      background: var(--surface-secondary);
      border-bottom: 1px solid var(--border-color);
      text-align: center;
    }
    .strip-val {
      display: block;
      font-size: 18px;
      font-weight: 700;
      color: var(--text-primary);
    }
    .strip-lbl {
      display: block;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--text-tertiary);
      margin-top: 2px;
    }

    /* Drawer Tabs */
    .drawer-nav-tabs {
      display: flex;
      border-bottom: 1px solid var(--border-color);
      background: var(--surface);
      padding: 0 24px;
    }
    .drawer-tab-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 14px 20px;
      border: none;
      background: transparent;
      color: var(--text-secondary);
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      border-bottom: 2px solid transparent;
      transition: all 0.2s ease;
    }
    .drawer-tab-btn:hover {
      color: var(--text-primary);
    }
    .drawer-tab-btn.active {
      color: var(--forest);
      border-bottom-color: var(--forest);
    }
    .drawer-tab-body {
      padding: 20px 24px;
      overflow-y: auto;
      max-height: 55vh;
    }

    /* Roster Table */
    .roster-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }
    .roster-table th {
      text-align: left;
      padding: 10px 14px;
      font-size: 11px;
      letter-spacing: 0.5px;
      color: var(--text-tertiary);
      border-bottom: 1px solid var(--border-color);
    }
    .roster-table td {
      padding: 12px 14px;
      border-bottom: 1px solid var(--border-color);
      color: var(--text-primary);
    }
    .roll-cell {
      font-weight: 600;
      color: var(--forest);
    }
    .student-name-text {
      font-weight: 600;
    }
    .student-email-text {
      font-size: 11px;
      color: var(--text-tertiary);
    }
    .score-cell {
      font-size: 14px;
    }
    .date-cell {
      font-size: 12px;
      color: var(--text-secondary);
    }
    .text-muted {
      color: var(--text-tertiary);
    }

    /* Questions Review Pane */
    .questions-review-pane {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .question-review-card {
      background: var(--surface-secondary);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-lg);
      padding: 18px;
    }
    .q-review-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
    }
    .q-review-prompt {
      font-size: 16px;
      color: var(--text-primary);
      margin: 0 0 14px 0;
      line-height: 1.4;
    }
    .q-review-options {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }
    @media (max-width: 650px) {
      .q-review-options {
        grid-template-columns: 1fr;
      }
    }
    .review-opt-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 12px;
      background: var(--surface);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      font-size: 13px;
    }
    .review-opt-item.opt-correct-highlight {
      border-color: var(--forest);
      background: var(--forest-muted);
      font-weight: 600;
    }
    .rev-opt-key {
      font-weight: 700;
      color: var(--text-primary);
    }
    .rev-opt-label {
      flex: 1;
    }
    .correct-badge {
      font-size: 10px;
      font-weight: 700;
      color: var(--forest);
      background: rgba(34, 197, 94, 0.15);
      padding: 2px 6px;
      border-radius: var(--radius-sm);
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
          // Check route param if navigated directly with /faculty/assessments/:facultyAssignmentId
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

  // ==========================================
  // CREATE MODAL OPERATIONS
  // ==========================================

  openCreateModal(): void {
    this.draftTitle = '';
    this.draftType = 'QUIZ';
    this.draftDate = new Date().toISOString().split('T')[0];
    this.createModalError.set(null);
    this.submitting.set(false);

    // Initial default question
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

    // Validate each question
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

  // ==========================================
  // DELETE ASSESSMENT
  // ==========================================

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

  // ==========================================
  // SUBMISSIONS & QUESTION DRAWER
  // ==========================================

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
