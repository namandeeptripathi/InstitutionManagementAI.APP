import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LearningMaterialsService } from '../../core/services/learning-materials.service';
import { LearningMaterial } from '../../core/models/student.models';
import { IconComponent } from '../../shared/components/icon.component';

@Component({
  selector: 'app-learning-materials',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  template: `
    <div class="materials-page">
      <!-- Page Header -->
      <div class="page-header-clean">
        <div>
          <h2 class="page-title">Learning Materials & Repository</h2>
          <p class="page-subtitle">
            Syllabus resources, lecture slides, and academic reference documents
            @if (materials().length > 0) {
              <span class="header-count font-mono">&bull; {{ filteredMaterials().length }} available</span>
            }
          </p>
        </div>

        <div class="header-controls">
          <div class="search-box-clean">
            <app-icon name="search" [size]="15" class="search-icon"></app-icon>
            <input 
              type="text" 
              [ngModel]="searchQuery()"
              (ngModelChange)="searchQuery.set($event)"
              placeholder="Search by title, subject, or code..." 
              class="search-input"
            />
            @if (searchQuery()) {
              <button class="clear-btn" (click)="searchQuery.set('')" title="Clear search">✕</button>
            }
          </div>

          <button class="btn btn-secondary btn-sm" (click)="loadMaterials()" title="Refresh Materials">
            <app-icon name="refresh" [size]="14"></app-icon> Refresh
          </button>
        </div>
      </div>

      <!-- Type Filter Pills -->
      @if (availableTypes().length > 1) {
        <div class="type-filters">
          <button 
            class="filter-pill" 
            [class.active]="selectedType() === 'ALL'" 
            (click)="selectedType.set('ALL')">
            All Types ({{ materials().length }})
          </button>
          @for (type of availableTypes(); track type) {
            <button 
              class="filter-pill" 
              [class.active]="selectedType() === type" 
              (click)="selectedType.set(type)">
              {{ type }}
            </button>
          }
        </div>
      }

      <!-- Loading State -->
      @if (loading()) {
        <div class="skeleton-grid">
          <div class="skeleton item-skeleton" *ngFor="let i of [1, 2]"></div>
        </div>
      }

      <!-- Error State -->
      @else if (errorMessage()) {
        <div class="error-banner card-modern" role="alert">
          <div class="error-icon-wrap">
            <app-icon name="alert" [size]="24"></app-icon>
          </div>
          <div class="error-text">
            <h3 class="error-title">Unable to Load Learning Materials</h3>
            <p class="error-desc">{{ errorMessage() }}</p>
            <p class="error-hint">Ensure the backend API at <code>http://localhost:5083</code> is active with PostgreSQL.</p>
          </div>
          <button class="btn btn-primary btn-sm" (click)="loadMaterials()">
            <app-icon name="refresh" [size]="14"></app-icon> Retry
          </button>
        </div>
      }

      <!-- Empty State -->
      @else if (filteredMaterials().length === 0) {
        <div class="card-modern empty-state-box">
          <app-icon name="materials" [size]="40" class="empty-icon"></app-icon>
          <h3 class="empty-title">No Learning Materials Found</h3>
          <p class="empty-desc">
            @if (searchQuery() || selectedType() !== 'ALL') {
              No resources matched your current filter criteria.
            } @else {
              No course documents or reference files have been uploaded by faculty yet.
            }
          </p>
          @if (searchQuery() || selectedType() !== 'ALL') {
            <button class="btn btn-secondary btn-sm" (click)="resetFilters()">Reset Filters</button>
          } @else {
            <button class="btn btn-secondary btn-sm" (click)="loadMaterials()">
              <app-icon name="refresh" [size]="14"></app-icon> Check Again
            </button>
          }
        </div>
      }

      <!-- Materials Grid -->
      @else {
        <div class="materials-grid">
          @for (item of filteredMaterials(); track item.materialId) {
            <div class="card-modern material-card">
              <div class="material-card-body">
                <div class="material-card-top">
                  <div class="tag-group">
                    <span class="type-badge font-mono" [class.type-pdf]="item.materialType.toUpperCase() === 'PDF'">
                      {{ item.materialType || 'RESOURCE' }}
                    </span>
                    <span class="subject-badge font-mono">{{ item.subjectCode }}</span>
                  </div>

                  <div class="academic-meta font-mono">
                    Sem {{ item.semester }} &bull; AY {{ item.academicYear }}
                  </div>
                </div>

                <div class="material-content">
                  <h3 class="material-title">{{ item.title }}</h3>
                  <span class="subject-name-tag">{{ item.subjectName }}</span>
                  <p class="material-desc">{{ item.description }}</p>
                </div>
              </div>

              <div class="material-card-footer">
                <div class="footer-date">
                  <app-icon name="clock" [size]="12"></app-icon>
                  <span>Published {{ item.uploadedAt | date:'mediumDate' }}</span>
                </div>

                @if (isValidUrl(item.resourceUrl)) {
                  <a 
                    [href]="item.resourceUrl" 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    class="btn btn-secondary btn-sm link-btn"
                    title="Open resource in new browser tab">
                    <app-icon name="external" [size]="13"></app-icon>
                    Open Link
                  </a>
                } @else {
                  <button 
                    type="button"
                    (click)="downloadMaterial(item)" 
                    [disabled]="downloadingId() === item.materialId"
                    class="btn btn-primary btn-sm link-btn"
                    title="Download course document via authenticated session">
                    @if (downloadingId() === item.materialId) {
                      <app-icon name="refresh" [size]="13" class="spinning"></app-icon>
                      <span>Downloading...</span>
                    } @else {
                      <app-icon name="download" [size]="13"></app-icon>
                      <span>Download File</span>
                    }
                  </button>
                }
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .materials-page {
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

    .header-count {
      color: var(--color-teal);
      font-weight: 600;
    }

    .header-controls {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }

    .search-box-clean {
      position: relative;
      display: flex;
      align-items: center;
    }

    .search-icon {
      position: absolute;
      left: 11px;
      color: var(--text-muted);
      pointer-events: none;
    }

    .search-input {
      width: 270px;
      padding: 8px 30px 8px 34px;
      font-size: 13px;
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      color: var(--text-main);
      box-shadow: var(--shadow-sm);
      outline: none;
      transition: all var(--transition-fast);
    }

    .search-input:focus {
      border-color: var(--color-teal);
      box-shadow: 0 0 0 3px rgba(15, 118, 110, 0.12);
    }

    .clear-btn {
      position: absolute;
      right: 9px;
      background: transparent;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      font-size: 11px;
    }

    .type-filters {
      display: flex;
      gap: 4px;
      background: var(--bg-surface-subtle);
      border: 1px solid var(--border-subtle);
      padding: 2px;
      border-radius: var(--radius-md);
      width: fit-content;
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

    .skeleton-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
    }

    .item-skeleton {
      height: 180px;
      border-radius: var(--radius-lg);
    }

    /* Materials Grid */
    .materials-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
    }

    .material-card {
      padding: 20px 22px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }

    .material-card-body {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .material-card-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }

    .tag-group {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .type-badge {
      display: inline-block;
      padding: 2px 7px;
      background: var(--bg-surface-subtle);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-xs);
      font-size: 10.5px;
      font-weight: 700;
      color: var(--text-secondary);
    }

    .type-badge.type-pdf {
      background: var(--color-danger-surface);
      border-color: var(--color-danger-border);
      color: var(--color-danger);
    }

    .subject-badge {
      display: inline-block;
      padding: 2px 7px;
      background: var(--color-teal-surface);
      border: 1px solid var(--color-teal-border);
      border-radius: var(--radius-xs);
      font-size: 10.5px;
      font-weight: 700;
      color: var(--color-teal);
    }

    .academic-meta {
      font-size: 11px;
      color: var(--text-muted);
    }

    .material-content {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .material-title {
      font-size: 16px;
      font-weight: 700;
      color: var(--text-main);
      line-height: 1.3;
    }

    .subject-name-tag {
      font-size: 12px;
      font-weight: 600;
      color: var(--color-teal);
    }

    .material-desc {
      font-size: 12.5px;
      color: var(--text-secondary);
      line-height: 1.45;
      margin-top: 4px;
    }

    .material-card-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-top: 1px solid var(--border-subtle);
      padding-top: 12px;
      margin-top: 14px;
      gap: 10px;
    }

    .footer-date {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 11.5px;
      color: var(--text-muted);
    }

    .link-btn {
      white-space: nowrap;
    }

    .spinning {
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

    @media (max-width: 900px) {
      .materials-grid,
      .skeleton-grid {
        grid-template-columns: 1fr;
      }
      .search-input {
        width: 100%;
      }
      .header-controls {
        width: 100%;
      }
    }
  `]
})
export class LearningMaterialsComponent implements OnInit {
  private readonly materialsService = inject(LearningMaterialsService);

