import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { FacultyService } from '../../../core/services/faculty.service';
import { ToastService } from '../../../core/services/toast.service';
import { 
  FacultyAssignedClass, 
  FacultyLearningMaterialItem 
} from '../../../core/models/faculty.models';
import { IconComponent } from '../../../shared/components/icon.component';

@Component({
  selector: 'app-faculty-materials',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  template: `
    <div class="materials-page">
      <!-- Header Bar with Class Selector -->
      <div class="faculty-page-header">
        <div class="faculty-header-titles">
          <div class="badge-row">
            <span class="badge badge-teal badge-sm">
              <app-icon name="badge-check" [size]="12"></app-icon>
              COURSE REPOSITORY
            </span>
            <span class="meta-dot">&bull;</span>
            <span class="meta-year font-mono text-muted">AY 2026-2027</span>
          </div>
          <h2 class="faculty-page-title">Learning Materials Repository</h2>
          <p class="faculty-page-subtitle">
            Upload lecture notes, presentations, syllabi, and reference documents for your instructional cohorts.
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
        <!-- Content Panel -->
        <div class="card-modern panel-card">
          <!-- Panel Header & Action Bar -->
          <div class="panel-header">
            <div class="panel-header-title">
              <div class="class-pill">
                <span class="font-mono font-bold text-teal">{{ selectedClass()?.subjectCode }}</span>
                <span class="class-subject-title">{{ selectedClass()?.subjectName }}</span>
                <span class="meta-dot">&bull;</span>
                <span class="text-secondary text-xs">{{ selectedClass()?.courseName }} (Sem {{ selectedClass()?.semester }})</span>
              </div>
              <h3 class="panel-title">Class Resources & Reference Files</h3>
            </div>

            <div class="panel-actions">
              <button class="btn btn-secondary btn-sm" (click)="loadMaterials(selectedClass()!.facultyAssignmentId)" title="Refresh list">
                <app-icon name="refresh" [size]="13"></app-icon>
                <span>Refresh</span>
              </button>
              <button class="btn btn-primary btn-sm" (click)="openUploadModal()" title="Upload new course document">
                <app-icon name="upload" [size]="13"></app-icon>
                <span>Upload Resource</span>
              </button>
            </div>
          </div>

          <!-- Filter & Search Bar -->
          <div class="filter-bar">
            <div class="type-filter-group">
              <button
                class="filter-tab-pill"
                [class.active]="selectedType() === 'ALL'"
                (click)="selectedType.set('ALL')"
              >
                All ({{ materials().length }})
              </button>
              <button
                class="filter-tab-pill"
                [class.active]="selectedType() === 'PDF'"
                (click)="selectedType.set('PDF')"
              >
                PDF
              </button>
              <button
                class="filter-tab-pill"
                [class.active]="selectedType() === 'DOCUMENT'"
                (click)="selectedType.set('DOCUMENT')"
              >
                Documents
              </button>
              <button
                class="filter-tab-pill"
                [class.active]="selectedType() === 'PRESENTATION'"
                (click)="selectedType.set('PRESENTATION')"
              >
                Slides
              </button>
              <button
                class="filter-tab-pill"
                [class.active]="selectedType() === 'OTHER'"
                (click)="selectedType.set('OTHER')"
              >
                Other
              </button>
            </div>

            <div class="search-input-wrap">
              <app-icon name="search" [size]="14" class="search-icon"></app-icon>
              <input
                type="text"
                [(ngModel)]="searchQuery"
                placeholder="Search resources by title..."
                class="search-input"
              />
              @if (searchQuery) {
                <button class="clear-search-btn" (click)="searchQuery = ''">&times;</button>
              }
            </div>
          </div>

          <!-- Materials List / Grid -->
          @if (materialsLoading()) {
            <div class="materials-skeleton-grid">
              <div class="skeleton item-card-skeleton"></div>
              <div class="skeleton item-card-skeleton"></div>
              <div class="skeleton item-card-skeleton"></div>
            </div>
          } @else if (materialsError()) {
            <div class="error-sub-banner">
              <p>{{ materialsError() }}</p>
              <button class="btn btn-secondary btn-sm" (click)="loadMaterials(selectedClass()!.facultyAssignmentId)">
                Retry Connection
              </button>
            </div>
          } @else if (filteredMaterials().length === 0) {
            <div class="empty-materials-state">
              <div class="empty-icon-wrap large">
                <app-icon name="materials" [size]="36"></app-icon>
              </div>
              <h4 class="empty-title">No Learning Materials Found</h4>
              <p class="empty-desc">
                @if (searchQuery || selectedType() !== 'ALL') {
                  No resources matched your current filter criteria.
                } @else {
                  No reference documents or lecture slides have been uploaded for {{ selectedClass()?.subjectCode }} yet.
                }
              </p>
              <button class="btn btn-primary btn-sm" (click)="openUploadModal()">
                Upload First Material
              </button>
            </div>
          } @else {
            <div class="materials-grid">
              @for (item of filteredMaterials(); track item.materialId) {
                <div class="material-card">
                  <div class="material-card-top">
                    <span class="badge badge-sm font-mono" [ngClass]="getTypeBadgeClass(item.materialType)">
                      {{ item.materialType }}
                    </span>
                    <span class="upload-date font-mono text-muted text-xs">
                      {{ item.uploadedAt | date:'mediumDate' }}
                    </span>
                  </div>

                  <div class="material-card-body">
                    <h4 class="material-title" [title]="item.title">
                      {{ item.title }}
                    </h4>
                    @if (item.description) {
                      <p class="material-desc">{{ item.description }}</p>
                    } @else {
                      <p class="material-desc text-muted italic">No description provided.</p>
                    }
                  </div>

                  <div class="material-card-footer">
                    @if (item.isExternalLink) {
                      <a
                        [href]="item.resourceUrl"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="btn btn-secondary btn-xs action-btn"
                        title="Open external link"
                      >
                        <app-icon name="external" [size]="12"></app-icon>
                        <span>Open Link</span>
                      </a>
                    } @else {
                      <a
                        [href]="getDownloadUrl(item.materialId)"
                        target="_blank"
                        class="btn btn-primary btn-xs action-btn"
                        title="Download file"
                      >
                        <app-icon name="download" [size]="12"></app-icon>
                        <span>Download</span>
                      </a>
                    }

                    <button
                      class="btn btn-outline btn-xs delete-btn"
                      (click)="confirmDelete(item)"
                      [disabled]="deletingId() === item.materialId"
                      title="Delete material"
                    >
                      @if (deletingId() === item.materialId) {
                        <span class="spin-icon">&#9696;</span>
                      } @else {
                        <app-icon name="close" [size]="12"></app-icon>
                      }
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              }
            </div>
          }
        </div>
      }

      <!-- UPLOAD MATERIAL MODAL -->
      @if (showUploadModal()) {
        <div class="modal-overlay" (click)="closeUploadModal()">
          <div class="modal-dialog-clean" (click)="$event.stopPropagation()" role="dialog" aria-labelledby="upload-modal-title">
            <div class="modal-header-clean">
              <div class="modal-title-wrap">
                <span class="badge badge-teal badge-sm font-mono">RESOURCE UPLOADER</span>
                <h3 id="upload-modal-title">Upload Learning Material</h3>
                <p class="modal-sub">Publish study resources for {{ selectedClass()?.subjectCode }} ({{ selectedClass()?.subjectName }})</p>
              </div>
              <button class="btn-ghost" (click)="closeUploadModal()" aria-label="Close dialog">
                <app-icon name="close" [size]="16"></app-icon>
              </button>
            </div>

            <form (ngSubmit)="submitUpload()" class="modal-body-clean">
              <!-- Title Field -->
              <div class="form-group">
                <label class="form-label font-mono">RESOURCE TITLE <span class="text-danger">*</span></label>
                <input
                  type="text"
                  [(ngModel)]="uploadTitle"
                  name="title"
                  placeholder="e.g. Unit 3 Transformer Attention Mechanisms"
                  class="form-control"
                  required
                />
              </div>

              <!-- Material Type Dropdown -->
              <div class="form-group">
                <label class="form-label font-mono">RESOURCE CATEGORY</label>
                <select [(ngModel)]="uploadType" name="type" class="form-control">
                  <option value="AUTO">Auto Detect from File Extension</option>
                  <option value="PDF">PDF Document (.pdf)</option>
                  <option value="PRESENTATION">Slide Deck / Presentation (.ppt, .pptx)</option>
                  <option value="DOCUMENT">Word Document (.doc, .docx)</option>
                  <option value="OTHER">Image / Diagram / Other (.png, .jpg)</option>
                </select>
              </div>

              <!-- Description Field -->
              <div class="form-group">
                <label class="form-label font-mono">DESCRIPTION / LECTURE TOPIC</label>
                <textarea
                  [(ngModel)]="uploadDescription"
                  name="description"
                  rows="3"
                  placeholder="Summary of topics covered, chapter numbers, or reading references..."
                  class="form-control"
                ></textarea>
              </div>

              <!-- File Selection Input -->
              <div class="form-group">
                <label class="form-label font-mono">DOCUMENT FILE <span class="text-danger">* (MAX 25 MB)</span></label>
                <div class="file-drop-zone" [class.has-file]="!!selectedFile">
                  <input
                    type="file"
                    #fileInput
                    (change)="onFileSelected($event)"
                    accept=".pdf,.doc,.docx,.ppt,.pptx,.png,.jpg,.jpeg"
                    class="file-input-hidden"
                    id="material-file-upload"
                  />
                  <label for="material-file-upload" class="file-drop-label">
                    @if (selectedFile) {
                      <div class="selected-file-meta">
                        <app-icon name="badge-check" [size]="20" class="file-ok-icon"></app-icon>
                        <div class="file-text">
                          <span class="file-name font-bold">{{ selectedFile.name }}</span>
                          <span class="file-size font-mono text-muted">{{ formatFileSize(selectedFile.size) }}</span>
                        </div>
                        <span class="btn btn-secondary btn-xs">Change</span>
                      </div>
                    } @else {
                      <div class="empty-drop-meta">
                        <app-icon name="upload" [size]="24" class="upload-icon"></app-icon>
                        <span class="upload-instruction font-bold">Choose a file or click to browse</span>
                        <span class="upload-formats font-mono text-muted text-xs">PDF, DOC, DOCX, PPT, PPTX, PNG, JPG (up to 25MB)</span>
                      </div>
                    }
                  </label>
                </div>
              </div>

              @if (uploadError()) {
                <div class="modal-error font-mono">
                  {{ uploadError() }}
                </div>
              }

              <div class="modal-footer-clean">
                <button type="button" class="btn btn-secondary btn-sm" (click)="closeUploadModal()" [disabled]="uploading()">
                  Cancel
                </button>
                <button type="submit" class="btn btn-primary btn-sm" [disabled]="uploading() || !selectedFile">
                  @if (uploading()) {
                    <span class="spin-icon">&#9696;</span>
                    <span>Uploading Document...</span>
                  } @else {
                    <app-icon name="upload" [size]="13"></app-icon>
                    <span>Publish Material</span>
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- CONFIRM DELETE DIALOG -->
      @if (materialToDelete()) {
        <div class="modal-overlay" (click)="cancelDelete()">
          <div class="modal-dialog-clean confirm-box" (click)="$event.stopPropagation()" role="alertdialog">
            <div class="modal-header-clean">
              <div class="modal-title-wrap">
                <span class="badge badge-danger badge-sm font-mono">DELETE CONFIRMATION</span>
                <h3>Remove Learning Material?</h3>
              </div>
            </div>
            <div class="modal-body-clean">
              <p class="confirm-message">
                Are you sure you want to delete <strong>"{{ materialToDelete()?.title }}"</strong>?
                This will remove the file from storage and enrolled students will no longer be able to download it.
              </p>
            </div>
            <div class="modal-footer-clean">
              <button class="btn btn-secondary btn-sm" (click)="cancelDelete()" [disabled]="deletingId() !== null">
                Cancel
              </button>
              <button
                class="btn btn-danger btn-sm"
                (click)="executeDelete()"
                [disabled]="deletingId() !== null"
              >
                @if (deletingId() !== null) {
                  <span class="spin-icon">&#9696;</span>
                  <span>Deleting...</span>
                } @else {
                  <app-icon name="close" [size]="13"></app-icon>
                  <span>Confirm Delete</span>
                }
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .materials-page {
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

    /* Panel Card */
    .panel-card {
      overflow: hidden;
    }

    .panel-header {
      padding: 18px 24px;
      border-bottom: 1px solid var(--border-subtle);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      flex-wrap: wrap;
    }

    .panel-header-title {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .class-pill {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
    }

    .class-subject-title {
      font-weight: 600;
      color: var(--text-main);
    }

    .panel-title {
      font-size: 17px;
      font-weight: 700;
      color: var(--text-main);
    }

    .panel-actions {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    /* Filter Bar */
    .filter-bar {
      padding: 14px 24px;
      background: var(--bg-surface-subtle);
      border-bottom: 1px solid var(--border-subtle);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      flex-wrap: wrap;
    }

    .type-filter-group {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
    }

    .filter-tab-pill {
      padding: 5px 12px;
      border-radius: var(--radius-sm);
      font-size: 12.5px;
      font-weight: 600;
      color: var(--text-secondary);
      background: #FFFFFF;
      border: 1px solid var(--border-subtle);
      cursor: pointer;
      transition: all var(--transition-fast);
    }

    .filter-tab-pill:hover {
      border-color: var(--border-medium);
      color: var(--text-main);
    }

    .filter-tab-pill.active {
      background: var(--color-teal);
      color: #FFFFFF;
      border-color: var(--color-teal);
      box-shadow: var(--shadow-sm);
    }

    .search-input-wrap {
      display: flex;
      align-items: center;
      gap: 8px;
      background: #FFFFFF;
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      padding: 5px 12px;
      min-width: 260px;
    }

    .search-icon {
      color: var(--text-muted);
    }

    .search-input {
      border: none;
      outline: none;
      background: transparent;
      font-size: 13px;
      color: var(--text-main);
      width: 100%;
    }

    .clear-search-btn {
      background: none;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      font-size: 14px;
    }

    /* Materials Grid */
    .materials-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 18px;
      padding: 24px;
    }

    .materials-skeleton-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 18px;
      padding: 24px;
    }

    .item-card-skeleton {
      height: 180px;
      border-radius: var(--radius-lg);
    }

    .material-card {
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-lg);
      padding: 18px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      transition: all var(--transition-fast);
      box-shadow: var(--shadow-sm);
    }

    .material-card:hover {
      border-color: var(--border-medium);
      box-shadow: var(--shadow-card-hover);
      transform: translateY(-2px);
    }

    .material-card-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }

    .type-pdf {
      background: var(--color-danger-surface);
      color: var(--color-danger);
      border: 1px solid var(--color-danger-border);
    }

    .type-ppt {
      background: var(--color-warning-surface);
      color: var(--color-warning);
      border: 1px solid var(--color-warning-border);
    }

    .type-doc {
      background: var(--color-info-surface);
      color: var(--color-info);
      border: 1px solid var(--color-info-border);
    }

    .type-other {
      background: var(--bg-surface-subtle);
      color: var(--text-secondary);
      border: 1px solid var(--border-subtle);
    }

    .material-card-body {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .material-title {
      font-size: 14.5px;
      font-weight: 700;
      color: var(--text-main);
      line-height: 1.35;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .material-desc {
      font-size: 12.5px;
      color: var(--text-secondary);
      line-height: 1.45;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .material-card-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding-top: 12px;
      border-top: 1px solid var(--border-subtle);
    }

    .delete-btn {
      color: var(--color-danger);
      border-color: transparent;
    }

    .delete-btn:hover {
      background: var(--color-danger-surface);
      border-color: var(--color-danger-border);
    }

    .empty-materials-state {
      padding: 56px 24px;
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

    .error-sub-banner {
      padding: 18px 24px;
      color: var(--color-danger);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }

    /* File Drop Zone */
    .file-drop-zone {
      border: 2px dashed var(--border-subtle);
      border-radius: var(--radius-md);
      background: var(--bg-surface-subtle);
      transition: all var(--transition-fast);
      cursor: pointer;
    }

    .file-drop-zone:hover,
    .file-drop-zone.has-file {
      border-color: var(--color-teal);
      background: var(--color-teal-surface);
    }

    .file-input-hidden {
      display: none;
    }

    .file-drop-label {
      padding: 24px 20px;
      display: block;
      cursor: pointer;
      text-align: center;
    }

    .empty-drop-meta {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
    }

    .upload-icon {
      color: var(--color-teal);
      margin-bottom: 2px;
    }

    .upload-instruction {
      font-size: 13.5px;
      color: var(--text-main);
    }

    .selected-file-meta {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      text-align: left;
    }

    .file-ok-icon {
      color: var(--color-teal);
    }

    .file-text {
      flex: 1;
      display: flex;
      flex-direction: column;
    }

    .file-name {
      font-size: 13.5px;
      color: var(--text-main);
    }

    .file-size {
      font-size: 11.5px;
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

    .confirm-box {
      max-width: 440px;
    }

    .confirm-message {
      font-size: 13.5px;
      color: var(--text-secondary);
      line-height: 1.5;
    }

    .spin-icon {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      100% { transform: rotate(360deg); }
    }
  `]
})
export class FacultyMaterialsComponent implements OnInit {
  private readonly facultyService = inject(FacultyService);
  private readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute);

  readonly assignedClasses = signal<FacultyAssignedClass[]>([]);
  readonly selectedClass = signal<FacultyAssignedClass | null>(null);
  readonly classesLoading = signal<boolean>(false);
  readonly classesError = signal<string | null>(null);

  readonly materials = signal<FacultyLearningMaterialItem[]>([]);
  readonly materialsLoading = signal<boolean>(false);
  readonly materialsError = signal<string | null>(null);

  readonly selectedType = signal<string>('ALL');
  searchQuery = '';

  // Upload modal state
  readonly showUploadModal = signal<boolean>(false);
  readonly uploading = signal<boolean>(false);
  readonly uploadError = signal<string | null>(null);

  uploadTitle = '';
  uploadType = 'AUTO';
  uploadDescription = '';
  selectedFile: File | null = null;

  // Delete state
  readonly materialToDelete = signal<FacultyLearningMaterialItem | null>(null);
  readonly deletingId = signal<string | null>(null);

  readonly filteredMaterials = computed(() => {
    let list = this.materials();
    const type = this.selectedType();
    if (type !== 'ALL') {
      list = list.filter((m) => m.materialType.toUpperCase() === type.toUpperCase());
    }
    const q = this.searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter((m) => 
        m.title.toLowerCase().includes(q) || 
        (m.description && m.description.toLowerCase().includes(q))
      );
    }
    return list;
  });

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
    this.loadMaterials(cls.facultyAssignmentId);
  }

  loadMaterials(facultyAssignmentId: string): void {
    this.materialsLoading.set(true);
    this.materialsError.set(null);

    this.facultyService.getClassMaterials(facultyAssignmentId).subscribe({
      next: (res) => {
        this.materials.set(res.materials);
        this.materialsLoading.set(false);
      },
      error: (err) => {
        this.materialsLoading.set(false);
        this.materialsError.set(err.message || 'Could not load class materials.');
      }
    });
  }

  openUploadModal(): void {
    this.uploadTitle = '';
    this.uploadType = 'AUTO';
    this.uploadDescription = '';
    this.selectedFile = null;
    this.uploadError.set(null);
    this.showUploadModal.set(true);
  }

  closeUploadModal(): void {
    this.showUploadModal.set(false);
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      const maxBytes = 25 * 1024 * 1024;
      if (file.size > maxBytes) {
        this.uploadError.set('Selected file exceeds maximum allowed limit of 25 MB.');
        this.selectedFile = null;
        return;
      }
      this.selectedFile = file;
      this.uploadError.set(null);

      if (!this.uploadTitle.trim()) {
        const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
        this.uploadTitle = baseName.replace(/[-_]/g, ' ');
      }
    }
  }

  submitUpload(): void {
    const cls = this.selectedClass();
    if (!cls) return;

    if (!this.uploadTitle.trim()) {
      this.uploadError.set('Material title is required.');
      return;
    }

    if (!this.selectedFile) {
      this.uploadError.set('Please select a file to upload.');
      return;
    }

    this.uploading.set(true);
    this.uploadError.set(null);

    const formData = new FormData();
    formData.append('title', this.uploadTitle.trim());
    if (this.uploadDescription.trim()) {
      formData.append('description', this.uploadDescription.trim());
    }
    if (this.uploadType !== 'AUTO') {
      formData.append('materialType', this.uploadType);
    }
    formData.append('file', this.selectedFile);

    this.facultyService.uploadMaterial(cls.facultyAssignmentId, formData).subscribe({
      next: (created) => {
        this.uploading.set(false);
        this.showUploadModal.set(false);
        this.toast.success(`Resource "${created.title}" published successfully.`);
        this.loadMaterials(cls.facultyAssignmentId);
      },
      error: (err) => {
        this.uploading.set(false);
        this.uploadError.set(err.message || 'Failed to upload learning material.');
      }
    });
  }

  confirmDelete(item: FacultyLearningMaterialItem): void {
    this.materialToDelete.set(item);
  }

  cancelDelete(): void {
    this.materialToDelete.set(null);
  }

  executeDelete(): void {
    const item = this.materialToDelete();
    if (!item) return;

    this.deletingId.set(item.materialId);

    this.facultyService.deleteMaterial(item.materialId).subscribe({
      next: () => {
        this.deletingId.set(null);
        this.materialToDelete.set(null);
        this.toast.success(`"${item.title}" was deleted.`);
        
        this.materials.update((list) => list.filter((m) => m.materialId !== item.materialId));
      },
      error: (err) => {
        this.deletingId.set(null);
        this.toast.error(err.message || 'Failed to delete learning material.');
      }
    });
  }

  getDownloadUrl(materialId: string): string {
    return this.facultyService.getMaterialDownloadUrl(materialId);
  }

  getTypeBadgeClass(type: string): string {
    switch (type.toUpperCase()) {
      case 'PDF': return 'type-pdf';
      case 'PRESENTATION': return 'type-ppt';
      case 'DOCUMENT': return 'type-doc';
      default: return 'type-other';
    }
  }

  formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
}
