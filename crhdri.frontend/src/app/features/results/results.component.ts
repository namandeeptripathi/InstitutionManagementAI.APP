import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ResultsService } from '../../core/services/results.service';
import { ResultsResponse, StudentResult } from '../../core/models/student.models';
import { IconComponent } from '../../shared/components/icon.component';

@Component({
  selector: 'app-results',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  template: `
    <div class="results-page">
      <!-- Page Header -->
      <div class="page-header-clean">
        <div>
          <h2 class="page-title">Academic Results & Performance Records</h2>
          <p class="page-subtitle">
            Evaluated assessments, quizzes, and official academic scorecards
            @if (data() && data()!.totalResults > 0) {
              <span class="header-count font-mono">&bull; {{ data()!.totalResults }} records</span>
            }
          </p>
        </div>

        <div class="header-actions">
          <div class="search-box-clean">
            <app-icon name="search" [size]="15" class="search-icon"></app-icon>
            <input 
              type="text" 
              [ngModel]="searchQuery()" 
              (ngModelChange)="searchQuery.set($event)" 
              placeholder="Search assessment or subject..." 
              class="search-input"
            />
            @if (searchQuery()) {
              <button class="clear-btn" (click)="searchQuery.set('')" title="Clear search">✕</button>
            }
          </div>

          <button class="btn btn-secondary btn-sm" (click)="loadResults()" title="Refresh Results">
            <app-icon name="refresh" [size]="14"></app-icon> Refresh
          </button>
        </div>
      </div>

      <!-- Loading State -->
      @if (loading()) {
        <div class="skeleton-layout">
          <div class="skeleton banner-skeleton"></div>
          <div class="skeleton table-skeleton"></div>
        </div>
      }

      <!-- Error State -->
      @else if (errorMessage()) {
        <div class="error-banner card-modern" role="alert">
          <div class="error-icon-wrap">
            <app-icon name="alert" [size]="24"></app-icon>
          </div>
          <div class="error-text">
            <h3 class="error-title">Unable to Load Academic Results</h3>
            <p class="error-desc">{{ errorMessage() }}</p>
            <p class="error-hint">Ensure the backend API at <code>http://localhost:5083</code> is active with PostgreSQL.</p>
          </div>
          <button class="btn btn-primary btn-sm" (click)="loadResults()">
            <app-icon name="refresh" [size]="14"></app-icon> Retry
          </button>
        </div>
      }

      <!-- Empty State -->
      @else if (!data() || data()?.results?.length === 0) {
        <div class="card-modern empty-state-box">
          <app-icon name="results" [size]="40" class="empty-icon"></app-icon>
          <h3 class="empty-title">No Examination Records Found</h3>
          <p class="empty-desc">
            No graded assessment or quiz scorecards have been recorded for your enrollment profile yet.
          </p>
          <button class="btn btn-secondary btn-sm" (click)="loadResults()">
            <app-icon name="refresh" [size]="14"></app-icon> Check Again
          </button>
        </div>
      }

      <!-- Loaded Results -->
      @else if (data(); as res) {
        <!-- Overall Summary Card -->
        <section class="card-modern overall-results-card">
          <div class="summary-meta">
            <div class="badge-row">
              <span class="badge badge-teal">Academic Record</span>
              <span class="enroll-badge font-mono">{{ res.enrollmentNumber }}</span>
            </div>

            <h3 class="summary-score-headline">
              Aggregate Academic Score: <span class="score-highlight">{{ res.overallPercentage }}%</span>
            </h3>

            <p class="summary-breakdown">
              Aggregate Marks: <strong>{{ res.totalMarksObtained }}</strong> / <strong>{{ res.totalMaximumMarks }}</strong>
              &bull; Completed Assessments: <strong>{{ res.totalResults }}</strong>
            </p>

            <div class="summary-chips-row">
              <div class="stat-pill-mini">
                <span class="pill-label">Marks Scored</span>
                <span class="pill-num font-mono">{{ res.totalMarksObtained }}</span>
              </div>
              <div class="stat-pill-mini">
                <span class="pill-label">Max Marks</span>
                <span class="pill-num font-mono">{{ res.totalMaximumMarks }}</span>
              </div>
              <div class="stat-pill-mini">
                <span class="pill-label">Evaluated Records</span>
                <span class="pill-num font-mono">{{ res.totalResults }}</span>
              </div>
            </div>
          </div>

          <div class="summary-dial-container">
            <div class="overall-ring" [style.background]="getConicGradient(res.overallPercentage)">
              <div class="ring-core">
                <span class="ring-pct">{{ res.overallPercentage }}%</span>
                <span class="ring-sub">Aggregate</span>
              </div>
            </div>
          </div>
        </section>

        <!-- Source Filter Pills if multiple sources exist -->
        @if (hasMultipleSources()) {
          <div class="source-filters">
            <button 
              class="filter-pill" 
              [class.active]="filterSource() === 'ALL'" 
              (click)="filterSource.set('ALL')">
              All Results ({{ res.results.length }})
            </button>
            <button 
              class="filter-pill" 
              [class.active]="filterSource() === 'EVALUATED_RESULT'" 
              (click)="filterSource.set('EVALUATED_RESULT')">
              Evaluated
            </button>
            <button 
              class="filter-pill" 
              [class.active]="filterSource() === 'QUIZ_ATTEMPT'" 
              (click)="filterSource.set('QUIZ_ATTEMPT')">
              Quiz Attempts
            </button>
          </div>
        }

        <!-- Filtered Empty State -->
        @if (filteredResults().length === 0) {
          <div class="card-modern empty-state-box">
            <app-icon name="search" [size]="36" class="empty-icon"></app-icon>
            <h3 class="empty-title">No Matching Results</h3>
            <p class="empty-desc">No assessment records matched your search filter criteria.</p>
            <button class="btn btn-secondary btn-sm" (click)="resetFilters()">Clear Filters</button>
          </div>
        }

        <!-- Results Table -->
        @else {
          <div class="table-container-clean">
            <table class="table-modern" aria-label="Student Results Table">
              <thead>
                <tr>
                  <th scope="col">Assessment</th>
                  <th scope="col">Subject</th>
                  <th scope="col">Type</th>
                  <th scope="col">Source</th>
                  <th scope="col">Score</th>
                  <th scope="col">Percentage</th>
                  <th scope="col">Date</th>
                  <th scope="col">Feedback</th>
                </tr>
              </thead>
              <tbody>
                @for (row of filteredResults(); track row.recordId) {
                  <tr>
                    <td>
                      <div class="assessment-cell">
                        <strong class="assessment-title">{{ row.assessmentName }}</strong>
                        @if (row.assessmentDate) {
                          <span class="assessment-date font-mono">Date: {{ row.assessmentDate | date:'mediumDate' }}</span>
                        }
                      </div>
                    </td>
                    <td>
                      <div class="subject-col">
                        <span class="subject-code font-mono">{{ row.subjectCode }}</span>
                        <span class="subject-name">{{ row.subjectName }}</span>
                      </div>
                    </td>
                    <td>
                      <span class="badge badge-teal font-mono">{{ row.assessmentType }}</span>
                    </td>
                    <td>
                      <span class="badge" [class.badge-success]="row.resultSource === 'EVALUATED_RESULT'" [class.badge-neutral]="row.resultSource !== 'EVALUATED_RESULT'">
                        {{ row.resultSource === 'EVALUATED_RESULT' ? 'Evaluated' : 'Quiz' }}
                      </span>
                    </td>
                    <td class="score-cell font-mono">
                      <strong>{{ row.marksObtained }}</strong> / {{ row.maxMarks }}
                    </td>
                    <td>
                      @if (safePercentage(row) !== null) {
                        <span class="badge font-mono" [class.badge-success]="safePercentage(row)! >= 75" [class.badge-amber]="safePercentage(row)! >= 50 && safePercentage(row)! < 75" [class.badge-danger]="safePercentage(row)! < 50">
                          {{ safePercentage(row) }}%
                        </span>
                      } @else {
                        <span class="empty-dash">&mdash;</span>
                      }
                    </td>
                    <td class="font-mono date-cell">
                      {{ row.recordedAt | date:'mediumDate' }}
                    </td>
                    <td>
                      @if (row.feedback) {
                        <span class="feedback-text" [title]="row.feedback">"{{ row.feedback }}"</span>
                      } @else {
                        <span class="empty-dash">&mdash;</span>
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
  `,
  styles: [`
    .results-page {
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

    .header-actions {
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
      width: 260px;
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

    /* Skeleton Loading */
    .skeleton-layout {
      display: flex;
      flex-direction: column;
      gap: 18px;
    }

    .banner-skeleton {
      height: 150px;
      border-radius: var(--radius-xl);
    }

    .table-skeleton {
      height: 260px;
      border-radius: var(--radius-lg);
    }

    /* Overall Summary Card */
    .overall-results-card {
      padding: 24px 28px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 28px;
    }

    .summary-meta {
      display: flex;
      flex-direction: column;
      gap: 8px;
      flex: 1;
    }

    .badge-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .enroll-badge {
      font-size: 11px;
      font-weight: 600;
      padding: 2px 7px;
      border-radius: var(--radius-sm);
      background: var(--bg-surface-subtle);
      border: 1px solid var(--border-subtle);
      color: var(--text-secondary);
    }

    .summary-score-headline {
      font-size: 22px;
      font-weight: 700;
      color: var(--text-main);
      line-height: 1.25;
      letter-spacing: -0.01em;
    }

    .score-highlight {
      color: var(--color-teal);
    }

    .summary-breakdown {
      font-size: 13px;
      color: var(--text-secondary);
    }

    .summary-chips-row {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 4px;
    }

    .stat-pill-mini {
      display: flex;
      flex-direction: column;
      padding: 6px 12px;
      background: var(--bg-surface-subtle);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm);
    }

    .pill-label {
      font-size: 9.5px;
      text-transform: uppercase;
      font-weight: 700;
      color: var(--text-muted);
      letter-spacing: 0.04em;
    }

    .pill-num {
      font-size: 13.5px;
      font-weight: 700;
      color: var(--text-main);
    }

    /* Overall Radial Dial */
    .summary-dial-container {
      flex-shrink: 0;
    }

    .overall-ring {
      width: 104px;
      height: 104px;
      border-radius: 50%;
      padding: 8px;
      box-shadow: 0 2px 8px rgba(15, 23, 42, 0.08);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.4s ease;
    }

    .ring-core {
      width: 100%;
      height: 100%;
      background: var(--bg-surface);
      border-radius: 50%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }

    .ring-pct {
      font-size: 20px;
      font-weight: 800;
      color: var(--color-teal);
      line-height: 1;
    }

    .ring-sub {
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--text-muted);
      margin-top: 3px;
    }

    /* Source Filters */
    .source-filters {
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

    /* Table cells */
    .assessment-cell {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .assessment-title {
      font-size: 13.5px;
      font-weight: 700;
      color: var(--text-main);
    }

    .assessment-date {
      font-size: 11px;
      color: var(--text-muted);
    }

    .subject-col {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .subject-code {
      font-size: 11px;
      font-weight: 700;
      color: var(--color-teal);
    }

    .subject-name {
      font-size: 12.5px;
      color: var(--text-secondary);
    }

    .score-cell {
      font-size: 13px;
    }

    .date-cell {
      font-size: 11.5px;
      color: var(--text-secondary);
    }

    .feedback-text {
      font-size: 12px;
      font-style: italic;
      color: var(--text-secondary);
      max-width: 220px;
      display: inline-block;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .empty-dash {
      color: var(--text-muted);
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

    @media (max-width: 768px) {
      .overall-results-card {
        flex-direction: column;
        align-items: flex-start;
      }
      .summary-dial-container {
        align-self: center;
      }
      .search-input {
        width: 100%;
      }
      .header-actions {
        width: 100%;
      }
    }
  `]
})
export class ResultsComponent implements OnInit {
  private readonly resultsService = inject(ResultsService);

