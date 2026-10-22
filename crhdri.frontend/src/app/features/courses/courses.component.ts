import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CoursesService } from '../../core/services/courses.service';
import { Course } from '../../core/models/student.models';
import { IconComponent } from '../../shared/components/icon.component';

@Component({
  selector: 'app-courses',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  template: `
    <div class="courses-page">
      <!-- Page Header -->
      <div class="page-header">
        <div>
          <h2 class="page-title font-editorial">Enrolled Academic Courses</h2>
          <p class="page-subtitle">Subjects registered for current semester curriculum ({{ filteredCourses().length }} subjects)</p>
        </div>

        <div class="header-controls">
          <div class="search-box">
            <app-icon name="search" [size]="16" class="search-icon"></app-icon>
            <input 
              type="text" 
              [(ngModel)]="searchQuery" 
              placeholder="Search by code or subject name..." 
              class="search-input"
            />
            @if (searchQuery()) {
              <button class="clear-btn" (click)="searchQuery.set('')">✕</button>
            }
          </div>

          <div class="view-toggle">
            <button class="toggle-btn" [class.active]="viewMode() === 'grid'" (click)="viewMode.set('grid')" title="Grid View">
              ⊞ Grid
            </button>
            <button class="toggle-btn" [class.active]="viewMode() === 'list'" (click)="viewMode.set('list')" title="List View">
              ☰ Table
            </button>
          </div>

          <button class="btn btn-secondary btn-sm" (click)="loadCourses()" title="Refresh Courses">
            <app-icon name="refresh" [size]="14"></app-icon> Refresh
          </button>
        </div>
      </div>

      <!-- Loading State -->
      @if (loading()) {
        <div class="skeleton-grid">
          <div class="skeleton course-skeleton" *ngFor="let i of [1,2,3]"></div>
        </div>
      }

      <!-- Error State -->
      @else if (errorMessage()) {
        <div class="error-banner card-tactile" role="alert">
          <div class="error-icon-wrap">
            <app-icon name="alert" [size]="28"></app-icon>
          </div>
          <div class="error-text">
            <h3 class="error-title">Unable to Load Course Roster</h3>
            <p class="error-desc">{{ errorMessage() }}</p>
            <p class="error-hint">Ensure the backend API at <code>http://localhost:5083</code> is running with PostgreSQL.</p>
          </div>
          <button class="btn btn-primary" (click)="loadCourses()">
            <app-icon name="refresh" [size]="16"></app-icon>
            Retry Connection
          </button>
        </div>
      }

      <!-- Empty State -->
      @else if (filteredCourses().length === 0) {
        <div class="card-tactile empty-state">
          <app-icon name="courses" [size]="48" class="empty-icon"></app-icon>
          <h3 class="empty-title font-editorial">No Enrolled Courses Found</h3>
          <p class="empty-desc">
            @if (searchQuery()) {
              No course subjects matched "{{ searchQuery() }}". Try adjusting your search query.
            } @else {
              No registered subjects were found for this student enrollment profile.
            }
          </p>
          @if (searchQuery()) {
            <button class="btn btn-secondary" (click)="searchQuery.set('')">Clear Search Filter</button>
          }
        </div>
      }

      <!-- Courses Grid View -->
      @else if (viewMode() === 'grid') {
        <div class="courses-grid">
          @for (course of filteredCourses(); track course.subjectCode) {
            <div class="card-tactile card-interactive course-card">
              <div class="course-card-top">
                <span class="subject-code-badge font-mono">{{ course.subjectCode }}</span>
                <span class="badge badge-sage">{{ course.credits }} Credits</span>
              </div>

              <div class="course-card-content">
                <h3 class="subject-name font-editorial">{{ course.subjectName }}</h3>
                <div class="course-program-row">
                  <span class="course-code-tag font-mono">{{ course.courseCode }}</span>
                  <span class="course-program">{{ course.courseName }}</span>
                </div>
              </div>

              <div class="course-card-footer">
                <div class="footer-meta">
                  <span class="footer-meta-item">Sem {{ course.semester }}</span>
                  <span class="footer-meta-dot">&bull;</span>
                  <span class="footer-meta-item">AY {{ course.academicYear }}</span>
                </div>
                <span class="badge badge-forest status-pill">{{ course.enrollmentStatus || 'ACTIVE' }}</span>
              </div>
            </div>
          }
        </div>
      }

      <!-- Courses List / Table View -->
      @else {
        <div class="card-tactile table-container">
          <table class="courses-table" aria-label="Course Subject List">
            <thead>
              <tr>
                <th scope="col">Subject Code</th>
                <th scope="col">Subject Title</th>
                <th scope="col">Course Code</th>
                <th scope="col">Program / Degree</th>
                <th scope="col">Credits</th>
                <th scope="col">Semester</th>
                <th scope="col">Academic Year</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              @for (course of filteredCourses(); track course.subjectCode) {
                <tr>
                  <td><span class="font-mono code-pill">{{ course.subjectCode }}</span></td>
                  <td><strong class="subject-title-cell">{{ course.subjectName }}</strong></td>
                  <td><span class="font-mono code-pill subtle">{{ course.courseCode }}</span></td>
                  <td class="secondary-cell">{{ course.courseName }}</td>
                  <td><span class="badge badge-sage">{{ course.credits }} Credits</span></td>
                  <td class="font-mono">Semester {{ course.semester }}</td>
                  <td class="font-mono">{{ course.academicYear }}</td>
                  <td><span class="badge badge-forest">{{ course.enrollmentStatus || 'ACTIVE' }}</span></td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>
  `,
  styles: [`
    .courses-page {
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

    .header-controls {
      display: flex;
      align-items: center;
      gap: 12px;
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

    .view-toggle {
      display: flex;
      background: var(--bg-surface-subtle);
      border: 1px solid var(--border-medium);
      border-radius: var(--radius-md);
      padding: 2px;
    }

    .toggle-btn {
      padding: 6px 12px;
      font-size: 12px;
      font-weight: 600;
      border: none;
      background: transparent;
      color: var(--text-secondary);
      border-radius: var(--radius-sm);
      cursor: pointer;
      transition: all var(--transition-fast);
    }

    .toggle-btn.active {
      background: var(--bg-surface);
      color: var(--color-forest);
      box-shadow: 0 1px 3px rgba(32, 40, 36, 0.08);
    }

    /* Skeleton */
    .skeleton-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 18px;
    }

    .course-skeleton {
      height: 180px;
      border-radius: var(--radius-lg);
    }

    /* Courses Grid */
    .courses-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 18px;
    }

    .course-card {
      padding: 22px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      height: 100%;
    }

    .course-card-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 16px;
    }

    .subject-code-badge {
      display: inline-block;
      padding: 4px 10px;
      background: var(--color-forest-surface);
      color: var(--color-forest);
      border: 1px solid var(--color-forest-border);
      border-radius: var(--radius-sm);
      font-size: 12px;
      font-weight: 700;
    }

    /* Error Banner */
    .error-banner {
      display: flex;
      align-items: center;
      gap: 20px;
      padding: 24px;
      background: var(--color-danger-surface);
      border-color: var(--color-danger-border);
    }

    .error-icon-wrap {
      color: var(--color-danger);
    }

    .error-title {
      font-size: 16px;
      font-weight: 700;
      color: var(--color-danger);
      margin-bottom: 4px;
    }

    .error-desc {
      font-size: 14px;
      color: var(--text-main);
      margin-bottom: 4px;
    }

    .error-hint {
      font-size: 12px;
      color: var(--text-muted);
    }

    .course-card-content {
      margin-bottom: 20px;
    }

    .subject-name {
      font-size: 19px;
      font-weight: 600;
      color: var(--color-forest);
      line-height: 1.3;
      margin-bottom: 6px;
    }

    .course-program-row {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }

    .course-code-tag {
      display: inline-block;
      padding: 2px 7px;
      background: var(--bg-surface-subtle);
      border: 1px solid var(--border-medium);
      border-radius: var(--radius-xs);
      font-size: 11px;
      font-weight: 700;
      color: var(--color-forest);
    }

    .course-program {
      font-size: 12.5px;
      color: var(--text-muted);
      line-height: 1.4;
    }

    .code-pill.subtle {
      background: var(--bg-surface-subtle);
      color: var(--text-secondary);
      border-color: var(--border-medium);
    }

    .course-card-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-top: 1px solid var(--border-subtle);
      padding-top: 14px;
    }

    .footer-meta {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: var(--text-muted);
      font-weight: 500;
    }

    .footer-meta-dot {
      color: var(--border-strong);
    }

    /* Table View */
    .table-container {
      overflow-x: auto;
    }

    .courses-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
      font-size: 13.5px;
    }

    .courses-table th {
      padding: 14px 18px;
      background: var(--bg-surface-subtle);
      color: var(--text-secondary);
      font-weight: 700;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      border-bottom: 1px solid var(--border-subtle);
    }

    .courses-table td {
      padding: 16px 18px;
      border-bottom: 1px solid var(--border-subtle);
      color: var(--text-main);
    }

    .courses-table tr:hover td {
      background-color: var(--bg-surface-subtle);
    }

    .code-pill {
      display: inline-block;
      padding: 3px 8px;
      background: var(--color-forest-surface);
      color: var(--color-forest);
      border: 1px solid var(--color-forest-border);
      border-radius: var(--radius-xs);
      font-size: 12px;
      font-weight: 700;
    }

    .subject-title-cell {
      color: var(--color-forest);
      font-size: 14px;
    }

    .secondary-cell {
      color: var(--text-muted);
      font-size: 13px;
    }

    /* Empty State */
    .empty-state {
      padding: 56px 24px;
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
      font-weight: 600;
      color: var(--color-forest);
    }

    .empty-desc {
      font-size: 14px;
      color: var(--text-muted);
      max-width: 440px;
      line-height: 1.5;
    }

    @media (max-width: 1024px) {
      .courses-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    @media (max-width: 640px) {
      .courses-grid {
        grid-template-columns: 1fr;
      }
      .search-input {
        width: 100%;
      }
      .header-controls {
        width: 100%;
        flex-direction: column;
        align-items: stretch;
      }
    }
  `]
})
export class CoursesComponent implements OnInit {
  private readonly coursesService = inject(CoursesService);

  courses = signal<Course[]>([]);
  loading = signal<boolean>(true);
  errorMessage = signal<string | null>(null);

  searchQuery = signal<string>('');
  viewMode = signal<'grid' | 'list'>('grid');

  filteredCourses = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const list = this.courses();
    if (!q) return list;
    return list.filter(c => 
      c.subjectName.toLowerCase().includes(q) ||
      c.subjectCode.toLowerCase().includes(q) ||
      (c.courseCode && c.courseCode.toLowerCase().includes(q)) ||
      (c.courseName && c.courseName.toLowerCase().includes(q))
    );
  });

  ngOnInit(): void {
    this.loadCourses();
  }

  loadCourses(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.coursesService.getCourses().subscribe({
      next: (list) => {
        this.courses.set(list || []);
        this.loading.set(false);
      },
      error: (err) => {
        this.errorMessage.set(err.message || 'Failed to load courses.');
        this.loading.set(false);
      }
    });
  }
}
