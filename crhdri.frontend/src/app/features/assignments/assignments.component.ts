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
      <!-- Header -->
      <div class="page-header">
        <div>
          <h2 class="page-title font-editorial">Assignments & Project Submissions</h2>
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
        <div class="error-banner card-tactile" role="alert">
          <div class="error-icon-wrap">
            <app-icon name="alert" [size]="28"></app-icon>
          </div>
          <div class="error-text">
            <h3 class="error-title">Unable to Load Course Assignments</h3>
            <p class="error-desc">{{ errorMessage() }}</p>
            <p class="error-hint">Ensure the backend API at <code>http://localhost:5083</code> is running with PostgreSQL.</p>
          </div>
          <button class="btn btn-primary" (click)="loadAssignments()">
            <app-icon name="refresh" [size]="16"></app-icon>
            Retry Connection
          </button>
        </div>
      }

      <!-- Empty State -->
      @else if (filteredAssignments().length === 0) {
        <div class="card-tactile empty-state">
          <app-icon name="assignments" [size]="48" class="empty-icon"></app-icon>
          <h3 class="font-editorial empty-title">No Assignments Found</h3>
          <p class="empty-desc">
            @if (filterStatus() !== 'ALL') {
              No assignments found with status "{{ filterStatus() }}".
            } @else {
              No course assignments have been published for your enrolled subjects yet.
            }
          </p>
          @if (filterStatus() !== 'ALL') {
            <button class="btn btn-secondary" (click)="filterStatus.set('ALL')">Show All Assignments</button>
          }
        </div>
      }

      <!-- Assignments List -->
      @else {
        <div class="assignments-list">
          @for (item of filteredAssignments(); track item.assignmentId) {
            <div class="card-tactile assignment-card" [class.is-submitted]="item.submissionStatus === 'SUBMITTED'">
              <div class="assignment-header-row">
                <div class="header-left">
                  <span class="badge" [class.badge-forest]="item.submissionStatus === 'SUBMITTED'" [class.badge-amber]="item.submissionStatus !== 'SUBMITTED'">
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
                <h3 class="assignment-title font-editorial">{{ item.title }}</h3>
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
                      <app-icon name="download" [size]="14"></app-icon> Download Submission
                    </a>
                  }

                  <button class="btn btn-primary btn-sm" (click)="openSubmitModal(item)">
                    <app-icon name="upload" [size]="14"></app-icon>
                    {{ item.submissionStatus === 'SUBMITTED' ? 'Update Submission' : 'Submit Assignment' }}
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
          <div class="card-tactile modal-dialog" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <div>
                <span class="modal-tag">Assignment Submission</span>
                <h3 class="modal-title font-editorial">{{ assignment.title }}</h3>
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
                    <p>A deliverable was previously submitted on {{ assignment.submittedAt | date:'medium' }}. Uploading a new file will replace your existing submission.</p>
                  </div>
                </div>
              }

              <!-- Upload Area -->
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
                      <app-icon name="assignments" [size]="24"></app-icon>
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
                    <app-icon name="upload" [size]="32" class="upload-icon"></app-icon>
                    <p class="drop-title">Click to select document or drag & drop</p>
                    <p class="drop-formats">Allowed formats: <strong>PDF, DOC, DOCX</strong> &bull; Max limit: <strong>10 MB</strong></p>
                  </div>
                }
              </div>

              <!-- Upload Progress bar if uploading -->
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

              <!-- Upload Error message if any -->
              @if (uploadError()) {
                <div class="upload-error-box">
                  <app-icon name="alert" [size]="15"></app-icon>
                  <span>{{ uploadError() }}</span>
                </div>
              }
            </div>

            <div class="modal-footer">
              <button class="btn btn-secondary" (click)="closeModal()" [disabled]="uploading()">
                Cancel
              </button>
              <button 
                class="btn btn-primary" 
                [disabled]="!selectedFile() || uploading()"
                (click)="submitFile()">
                @if (uploading()) {
                  <app-icon name="refresh" [size]="15" class="spin"></app-icon>
                  Uploading Deliverable ({{ uploadProgress() }}%)...
                } @else {
                  <app-icon name="upload" [size]="15"></app-icon>
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
      gap: 22px;
    }

    .page-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 16px;
    }

    .page-title {
      font-size: 26px;
      font-weight: 600;
      color: var(--color-forest);
      letter-spacing: -0.01em;
    }

    .page-subtitle {
      font-size: 13.5px;
      color: var(--text-muted);
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }

    .status-filters {
      display: flex;
      gap: 6px;
      background: var(--bg-surface-subtle);
      border: 1px solid var(--border-medium);
      padding: 3px;
      border-radius: var(--radius-md);
    }

    .filter-pill {
      padding: 6px 14px;
      font-size: 12.5px;
      font-weight: 600;
      border: none;
      background: transparent;
      color: var(--text-secondary);
      border-radius: var(--radius-sm);
      cursor: pointer;
      transition: all var(--transition-fast);
    }

    .filter-pill.active {
      background: var(--bg-surface);
      color: var(--color-forest);
      box-shadow: 0 1px 3px rgba(32, 40, 36, 0.08);
    }

    /* Skeleton */
    .skeleton-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .item-skeleton {
      height: 160px;
      border-radius: var(--radius-lg);
    }

    /* Error Banner */
    .error-banner {
      display: flex;
      align-items: center;
      gap: 20px;
      padding: 24px 28px;
      background: linear-gradient(135deg, rgba(254, 242, 242, 0.95), rgba(255, 255, 255, 0.98));
      border: 1px solid rgba(220, 38, 38, 0.25);
      border-left: 5px solid #dc2626;
      border-radius: var(--radius-lg);
      box-shadow: 0 4px 16px rgba(220, 38, 38, 0.08);
    }

    .error-icon-wrap {
      flex-shrink: 0;
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: #fee2e2;
      color: #dc2626;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .error-text {
      flex: 1;
    }

    .error-title {
      font-size: 16px;
      font-weight: 600;
      color: #991b1b;
      margin-bottom: 4px;
    }

    .error-desc {
      font-size: 13.5px;
      color: #7f1d1d;
      margin-bottom: 4px;
    }

    .error-hint {
      font-size: 12px;
      color: #b91c1c;
    }

    .error-hint code {
      background: rgba(220, 38, 38, 0.1);
      padding: 2px 6px;
      border-radius: 4px;
      font-family: monospace;
    }

    /* Assignments List */
    .assignments-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .assignment-card {
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .assignment-header-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }

    .due-tag {
      font-size: 12px;
      color: var(--text-muted);
      font-weight: 500;
    }

    .due-tag.deadline-near {
      color: var(--color-danger);
      font-weight: 700;
    }

    .marks-badge {
      font-size: 12.5px;
      color: var(--color-forest);
      background: rgba(23, 63, 53, 0.08);
      border: 1px solid var(--border-subtle);
      padding: 4px 10px;
      border-radius: var(--radius-sm);
    }

    .assignment-title {
      font-size: 20px;
      font-weight: 600;
      color: var(--color-forest);
      margin-bottom: 6px;
    }

    .assignment-instructions {
      font-size: 13.5px;
      color: var(--text-secondary);
      line-height: 1.5;
    }

    .grading-feedback-box {
      background: rgba(23, 63, 53, 0.04);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      padding: 12px 16px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .grading-score {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .grade-label {
      font-size: 12px;
      font-weight: 700;
      color: var(--color-forest);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .grade-value {
      font-size: 14px;
      color: var(--color-forest-dark);
    }

    .comment-text {
      font-size: 13px;
      color: var(--text-main);
      font-style: italic;
    }

    .assignment-footer-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-top: 1px solid var(--border-subtle);
      padding-top: 16px;
      gap: 12px;
      flex-wrap: wrap;
    }

    .submitted-meta {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12.5px;
      color: var(--color-forest);
      font-weight: 600;
    }

    .submitted-check {
      color: var(--color-forest);
    }

    .pending-meta {
      font-size: 12.5px;
      color: var(--text-muted);
    }

    .action-buttons {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    /* Modal */
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(32, 40, 36, 0.4);
      backdrop-filter: blur(4px);
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }

    .modal-dialog {
      width: 100%;
      max-width: 560px;
      background: var(--bg-surface);
      padding: 28px;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .modal-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
    }

    .modal-tag {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--color-forest);
    }

    .modal-title {
      font-size: 21px;
      font-weight: 600;
      color: var(--color-forest);
      margin-top: 2px;
    }

    .modal-close {
      font-size: 16px;
      padding: 4px 8px;
    }

    .modal-instructions {
      font-size: 13.5px;
      color: var(--text-secondary);
      margin-bottom: 16px;
      line-height: 1.4;
    }

    .resubmit-notice {
      display: flex;
      gap: 10px;
      padding: 12px 14px;
      background: rgba(212, 163, 115, 0.12);
      border: 1px solid rgba(212, 163, 115, 0.35);
      border-radius: var(--radius-md);
      font-size: 12px;
      color: #7A531C;
      margin-bottom: 14px;
    }

    .notice-icon {
      flex-shrink: 0;
      color: #A0641D;
      margin-top: 2px;
    }

    .notice-content strong {
      display: block;
      margin-bottom: 2px;
    }

    .notice-content p {
      margin: 0;
      line-height: 1.4;
    }

    /* Drop Zone */
    .file-drop-zone {
      border: 2px dashed var(--border-medium);
      border-radius: var(--radius-lg);
      padding: 32px 20px;
      text-align: center;
      cursor: pointer;
      background: var(--bg-surface-subtle);
      transition: all var(--transition-fast);
    }

    .file-drop-zone:hover, .file-drop-zone.drag-over {
      border-color: var(--color-forest);
      background: rgba(23, 63, 53, 0.04);
    }

    .file-drop-zone.has-file {
      border-style: solid;
      border-color: var(--color-forest);
      background: rgba(23, 63, 53, 0.04);
      padding: 16px;
    }

    .hidden-file-input {
      display: none;
    }

    .drop-prompt {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
    }

    .upload-icon {
      color: var(--color-forest);
    }

    .drop-title {
      font-size: 14px;
      font-weight: 600;
      color: var(--color-forest);
    }

    .drop-formats {
      font-size: 12px;
      color: var(--text-muted);
    }

    .file-preview-card {
      display: flex;
      align-items: center;
      gap: 12px;
      text-align: left;
    }

    .file-icon-box {
      width: 44px;
      height: 44px;
      border-radius: var(--radius-md);
      background: var(--color-forest);
      color: #FFFFFF;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .file-info {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
    }

    .file-name {
      font-size: 13.5px;
      color: var(--color-forest);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .file-size {
      font-size: 11px;
      color: var(--text-muted);
    }

    .file-remove-btn {
      background: transparent;
      border: none;
      color: var(--color-danger);
      font-size: 16px;
      padding: 6px 10px;
      cursor: pointer;
    }

    .upload-progress-container {
      margin-top: 14px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .progress-bar-track {
      width: 100%;
      height: 8px;
      background: var(--bg-surface-subtle);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-full);
      overflow: hidden;
    }

    .progress-bar-fill {
      height: 100%;
      background: var(--color-forest);
      border-radius: var(--radius-full);
      transition: width 0.2s ease;
    }

    .progress-label-row {
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      color: var(--text-muted);
      font-weight: 500;
    }

    .upload-error-box {
      display: flex;
      align-items: center;
      gap: 8px;
      color: var(--color-danger);
      background: rgba(184, 66, 51, 0.08);
      border: 1px solid rgba(184, 66, 51, 0.2);
      padding: 10px 14px;
      border-radius: var(--radius-md);
      font-size: 12.5px;
      margin-top: 12px;
    }

    .modal-footer {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 12px;
      border-top: 1px solid var(--border-subtle);
      padding-top: 16px;
    }

    .spin {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      100% { transform: rotate(360deg); }
    }

    /* Empty */
    .empty-state {
      padding: 56px;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
    }

    .empty-icon {
      color: var(--text-muted);
      opacity: 0.6;
    }

    .empty-title {
      font-size: 22px;
      color: var(--color-forest);
    }

    .empty-desc {
      font-size: 14px;
      color: var(--text-muted);
      max-width: 420px;
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
          // Immediately reload assignments to reflect status and download url
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
