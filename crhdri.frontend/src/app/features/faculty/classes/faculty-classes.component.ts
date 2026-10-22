import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { FacultyService } from '../../../core/services/faculty.service';
import { FacultyAssignedClass } from '../../../core/models/faculty.models';
import { IconComponent } from '../../../shared/components/icon.component';

@Component({
  selector: 'app-faculty-classes',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, IconComponent],
  template: `
    <div class="classes-page">
      <!-- Page Header -->
      <div class="page-header">
        <div class="header-titles">
          <div class="header-badge-row">
            <span class="badge badge-sage">ACADEMIC WORKLOAD</span>
            <span class="meta-dot">&bull;</span>
            <span class="header-meta font-mono">AY 2026-2027</span>
          </div>
          <h2 class="page-title font-editorial">My Teaching Classes</h2>
          <p class="page-subtitle">
            Manage your assigned subjects, instruction cohorts, and access official student rosters.
          </p>
        </div>

        <div class="header-actions">
          <button class="btn btn-outline" (click)="loadClasses()" [disabled]="loading()" title="Refresh class list">
            <app-icon name="refresh" [size]="16" [class.spin-icon]="loading()"></app-icon>
            <span>Refresh</span>
          </button>
        </div>
      </div>

      <!-- Quick KPI Metric Cards -->
      <div class="stats-row">
        <div class="card-tactile stat-card">
          <div class="stat-icon-wrap forest-bg">
            <app-icon name="courses" [size]="20"></app-icon>
          </div>
          <div class="stat-content">
            <span class="stat-value font-editorial">{{ classes().length }}</span>
            <span class="stat-label">Assigned Classes</span>
          </div>
        </div>

        <div class="card-tactile stat-card">
          <div class="stat-icon-wrap teal-bg">
            <app-icon name="profile" [size]="20"></app-icon>
          </div>
          <div class="stat-content">
            <span class="stat-value font-editorial">{{ totalStudentsCount() }}</span>
            <span class="stat-label">Total Enrolled Students</span>
          </div>
        </div>

        <div class="card-tactile stat-card">
          <div class="stat-icon-wrap amber-bg">
            <app-icon name="badge-check" [size]="20"></app-icon>
          </div>
          <div class="stat-content">
            <span class="stat-value font-editorial">{{ totalCredits() }}</span>
            <span class="stat-label">Total Teaching Credits</span>
          </div>
        </div>
      </div>

      <!-- Search & Controls Bar -->
      <div class="card-tactile controls-card">
        <div class="search-input-wrap">
          <app-icon name="search" [size]="16" class="search-icon"></app-icon>
          <input
            type="text"
            [(ngModel)]="searchQuery"
            placeholder="Filter by subject code, name, or course..."
            class="search-input"
          />
          @if (searchQuery) {
            <button class="clear-search-btn" (click)="searchQuery = ''" aria-label="Clear filter">
              &times;
            </button>
          }
        </div>

        <div class="results-count-pill font-mono">
          {{ filteredClasses().length }} of {{ classes().length }} Classes
        </div>
      </div>

      <!-- Loading State -->
      @if (loading()) {
        <div class="skeleton-grid" aria-busy="true" aria-label="Loading assigned classes">
          <div class="skeleton card-skeleton"></div>
          <div class="skeleton card-skeleton"></div>
          <div class="skeleton card-skeleton"></div>
        </div>
      }

      <!-- Error State -->
      @else if (errorMessage()) {
        <div class="error-banner card-tactile" role="alert">
          <div class="error-icon-wrap">
            <app-icon name="alert" [size]="24"></app-icon>
          </div>
          <div class="error-text">
            <h3 class="error-title">Unable to Load Assigned Classes</h3>
            <p class="error-desc">{{ errorMessage() }}</p>
          </div>
          <button class="btn btn-primary" (click)="loadClasses()">
            <app-icon name="refresh" [size]="16"></app-icon>
            Retry
          </button>
        </div>
      }

      <!-- Classes Grid -->
      @else if (filteredClasses().length > 0) {
        <div class="classes-grid">
          @for (cls of filteredClasses(); track cls.facultyAssignmentId) {
            <div class="card-tactile class-card">
              <!-- Card Top Header -->
              <div class="card-top">
                <div class="subject-badge font-mono">{{ cls.subjectCode }}</div>
                <div class="credits-badge font-mono">{{ cls.credits }} Credits</div>
              </div>

              <!-- Card Body Info -->
              <div class="card-middle">
                <h3 class="subject-title">{{ cls.subjectName }}</h3>
                <p class="course-subtitle">{{ cls.courseName }}</p>

                <div class="cohort-tags-row">
                  <span class="tag-badge">
                    <strong>Sem {{ cls.semester }}</strong> &bull; Sec {{ cls.section }}
                  </span>
                  <span class="tag-badge font-mono">{{ cls.academicYear }}</span>
                </div>
              </div>

              <!-- Card Footer Action -->
              <div class="card-bottom">
                <div class="students-count-badge">
                  <app-icon name="profile" [size]="15" class="student-icon"></app-icon>
                  <span class="student-num">{{ cls.enrolledStudentsCount }}</span>
                  <span class="student-lbl">{{ cls.enrolledStudentsCount === 1 ? 'Student' : 'Students' }}</span>
                </div>

                <a
                  [routerLink]="['/faculty/classes', cls.facultyAssignmentId]"
                  class="btn btn-primary view-btn"
                  [attr.aria-label]="'View student roster for ' + cls.subjectName"
                >
                  <span>View Class</span>
                  <app-icon name="chevron-right" [size]="14"></app-icon>
                </a>
              </div>
            </div>
          }
        </div>
      }

      <!-- Empty State -->
      @else {
        <div class="card-tactile empty-card">
          <div class="empty-icon-box">
            <app-icon name="courses" [size]="36"></app-icon>
          </div>
          <h3 class="empty-title font-editorial">No Classes Found</h3>
          <p class="empty-desc">
            @if (searchQuery) {
              No assigned classes match your search query "{{ searchQuery }}". Try clearing the filter.
            } @else {
              No teaching classes are currently assigned to your faculty profile in the database.
            }
          </p>
          @if (searchQuery) {
            <button class="btn btn-outline" (click)="searchQuery = ''">
              Clear Search Filter
            </button>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .classes-page {
      display: flex;
      flex-direction: column;
      gap: 24px;
      padding-bottom: 36px;
    }

    /* Page Header */
    .page-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
    }

    .header-titles {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .header-badge-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .meta-dot {
      color: var(--text-muted);
    }

    .header-meta {
      font-size: 12px;
      color: var(--text-muted);
    }

    .page-title {
      font-size: 26px;
      font-weight: 700;
      color: var(--color-forest);
      margin: 0;
      line-height: 1.2;
    }

    .page-subtitle {
      font-size: 13.5px;
      color: var(--text-secondary);
      margin: 0;
      max-width: 600px;
    }

    /* Stats Row */
    .stats-row {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
    }

    .stat-card {
      padding: 18px 20px;
      display: flex;
      align-items: center;
      gap: 16px;
      background: #FFFFFF;
      border-radius: var(--radius-lg);
      border: 1px solid var(--border-subtle);
    }

    .stat-icon-wrap {
      width: 44px;
      height: 44px;
      border-radius: var(--radius-md);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .forest-bg {
      background: var(--color-forest-surface);
      color: var(--color-forest);
    }

    .teal-bg {
      background: rgba(13, 148, 136, 0.1);
      color: #0f766e;
    }

    .amber-bg {
      background: rgba(217, 119, 6, 0.1);
      color: var(--color-amber-dark);
    }

    .stat-content {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .stat-value {
      font-size: 26px;
      font-weight: 700;
      color: var(--text-main);
      line-height: 1;
    }

    .stat-label {
      font-size: 12px;
      color: var(--text-muted);
      font-weight: 600;
    }

    /* Controls Bar */
    .controls-card {
      padding: 12px 18px;
      background: #FFFFFF;
      border-radius: var(--radius-lg);
      border: 1px solid var(--border-subtle);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
    }

    .search-input-wrap {
      position: relative;
      flex: 1;
      max-width: 460px;
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
      width: 100%;
      padding: 9px 36px 9px 36px;
      font-size: 13.5px;
      color: var(--text-main);
      background: var(--bg-surface-subtle);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      outline: none;
      transition: all var(--transition-fast);
      font-family: inherit;
    }

    .search-input:focus {
      background: #FFFFFF;
      border-color: var(--color-forest);
      box-shadow: 0 0 0 3px rgba(23, 63, 53, 0.08);
    }

    .clear-search-btn {
      position: absolute;
      right: 10px;
      background: none;
      border: none;
      font-size: 18px;
      color: var(--text-muted);
      cursor: pointer;
      line-height: 1;
    }

    .results-count-pill {
      font-size: 12px;
      color: var(--text-muted);
      background: var(--bg-surface-subtle);
      padding: 5px 12px;
      border-radius: var(--radius-full);
      border: 1px solid var(--border-subtle);
      white-space: nowrap;
    }

    /* Classes Grid */
    .classes-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
      gap: 20px;
    }

    .class-card {
      padding: 22px;
      background: #FFFFFF;
      border-radius: var(--radius-xl);
      border: 1px solid var(--border-subtle);
      display: flex;
      flex-direction: column;
      gap: 16px;
      transition: all var(--transition-fast);
      position: relative;
    }

    .class-card:hover {
      transform: translateY(-2px);
      box-shadow: var(--shadow-tactile-hover);
      border-color: var(--color-forest-border);
    }

    .card-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .subject-badge {
      font-size: 13px;
      font-weight: 700;
      color: var(--color-forest);
      background: var(--color-forest-surface);
      border: 1px solid var(--color-forest-border);
      padding: 4px 10px;
      border-radius: var(--radius-sm);
    }

    .credits-badge {
      font-size: 11.5px;
      font-weight: 700;
      color: var(--color-amber-dark);
      background: rgba(217, 119, 6, 0.1);
      padding: 3px 8px;
      border-radius: var(--radius-full);
    }

    .card-middle {
      display: flex;
      flex-direction: column;
      gap: 6px;
      flex: 1;
    }

    .subject-title {
      font-size: 17px;
      font-weight: 700;
      color: var(--text-main);
      margin: 0;
      line-height: 1.25;
    }

    .course-subtitle {
      font-size: 12.5px;
      color: var(--text-secondary);
      margin: 0;
      line-height: 1.35;
    }

    .cohort-tags-row {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 6px;
      flex-wrap: wrap;
    }

    .tag-badge {
      font-size: 11.5px;
      color: var(--text-secondary);
      background: var(--bg-surface-subtle);
      border: 1px solid var(--border-subtle);
      padding: 3px 8px;
      border-radius: var(--radius-sm);
    }

    .tag-badge strong {
      color: var(--color-forest);
    }

    .card-bottom {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding-top: 14px;
      border-top: 1px solid var(--border-subtle);
      margin-top: auto;
    }

    .students-count-badge {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
    }

    .student-icon {
      color: var(--color-forest);
    }

    .student-num {
      font-weight: 700;
      color: var(--color-forest);
    }

    .student-lbl {
      color: var(--text-secondary);
    }

    .view-btn {
      padding: 7px 14px;
      font-size: 12.5px;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }

    /* Error & Empty States */
    .error-banner {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 20px;
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-left: 4px solid #dc2626;
      border-radius: var(--radius-lg);
    }

    .error-icon-wrap {
      color: #dc2626;
    }

    .error-text {
      flex: 1;
    }

    .error-title {
      font-size: 15px;
      font-weight: 700;
      color: #991b1b;
      margin: 0 0 4px 0;
    }

    .error-desc {
      font-size: 13px;
      color: #b91c1c;
      margin: 0;
    }

    .empty-card {
      padding: 48px 24px;
      background: #FFFFFF;
      border-radius: var(--radius-xl);
      border: 1px solid var(--border-subtle);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      gap: 12px;
    }

    .empty-icon-box {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background: var(--bg-surface-subtle);
      color: var(--text-muted);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .empty-title {
      font-size: 20px;
      color: var(--color-forest);
      margin: 0;
    }

    .empty-desc {
      font-size: 13.5px;
      color: var(--text-muted);
      max-width: 420px;
      margin: 0;
      line-height: 1.45;
    }

    /* Skeletons */
    .skeleton-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
      gap: 20px;
    }

    .card-skeleton {
      height: 200px;
      border-radius: var(--radius-xl);
      background: linear-gradient(90deg, #f0ede4 25%, #f8f6f0 50%, #f0ede4 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
    }

    @keyframes shimmer {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }

    .spin-icon {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      100% { transform: rotate(360deg); }
    }

    @media (max-width: 800px) {
      .stats-row {
        grid-template-columns: 1fr;
      }
      .page-header {
        flex-direction: column;
        align-items: flex-start;
      }
    }
  `]
})
export class FacultyClassesComponent implements OnInit {
  private readonly facultyService = inject(FacultyService);
  private readonly router = inject(Router);

  classes = signal<FacultyAssignedClass[]>([]);
  loading = signal<boolean>(false);
  errorMessage = signal<string | null>(null);
  searchQuery = '';

  filteredClasses = computed(() => {
    const query = this.searchQuery.trim().toLowerCase();
    if (!query) return this.classes();

    return this.classes().filter(c =>
      c.subjectCode.toLowerCase().includes(query) ||
      c.subjectName.toLowerCase().includes(query) ||
      c.courseName.toLowerCase().includes(query) ||
      c.courseCode.toLowerCase().includes(query) ||
      c.section.toLowerCase().includes(query)
    );
  });

  totalStudentsCount = computed(() => {
    return this.classes().reduce((acc, c) => acc + (c.enrolledStudentsCount || 0), 0);
  });

  totalCredits = computed(() => {
    return this.classes().reduce((acc, c) => acc + (c.credits || 0), 0);
  });

  ngOnInit(): void {
    this.loadClasses();
  }

  loadClasses(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.facultyService.getMyClasses().subscribe({
      next: (list) => {
        this.classes.set(list);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set(err.message || 'Failed to load assigned classes.');
      }
    });
  }
}
