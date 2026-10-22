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
      <!-- Header -->
      <div class="page-header">
        <div>
          <h2 class="page-title font-editorial">Learning Materials & Repository</h2>
          <p class="page-subtitle">
            Syllabus resources, lecture slides, and academic reference documents
            @if (materials().length > 0) {
              <span class="header-count font-mono">&bull; {{ filteredMaterials().length }} available</span>
            }
          </p>
        </div>

        <div class="header-controls">
          <div class="search-box">
            <app-icon name="search" [size]="16" class="search-icon"></app-icon>
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

      <!-- Filter Tabs / Pills (shown if multiple types exist) -->
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
        <div class="error-banner card-tactile" role="alert">
          <div class="error-icon-wrap">
            <app-icon name="alert" [size]="28"></app-icon>
          </div>
          <div class="error-text">
            <h3 class="error-title">Unable to Load Learning Materials</h3>
            <p class="error-desc">{{ errorMessage() }}</p>
            <p class="error-hint">Ensure the backend API at <code>http://localhost:5083</code> is running with PostgreSQL.</p>
          </div>
          <button class="btn btn-primary" (click)="loadMaterials()">
            <app-icon name="refresh" [size]="16"></app-icon>
            Retry Connection
          </button>
        </div>
      }

      <!-- Empty State -->
      @else if (filteredMaterials().length === 0) {
        <div class="card-tactile empty-state">
          <app-icon name="materials" [size]="48" class="empty-icon"></app-icon>
          <h3 class="font-editorial empty-title">No Learning Materials Found</h3>
          <p class="empty-desc">
            @if (searchQuery() || selectedType() !== 'ALL') {
              No resources matched your current filter criteria.
            } @else {
              No course documents or reference files have been uploaded by faculty yet.
            }
          </p>
          @if (searchQuery() || selectedType() !== 'ALL') {
            <button class="btn btn-secondary" (click)="resetFilters()">Reset All Filters</button>
          } @else {
            <button class="btn btn-secondary" (click)="loadMaterials()">
              <app-icon name="refresh" [size]="14"></app-icon> Check Again
            </button>
          }
        </div>
      }

      <!-- Materials Grid -->
      @else {
        <div class="materials-grid">
          @for (item of filteredMaterials(); track item.materialId) {
            <div class="card-tactile material-card">
              <div>
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

                <div class="material-card-content">
                  <h3 class="material-title font-editorial">{{ item.title }}</h3>
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
                    <app-icon name="external" [size]="14"></app-icon>
                    Open Resource
                  </a>
                } @else {
                  <a 
                    [href]="getDownloadUrl(item)" 
                    target="_blank"
                    class="btn btn-primary btn-sm link-btn"
                    title="Download course document">
                    <app-icon name="download" [size]="14"></app-icon>
                    Download File
                  </a>
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
      margin-top: 2px;
    }

    .header-count {
      color: var(--color-forest);
      font-weight: 600;
    }

    .header-controls {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }

    .search-box {
      position: relative;
      display: flex;
      align-items: center;
    }

    .search-icon {
      position: absolute;
      left: 12px;
      color: var(--text-muted);
      pointer-events: none;
    }

    .search-input {
      width: 290px;
      padding: 9px 34px 9px 36px;
      font-size: 13.5px;
      background: var(--bg-surface);
      border: 1px solid var(--border-medium);
      border-radius: var(--radius-md);
      color: var(--text-main);
      box-shadow: inset 0 1px 2px rgba(32, 40, 36, 0.04);
      transition: border-color var(--transition-fast);
    }

    .search-input:focus {
      outline: none;
      border-color: var(--color-forest);
      box-shadow: 0 0 0 3px rgba(23, 63, 53, 0.1);
    }

    .clear-btn {
      position: absolute;
      right: 10px;
      background: transparent;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      font-size: 12px;
    }

    /* Type Filters */
    .type-filters {
      display: flex;
      gap: 6px;
      background: var(--bg-surface-subtle);
      border: 1px solid var(--border-medium);
      padding: 3px;
      border-radius: var(--radius-md);
      width: fit-content;
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
    .skeleton-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 18px;
    }

    .item-skeleton {
      height: 200px;
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

    /* Materials Grid */
    .materials-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 18px;
    }

    .material-card {
      padding: 24px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      height: 100%;
      gap: 16px;
    }

    .material-card-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 14px;
      gap: 12px;
      flex-wrap: wrap;
    }

    .tag-group {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .type-badge {
      display: inline-block;
      padding: 3px 9px;
      border-radius: var(--radius-sm);
      font-size: 11px;
      font-weight: 700;
      background: var(--bg-surface-subtle);
      color: var(--text-secondary);
      border: 1px solid var(--border-medium);
      letter-spacing: 0.04em;
    }

    .type-badge.type-pdf {
      background: rgba(184, 66, 51, 0.08);
      color: var(--color-danger);
      border-color: rgba(184, 66, 51, 0.25);
    }

    .subject-badge {
      display: inline-block;
      font-size: 11px;
      font-weight: 700;
      color: var(--color-forest);
      background: rgba(23, 63, 53, 0.08);
      padding: 3px 8px;
      border-radius: var(--radius-sm);
    }

    .academic-meta {
      font-size: 11.5px;
      color: var(--text-muted);
    }

    .material-card-content {
      margin-bottom: 12px;
    }

    .material-title {
      font-size: 19px;
      font-weight: 600;
      color: var(--color-forest);
      margin-bottom: 4px;
      line-height: 1.35;
    }

    .subject-name-tag {
      display: inline-block;
      font-size: 12px;
      color: var(--color-sage);
      font-weight: 600;
      margin-bottom: 10px;
    }

    .material-desc {
      font-size: 13.5px;
      color: var(--text-secondary);
      line-height: 1.55;
    }

    .material-card-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-top: 1px solid var(--border-subtle);
      padding-top: 16px;
      gap: 12px;
      flex-wrap: wrap;
    }

    .footer-date {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: var(--text-muted);
    }

    .link-btn {
      text-decoration: none;
    }

    .resource-missing-label {
      font-size: 11.5px;
      color: var(--text-muted);
      font-style: italic;
    }

    /* Empty */
    .empty-state {
      padding: 56px 32px;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 14px;
    }

    .empty-icon {
      color: var(--text-muted);
      opacity: 0.7;
    }

    .empty-title {
      font-size: 22px;
      font-weight: 600;
      color: var(--color-forest);
    }

    .empty-desc {
      font-size: 14px;
      color: var(--text-muted);
      max-width: 440px;
      line-height: 1.5;
    }

    @media (max-width: 900px) {
      .materials-grid {
        grid-template-columns: 1fr;
      }
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
}
