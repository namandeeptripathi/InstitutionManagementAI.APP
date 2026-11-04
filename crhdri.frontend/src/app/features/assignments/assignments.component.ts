import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpEvent, HttpEventType } from '@angular/common/http';
import { AssignmentsService } from '../../core/services/assignments.service';
import { Assignment, AssignmentSubmissionResponse } from '../../core/models/student.models';
import { ToastService } from '../../core/services/toast.service';
import { IconComponent } from '../../shared/components/icon.component';

@Component({
  selector: 'app-assignments',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  template: `
    <div class="assignments-page">
      <!-- Page Header -->
      <div class="page-header-clean">
        <div>
          <h2 class="page-title">Assignments & Submissions</h2>
          <p class="page-subtitle">Track academic coursework, deadlines, and upload deliverables</p>
        </div>

        <div class="header-actions">
          <div class="status-filters">
            <button 
              class="filter-pill" 
              [class.active]="filterStatus() === 'ALL'" 
              (click)="filterStatus.set('ALL')">
              All ({{ assignments().length }})
            </button>
            <button 
              class="filter-pill" 
              [class.active]="filterStatus() === 'PENDING'" 
              (click)="filterStatus.set('PENDING')">
              Pending ({{ pendingCount() }})
            </button>
            <button 
              class="filter-pill" 
              [class.active]="filterStatus() === 'SUBMITTED'" 
              (click)="filterStatus.set('SUBMITTED')">
              Submitted ({{ submittedCount() }})
            </button>
          </div>

          <button class="btn btn-secondary btn-sm" (click)="loadAssignments()" title="Refresh Assignments">
            <app-icon name="refresh" [size]="14"></app-icon> Refresh
          </button>
        </div>
      </div>

      <!-- Loading State -->
      @if (loading()) {
        <div class="skeleton-list">
          <div class="skeleton item-skeleton" *ngFor="let i of [1,2,3]"></div>
        </div>
      }

      <!-- Error State -->
      @else if (errorMessage()) {
        <div class="error-banner card-modern" role="alert">
          <div class="error-icon-wrap">
            <app-icon name="alert" [size]="24"></app-icon>
          </div>
          <div class="error-text">
            <h3 class="error-title">Unable to Load Course Assignments</h3>
            <p class="error-desc">{{ errorMessage() }}</p>
            <p class="error-hint">Ensure the backend API at <code>http://localhost:5083</code> is active with PostgreSQL.</p>
          </div>
          <button class="btn btn-primary btn-sm" (click)="loadAssignments()">
            <app-icon name="refresh" [size]="14"></app-icon> Retry
          </button>
        </div>
      }

      <!-- Empty State -->
      @else if (filteredAssignments().length === 0) {
        <div class="card-modern empty-state-box">
          <app-icon name="assignments" [size]="40" class="empty-icon"></app-icon>
          <h3 class="empty-title">No Assignments Found</h3>
          <p class="empty-desc">
            @if (filterStatus() !== 'ALL') {
              No assignments found with status "{{ filterStatus() }}".
            } @else {
              No course assignments have been published for your enrolled subjects yet.
            }
          </p>
          @if (filterStatus() !== 'ALL') {
            <button class="btn btn-secondary btn-sm" (click)="filterStatus.set('ALL')">Show All Assignments</button>
          }
        </div>
      }

      <!-- Assignments List -->
      @else {
        <div class="assignments-list">
          @for (item of filteredAssignments(); track item.assignmentId) {
            <div class="card-modern assignment-card" [class.is-submitted]="item.submissionStatus === 'SUBMITTED'">
              <div class="assignment-header-row">
                <div class="header-left">
                  <span class="badge" [class.badge-success]="item.submissionStatus === 'SUBMITTED'" [class.badge-amber]="item.submissionStatus !== 'SUBMITTED'">
                    <app-icon [name]="item.submissionStatus === 'SUBMITTED' ? 'check' : 'clock'" [size]="12"></app-icon>
                    {{ item.submissionStatus === 'SUBMITTED' ? 'Submitted' : 'Pending Submission' }}
                  </span>
                  <span class="due-tag" [class.deadline-near]="isDeadlineNear(item.dueAt)">
                    Due: {{ item.dueAt | date:'EEEE, MMM d, y, h:mm a' }}
                  </span>
                </div>

                <div class="marks-badge font-mono">
                  Max Marks: <strong>{{ item.maxMarks }}</strong>
                </div>
              </div>

              <div class="assignment-body">
                <h3 class="assignment-title">{{ item.title }}</h3>
                <p class="assignment-instructions">{{ item.instructions }}</p>
              </div>

              <!-- Submission Result / Feedback if present -->
              @if (item.marksObtained !== null || item.feedback) {
                <div class="grading-feedback-box">
                  <div class="grading-score">
                    <span class="grade-label">Evaluated Score:</span>
                    <strong class="grade-value font-mono">{{ item.marksObtained }} / {{ item.maxMarks }}</strong>
                  </div>
                  @if (item.feedback) {
                    <div class="grading-comment">
                      <span class="grade-label">Instructor Feedback:</span>
                      <p class="comment-text">"{{ item.feedback }}"</p>
                    </div>
                  }
                </div>
              }

              <!-- Submission Footer & Actions -->
              <div class="assignment-footer-row">
                <div class="submission-details">
                  @if (item.submissionStatus === 'SUBMITTED') {
                    <div class="submitted-meta">
                      <app-icon name="check" [size]="14" class="submitted-check"></app-icon>
                      <span>Uploaded on {{ item.submittedAt | date:'medium' }}</span>
                    </div>
                  } @else {
                    <span class="pending-meta">Awaiting file upload before deadline</span>
                  }
                </div>

                <div class="action-buttons">
                  @if (item.submissionStatus === 'SUBMITTED') {
                    <a [href]="getDownloadUrl(item.assignmentId)" target="_blank" class="btn btn-secondary btn-sm" download>
                      <app-icon name="download" [size]="13"></app-icon> Download
                    </a>
                  }

                  <button class="btn btn-primary btn-sm" (click)="openSubmitModal(item)">
                    <app-icon name="upload" [size]="13"></app-icon>
                    {{ item.submissionStatus === 'SUBMITTED' ? 'Update Submission' : 'Submit Task' }}
                  </button>
                </div>
              </div>
            </div>
          }
        </div>
      }

      <!-- Assignment Submission Modal -->
      @if (selectedAssignment(); as assignment) {
        <div class="modal-overlay" (click)="closeModal()">
          <div class="card-modern modal-dialog" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <div>
                <span class="modal-tag">Submit Deliverable</span>
                <h3 class="modal-title">{{ assignment.title }}</h3>
              </div>
              <button class="btn-ghost modal-close" (click)="closeModal()" [disabled]="uploading()">✕</button>
            </div>

            <div class="modal-body">
              <p class="modal-instructions">{{ assignment.instructions }}</p>

              <!-- Resubmission Notice -->
              @if (assignment.submissionStatus === 'SUBMITTED') {
                <div class="resubmit-notice">
                  <app-icon name="alert" [size]="15" class="notice-icon"></app-icon>
                  <div class="notice-content">
                    <strong>Existing Submission on File</strong>
                    <p>A deliverable was previously submitted on {{ assignment.submittedAt | date:'medium' }}. Uploading a new file will replace your existing file.</p>
                  </div>
                </div>
              }

              <!-- Upload Drop Zone -->
              <div 
                class="file-drop-zone"
                [class.has-file]="selectedFile()"
                [class.drag-over]="isDragging()"
                (dragover)="onDragOver($event)"
                (dragleave)="isDragging.set(false)"
                (drop)="onFileDrop($event)"
                (click)="fileInput.click()">
                
                <input 
                  #fileInput 
                  type="file" 
                  accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" 
                  class="hidden-file-input"
                  (change)="onFileSelected($event)"
                />

                @if (selectedFile(); as file) {
                  <div class="file-preview-card">
                    <div class="file-icon-box">
                      <app-icon name="assignments" [size]="22"></app-icon>
                    </div>
                    <div class="file-info">
                      <strong class="file-name font-mono">{{ file.name }}</strong>
                      <span class="file-size">{{ (file.size / 1024 / 1024).toFixed(2) }} MB</span>
                    </div>
                    <button class="file-remove-btn" (click)="$event.stopPropagation(); removeSelectedFile()" [disabled]="uploading()">
                      ✕
                    </button>
                  </div>
                } @else {
                  <div class="drop-prompt">
                    <app-icon name="upload" [size]="28" class="upload-icon"></app-icon>
                    <p class="drop-title">Click to select document or drag & drop</p>
                    <p class="drop-formats">Allowed formats: <strong>PDF, DOC, DOCX</strong> &bull; Max limit: <strong>10 MB</strong></p>
                  </div>
                }
              </div>

              <!-- Upload Progress -->
              @if (uploading()) {
                <div class="upload-progress-container">
                  <div class="progress-bar-track">
                    <div class="progress-bar-fill" [style.width.%]="uploadProgress()"></div>
                  </div>
                  <div class="progress-label-row">
                    <span>Uploading deliverable to institutional storage...</span>
                    <span class="font-mono">{{ uploadProgress() }}%</span>
                  </div>
                </div>
              }

              <!-- Error Box -->
              @if (uploadError()) {
                <div class="upload-error-box">
                  <app-icon name="alert" [size]="14"></app-icon>
                  <span>{{ uploadError() }}</span>
                </div>
              }
            </div>

            <div class="modal-footer">
              <button class="btn btn-secondary btn-sm" (click)="closeModal()" [disabled]="uploading()">
                Cancel
              </button>
              <button 
                class="btn btn-primary btn-sm" 
                [disabled]="!selectedFile() || uploading()"
                (click)="submitFile()">
                @if (uploading()) {
                  <app-icon name="refresh" [size]="14" class="spin"></app-icon>
                  Uploading ({{ uploadProgress() }}%)...
                } @else {
                  <app-icon name="upload" [size]="14"></app-icon>
                  {{ assignment.submissionStatus === 'SUBMITTED' ? 'Replace & Upload' : 'Confirm & Upload' }}
                }
              </button>
            </div>
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
    }

    .page-header-clean {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 14px;
    }

    .page-title {
      font-size: 20px;
      font-weight: 700;
      color: var(--text-main);
      letter-spacing: -0.01em;
    }

    .page-subtitle {
      font-size: 13px;
      color: var(--text-secondary);
      margin-top: 2px;
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }

    .status-filters {
      display: flex;
      gap: 4px;
      background: var(--bg-surface-subtle);
      border: 1px solid var(--border-subtle);
      padding: 2px;
      border-radius: var(--radius-md);
    }

    .filter-pill {
      padding: 5px 12px;
      font-size: 12px;
      font-weight: 600;
      border: none;
      background: transparent;
      color: var(--text-secondary);
      border-radius: var(--radius-sm);
      cursor: pointer;
      transition: all var(--transition-fast);
    }

    .filter-pill.active {
      background: #FFFFFF;
      color: var(--color-teal);
      box-shadow: 0 1px 2px rgba(15, 23, 42, 0.06);
    }

    /* Skeleton */
    .skeleton-list {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .item-skeleton {
      height: 140px;
      border-radius: var(--radius-lg);
    }

    /* Assignments List */
    .assignments-list {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .assignment-card {
      padding: 20px 22px;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .assignment-header-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      flex-wrap: wrap;
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }

    .due-tag {
      font-size: 11.5px;
      color: var(--text-secondary);
      font-weight: 500;
    }

    .due-tag.deadline-near {
      color: var(--color-danger);
      font-weight: 700;
    }

    .marks-badge {
      font-size: 11.5px;
      color: var(--color-teal);
      background: var(--color-teal-surface);
      border: 1px solid var(--color-teal-border);
      padding: 3px 8px;
      border-radius: var(--radius-sm);
    }

    .assignment-body {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .assignment-title {
      font-size: 16px;
      font-weight: 700;
      color: var(--text-main);
      line-height: 1.3;
    }

    .assignment-instructions {
      font-size: 13px;
      color: var(--text-secondary);
      line-height: 1.5;
    }

    /* Feedback Box */
    .grading-feedback-box {
      padding: 12px 14px;
      background: var(--color-teal-surface);
      border: 1px solid var(--color-teal-border);
      border-radius: var(--radius-md);
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .grading-score {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12.5px;
    }

    .grade-label {
      font-weight: 600;
      color: var(--color-teal);
    }

    .grade-value {
      color: var(--color-teal-dark);
      font-size: 13.5px;
    }

    .grading-comment {
      display: flex;
      flex-direction: column;
      gap: 2px;
      font-size: 12px;
    }

    .comment-text {
      font-style: italic;
      color: var(--text-secondary);
    }

    /* Footer */
    .assignment-footer-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-top: 1px solid var(--border-subtle);
      padding-top: 12px;
      gap: 12px;
      flex-wrap: wrap;
    }

    .submission-details {
      font-size: 12px;
      color: var(--text-secondary);
    }

    .submitted-meta {
      display: flex;
      align-items: center;
      gap: 5px;
      color: var(--color-success);
      font-weight: 600;
    }

    .submitted-check {
      color: var(--color-success);
    }

    .pending-meta {
      color: var(--text-muted);
    }

    .action-buttons {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    /* Modal */
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.4);
      backdrop-filter: blur(2px);
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }

    .modal-dialog {
      width: 100%;
      max-width: 520px;
      background: var(--bg-surface);
      border-radius: var(--radius-xl);
      padding: 22px 24px;
      box-shadow: var(--shadow-modal);
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .modal-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
    }

    .modal-tag {
      font-size: 10.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--color-teal);
    }

    .modal-title {
      font-size: 17px;
      font-weight: 700;
      color: var(--text-main);
      margin-top: 2px;
    }

    .modal-close {
      font-size: 16px;
      color: var(--text-muted);
      cursor: pointer;
      padding: 4px 8px;
    }

    .modal-body {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .modal-instructions {
      font-size: 12.5px;
      color: var(--text-secondary);
      line-height: 1.45;
    }

    .resubmit-notice {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      padding: 10px 12px;
      background: var(--color-amber-surface);
      border: 1px solid var(--color-amber-border);
      border-radius: var(--radius-md);
      font-size: 11.5px;
      color: var(--color-amber);
    }

    .resubmit-notice strong {
      display: block;
      margin-bottom: 2px;
    }

    .notice-icon {
      color: var(--color-amber);
      flex-shrink: 0;
      margin-top: 2px;
    }

    /* Drop Zone */
    .file-drop-zone {
      border: 2px dashed var(--border-medium);
      border-radius: var(--radius-lg);
      padding: 24px 20px;
      text-align: center;
      cursor: pointer;
      transition: all var(--transition-fast);
      background: var(--bg-surface-subtle);
    }

    .file-drop-zone:hover,
    .file-drop-zone.drag-over {
      border-color: var(--color-teal);
      background: var(--color-teal-surface);
    }

    .hidden-file-input {
      display: none;
    }

    .drop-prompt {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
    }

    .upload-icon {
      color: var(--color-teal);
    }

    .drop-title {
      font-size: 13.5px;
      font-weight: 600;
      color: var(--text-main);
    }

    .drop-formats {
      font-size: 11px;
      color: var(--text-muted);
    }

    .file-preview-card {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 12px;
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      text-align: left;
    }

    .file-icon-box {
      color: var(--color-teal);
      display: flex;
      align-items: center;
    }

    .file-info {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
    }

    .file-name {
      font-size: 12px;
      color: var(--text-main);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .file-size {
      font-size: 10.5px;
      color: var(--text-muted);
    }

    .file-remove-btn {
      background: transparent;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      padding: 4px;
    }

    .file-remove-btn:hover {
      color: var(--color-danger);
    }

    .upload-progress-container {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .progress-bar-track {
      height: 6px;
      background: var(--bg-surface-subtle);
      border-radius: var(--radius-full);
      overflow: hidden;
    }

    .progress-bar-fill {
      height: 100%;
      background: var(--color-teal);
      border-radius: var(--radius-full);
    }

    .progress-label-row {
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      color: var(--text-secondary);
    }

    .upload-error-box {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 12px;
      background: var(--color-danger-surface);
      border: 1px solid var(--color-danger-border);
      border-radius: var(--radius-md);
      font-size: 11.5px;
      color: var(--color-danger);
    }

    .modal-footer {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 10px;
      border-top: 1px solid var(--border-subtle);
      padding-top: 12px;
    }

    .spin {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      100% { transform: rotate(360deg); }
    }

    /* Error and Empty */
    .error-banner {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 18px;
      background: var(--color-danger-surface);
      border-color: var(--color-danger-border);
    }

    .error-icon-wrap {
      color: var(--color-danger);
    }

    .error-title {
      font-size: 15px;
      font-weight: 700;
      color: var(--color-danger);
      margin-bottom: 2px;
    }

    .error-desc {
      font-size: 13px;
      color: var(--text-main);
      margin-bottom: 2px;
    }

    .error-hint {
      font-size: 11.5px;
      color: var(--text-secondary);
    }

    .empty-state-box {
      padding: 48px 20px;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
    }

    .empty-icon {
      color: var(--text-muted);
    }

    .empty-title {
      font-size: 17px;
      font-weight: 700;
      color: var(--text-main);
    }

    .empty-desc {
      font-size: 13px;
      color: var(--text-secondary);
      max-width: 400px;
      line-height: 1.45;
    }
  `]
})
export class AssignmentsComponent implements OnInit {
  private readonly assignmentsService = inject(AssignmentsService);
  private readonly toast = inject(ToastService);

