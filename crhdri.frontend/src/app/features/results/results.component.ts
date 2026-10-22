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
      <!-- Header -->
      <div class="page-header">
        <div>
          <h2 class="page-title font-editorial">Academic Results & Performance Records</h2>
          <p class="page-subtitle">
            Evaluated assessments, quizzes, and official academic scores
            @if (data() && data()!.totalResults > 0) {
              <span class="header-count font-mono">&bull; {{ data()!.totalResults }} records recorded</span>
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
        <div class="error-banner card-tactile" role="alert">
          <div class="error-icon-wrap">
            <app-icon name="alert" [size]="28"></app-icon>
          </div>
          <div class="error-text">
            <h3 class="error-title">Unable to Load Academic Results</h3>
            <p class="error-desc">{{ errorMessage() }}</p>
            <p class="error-hint">Ensure the backend API at <code>http://localhost:5083</code> is running with PostgreSQL.</p>
          </div>
          <button class="btn btn-primary" (click)="loadResults()">
            <app-icon name="refresh" [size]="16"></app-icon>
            Retry Connection
          </button>
        </div>
      }

      <!-- Empty State -->
      @else if (!data() || data()?.results?.length === 0) {
        <div class="card-tactile empty-state">
          <app-icon name="results" [size]="48" class="empty-icon"></app-icon>
          <h3 class="font-editorial empty-title">No Examination Records Found</h3>
          <p class="empty-desc">
            No graded assessment or quiz scorecards have been recorded for your enrollment profile yet.
          </p>
          <button class="btn btn-secondary" (click)="loadResults()">
            <app-icon name="refresh" [size]="14"></app-icon> Check Again
          </button>
        </div>
      }

      <!-- Loaded Results -->
      @else if (data(); as res) {
        <!-- Overall Summary Card -->
        <section class="card-tactile overall-results-card">
          <div class="summary-meta">
            <div class="badge-row">
              <span class="badge badge-forest">Official Academic Record</span>
              <span class="enroll-badge font-mono">{{ res.enrollmentNumber }}</span>
            </div>

            <h3 class="summary-score-headline font-editorial">
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
                <span class="pill-label">Maximum Marks</span>
                <span class="pill-num font-mono">{{ res.totalMaximumMarks }}</span>
              </div>
              <div class="stat-pill-mini">
                <span class="pill-label">Records Evaluated</span>
                <span class="pill-num font-mono">{{ res.totalResults }}</span>
              </div>
            </div>
          </div>

          <div class="summary-dial-container">
            <div class="overall-ring" [style.background]="getConicGradient(res.overallPercentage)">
              <div class="ring-core">
                <span class="ring-pct font-editorial">{{ res.overallPercentage }}%</span>
                <span class="ring-sub">Aggregate</span>
              </div>
            </div>
          </div>
        </section>

        <!-- Filter Pills if multiple result sources exist -->
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
          <div class="card-tactile empty-state">
            <app-icon name="search" [size]="40" class="empty-icon"></app-icon>
            <h3 class="font-editorial empty-title">No Matching Results</h3>
            <p class="empty-desc">No assessment records matched your search filter criteria.</p>
            <button class="btn btn-secondary" (click)="resetFilters()">Clear Filters</button>
          </div>
        }

        <!-- Results Table -->
        @else {
          <div class="card-tactile table-container">
            <table class="results-table" aria-label="Student Results Table">
              <thead>
                <tr>
                  <th scope="col">Assessment</th>
                  <th scope="col">Subject</th>
                  <th scope="col">Type</th>
                  <th scope="col">Source</th>
                  <th scope="col">Score</th>
                  <th scope="col">Percentage</th>
                  <th scope="col">Recorded Date</th>
                  <th scope="col">Faculty Feedback</th>
                </tr>
              </thead>
              <tbody>
                @for (row of filteredResults(); track row.recordId) {
                  <tr>
                    <td>
                      <div class="assessment-cell">
                        <strong class="assessment-title font-editorial">{{ row.assessmentName }}</strong>
                        @if (row.assessmentDate) {
                          <span class="assessment-date font-mono">Date: {{ row.assessmentDate | date:'mediumDate' }}</span>
                        }
                      </div>
                    </td>
                    <td>
                      <span class="subject-code font-mono">{{ row.subjectCode }}</span>
                      <span class="subject-name">{{ row.subjectName }}</span>
                    </td>
                    <td>
                      <span class="badge badge-sage font-mono">{{ row.assessmentType }}</span>
                    </td>
                    <td>
                      <span class="badge badge-neutral font-mono source-tag" [class.source-eval]="row.resultSource === 'EVALUATED_RESULT'">
                        {{ row.resultSource === 'EVALUATED_RESULT' ? 'Evaluated' : 'Quiz Attempt' }}
                      </span>
                    </td>
                    <td class="score-cell font-mono">
                      <strong>{{ row.marksObtained }}</strong> / {{ row.maxMarks }}
                    </td>
                    <td>
                      @if (safePercentage(row) !== null) {
                        <span class="pct-pill font-mono" [class.high-pct]="safePercentage(row)! >= 75" [class.low-pct]="safePercentage(row)! < 50">
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
      width: 280px;
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

    /* Skeleton Loading */
    .skeleton-layout {
      display: flex;
      flex-direction: column;
      gap: 18px;
    }

    .banner-skeleton {
      height: 180px;
      border-radius: var(--radius-xl);
    }

    .table-skeleton {
      height: 260px;
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

    /* Summary Card */
    .overall-results-card {
      padding: 28px 32px;
      background: linear-gradient(135deg, #FFFFFF 0%, #FAF8F2 100%);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 28px;
    }

    .summary-meta {
      display: flex;
      flex-direction: column;
      gap: 10px;
      flex: 1;
    }

    .badge-row {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .enroll-badge {
      font-size: 11px;
      font-weight: 600;
      padding: 3px 8px;
      border-radius: var(--radius-sm);
      background: var(--bg-surface-subtle);
      border: 1px solid var(--border-medium);
      color: var(--text-muted);
    }

    .summary-score-headline {
      font-size: 26px;
      font-weight: 600;
      color: var(--color-forest);
      line-height: 1.25;
      letter-spacing: -0.01em;
    }

    .score-highlight {
      color: var(--color-forest-dark);
      font-weight: 700;
    }

    .summary-breakdown {
      font-size: 13.5px;
      color: var(--text-secondary);
      line-height: 1.4;
    }

    .summary-chips-row {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-top: 4px;
    }

    .stat-pill-mini {
      display: flex;
      flex-direction: column;
      padding: 6px 12px;
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm);
      box-shadow: 0 1px 3px rgba(32, 40, 36, 0.04);
    }

    .pill-label {
      font-size: 9.5px;
      text-transform: uppercase;
      font-weight: 600;
      color: var(--text-muted);
      letter-spacing: 0.04em;
    }

    .pill-num {
      font-size: 14px;
      font-weight: 700;
      color: var(--color-forest);
    }

    /* Radial Dial */
    .summary-dial-container {
      flex-shrink: 0;
    }

    .overall-ring {
      width: 120px;
      height: 120px;
      border-radius: 50%;
      padding: 10px;
      box-shadow: 0 4px 16px rgba(23, 63, 53, 0.14);
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
      box-shadow: inset 0 2px 6px rgba(32, 40, 36, 0.08);
    }

    .ring-pct {
      font-size: 24px;
      font-weight: 700;
      color: var(--color-forest);
      line-height: 1;
    }

    .ring-sub {
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--text-muted);
      margin-top: 4px;
    }

    /* Source Filters */
    .source-filters {
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

    /* Table */
    .table-container {
      overflow-x: auto;
    }

    .results-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
      font-size: 13.5px;
    }

    .results-table th {
      padding: 14px 18px;
      background: var(--bg-surface-subtle);
      color: var(--text-secondary);
      font-weight: 700;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      border-bottom: 1px solid var(--border-subtle);
    }

    .results-table td {
      padding: 16px 18px;
      border-bottom: 1px solid var(--border-subtle);
      color: var(--text-main);
    }

    .results-table tr:hover td {
      background-color: var(--bg-surface-subtle);
    }

    .assessment-cell {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    .assessment-title {
      color: var(--color-forest);
      font-size: 14.5px;
      font-weight: 600;
    }

    .assessment-date {
      font-size: 11px;
      color: var(--text-muted);
    }

    .subject-code {
      display: block;
      font-size: 11px;
      color: var(--color-forest);
      font-weight: 700;
    }

    .subject-name {
      font-size: 13px;
      color: var(--text-secondary);
    }

    .source-tag {
      font-size: 10.5px;
      padding: 2px 7px;
    }

    .source-tag.source-eval {
      background: rgba(23, 63, 53, 0.08);
      color: var(--color-forest);
    }

    .score-cell {
      font-size: 13.5px;
    }

    .pct-pill {
      display: inline-block;
      padding: 2px 8px;
      border-radius: var(--radius-xs);
      font-size: 12px;
      font-weight: 700;
      background: var(--bg-surface-subtle);
      color: var(--text-main);
    }

    .pct-pill.high-pct {
      background: rgba(23, 63, 53, 0.1);
      color: var(--color-forest);
    }

    .pct-pill.low-pct {
      background: rgba(184, 66, 51, 0.1);
      color: var(--color-danger);
    }

    .date-cell {
      font-size: 12px;
      color: var(--text-muted);
    }

    .feedback-text {
      font-size: 12.5px;
      font-style: italic;
      color: var(--text-secondary);
    }

    .empty-dash {
      color: var(--text-muted);
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
      .header-controls {
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

    // Deduplicate by recordId defensively
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
    const color = validPct >= 75 ? '#173F35' : (validPct >= 50 ? '#D4A373' : '#B84233');
    return `conic-gradient(${color} 0% ${validPct}%, #E5E4DC ${validPct}% 100%)`;
  }

  resetFilters(): void {
    this.searchQuery.set('');
    this.filterSource.set('ALL');
  }
}