  materials = signal<LearningMaterial[]>([]);
  loading = signal<boolean>(true);
  errorMessage = signal<string | null>(null);
  downloadingId = signal<string | null>(null);

  searchQuery = signal<string>('');
  selectedType = signal<string>('ALL');

  availableTypes = computed(() => {
    const types = new Set<string>();
    for (const m of this.materials()) {
      if (m.materialType) types.add(m.materialType.toUpperCase());
    }
    return Array.from(types);
  });

  filteredMaterials = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const type = this.selectedType();
    let list = this.materials();

    if (type !== 'ALL') {
      list = list.filter(m => (m.materialType || '').toUpperCase() === type);
    }

    if (q) {
      list = list.filter(m => 
        m.title.toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q) ||
        m.subjectName.toLowerCase().includes(q) ||
        m.subjectCode.toLowerCase().includes(q)
      );
    }

    return list;
  });

  ngOnInit(): void {
    this.loadMaterials();
  }

  loadMaterials(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.materialsService.getMaterials().subscribe({
      next: (res) => {
        this.materials.set(res?.materials || []);
        this.loading.set(false);
      },
      error: (err) => {
        this.errorMessage.set(err.message || 'Failed to load learning materials.');
        this.loading.set(false);
      }
    });
  }

  resetFilters(): void {
    this.searchQuery.set('');
    this.selectedType.set('ALL');
  }

  isValidUrl(url: string | null | undefined): boolean {
    if (!url) return false;
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }

  getDownloadUrl(item: LearningMaterial): string {
    return this.materialsService.getMaterialDownloadUrl(item.materialId);
  }

  downloadMaterial(item: LearningMaterial): void {
    if (this.downloadingId()) return;
    this.downloadingId.set(item.materialId);

    this.materialsService.downloadMaterial(item.materialId).subscribe({
      next: (response) => {
        this.downloadingId.set(null);
        const blob = response.body;
        if (!blob) {
          this.errorMessage.set('Downloaded file was empty.');
          return;
        }

        // Determine filename from Content-Disposition header if available
        let filename = '';
        const disposition = response.headers.get('content-disposition');
        if (disposition) {
          const match = /filename\*?=['"]?(?:UTF-\d['"]*)?([^;\r\n"']*)['"]?/i.exec(disposition);
          if (match && match[1]) {
            filename = decodeURIComponent(match[1].trim());
          }
        }

        if (!filename) {
          filename = item.title?.trim() || 'learning-material';
          if (!filename.toLowerCase().endsWith('.pdf') && item.materialType?.toUpperCase() === 'PDF') {
            filename += '.pdf';
          }
        }

        // Trigger browser download via object URL
        const objectUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = objectUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(objectUrl);
      },
      error: async (err) => {
        this.downloadingId.set(null);
        let errorMsg = 'Failed to download learning material.';
        if (err.error instanceof Blob) {
          try {
            const text = await err.error.text();
            const json = JSON.parse(text);
            errorMsg = json.message || errorMsg;
          } catch {
            // Error was not JSON
          }
        } else if (err.error?.message) {
          errorMsg = err.error.message;
        } else if (err.message) {
          errorMsg = err.message;
        }
        this.errorMessage.set(errorMsg);
      }
    });
  }
}