  assignments = signal<Assignment[]>([]);
  loading = signal<boolean>(true);
  errorMessage = signal<string | null>(null);

  filterStatus = signal<'ALL' | 'PENDING' | 'SUBMITTED'>('ALL');

  selectedAssignment = signal<Assignment | null>(null);
  selectedFile = signal<File | null>(null);
  uploading = signal<boolean>(false);
  uploadProgress = signal<number>(0);
  uploadError = signal<string | null>(null);
  isDragging = signal<boolean>(false);

  pendingCount = computed(() => this.assignments().filter(a => a.submissionStatus !== 'SUBMITTED').length);
  submittedCount = computed(() => this.assignments().filter(a => a.submissionStatus === 'SUBMITTED').length);

  filteredAssignments = computed(() => {
    const list = this.assignments();
    const st = this.filterStatus();
    if (st === 'PENDING') {
      return list.filter(a => a.submissionStatus !== 'SUBMITTED');
    }
    if (st === 'SUBMITTED') {
      return list.filter(a => a.submissionStatus === 'SUBMITTED');
    }
    return list;
  });

  ngOnInit(): void {
    this.loadAssignments();
  }

  loadAssignments(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.assignmentsService.getAssignments().subscribe({
      next: (data) => {
        this.assignments.set(data || []);
        this.loading.set(false);
      },
      error: (err) => {
        this.errorMessage.set(err.message || 'Failed to load assignments.');
        this.loading.set(false);
      }
    });
  }