  loading = signal<boolean>(true);
  errorMessage = signal<string | null>(null);
  data = signal<ResultsResponse | null>(null);

  searchQuery = signal<string>('');
  filterSource = signal<'ALL' | 'EVALUATED_RESULT' | 'QUIZ_ATTEMPT'>('ALL');

  hasMultipleSources = computed(() => {
    const res = this.data();
    if (!res || !res.results) return false;
    const sources = new Set(res.results.map(r => r.resultSource));
    return sources.size > 1;
  });

  filteredResults = computed(() => {
    const res = this.data();
    if (!res || !res.results) return [];

    const seen = new Set<string>();
    const unique = res.results.filter(r => {
      if (seen.has(r.recordId)) return false;
      seen.add(r.recordId);
      return true;
    });

    const q = this.searchQuery().toLowerCase().trim();
    const src = this.filterSource();

    return unique.filter(r => {
      if (src !== 'ALL' && r.resultSource !== src) return false;
      if (q) {
        return (
          r.assessmentName.toLowerCase().includes(q) ||
          r.subjectName.toLowerCase().includes(q) ||
          r.subjectCode.toLowerCase().includes(q) ||
          (r.feedback && r.feedback.toLowerCase().includes(q))
        );
      }
      return true;
    });
  });

  ngOnInit(): void {
    this.loadResults();
  }

  loadResults(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.resultsService.getResults().subscribe({
      next: (res) => {
        this.data.set(res);
        this.loading.set(false);
      },
      error: (err) => {
        this.errorMessage.set(err.message || 'Failed to load results.');
        this.loading.set(false);
      }
    });
  }

  safePercentage(row: StudentResult): number | null {
    if (typeof row.maxMarks === 'number' && row.maxMarks > 0 && typeof row.marksObtained === 'number' && row.marksObtained >= 0) {
      return Math.round((row.marksObtained * 100) / row.maxMarks * 100) / 100;
    }
    if (typeof row.percentage === 'number' && !isNaN(row.percentage)) {
      return row.percentage;
    }
    return null;
  }

  getConicGradient(pct: number): string {
    const validPct = Math.min(100, Math.max(0, pct || 0));
    const color = validPct >= 75 ? '#0F766E' : (validPct >= 50 ? '#D4A373' : '#B91C1C');
    return `conic-gradient(${color} 0% ${validPct}%, #E2E8F0 ${validPct}% 100%)`;
  }

  resetFilters(): void {
    this.searchQuery.set('');
    this.filterSource.set('ALL');
  }
}
