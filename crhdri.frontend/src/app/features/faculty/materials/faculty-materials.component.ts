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
      <div class="page-header card-tactile">
        <div class="header-titles">
          <div class="badge-row">
            <span class="badge badge-sage">COURSE REPOSITORY</span>
            <span class="meta-dot">&bull;</span>
            <span class="meta-year font-mono">AY 2026-2027</span>
          </div>
          <h2 class="page-title font-editorial">Learning Materials Repository</h2>
          <p class="page-subtitle">
            Upload lecture notes, presentations, syllabi, and reference documents for your instructional cohorts.
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
        <!-- Content Panel -->
        <div class="card-tactile panel-card">
          <!-- Panel Header & Action Bar -->
          <div class="panel-header">
            <div class="panel-header-title">
              <div class="class-pill">
                <span class="font-mono font-bold">{{ selectedClass()?.subjectCode }}</span>
                <span>{{ selectedClass()?.subjectName }}</span>
                <span class="meta-dot">&bull;</span>
                <span>{{ selectedClass()?.courseName }} (Sem {{ selectedClass()?.semester }})</span>
              </div>
              <h3 class="panel-title font-editorial">Class Resources & Reference Files</h3>
            </div>

            <div class="panel-actions">
              <button class="btn btn-secondary btn-sm" (click)="loadMaterials(selectedClass()!.facultyAssignmentId)" title="Refresh list">
                <app-icon name="refresh" [size]="15"></app-icon>
                Refresh
              </button>
              <button class="btn btn-primary btn-sm" (click)="openUploadModal()" title="Upload new course document">
                <app-icon name="upload" [size]="15"></app-icon>
                Upload Resource
              </button>
            </div>
          </div>

          <!-- Filter & Search Bar -->
          <div class="filter-bar">
            <div class="type-filter-group">
              <button
                class="filter-tab"
                [class.active]="selectedType() === 'ALL'"
                (click)="selectedType.set('ALL')"
              >
                All ({{ materials().length }})
              </button>
              <button
                class="filter-tab"
                [class.active]="selectedType() === 'PDF'"
                (click)="selectedType.set('PDF')"
              >
                PDF
              </button>
              <button
                class="filter-tab"
                [class.active]="selectedType() === 'DOCUMENT'"
                (click)="selectedType.set('DOCUMENT')"
              >
                Documents
              </button>
              <button
                class="filter-tab"
                [class.active]="selectedType() === 'PRESENTATION'"
                (click)="selectedType.set('PRESENTATION')"
              >
                Slides
              </button>
              <button
                class="filter-tab"
                [class.active]="selectedType() === 'OTHER'"
                (click)="selectedType.set('OTHER')"
              >
                Other
              </button>
            </div>

            <div class="search-wrap">
              <app-icon name="search" [size]="14" class="search-icon"></app-icon>
              <input
                type="text"
                [(ngModel)]="searchQuery"
                placeholder="Search resources by title..."
                class="search-input"
              />
              @if (searchQuery) {
                <button class="clear-search-btn" (click)="searchQuery = ''">✕</button>
              }
            </div>
          </div>

          <!-- Materials List / Grid -->
          @if (materialsLoading()) {
            <div class="loading-state">
              <div class="spinner"></div>
              <p>Loading course resources...</p>
            </div>
          } @else if (materialsError()) {
            <div class="alert-box alert-error">
              <p>{{ materialsError() }}</p>
              <button class="btn btn-secondary btn-sm" (click)="loadMaterials(selectedClass()!.facultyAssignmentId)">
                Retry
              </button>
            </div>
          } @else if (filteredMaterials().length === 0) {
            <div class="empty-state card-tactile">
              <app-icon name="materials" [size]="48"></app-icon>
              <h4>No Learning Materials Found</h4>
              <p>
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
                <div class="material-card card-tactile">
                  <div class="material-card-top">
                    <span class="type-pill font-mono" [ngClass]="getTypeBadgeClass(item.materialType)">
                      {{ item.materialType }}
                    </span>
                    <span class="upload-date font-mono">
                      {{ item.uploadedAt | date:'mediumDate' }}
                    </span>
                  </div>

                  <div class="material-card-body">
                    <h4 class="material-title font-editorial" [title]="item.title">
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
                        <app-icon name="external" [size]="13"></app-icon>
                        <span>Open Link</span>
                      </a>
                    } @else {
                      <a
                        [href]="getDownloadUrl(item.materialId)"
                        target="_blank"
                        class="btn btn-primary btn-xs action-btn"
                        title="Download file"
                      >
                        <app-icon name="download" [size]="13"></app-icon>
                        <span>Download</span>
                      </a>
                    }

                    <button
                      class="btn btn-danger-outline btn-xs delete-btn"
                      (click)="confirmDelete(item)"
                      [disabled]="deletingId() === item.materialId"
                      title="Delete material"
                    >
                      @if (deletingId() === item.materialId) {
                        <span class="btn-spinner"></span>
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
        </div>
      }

      <!-- UPLOAD MATERIAL MODAL -->
      @if (showUploadModal()) {
        <div class="modal-backdrop" (click)="closeUploadModal()">
          <div class="modal-box card-tactile" (click)="$event.stopPropagation()" role="dialog" aria-labelledby="upload-modal-title">
            <div class="modal-header">
              <div class="modal-title-wrap">
                <span class="badge badge-sage font-mono">RESOURCE UPLOADER</span>
                <h3 id="upload-modal-title" class="modal-title font-editorial">Upload Learning Material</h3>
                <p class="modal-subtitle">Publish study resources for {{ selectedClass()?.subjectCode }} ({{ selectedClass()?.subjectName }})</p>
              </div>
              <button class="modal-close-btn" (click)="closeUploadModal()" aria-label="Close dialog">
                <app-icon name="close" [size]="18"></app-icon>
              </button>
            </div>

            <form (ngSubmit)="submitUpload()" class="modal-form">
              <!-- Title Field -->
              <div class="form-group">
                <label class="form-label font-mono">RESOURCE TITLE <span class="required">*</span></label>
                <input
                  type="text"
                  [(ngModel)]="uploadTitle"
                  name="title"
                  placeholder="e.g. Unit 3 Transformer Attention Mechanisms"
                  class="form-input"
                  required
                />
              </div>

              <!-- Material Type Dropdown -->
              <div class="form-group">
                <label class="form-label font-mono">RESOURCE CATEGORY</label>
                <select [(ngModel)]="uploadType" name="type" class="form-input font-mono">
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
                  class="form-textarea"
                ></textarea>
              </div>

              <!-- File Selection Input -->
              <div class="form-group">
                <label class="form-label font-mono">DOCUMENT FILE <span class="required">* (MAX 25 MB)</span></label>
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
                        <app-icon name="check" [size]="20" class="file-ok-icon"></app-icon>
                        <div class="file-text">
                          <span class="file-name font-bold">{{ selectedFile.name }}</span>
                          <span class="file-size font-mono text-muted">{{ formatFileSize(selectedFile.size) }}</span>
                        </div>
                        <span class="change-file-tag">Change</span>
                      </div>
                    } @else {
                      <div class="empty-drop-meta">
                        <app-icon name="upload" [size]="24" class="upload-icon"></app-icon>
                        <span class="upload-instruction font-bold">Choose a file or drag & drop</span>
                        <span class="upload-formats font-mono text-muted">Supported: PDF, DOC, DOCX, PPT, PPTX, PNG, JPG</span>
                      </div>
                    }
                  </label>
                </div>
              </div>

              @if (uploadError()) {
                <div class="modal-error font-mono">
                  <app-icon name="alert" [size]="14"></app-icon>
                  <span>{{ uploadError() }}</span>
                </div>
              }

              <div class="modal-actions">
                <button type="button" class="btn btn-secondary" (click)="closeUploadModal()" [disabled]="uploading()">
                  Cancel
                </button>
                <button type="submit" class="btn btn-primary" [disabled]="uploading() || !selectedFile">
                  @if (uploading()) {
                    <span class="btn-spinner"></span>
                    <span>Uploading Document...</span>
                  } @else {
                    <app-icon name="upload" [size]="15"></app-icon>
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
        <div class="modal-backdrop" (click)="cancelDelete()">
          <div class="modal-box card-tactile confirm-box" (click)="$event.stopPropagation()" role="alertdialog">
            <div class="modal-header">
              <div class="modal-title-wrap">
                <span class="badge badge-rose font-mono">DELETE CONFIRMATION</span>
                <h3 class="modal-title font-editorial">Remove Learning Material?</h3>
              </div>
            </div>
            <p class="confirm-message">
              Are you sure you want to delete <strong>"{{ materialToDelete()?.title }}"</strong>?
              This will remove the file from storage and enrolled students will no longer be able to download it.
            </p>
            <div class="modal-actions">
              <button class="btn btn-secondary" (click)="cancelDelete()" [disabled]="deletingId() !== null">
                Cancel
              </button>
              <button class="btn btn-danger" (click)="executeDelete()" [disabled]="deletingId() !== null">
                @if (deletingId() !== null) {
                  <span class="btn-spinner"></span>
                  <span>Deleting...</span>
                } @else {
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

    /* Content Panel */
    .panel-card {
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
      min-height: 520px;
    }

    .panel-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 1rem;
      flex-wrap: wrap;
      padding-bottom: 1rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    }

    .class-pill {
      font-size: 0.8rem;
      color: #94a3b8;
      background: rgba(255, 255, 255, 0.03);
      padding: 0.3rem 0.65rem;
      border-radius: 6px;
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      margin-bottom: 0.4rem;
    }

    .panel-title {
      font-size: 1.35rem;
      font-weight: 600;
      color: #f1f5f9;
      margin: 0;
    }

    .panel-actions {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    /* Filter Bar */
    .filter-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1rem;
    }

    .type-filter-group {
      display: flex;
      gap: 0.35rem;
      background: rgba(0, 0, 0, 0.25);
      padding: 0.25rem;
      border-radius: 6px;
    }

    .filter-tab {
      background: transparent;
      border: none;
      color: #94a3b8;
      font-size: 0.775rem;
      font-weight: 600;
      padding: 0.35rem 0.65rem;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .filter-tab:hover {
      color: #f1f5f9;
    }

    .filter-tab.active {
      background: rgba(255, 255, 255, 0.08);
      color: #ffffff;
    }

    .search-wrap {
      position: relative;
      display: flex;
      align-items: center;
    }

    .search-icon {
      position: absolute;
      left: 0.65rem;
      color: #64748b;
      pointer-events: none;
    }

    .search-input {
      padding: 0.45rem 1.8rem 0.45rem 2rem;
      background: rgba(0, 0, 0, 0.35);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 6px;
      color: #f8fafc;
      font-size: 0.825rem;
      width: 240px;
    }

    .search-input:focus {
      outline: none;
      border-color: #2563eb;
    }

    .clear-search-btn {
      position: absolute;
      right: 0.5rem;
      background: transparent;
      border: none;
      color: #64748b;
      cursor: pointer;
      font-size: 0.75rem;
    }

    /* Materials Grid */
    .materials-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 1.25rem;
    }

    .material-card {
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: 1rem;
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.06);
      transition: transform 0.2s ease, border-color 0.2s ease;
    }

    .material-card:hover {
      transform: translateY(-2px);
      border-color: rgba(255, 255, 255, 0.14);
      background: rgba(255, 255, 255, 0.035);
    }

    .material-card-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .type-pill {
      font-size: 0.675rem;
      font-weight: 700;
      padding: 0.15rem 0.5rem;
      border-radius: 4px;
      letter-spacing: 0.04em;
    }

    .type-pdf { background: rgba(244, 63, 94, 0.12); color: #f43f5e; border: 1px solid rgba(244, 63, 94, 0.25); }
    .type-doc { background: rgba(59, 130, 246, 0.12); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.25); }
    .type-ppt { background: rgba(245, 158, 11, 0.12); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.25); }
    .type-other { background: rgba(45, 212, 191, 0.12); color: #2dd4bf; border: 1px solid rgba(45, 212, 191, 0.25); }

    .upload-date {
      font-size: 0.725rem;
      color: #64748b;
    }

    .material-title {
      font-size: 1.05rem;
      font-weight: 600;
      color: #f8fafc;
      margin: 0.4rem 0 0.35rem 0;
      line-height: 1.35;
    }

    .material-desc {
      font-size: 0.825rem;
      color: #94a3b8;
      margin: 0;
      line-height: 1.45;
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .material-card-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 0.5rem;
      padding-top: 0.75rem;
      border-top: 1px solid rgba(255, 255, 255, 0.05);
    }

    .action-btn {
      flex: 1;
      text-decoration: none;
    }

    .btn-danger-outline {
      background: transparent;
      border: 1px solid rgba(244, 63, 94, 0.3);
      color: #f43f5e;
    }

    .btn-danger-outline:hover:not(:disabled) {
      background: rgba(244, 63, 94, 0.15);
      border-color: #f43f5e;
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

    .badge-rose {
      background: rgba(244, 63, 94, 0.1);
      color: #f43f5e;
      border: 1px solid rgba(244, 63, 94, 0.25);
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
      padding: 0.35rem 0.65rem;
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

    .btn-secondary {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #cbd5e1;
    }

    .btn-secondary:hover:not(:disabled) {
      background: rgba(255, 255, 255, 0.08);
      color: #ffffff;
    }

    .btn-danger {
      background: #e11d48;
      color: #ffffff;
    }

    .btn-danger:hover:not(:disabled) {
      background: #be123c;
    }

    .btn-spinner {
      width: 12px;
      height: 12px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top-color: #ffffff;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    /* Modals */
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
      max-width: 520px;
      background: #11151e;
      border: 1px solid rgba(255, 255, 255, 0.12);
      padding: 1.75rem;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
      animation: modalIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .confirm-box {
      max-width: 440px;
    }

    .confirm-message {
      font-size: 0.875rem;
      color: #cbd5e1;
      line-height: 1.5;
      margin: 0;
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

    /* File Drop Zone */
    .file-drop-zone {
      border: 2px dashed rgba(255, 255, 255, 0.15);
      border-radius: 8px;
      padding: 1rem;
      text-align: center;
      background: rgba(0, 0, 0, 0.25);
      cursor: pointer;
      transition: border-color 0.2s ease, background 0.2s ease;
    }

    .file-drop-zone:hover {
      border-color: #2563eb;
      background: rgba(37, 99, 235, 0.04);
    }

    .file-drop-zone.has-file {
      border-color: #10b981;
      background: rgba(16, 185, 129, 0.04);
    }

    .file-input-hidden {
      display: none;
    }

    .file-drop-label {
      cursor: pointer;
      display: block;
    }

    .empty-drop-meta {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.35rem;
    }

    .upload-icon {
      color: #3b82f6;
      margin-bottom: 0.25rem;
    }

    .upload-instruction {
      font-size: 0.85rem;
      color: #f1f5f9;
    }

    .upload-formats {
      font-size: 0.725rem;
    }

    .selected-file-meta {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      padding: 0.25rem 0.5rem;
    }

    .file-ok-icon {
      color: #10b981;
    }

    .file-text {
      display: flex;
      flex-direction: column;
      text-align: left;
    }

    .file-name {
      font-size: 0.85rem;
      color: #f8fafc;
      word-break: break-all;
    }

    .file-size {
      font-size: 0.725rem;
    }

    .change-file-tag {
      font-size: 0.75rem;
      color: #3b82f6;
      font-weight: 600;
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

    /* Empty, Loading, and Skeleton states */
    .empty-state {
      padding: 3.5rem 1.5rem;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.75rem;
      color: #64748b;
    }

    .empty-state h4 {
      font-size: 1.15rem;
      color: #e2e8f0;
      margin: 0;
    }

    .empty-state p {
      font-size: 0.85rem;
      max-width: 420px;
      margin: 0;
      line-height: 1.5;
    }

    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 3.5rem;
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

      // Auto-populate title if empty
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
        
        // Remove locally
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