  isDeadlineNear(dueAt: string): boolean {
    if (!dueAt) return false;
    const diffHours = (new Date(dueAt).getTime() - Date.now()) / (1000 * 60 * 60);
    return diffHours > 0 && diffHours <= 48;
  }

  getDownloadUrl(assignmentId: string): string {
    return this.assignmentsService.getDownloadUrl(assignmentId);
  }

  openSubmitModal(item: Assignment): void {
    this.selectedAssignment.set(item);
    this.selectedFile.set(null);
    this.uploadError.set(null);
    this.uploadProgress.set(0);
  }

  closeModal(): void {
    if (!this.uploading()) {
      this.selectedAssignment.set(null);
      this.selectedFile.set(null);
      this.uploadError.set(null);
      this.uploadProgress.set(0);
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.validateAndSetFile(input.files[0]);
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(true);
  }

  onFileDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(false);
    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      this.validateAndSetFile(event.dataTransfer.files[0]);
    }
  }

  private validateAndSetFile(file: File): void {
    this.uploadError.set(null);
    const maxBytes = 10 * 1024 * 1024; // 10MB
    if (file.size > maxBytes) {
      this.uploadError.set('File size exceeds the 10 MB institutional limit.');
      return;
    }

    if (file.size === 0) {
      this.uploadError.set('Uploaded file cannot be empty.');
      return;
    }

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'pdf' && ext !== 'doc' && ext !== 'docx') {
      this.uploadError.set('Unsupported file format. Please upload a PDF, DOC, or DOCX document.');
      return;
    }

    this.selectedFile.set(file);
  }

  removeSelectedFile(): void {
    this.selectedFile.set(null);
    this.uploadError.set(null);
    this.uploadProgress.set(0);
  }

  submitFile(): void {
    const assignment = this.selectedAssignment();
    const file = this.selectedFile();
    if (!assignment || !file || this.uploading()) return;

    this.uploading.set(true);
    this.uploadProgress.set(0);
    this.uploadError.set(null);

    this.assignmentsService.submitAssignment(assignment.assignmentId, file).subscribe({
      next: (event: HttpEvent<AssignmentSubmissionResponse>) => {
        if (event.type === HttpEventType.UploadProgress) {
          if (event.total) {
            const pct = Math.round((100 * event.loaded) / event.total);
            this.uploadProgress.set(pct);
          }
        } else if (event.type === HttpEventType.Response) {
          this.uploading.set(false);
          this.uploadProgress.set(100);
          const body = event.body as AssignmentSubmissionResponse;
          this.toast.success(body?.message || 'Assignment submitted successfully!', 'Deliverable Uploaded');
          this.closeModal();
          this.loadAssignments();
        }
      },
      error: (err) => {
        this.uploading.set(false);
        this.uploadProgress.set(0);
        this.uploadError.set(err.message || 'File upload failed. Please try again.');
      }
    });
  }
}
