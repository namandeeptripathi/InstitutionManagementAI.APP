import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { FacultyService } from '../../../core/services/faculty.service';
import { ToastService } from '../../../core/services/toast.service';
import { 
  FacultyAssignedClass, 
  FacultyAssignmentTask, 
  FacultySubmissionItem 
} from '../../../core/models/faculty.models';
import { IconComponent } from '../../../shared/components/icon.component';

interface GradingState {
  marks: number | null;
  feedback: string;
  saving: boolean;
  error: string | null;
}

@Component({
  selector: 'app-faculty-assignments',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  template: `
    <div class="assignments-page">
      <!-- Header Bar with Class Selector -->
      <div class="faculty-page-header">
        <div class="faculty-header-titles">
          <div class="badge-row">
            <span class="badge badge-teal badge-sm">
              <app-icon name="badge-check" [size]="12"></app-icon>
              GRADING & TASKS
            </span>
            <span class="meta-dot">&bull;</span>
            <span class="meta-year font-mono text-muted">AY 2026-2027</span>
          </div>
          <h2 class="faculty-page-title">Assignments & Grading Console</h2>
          <p class="faculty-page-subtitle">
            Create course assignments, monitor student submissions in real-time, and publish evaluated grades.
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

      <!-- Main Content State -->
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
      } @else if (selectedClass()) {
        <!-- Split View: Left (Tasks List) | Right (Submissions Review & Grading) -->
        <div class="assignments-split-layout">
          <!-- LEFT COLUMN: Tasks List & Create Button -->
          <div class="split-col tasks-col">
            <div class="card-modern panel-card">
              <div class="panel-header">
                <div class="panel-header-title">
                  <h3 class="panel-title">Course Tasks</h3>
                  <span class="badge badge-teal badge-sm font-mono">{{ tasks().length }} Published</span>
                </div>
                <button
                  class="btn btn-primary btn-sm"
                  (click)="openCreateModal()"
                  title="Create and publish a new assignment"
                >
                  <app-icon name="plus" [size]="13"></app-icon>
                  <span>Create Task</span>
                </button>
              </div>

              <!-- Class Details Summary Pill -->
              <div class="class-meta-bar">
                <span class="font-mono font-bold text-teal">{{ selectedClass()?.subjectCode }}</span>
                <span class="meta-subject-name">{{ selectedClass()?.subjectName }}</span>
                <span class="meta-dot">&bull;</span>
                <span class="text-secondary text-xs">{{ selectedClass()?.courseName }} (Sem {{ selectedClass()?.semester }})</span>
              </div>

              @if (tasksLoading()) {
                <div class="tasks-skeleton-list">
                  <div class="skeleton item-skeleton"></div>
                  <div class="skeleton item-skeleton"></div>
                  <div class="skeleton item-skeleton"></div>
                </div>
              } @else if (tasksError()) {
                <div class="error-sub-banner">
                  <p>{{ tasksError() }}</p>
                  <button class="btn btn-secondary btn-sm" (click)="loadTasks(selectedClass()!.facultyAssignmentId)">
                    Retry
                  </button>
                </div>
              } @else if (tasks().length === 0) {
                <div class="empty-tasks-box">
                  <div class="empty-icon-wrap">
                    <app-icon name="assignments" [size]="28"></app-icon>
                  </div>
                  <h4 class="empty-tasks-title">No Assignments Published</h4>
                  <p class="empty-tasks-desc">Create your first task for {{ selectedClass()?.subjectCode }} to collect student submissions.</p>
                  <button class="btn btn-primary btn-sm" (click)="openCreateModal()">
                    Publish New Assignment
                  </button>
                </div>
              } @else {
                <div class="tasks-scroll-list">
                  @for (task of tasks(); track task.assignmentId) {
                    <div
                      class="task-card"
                      [class.active]="selectedTask()?.assignmentId === task.assignmentId"
                      (click)="selectTask(task)"
                    >
                      <div class="task-card-header">
                        <h4 class="task-title">{{ task.title }}</h4>
                        <span class="badge badge-teal badge-sm font-mono">{{ task.maxMarks }} Marks</span>
                      </div>

                      @if (task.instructions) {
                        <p class="task-snippet">{{ task.instructions }}</p>
                      }

                      <div class="task-stats-row">
                        <div class="due-info font-mono text-muted">
                          <app-icon name="clock" [size]="12"></app-icon>
                          <span>Due: {{ formatDueDate(task.dueAt) }}</span>
                        </div>
                        <div class="progress-pill font-mono">
                          <span [class.text-amber]="task.submittedCount > 0" class="sub-count">
                            {{ task.submittedCount }}/{{ task.totalEnrolled }} Submissions
                          </span>
                          <span class="meta-dot">&bull;</span>
                          <span [class.text-success]="task.gradedCount === task.submittedCount && task.submittedCount > 0" class="grade-count">
                            {{ task.gradedCount }} Graded
                          </span>
                        </div>
                      </div>
                    </div>
                  }
                </div>
              }
            </div>
          </div>

          <!-- RIGHT COLUMN: Submissions Review & Grading Console -->
          <div class="split-col submissions-col">
            <div class="card-modern panel-card">
              @if (!selectedTask()) {
                <div class="empty-select-card">
                  <div class="empty-icon-wrap large">
                    <app-icon name="assignments" [size]="36"></app-icon>
                  </div>
                  <h3 class="empty-title">Select an Assignment</h3>
                  <p class="empty-desc">Choose an assignment task from the left list to review student submissions, download submitted files, and assign grades.</p>
                </div>
              } @else {
                <!-- Selected Task Header -->
                <div class="panel-header border-bottom">
                  <div class="panel-header-title">
                    <div class="task-meta-pills">
                      <span class="badge badge-teal badge-sm font-mono">MAX: {{ selectedTask()?.maxMarks }} PTS</span>
                      <span class="meta-dot">&bull;</span>
                      <span class="due-badge font-mono text-muted">Due {{ formatDueDate(selectedTask()?.dueAt) }}</span>
                    </div>
                    <h3 class="panel-title">{{ selectedTask()?.title }}</h3>
                  </div>
                  <div class="header-actions">
                    <button class="btn btn-secondary btn-sm" (click)="loadSubmissions(selectedTask()!.assignmentId)" title="Refresh submissions">
                      <app-icon name="refresh" [size]="13"></app-icon>
                      <span>Refresh</span>
                    </button>
                  </div>
                </div>

                @if (selectedTask()?.instructions) {
                  <div class="instructions-banner">
                    <span class="instructions-label font-mono">INSTRUCTIONS & RUBRIC:</span>
                    <p class="instructions-text">{{ selectedTask()?.instructions }}</p>
                  </div>
                }

                <!-- Submissions Roster -->
                @if (submissionsLoading()) {
                  <div class="submissions-skeleton">
                    <div class="skeleton row-skeleton"></div>
                    <div class="skeleton row-skeleton"></div>
                    <div class="skeleton row-skeleton"></div>
                  </div>
                } @else if (submissionsError()) {
                  <div class="error-sub-banner">
                    <p>{{ submissionsError() }}</p>
                    <button class="btn btn-secondary btn-sm" (click)="loadSubmissions(selectedTask()!.assignmentId)">
                      Retry Connection
                    </button>
                  </div>
                } @else {
                  <div class="table-responsive">
                    <table class="table-modern" aria-label="Student Submissions">
                      <thead>
                        <tr>
                          <th scope="col" style="width: 240px;">STUDENT</th>
                          <th scope="col" style="width: 140px;">STATUS</th>
                          <th scope="col" style="width: 160px;">SUBMITTED AT</th>
                          <th scope="col" style="width: 130px;">ATTACHMENT</th>
                          <th scope="col">EVALUATION & MARKS</th>
                          <th scope="col" style="width: 110px;">ACTION</th>
                        </tr>
                      </thead>
                      <tbody>
                        @for (sub of submissions(); track sub.studentId) {
                          <tr [class.row-graded]="sub.submissionStatus === 'GRADED'">
                            <!-- Student Info -->
                            <td>
                              <div class="student-info-cell">
                                <span class="student-name font-bold">{{ sub.fullName }}</span>
                                <span class="student-roll font-mono text-muted">{{ sub.enrollmentNumber }}</span>
                              </div>
                            </td>

                            <!-- Status Badge -->
                            <td>
                              @switch (sub.submissionStatus) {
                                @case ('GRADED') {
                                  <span class="badge badge-teal badge-sm font-mono">GRADED</span>
                                }
                                @case ('SUBMITTED') {
                                  <span class="badge badge-amber badge-sm font-mono">SUBMITTED</span>
                                }
                                @case ('LATE') {
                                  <span class="badge badge-danger badge-sm font-mono">LATE</span>
                                }
                                @default {
                                  <span class="badge badge-neutral badge-sm font-mono">NOT SUBMITTED</span>
                                }
                              }
                            </td>

                            <!-- Submitted At -->
                            <td class="font-mono text-xs">
                              {{ sub.submittedAt ? (sub.submittedAt | date:'short') : '—' }}
                            </td>

                            <!-- File Attachment / Download -->
                            <td>
                              @if (sub.hasSubmission && sub.submissionId) {
                                <a
                                  [href]="getDownloadUrl(sub.submissionId)"
                                  target="_blank"
                                  class="btn btn-secondary btn-xs"
                                  title="Download student file"
                                >
                                  <app-icon name="download" [size]="12"></app-icon>
                                  <span>Download</span>
                                </a>
                              } @else {
                                <span class="text-muted font-mono text-xs">No file</span>
                              }
                            </td>

                            <!-- Evaluation & Marks Inputs -->
                            <td>
                              @if (sub.hasSubmission && sub.submissionId) {
                                <div class="grade-inputs">
                                  <div class="marks-input-wrap">
                                    <input
                                      type="number"
                                      step="0.5"
                                      min="0"
                                      [max]="selectedTask()!.maxMarks"
                                      [(ngModel)]="getGradingState(sub.submissionId).marks"
                                      placeholder="0.0"
                                      class="form-control marks-input font-mono"
                                      [disabled]="getGradingState(sub.submissionId).saving"
                                    />
                                    <span class="max-marks-label font-mono text-muted">/ {{ selectedTask()!.maxMarks }}</span>
                                  </div>

                                  <input
                                    type="text"
                                    [(ngModel)]="getGradingState(sub.submissionId).feedback"
                                    placeholder="Add feedback comment..."
                                    class="form-control feedback-input"
                                    [disabled]="getGradingState(sub.submissionId).saving"
                                  />
                                </div>
                                @if (getGradingState(sub.submissionId).error) {
                                  <div class="field-error font-mono">{{ getGradingState(sub.submissionId).error }}</div>
                                }
                              } @else {
                                <span class="text-muted font-mono text-xs">Awaiting submission</span>
                              }
                            </td>

                            <!-- Action Button -->
                            <td>
                              @if (sub.hasSubmission && sub.submissionId) {
                                <button
                                  class="btn btn-primary btn-xs save-grade-btn"
                                  [disabled]="getGradingState(sub.submissionId).saving"
                                  (click)="submitGrade(sub)"
                                >
                                  @if (getGradingState(sub.submissionId).saving) {
                                    <span class="spin-icon">&#9696;</span>
                                    <span>Saving...</span>
                                  } @else {
                                    <app-icon name="badge-check" [size]="12"></app-icon>
                                    <span>{{ sub.submissionStatus === 'GRADED' ? 'Update' : 'Grade' }}</span>
                                  }
                                </button>
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
              }
            </div>
          </div>
        </div>
      }

      <!-- CREATE ASSIGNMENT MODAL -->
      @if (showCreateModal()) {
        <div class="modal-overlay" (click)="closeCreateModal()">
          <div class="modal-dialog-clean" (click)="$event.stopPropagation()" role="dialog" aria-labelledby="create-modal-title">
            <div class="modal-header-clean">
              <div class="modal-title-wrap">
                <span class="badge badge-teal badge-sm font-mono">NEW COURSE TASK</span>
                <h3 id="create-modal-title">Create Assignment</h3>
                <p class="modal-sub">Publish for {{ selectedClass()?.subjectCode }} - {{ selectedClass()?.subjectName }}</p>
              </div>
              <button class="btn-ghost" (click)="closeCreateModal()" aria-label="Close dialog">
                <app-icon name="close" [size]="16"></app-icon>
              </button>
            </div>

            <form (ngSubmit)="saveAssignment()" class="modal-body-clean">
              <!-- Title Field -->
              <div class="form-group">
                <label class="form-label font-mono">ASSIGNMENT TITLE <span class="text-danger">*</span></label>
                <input
                  type="text"
                  [(ngModel)]="newAssignmentTitle"
                  name="title"
                  placeholder="e.g. Deep Neural Architectures & Case Analysis"
                  class="form-control"
                  required
                />
              </div>

              <!-- Max Marks & Due Date Row -->
              <div class="form-row">
                <div class="form-group flex-1">
                  <label class="form-label font-mono">MAXIMUM MARKS <span class="text-danger">*</span></label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    [(ngModel)]="newAssignmentMaxMarks"
                    name="maxMarks"
                    placeholder="e.g. 25"
                    class="form-control font-mono"
                    required
                  />
                </div>

                <div class="form-group flex-1">
                  <label class="form-label font-mono">DUE DATE & TIME</label>
                  <input
                    type="datetime-local"
                    [(ngModel)]="newAssignmentDueDate"
                    name="dueDate"
                    class="form-control font-mono"
                  />
                </div>
              </div>

              <!-- Instructions Field -->
              <div class="form-group">
                <label class="form-label font-mono">INSTRUCTIONS & RUBRIC</label>
                <textarea
                  [(ngModel)]="newAssignmentInstructions"
                  name="instructions"
                  rows="4"
                  placeholder="Detail the deliverable expectations, guidelines, and grading criteria..."
                  class="form-control"
                ></textarea>
              </div>

              @if (createError()) {
                <div class="modal-error font-mono">
                  {{ createError() }}
                </div>
              }

              <div class="modal-footer-clean">
                <button type="button" class="btn btn-secondary btn-sm" (click)="closeCreateModal()">
                  Cancel
                </button>
                <button type="submit" class="btn btn-primary btn-sm" [disabled]="creatingTask()">
                  @if (creatingTask()) {
                    <span class="spin-icon">&#9696;</span>
                    <span>Publishing...</span>
                  } @else {
                    <app-icon name="badge-check" [size]="13"></app-icon>
                    <span>Publish Assignment</span>
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .assignments-page {
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

    .text-amber {
      color: var(--color-warning);
    }

    .text-success {
      color: var(--color-success);
    }

    .text-danger {
      color: var(--color-danger);
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

    /* Split Layout */
    .assignments-split-layout {
      display: grid;
      grid-template-columns: 380px 1fr;
      gap: 20px;
      align-items: start;
    }

    @media (max-width: 1024px) {
      .assignments-split-layout {
        grid-template-columns: 1fr;
      }
    }

    .panel-card {
      overflow: hidden;
    }

    .panel-header {
      padding: 16px 20px;
      border-bottom: 1px solid var(--border-subtle);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }

    .panel-header-title {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .panel-title {
      font-size: 16px;
      font-weight: 700;
      color: var(--text-main);
    }

    .class-meta-bar {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 20px;
      background: var(--bg-surface-subtle);
      border-bottom: 1px solid var(--border-subtle);
      font-size: 13px;
      flex-wrap: wrap;
    }

    .meta-subject-name {
      font-weight: 600;
      color: var(--text-main);
    }

    /* Tasks List */
    .tasks-scroll-list {
      max-height: 600px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
    }

    .task-card {
      padding: 16px 20px;
      border-bottom: 1px solid var(--border-subtle);
      cursor: pointer;
      transition: all var(--transition-fast);
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .task-card:hover {
      background-color: #F8FAFC;
    }

    .task-card.active {
      background-color: var(--color-teal-surface);
      border-left: 4px solid var(--color-teal);
    }

    .task-card-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 10px;
    }

    .task-title {
      font-size: 14.5px;
      font-weight: 700;
      color: var(--text-main);
      line-height: 1.3;
    }

    .task-snippet {
      font-size: 12.5px;
      color: var(--text-secondary);
      line-height: 1.4;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .task-stats-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      font-size: 11.5px;
      flex-wrap: wrap;
      margin-top: 2px;
    }

    .due-info {
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }

    .progress-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }

    .empty-tasks-box {
      padding: 40px 20px;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
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

    .empty-tasks-title {
      font-size: 15px;
      font-weight: 700;
      color: var(--text-main);
    }

    .empty-tasks-desc {
      font-size: 13px;
      color: var(--text-secondary);
      max-width: 300px;
    }

    .empty-select-card {
      padding: 60px 24px;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
    }

    .empty-title {
      font-size: 16px;
      font-weight: 700;
      color: var(--text-main);
    }

    .empty-desc {
      font-size: 13.5px;
      color: var(--text-secondary);
      max-width: 400px;
    }

    /* Submissions Workstation */
    .task-meta-pills {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .instructions-banner {
      padding: 14px 20px;
      background: var(--bg-surface-subtle);
      border-bottom: 1px solid var(--border-subtle);
      font-size: 13px;
    }

    .instructions-label {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.04em;
      color: var(--text-muted);
      display: block;
      margin-bottom: 4px;
    }

    .instructions-text {
      color: var(--text-secondary);
      line-height: 1.5;
    }

    .student-info-cell {
      display: flex;
      flex-direction: column;
    }

    .student-name {
      font-size: 13.5px;
      color: var(--text-main);
    }

    .grade-inputs {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .marks-input-wrap {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .marks-input {
      width: 70px;
      padding: 4px 8px;
      font-size: 13px;
    }

    .feedback-input {
      padding: 4px 8px;
      font-size: 12.5px;
    }

    .field-error {
      font-size: 11px;
      color: var(--color-danger);
    }

    .row-graded {
      background-color: rgba(240, 253, 250, 0.4);
    }

    .error-sub-banner {
      padding: 16px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      color: var(--color-danger);
      font-size: 13px;
    }

    /* Modal Details */
    .modal-title-wrap {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .modal-sub {
      font-size: 12.5px;
      color: var(--text-secondary);
    }

    .form-row {
      display: flex;
      gap: 12px;
    }

    .flex-1 {
      flex: 1;
    }

    .modal-error {
      padding: 8px 12px;
      background: var(--color-danger-surface);
      border: 1px solid var(--color-danger-border);
      color: var(--color-danger);
      font-size: 12px;
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
export class FacultyAssignmentsComponent implements OnInit {
  private readonly facultyService = inject(FacultyService);
  private readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute);

  readonly assignedClasses = signal<FacultyAssignedClass[]>([]);
  readonly selectedClass = signal<FacultyAssignedClass | null>(null);
  readonly classesLoading = signal<boolean>(false);
  readonly classesError = signal<string | null>(null);

  readonly tasks = signal<FacultyAssignmentTask[]>([]);
  readonly selectedTask = signal<FacultyAssignmentTask | null>(null);
  readonly tasksLoading = signal<boolean>(false);
  readonly tasksError = signal<string | null>(null);

  readonly submissions = signal<FacultySubmissionItem[]>([]);
  readonly submissionsLoading = signal<boolean>(false);
  readonly submissionsError = signal<string | null>(null);

  readonly gradingStates = new Map<string, GradingState>();

  readonly showCreateModal = signal<boolean>(false);
  readonly creatingTask = signal<boolean>(false);
  readonly createError = signal<string | null>(null);

  newAssignmentTitle = '';
  newAssignmentMaxMarks = 25;
  newAssignmentDueDate = '';
  newAssignmentInstructions = '';

  ngOnInit(): void {
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
          const routeFaId = this.route.snapshot.paramMap.get('facultyAssignmentId');
          const matched = classes.find((c) => c.facultyAssignmentId === routeFaId) || classes[0];
          this.selectClass(matched);
        }
      },
      error: (err) => {
        this.classesLoading.set(false);
        this.classesError.set(err.message || 'Failed to load assigned classes.');
      }
    });
  }

  selectClass(cls: FacultyAssignedClass): void {
    this.selectedClass.set(cls);
    this.selectedTask.set(null);
    this.submissions.set([]);
    this.loadTasks(cls.facultyAssignmentId);
  }

  loadTasks(facultyAssignmentId: string): void {
    this.tasksLoading.set(true);
    this.tasksError.set(null);

    this.facultyService.getClassTasks(facultyAssignmentId).subscribe({
      next: (res) => {
        this.tasks.set(res.assignments);
        this.tasksLoading.set(false);

        if (res.assignments.length > 0) {
          this.selectTask(res.assignments[0]);
        }
      },
      error: (err) => {
        this.tasksLoading.set(false);
        this.tasksError.set(err.message || 'Could not load class assignments.');
      }
    });
  }

  selectTask(task: FacultyAssignmentTask): void {
    this.selectedTask.set(task);
    this.loadSubmissions(task.assignmentId);
  }

  loadSubmissions(assignmentId: string): void {
    this.submissionsLoading.set(true);
    this.submissionsError.set(null);

    this.facultyService.getTaskSubmissions(assignmentId).subscribe({
      next: (res) => {
        this.submissions.set(res.submissions);
        this.submissionsLoading.set(false);

        for (const sub of res.submissions) {
          if (sub.submissionId) {
            this.gradingStates.set(sub.submissionId, {
              marks: sub.marksObtained ?? null,
              feedback: sub.feedback ?? '',
              saving: false,
              error: null
            });
          }
        }
      },
      error: (err) => {
        this.submissionsLoading.set(false);
        this.submissionsError.set(err.message || 'Could not load student submissions.');
      }
    });
  }

  getGradingState(submissionId: string): GradingState {
    let state = this.gradingStates.get(submissionId);
    if (!state) {
      state = { marks: null, feedback: '', saving: false, error: null };
      this.gradingStates.set(submissionId, state);
    }
    return state;
  }

  submitGrade(sub: FacultySubmissionItem): void {
    if (!sub.submissionId || !this.selectedTask()) return;

    const state = this.getGradingState(sub.submissionId);
    state.error = null;

    if (state.marks === null || state.marks === undefined) {
      state.error = 'Enter valid score.';
      return;
    }

    if (state.marks < 0) {
      state.error = 'Marks cannot be negative.';
      return;
    }

    const max = this.selectedTask()!.maxMarks;
    if (state.marks > max) {
      state.error = `Max is ${max} pts.`;
      return;
    }

    state.saving = true;

    this.facultyService.gradeSubmission(sub.submissionId, {
      marksObtained: Number(state.marks),
      feedback: state.feedback.trim()
    }).subscribe({
      next: (res) => {
        state.saving = false;
        this.toast.success(`Grade saved for ${sub.fullName}: ${res.marksObtained}/${max}`);

        sub.submissionStatus = 'GRADED';
        sub.marksObtained = res.marksObtained;
        sub.feedback = res.feedback;

        const curTask = this.selectedTask();
        if (curTask) {
          curTask.gradedCount = this.submissions().filter(s => s.submissionStatus === 'GRADED').length;
        }
      },
      error: (err) => {
        state.saving = false;
        state.error = err.message || 'Failed to save grade.';
        this.toast.error(err.message || 'Failed to save grade evaluation.');
      }
    });
  }

  getDownloadUrl(submissionId: string): string {
    return this.facultyService.getSubmissionDownloadUrl(submissionId);
  }

  formatDueDate(dateStr?: string | null): string {
    if (!dateStr) return 'No due date';
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  openCreateModal(): void {
    this.newAssignmentTitle = '';
    this.newAssignmentMaxMarks = 25;
    this.newAssignmentInstructions = '';
    
    const d = new Date();
    d.setDate(d.getDate() + 7);
    d.setHours(23, 59, 0, 0);
    this.newAssignmentDueDate = d.toISOString().slice(0, 16);

    this.createError.set(null);
    this.showCreateModal.set(true);
  }

  closeCreateModal(): void {
    this.showCreateModal.set(false);
  }

  saveAssignment(): void {
    const cls = this.selectedClass();
    if (!cls) return;

    if (!this.newAssignmentTitle.trim()) {
      this.createError.set('Assignment title is required.');
      return;
    }

    if (!this.newAssignmentMaxMarks || this.newAssignmentMaxMarks <= 0) {
      this.createError.set('Maximum marks must be greater than zero.');
      return;
    }

    this.creatingTask.set(true);
    this.createError.set(null);

    const payload = {
      title: this.newAssignmentTitle.trim(),
      instructions: this.newAssignmentInstructions.trim() || undefined,
      maxMarks: Number(this.newAssignmentMaxMarks),
      dueAt: this.newAssignmentDueDate ? new Date(this.newAssignmentDueDate).toISOString() : undefined
    };

    this.facultyService.createClassTask(cls.facultyAssignmentId, payload).subscribe({
      next: (created) => {
        this.creatingTask.set(false);
        this.showCreateModal.set(false);
        this.toast.success(`Assignment "${created.title}" published successfully.`);
        
        this.loadTasks(cls.facultyAssignmentId);
      },
      error: (err) => {
        this.creatingTask.set(false);
        this.createError.set(err.message || 'Failed to create assignment.');
      }
    });
  }
}
