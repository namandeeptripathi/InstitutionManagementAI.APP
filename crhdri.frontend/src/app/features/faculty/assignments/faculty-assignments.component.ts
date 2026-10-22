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
      <div class="page-header card-tactile">
        <div class="header-titles">
          <div class="badge-row">
            <span class="badge badge-sage">GRADING & TASKS</span>
            <span class="meta-dot">&bull;</span>
            <span class="meta-year font-mono">AY 2026-2027</span>
          </div>
          <h2 class="page-title font-editorial">Assignments & Grading Console</h2>
          <p class="page-subtitle">
            Create course assignments, monitor student submissions in real-time, and publish evaluated grades.
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

      <!-- Main Content State -->
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
      } @else if (selectedClass()) {
        <!-- Split View: Left (Tasks List) | Right (Submissions Review & Grading) -->
        <div class="assignments-split-layout">
          <!-- LEFT COLUMN: Tasks List & Create Button -->
          <div class="split-col tasks-col">
            <div class="card-tactile panel-card">
              <div class="panel-header">
                <div class="panel-header-title">
                  <h3 class="panel-title font-editorial">Course Tasks</h3>
                  <span class="badge badge-amber badge-sm font-mono">{{ tasks().length }} Published</span>
                </div>
                <button
                  class="btn btn-primary btn-sm new-task-btn"
                  (click)="openCreateModal()"
                  title="Create and publish a new assignment"
                >
                  <app-icon name="assignments" [size]="16"></app-icon>
                  Create Task
                </button>
              </div>

              <!-- Class Details Summary Pill -->
              <div class="class-meta-bar">
                <span class="font-mono font-bold">{{ selectedClass()?.subjectCode }}</span>
                <span>{{ selectedClass()?.subjectName }}</span>
                <span class="meta-dot">&bull;</span>
                <span>{{ selectedClass()?.courseName }} (Sem {{ selectedClass()?.semester }})</span>
              </div>

              @if (tasksLoading()) {
                <div class="loading-state">
                  <div class="spinner"></div>
                  <p>Loading course assignments...</p>
                </div>
              } @else if (tasksError()) {
                <div class="alert-box alert-error">
                  <p>{{ tasksError() }}</p>
                  <button class="btn btn-secondary btn-sm" (click)="loadTasks(selectedClass()!.facultyAssignmentId)">
                    Retry
                  </button>
                </div>
              } @else if (tasks().length === 0) {
                <div class="empty-state card-tactile">
                  <app-icon name="assignments" [size]="40"></app-icon>
                  <h4>No Assignments Published</h4>
                  <p>Create your first task for {{ selectedClass()?.subjectCode }} to allow students to submit coursework.</p>
                  <button class="btn btn-primary btn-sm" (click)="openCreateModal()">
                    Publish New Assignment
                  </button>
                </div>
              } @else {
                <div class="tasks-scroll-list">
                  @for (task of tasks(); track task.assignmentId) {
                    <div
                      class="task-card card-tactile"
                      [class.active]="selectedTask()?.assignmentId === task.assignmentId"
                      (click)="selectTask(task)"
                    >
                      <div class="task-card-header">
                        <h4 class="task-title">{{ task.title }}</h4>
                        <span class="badge badge-sage font-mono">{{ task.maxMarks }} Marks</span>
                      </div>

                      @if (task.instructions) {
                        <p class="task-snippet">{{ task.instructions }}</p>
                      }

                      <div class="task-stats-row">
                        <div class="due-info font-mono">
                          <app-icon name="clock" [size]="13"></app-icon>
                          <span>Due: {{ formatDueDate(task.dueAt) }}</span>
                        </div>
                        <div class="progress-pill font-mono">
                          <span [class.text-amber]="task.submittedCount > 0">
                            {{ task.submittedCount }}/{{ task.totalEnrolled }} Submitted
                          </span>
                          <span class="meta-dot">&bull;</span>
                          <span [class.text-emerald]="task.gradedCount === task.submittedCount && task.submittedCount > 0">
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
            <div class="card-tactile panel-card">
              @if (!selectedTask()) {
                <div class="empty-state card-tactile select-prompt">
                  <app-icon name="assignments" [size]="48"></app-icon>
                  <h4>Select an Assignment</h4>
                  <p>Choose an assignment task from the left to view enrolled student submissions, download submitted files, and input grades.</p>
                </div>
              } @else {
                <!-- Selected Task Header -->
                <div class="panel-header border-bottom">
                  <div class="panel-header-title">
                    <div class="badge-row">
                      <span class="badge badge-amber font-mono">MAX: {{ selectedTask()?.maxMarks }} PTS</span>
                      <span class="meta-dot">&bull;</span>
                      <span class="due-badge font-mono">Due {{ formatDueDate(selectedTask()?.dueAt) }}</span>
                    </div>
                    <h3 class="panel-title font-editorial">{{ selectedTask()?.title }}</h3>
                  </div>
                  <div class="header-actions">
                    <button class="btn btn-secondary btn-sm" (click)="loadSubmissions(selectedTask()!.assignmentId)" title="Refresh submissions">
                      <app-icon name="refresh" [size]="15"></app-icon>
                      Refresh
                    </button>
                  </div>
                </div>

                @if (selectedTask()?.instructions) {
                  <div class="instructions-banner">
                    <span class="label font-mono">INSTRUCTIONS & RUBRIC:</span>
                    <p>{{ selectedTask()?.instructions }}</p>
                  </div>
                }

                <!-- Submissions Roster -->
                @if (submissionsLoading()) {
                  <div class="loading-state">
                    <div class="spinner"></div>
                    <p>Loading student submissions...</p>
                  </div>
                } @else if (submissionsError()) {
                  <div class="alert-box alert-error">
                    <p>{{ submissionsError() }}</p>
                    <button class="btn btn-secondary btn-sm" (click)="loadSubmissions(selectedTask()!.assignmentId)">
                      Retry
                    </button>
                  </div>
                } @else {
                  <div class="submissions-table-wrap">
                    <table class="submissions-table">
                      <thead>
                        <tr>
                          <th>STUDENT</th>
                          <th>STATUS</th>
                          <th>SUBMITTED AT</th>
                          <th>ATTACHMENT</th>
                          <th>EVALUATION & MARKS</th>
                          <th>ACTION</th>
                        </tr>
                      </thead>
                      <tbody>
                        @for (sub of submissions(); track sub.studentId) {
                          <tr [class.row-graded]="sub.submissionStatus === 'GRADED'">
                            <!-- Student Info -->
                            <td class="student-cell">
                              <div class="student-name font-bold">{{ sub.fullName }}</div>
                              <div class="student-roll font-mono text-muted">{{ sub.enrollmentNumber }}</div>
                            </td>

                            <!-- Status Badge -->
                            <td>
                              @switch (sub.submissionStatus) {
                                @case ('GRADED') {
                                  <span class="badge badge-emerald font-mono">GRADED</span>
                                }
                                @case ('SUBMITTED') {
                                  <span class="badge badge-amber font-mono">SUBMITTED</span>
                                }
                                @case ('LATE') {
                                  <span class="badge badge-rose font-mono">LATE</span>
                                }
                                @default {
                                  <span class="badge badge-neutral font-mono">NOT SUBMITTED</span>
                                }
                              }
                            </td>

                            <!-- Submitted At -->
                            <td class="font-mono text-sm">
                              {{ sub.submittedAt ? (sub.submittedAt | date:'medium') : '—' }}
                            </td>

                            <!-- File Attachment / Download -->
                            <td>
                              @if (sub.hasSubmission && sub.submissionId) {
                                <a
                                  [href]="getDownloadUrl(sub.submissionId)"
                                  target="_blank"
                                  class="btn-download"
                                  title="Download student file"
                                >
                                  <app-icon name="download" [size]="14"></app-icon>
                                  <span>Download</span>
                                </a>
                              } @else {
                                <span class="text-muted font-mono text-xs">No file</span>
                              }
                            </td>

                            <!-- Evaluation & Marks Inputs -->
                            <td class="grade-cell">
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
                                      class="marks-input font-mono"
                                      [disabled]="getGradingState(sub.submissionId).saving"
                                    />
                                    <span class="max-marks-label font-mono">/ {{ selectedTask()!.maxMarks }}</span>
                                  </div>

                                  <input
                                    type="text"
                                    [(ngModel)]="getGradingState(sub.submissionId).feedback"
                                    placeholder="Add feedback comment..."
                                    class="feedback-input"
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
                                    <span class="btn-spinner"></span>
                                    <span>Saving...</span>
                                  } @else {
                                    <app-icon name="check" [size]="13"></app-icon>
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

      <!-- CREATE ASSIGNMENT MODAL / DRAWER -->
      @if (showCreateModal()) {
        <div class="modal-backdrop" (click)="closeCreateModal()">
          <div class="modal-box card-tactile" (click)="$event.stopPropagation()" role="dialog" aria-labelledby="create-modal-title">
            <div class="modal-header">
              <div class="modal-title-wrap">
                <span class="badge badge-sage font-mono">NEW COURSE TASK</span>
                <h3 id="create-modal-title" class="modal-title font-editorial">Create Assignment</h3>
                <p class="modal-subtitle">Publish a graded assignment for {{ selectedClass()?.subjectCode }} - {{ selectedClass()?.subjectName }}</p>
              </div>
              <button class="modal-close-btn" (click)="closeCreateModal()" aria-label="Close dialog">
                <app-icon name="close" [size]="18"></app-icon>
              </button>
            </div>

            <form (ngSubmit)="saveAssignment()" class="modal-form">
              <!-- Title Field -->
              <div class="form-group">
                <label class="form-label font-mono">ASSIGNMENT TITLE <span class="required">*</span></label>
                <input
                  type="text"
                  [(ngModel)]="newAssignmentTitle"
                  name="title"
                  placeholder="e.g. Deep Neural Architectures & Case Analysis"
                  class="form-input"
                  required
                />
              </div>

              <!-- Max Marks & Due Date Row -->
              <div class="form-row">
                <div class="form-group flex-1">
                  <label class="form-label font-mono">MAXIMUM MARKS <span class="required">*</span></label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    [(ngModel)]="newAssignmentMaxMarks"
                    name="maxMarks"
                    placeholder="e.g. 25"
                    class="form-input font-mono"
                    required
                  />
                </div>

                <div class="form-group flex-1">
                  <label class="form-label font-mono">DUE DATE & TIME</label>
                  <input
                    type="datetime-local"
                    [(ngModel)]="newAssignmentDueDate"
                    name="dueDate"
                    class="form-input font-mono"
                  />
                </div>
              </div>

              <!-- Instructions / Rubric Field -->
              <div class="form-group">
                <label class="form-label font-mono">INSTRUCTIONS & SUBMISSION RUBRIC</label>
                <textarea
                  [(ngModel)]="newAssignmentInstructions"
                  name="instructions"
                  rows="4"
                  placeholder="Provide detailed instructions, required file formats (PDF/DOCX), and grading criteria..."
                  class="form-textarea"
                ></textarea>
              </div>

              @if (createError()) {
                <div class="modal-error font-mono">
                  <app-icon name="alert" [size]="14"></app-icon>
                  <span>{{ createError() }}</span>
                </div>
              }

              <div class="modal-actions">
                <button type="button" class="btn btn-secondary" (click)="closeCreateModal()" [disabled]="creatingTask()">
                  Cancel
                </button>
                <button type="submit" class="btn btn-primary" [disabled]="creatingTask()">
                  @if (creatingTask()) {
                    <span class="btn-spinner"></span>
                    <span>Publishing Task...</span>
                  } @else {
                    <app-icon name="check" [size]="15"></app-icon>
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
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      max-width: 1560px;
      margin: 0 auto;
    }

    .card-tactile {
      background: var(--surface, #13171f);
      border: 1px solid var(--border-tactile, rgba(255, 255, 255, 0.08));
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);
    }

    /* Page Header */
    .page-header {
      padding: 1.5rem 1.75rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1.25rem;
      background: linear-gradient(135deg, rgba(26, 32, 44, 0.6) 0%, rgba(15, 20, 28, 0.9) 100%);
    }

    .badge-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.35rem;
    }

    .meta-dot {
      color: var(--text-muted, #718096);
      font-size: 0.85rem;
    }

    .meta-year {
      font-size: 0.75rem;
      color: var(--text-muted, #a0aec0);
      letter-spacing: 0.05em;
    }

    .page-title {
      font-size: 1.5rem;
      font-weight: 700;
      color: #f7fafc;
      margin: 0;
      letter-spacing: -0.01em;
    }

    .page-subtitle {
      font-size: 0.875rem;
      color: var(--text-muted, #94a3b8);
      margin: 0.25rem 0 0 0;
    }

    /* Class Picker */
    .class-picker-wrap {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }

    .picker-label {
      font-size: 0.7rem;
      color: #64748b;
      letter-spacing: 0.08em;
    }

    .class-selector-box {
      display: flex;
      gap: 0.5rem;
      background: rgba(0, 0, 0, 0.3);
      padding: 0.3rem;
      border-radius: 8px;
      border: 1px solid rgba(255, 255, 255, 0.05);
    }

    .class-tab-btn {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.45rem 0.85rem;
      background: transparent;
      border: 1px solid transparent;
      border-radius: 6px;
      color: #94a3b8;
      cursor: pointer;
      font-size: 0.825rem;
      transition: all 0.2s ease;
    }

    .class-tab-btn:hover {
      background: rgba(255, 255, 255, 0.04);
      color: #e2e8f0;
    }

    .class-tab-btn.active {
      background: #2563eb;
      color: #ffffff;
      border-color: #3b82f6;
      box-shadow: 0 2px 8px rgba(37, 99, 235, 0.4);
    }

    .tab-code {
      font-weight: 700;
    }

    .tab-sec {
      font-size: 0.75rem;
      opacity: 0.85;
    }

    /* Split Layout */
    .assignments-split-layout {
      display: grid;
      grid-template-columns: 420px 1fr;
      gap: 1.5rem;
      align-items: start;
    }

    @media (max-width: 1080px) {
      .assignments-split-layout {
        grid-template-columns: 1fr;
      }
    }

    .panel-card {
      padding: 1.25rem 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
      min-height: 520px;
    }

    .panel-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 0.75rem;
    }

    .panel-header.border-bottom {
      padding-bottom: 0.75rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.07);
    }

    .panel-title {
      font-size: 1.15rem;
      font-weight: 600;
      color: #f1f5f9;
      margin: 0;
    }

    .class-meta-bar {
      font-size: 0.8rem;
      color: #94a3b8;
      background: rgba(255, 255, 255, 0.03);
      padding: 0.5rem 0.75rem;
      border-radius: 6px;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    /* Tasks Scroll List */
    .tasks-scroll-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      overflow-y: auto;
      max-height: 600px;
      padding-right: 0.25rem;
    }

    .task-card {
      padding: 1rem;
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s ease;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .task-card:hover {
      background: rgba(255, 255, 255, 0.04);
      border-color: rgba(255, 255, 255, 0.12);
      transform: translateY(-1px);
    }

    .task-card.active {
      background: rgba(37, 99, 235, 0.08);
      border-color: #2563eb;
      box-shadow: 0 0 14px rgba(37, 99, 235, 0.25);
    }

    .task-card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 0.5rem;
    }

    .task-title {
      font-size: 0.95rem;
      font-weight: 600;
      color: #f8fafc;
      margin: 0;
      line-height: 1.3;
    }

    .task-snippet {
      font-size: 0.8rem;
      color: #94a3b8;
      margin: 0;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      line-height: 1.4;
    }

    .task-stats-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.75rem;
      color: #64748b;
      margin-top: 0.25rem;
    }

    .due-info {
      display: flex;
      align-items: center;
      gap: 0.35rem;
    }

    .progress-pill {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      background: rgba(0, 0, 0, 0.25);
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
    }

    .text-amber { color: #f59e0b; }
    .text-emerald { color: #10b981; }

    /* Submissions Console */
    .instructions-banner {
      background: rgba(37, 99, 235, 0.05);
      border-left: 3px solid #2563eb;
      padding: 0.75rem 1rem;
      border-radius: 0 6px 6px 0;
      font-size: 0.825rem;
      color: #cbd5e1;
      line-height: 1.5;
    }

    .instructions-banner .label {
      font-size: 0.675rem;
      color: #60a5fa;
      font-weight: 700;
      display: block;
      margin-bottom: 0.25rem;
    }

    .submissions-table-wrap {
      overflow-x: auto;
    }

    .submissions-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
      font-size: 0.85rem;
    }

    .submissions-table th {
      padding: 0.75rem 0.85rem;
      color: #64748b;
      font-size: 0.7rem;
      font-weight: 700;
      letter-spacing: 0.06em;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      font-family: monospace;
    }

    .submissions-table td {
      padding: 0.85rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.04);
      color: #e2e8f0;
      vertical-align: middle;
    }

    .submissions-table tr:hover td {
      background: rgba(255, 255, 255, 0.02);
    }

    .submissions-table tr.row-graded td {
      background: rgba(16, 185, 129, 0.02);
    }

    .student-name {
      color: #f8fafc;
      font-size: 0.9rem;
    }

    .student-roll {
      font-size: 0.75rem;
      margin-top: 0.15rem;
    }

    .btn-download {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.35rem 0.65rem;
      background: rgba(37, 99, 235, 0.12);
      border: 1px solid rgba(37, 99, 235, 0.3);
      border-radius: 6px;
      color: #60a5fa;
      font-size: 0.775rem;
      font-weight: 500;
      text-decoration: none;
      transition: all 0.2s ease;
    }

    .btn-download:hover {
      background: #2563eb;
      color: #ffffff;
    }

    .grade-inputs {
      display: flex;
      gap: 0.5rem;
      align-items: center;
    }

    .marks-input-wrap {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      background: rgba(0, 0, 0, 0.35);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 6px;
      padding: 0 0.4rem;
    }

    .marks-input {
      width: 55px;
      padding: 0.35rem 0.2rem;
      background: transparent;
      border: none;
      color: #f8fafc;
      font-size: 0.85rem;
      font-weight: 700;
      text-align: right;
    }

    .marks-input:focus {
      outline: none;
    }

    .max-marks-label {
      color: #64748b;
      font-size: 0.75rem;
      white-space: nowrap;
    }

    .feedback-input {
      flex: 1;
      min-width: 150px;
      padding: 0.4rem 0.65rem;
      background: rgba(0, 0, 0, 0.35);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 6px;
      color: #f8fafc;
      font-size: 0.8rem;
    }

    .feedback-input:focus {
      outline: none;
      border-color: #2563eb;
    }

    .field-error {
      color: #f43f5e;
      font-size: 0.7rem;
      margin-top: 0.25rem;
    }

    .save-grade-btn {
      white-space: nowrap;
    }

    /* Badges */
    .badge {
      display: inline-flex;
      align-items: center;
      padding: 0.2rem 0.55rem;
      border-radius: 4px;
      font-size: 0.7rem;
      font-weight: 600;
      letter-spacing: 0.04em;
    }

    .badge-sage {
      background: rgba(45, 212, 191, 0.1);
      color: #2dd4bf;
      border: 1px solid rgba(45, 212, 191, 0.25);
    }

    .badge-amber {
      background: rgba(245, 158, 11, 0.1);
      color: #f59e0b;
      border: 1px solid rgba(245, 158, 11, 0.25);
    }

    .badge-emerald {
      background: rgba(16, 185, 129, 0.12);
      color: #10b981;
      border: 1px solid rgba(16, 185, 129, 0.3);
    }

    .badge-rose {
      background: rgba(244, 63, 94, 0.1);
      color: #f43f5e;
      border: 1px solid rgba(244, 63, 94, 0.25);
    }

    .badge-neutral {
      background: rgba(148, 163, 184, 0.1);
      color: #94a3b8;
      border: 1px solid rgba(148, 163, 184, 0.2);
    }

    .badge-sm {
      font-size: 0.65rem;
      padding: 0.15rem 0.4rem;
    }

    .due-badge {
      font-size: 0.75rem;
      color: #94a3b8;
    }

    /* Buttons */
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.45rem;
      padding: 0.5rem 1rem;
      border-radius: 6px;
      font-size: 0.85rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      border: none;
    }

    .btn-sm {
      padding: 0.4rem 0.8rem;
      font-size: 0.8rem;
    }

    .btn-xs {
      padding: 0.3rem 0.6rem;
      font-size: 0.75rem;
    }

    .btn-primary {
      background: #2563eb;
      color: #ffffff;
      box-shadow: 0 2px 8px rgba(37, 99, 235, 0.35);
    }

    .btn-primary:hover:not(:disabled) {
      background: #1d4ed8;
      transform: translateY(-1px);
    }

    .btn-primary:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .btn-secondary {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #cbd5e1;
    }

    .btn-secondary:hover:not(:disabled) {
      background: rgba(255, 255, 255, 0.08);
      color: #ffffff;
    }

    .btn-spinner {
      width: 12px;
      height: 12px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top-color: #ffffff;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    /* Empty and Loading States */
    .empty-state {
      padding: 3rem 1.5rem;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.75rem;
      color: #64748b;
    }

    .empty-state h4 {
      font-size: 1.1rem;
      color: #e2e8f0;
      margin: 0;
    }

    .empty-state p {
      font-size: 0.85rem;
      max-width: 380px;
      margin: 0;
      line-height: 1.5;
    }

    .select-prompt {
      min-height: 400px;
      justify-content: center;
    }

    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 3rem;
      gap: 0.75rem;
      color: #94a3b8;
      font-size: 0.85rem;
    }

    .spinner {
      width: 28px;
      height: 28px;
      border: 3px solid rgba(37, 99, 235, 0.2);
      border-top-color: #2563eb;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* Modal / Drawer */
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.75);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 1.5rem;
    }

    .modal-box {
      width: 100%;
      max-width: 540px;
      background: #11151e;
      border: 1px solid rgba(255, 255, 255, 0.12);
      padding: 1.75rem;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
      animation: modalIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes modalIn {
      from { opacity: 0; transform: scale(0.96) translateY(8px); }
      to { opacity: 1; transform: scale(1) translateY(0); }
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 1rem;
    }

    .modal-title {
      font-size: 1.35rem;
      font-weight: 700;
      color: #f8fafc;
      margin: 0.25rem 0 0 0;
    }

    .modal-subtitle {
      font-size: 0.825rem;
      color: #94a3b8;
      margin: 0.2rem 0 0 0;
    }

    .modal-close-btn {
      background: transparent;
      border: none;
      color: #64748b;
      cursor: pointer;
      padding: 0.25rem;
      border-radius: 4px;
      transition: color 0.15s ease;
    }

    .modal-close-btn:hover {
      color: #ffffff;
    }

    .modal-form {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }

    .form-row {
      display: flex;
      gap: 1rem;
    }

    .flex-1 {
      flex: 1;
    }

    .form-label {
      font-size: 0.725rem;
      font-weight: 600;
      color: #94a3b8;
      letter-spacing: 0.05em;
    }

    .required {
      color: #f43f5e;
    }

    .form-input, .form-textarea {
      background: rgba(0, 0, 0, 0.4);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 6px;
      padding: 0.55rem 0.85rem;
      color: #f8fafc;
      font-size: 0.875rem;
      transition: border-color 0.15s ease;
    }

    .form-input:focus, .form-textarea:focus {
      outline: none;
      border-color: #2563eb;
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.2);
    }

    .modal-error {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      color: #f43f5e;
      font-size: 0.8rem;
      background: rgba(244, 63, 94, 0.1);
      padding: 0.5rem 0.75rem;
      border-radius: 6px;
    }

    .modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      margin-top: 0.5rem;
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

  // Per-submission grading form states keyed by submissionId
  readonly gradingStates = new Map<string, GradingState>();

  // Create Assignment Modal State
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
          // Check route param for target assignment
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

        // Auto-select first task if available
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

        // Initialize local grading states
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

        // Update local item
        sub.submissionStatus = 'GRADED';
        sub.marksObtained = res.marksObtained;
        sub.feedback = res.feedback;

        // Update task gradedCount in tasks list
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
    
    // Default due date to 7 days in future at 23:59
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
        
        // Refresh tasks and select the new one
        this.loadTasks(cls.facultyAssignmentId);
      },
      error: (err) => {
        this.creatingTask.set(false);
        this.createError.set(err.message || 'Failed to create assignment.');
      }
    });
  }
}
