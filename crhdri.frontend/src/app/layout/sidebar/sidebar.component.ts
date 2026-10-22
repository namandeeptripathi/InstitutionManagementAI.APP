import { Component, computed, inject, input, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { StudentService } from '../../core/services/student.service';
import { AuthService } from '../../core/services/auth.service';
import { IconComponent } from '../../shared/components/icon.component';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, IconComponent],
  template: `
    <aside class="sidebar" [class.mobile-open]="isOpen()">
      <!-- Brand Crest & Header -->
      <div class="brand-container">
        <div class="brand-crest">
          <div class="crest-diamond">
            <span class="crest-letter">C</span>
          </div>
          <div class="brand-text">
            <span class="brand-title">CRHDRI<span class="brand-ai">.AI</span></span>
            <span class="brand-subtitle">{{ isFaculty() ? 'FACULTY STUDIO' : 'STUDENT STUDIO' }}</span>
          </div>
        </div>
        <button class="mobile-close-btn" (click)="closeNav.emit()" aria-label="Close navigation menu">
          <app-icon name="close" [size]="20"></app-icon>
        </button>
      </div>

      <!-- Mini User Profile Card -->
      <div class="student-mini-card">
        <div class="student-avatar" [attr.aria-label]="userName()">
          {{ userInitials() }}
        </div>
        <div class="student-meta">
          <span class="student-name" [title]="userName()">{{ userName() }}</span>
          <span class="student-enrollment font-mono">{{ userIdentifier() }}</span>
        </div>
        <div class="status-indicator" [title]="isFaculty() ? 'Active Faculty Session' : 'Active Enrollment Status'">
          <span class="pulse-dot"></span>
        </div>
      </div>

      <!-- Navigation Section -->
      <nav class="nav-scroller" aria-label="Main Navigation">
        <div class="nav-group-label">{{ isFaculty() ? 'FACULTY OPERATIONS' : 'ACADEMIC WORKSPACE' }}</div>
        <ul class="nav-list">
          @if (isFaculty()) {
            <!-- Faculty Navigation Items -->
            <li>
              <a routerLink="/faculty/dashboard" routerLinkActive="active" (click)="onLinkClick()" class="nav-link">
                <span class="nav-icon-wrap">
                  <app-icon name="dashboard" [size]="18"></app-icon>
                </span>
                <span class="nav-label">Faculty Dashboard</span>
                <span class="active-pill"></span>
              </a>
            </li>

            <li>
              <a routerLink="/faculty/classes" routerLinkActive="active" (click)="onLinkClick()" class="nav-link">
                <span class="nav-icon-wrap">
                  <app-icon name="courses" [size]="18"></app-icon>
                </span>
                <span class="nav-label">My Classes</span>
                <span class="active-pill"></span>
              </a>
            </li>

            <li>
              <a routerLink="/faculty/attendance" routerLinkActive="active" (click)="onLinkClick()" class="nav-link">
                <span class="nav-icon-wrap">
                  <app-icon name="attendance" [size]="18"></app-icon>
                </span>
                <span class="nav-label">Attendance</span>
                <span class="active-pill"></span>
              </a>
            </li>

            <li>
              <a routerLink="/faculty/materials" routerLinkActive="active" (click)="onLinkClick()" class="nav-link">
                <span class="nav-icon-wrap">
                  <app-icon name="materials" [size]="18"></app-icon>
                </span>
                <span class="nav-label">Learning Materials</span>
                <span class="active-pill"></span>
              </a>
            </li>

            <li>
              <a routerLink="/faculty/assignments" routerLinkActive="active" (click)="onLinkClick()" class="nav-link">
                <span class="nav-icon-wrap">
                  <app-icon name="assignments" [size]="18"></app-icon>
                </span>
                <span class="nav-label">Grading & Tasks</span>
                <span class="active-pill"></span>
              </a>
            </li>

            <li>
              <a routerLink="/faculty/assessments" routerLinkActive="active" (click)="onLinkClick()" class="nav-link">
                <span class="nav-icon-wrap">
                  <app-icon name="assessments" [size]="18"></app-icon>
                </span>
                <span class="nav-label">Quiz & Assessments</span>
                <span class="active-pill"></span>
              </a>
            </li>
          } @else {
            <!-- Student Navigation Items -->
            <li>
              <a routerLink="/dashboard" routerLinkActive="active" (click)="onLinkClick()" class="nav-link">
                <span class="nav-icon-wrap">
                  <app-icon name="dashboard" [size]="18"></app-icon>
                </span>
                <span class="nav-label">Dashboard</span>
                <span class="active-pill"></span>
              </a>
            </li>

            <li>
              <a routerLink="/courses" routerLinkActive="active" (click)="onLinkClick()" class="nav-link">
                <span class="nav-icon-wrap">
                  <app-icon name="courses" [size]="18"></app-icon>
                </span>
                <span class="nav-label">My Courses</span>
                <span class="active-pill"></span>
              </a>
            </li>

            <li>
              <a routerLink="/attendance" routerLinkActive="active" (click)="onLinkClick()" class="nav-link">
                <span class="nav-icon-wrap">
                  <app-icon name="attendance" [size]="18"></app-icon>
                </span>
                <span class="nav-label">Attendance</span>
                <span class="active-pill"></span>
              </a>
            </li>

            <li>
              <a routerLink="/assignments" routerLinkActive="active" (click)="onLinkClick()" class="nav-link">
                <span class="nav-icon-wrap">
                  <app-icon name="assignments" [size]="18"></app-icon>
                </span>
                <span class="nav-label">Assignments</span>
                <span class="active-pill"></span>
              </a>
            </li>

            <li>
              <a routerLink="/learning-materials" routerLinkActive="active" (click)="onLinkClick()" class="nav-link">
                <span class="nav-icon-wrap">
                  <app-icon name="materials" [size]="18"></app-icon>
                </span>
                <span class="nav-label">Learning Materials</span>
                <span class="active-pill"></span>
              </a>
            </li>

            <li>
              <a routerLink="/results" routerLinkActive="active" (click)="onLinkClick()" class="nav-link">
                <span class="nav-icon-wrap">
                  <app-icon name="results" [size]="18"></app-icon>
                </span>
                <span class="nav-label">Results</span>
                <span class="active-pill"></span>
              </a>
            </li>

            <li>
              <a routerLink="/assessments" routerLinkActive="active" (click)="onLinkClick()" class="nav-link">
                <span class="nav-icon-wrap">
                  <app-icon name="assessments" [size]="18"></app-icon>
                </span>
                <span class="nav-label">Quiz / Assessments</span>
                <span class="active-pill"></span>
              </a>
            </li>

            <li>
              <a routerLink="/profile" routerLinkActive="active" (click)="onLinkClick()" class="nav-link">
                <span class="nav-icon-wrap">
                  <app-icon name="profile" [size]="18"></app-icon>
                </span>
                <span class="nav-label">My Profile</span>
                <span class="active-pill"></span>
              </a>
            </li>
          }
        </ul>

        @if (!isFaculty()) {
          <div class="nav-group-label" style="margin-top: 24px;">EXPLORE</div>
          <ul class="nav-list">
            <li>
              <a routerLink="/ai-assistant" routerLinkActive="active" (click)="onLinkClick()" class="nav-link ai-nav-link">
                <span class="nav-icon-wrap ai-icon-wrap">
                  <app-icon name="ai" [size]="18"></app-icon>
                </span>
                <span class="nav-label">AI Assistant</span>
                <span class="badge badge-amber badge-sm">Soon</span>
              </a>
            </li>
          </ul>
        }
      </nav>

      <!-- Sidebar Footer -->
      <div class="sidebar-footer">
        <button class="sidebar-logout-btn" (click)="logout()" title="Sign Out">
          <app-icon name="logout" [size]="16"></app-icon>
          <span>Sign Out</span>
        </button>
        <div class="footer-system-badge">
          <span class="system-dot"></span>
          <span class="system-text">Backend: .NET 10 &bull; PostgreSQL</span>
        </div>
      </div>
    </aside>
  `,
  styles: [`
    :host {
      display: block;
      height: 100%;
    }

    .sidebar {
      width: 272px;
      height: 100vh;
      background-color: var(--bg-surface);
      border-right: 1px solid var(--border-subtle);
      display: flex;
      flex-direction: column;
      position: sticky;
      top: 0;
      z-index: 100;
      transition: transform var(--transition-normal);
    }

    .brand-container {
      padding: 24px 20px 20px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid var(--border-subtle);
    }

    .brand-crest {
      display: flex;
      align-items: center;
      gap: 12px;
      text-decoration: none;
    }

    .crest-diamond {
      width: 38px;
      height: 38px;
      background: var(--color-forest);
      border-radius: 9px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 3px 8px rgba(23, 63, 53, 0.25), 0 1px 0 rgba(255, 255, 255, 0.2) inset;
      transform: rotate(-3deg);
      transition: transform 0.2s ease;
    }

    .crest-diamond:hover {
      transform: rotate(0deg) scale(1.04);
    }

    .crest-letter {
      color: #F7F5EF;
      font-family: var(--font-editorial);
      font-size: 20px;
      font-weight: 600;
      line-height: 1;
    }

    .brand-text {
      display: flex;
      flex-direction: column;
    }

    .brand-title {
      font-size: 17px;
      font-weight: 800;
      letter-spacing: -0.02em;
      color: var(--color-forest);
      line-height: 1.1;
    }

    .brand-ai {
      color: var(--color-amber-dark);
      font-weight: 700;
    }

    .brand-subtitle {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.12em;
      color: var(--text-muted);
      margin-top: 2px;
    }

    .mobile-close-btn {
      display: none;
      background: transparent;
      border: none;
      cursor: pointer;
      color: var(--text-secondary);
      padding: 4px;
      border-radius: var(--radius-sm);
    }

    /* Student Mini Card */
    .student-mini-card {
      margin: 16px 16px 12px 16px;
      padding: 12px;
      background-color: var(--color-forest-surface);
      border: 1px solid var(--color-forest-border);
      border-radius: var(--radius-md);
      display: flex;
      align-items: center;
      gap: 12px;
      box-shadow: 0 1px 3px rgba(23, 63, 53, 0.04);
    }

    .student-avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: var(--color-forest);
      color: #FFFFFF;
      font-weight: 700;
      font-size: 13px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 4px rgba(23, 63, 53, 0.2);
      flex-shrink: 0;
    }

    .student-meta {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
    }

    .student-name {
      font-size: 13px;
      font-weight: 700;
      color: var(--color-forest);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      line-height: 1.2;
    }

    .student-enrollment {
      font-size: 11px;
      color: var(--text-muted);
      margin-top: 2px;
    }

    .status-indicator {
      display: flex;
      align-items: center;
    }

    .pulse-dot {
      width: 8px;
      height: 8px;
      background-color: #28a745;
      border-radius: 50%;
      box-shadow: 0 0 0 3px rgba(40, 167, 69, 0.2);
    }

    /* Nav Scroller */
    .nav-scroller {
      flex: 1;
      padding: 8px 16px;
      overflow-y: auto;
    }

    .nav-group-label {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.1em;
      color: var(--text-muted);
      padding: 8px 12px 4px 12px;
    }

    .nav-list {
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    .nav-link {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 9px 12px;
      border-radius: var(--radius-md);
      color: var(--text-secondary);
      text-decoration: none;
      font-size: 13.5px;
      font-weight: 600;
      position: relative;
      transition: background-color var(--transition-fast), color var(--transition-fast), transform var(--transition-fast);
    }

    .nav-link:hover:not(.disabled-link) {
      background-color: var(--bg-surface-subtle);
      color: var(--text-main);
      transform: translateX(2px);
    }

    .disabled-link {
      opacity: 0.65;
      cursor: not-allowed;
    }

    .nav-icon-wrap {
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--text-muted);
      transition: color var(--transition-fast), transform var(--transition-fast);
    }

    .nav-link:hover:not(.disabled-link) .nav-icon-wrap {
      color: var(--color-forest);
      transform: scale(1.08);
    }

    .nav-label {
      flex: 1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .active-pill {
      display: none;
      width: 5px;
      height: 18px;
      background-color: var(--color-forest);
      border-radius: var(--radius-full);
      box-shadow: 0 1px 4px rgba(23, 63, 53, 0.3);
    }

    .nav-link.active {
      background-color: var(--color-forest-surface);
      color: var(--color-forest);
      font-weight: 700;
    }

    .nav-link.active .nav-icon-wrap {
      color: var(--color-forest);
    }

    .nav-link.active .active-pill {
      display: block;
    }

    .ai-icon-wrap {
      color: var(--color-amber-dark);
    }

    .badge-sm {
      padding: 1px 6px;
      font-size: 10px;
    }

    /* Footer */
    .sidebar-footer {
      padding: 12px 16px;
      border-top: 1px solid var(--border-subtle);
      background-color: var(--bg-surface);
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .sidebar-logout-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      width: 100%;
      padding: 8px 12px;
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      background: var(--bg-surface-subtle);
      color: var(--text-secondary);
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all var(--transition-fast);
    }

    .sidebar-logout-btn:hover {
      background: var(--color-danger-surface);
      color: var(--color-danger);
      border-color: var(--color-danger-border);
    }

    .footer-system-badge {
      display: flex;
      align-items: center;
      gap: 7px;
      font-size: 11px;
      color: var(--text-muted);
    }

    .system-dot {
      width: 6px;
      height: 6px;
      background-color: var(--color-teal);
      border-radius: 50%;
    }

    /* Mobile Drawer */
    @media (max-width: 900px) {
      .sidebar {
        position: fixed;
        left: 0;
        top: 0;
        bottom: 0;
        transform: translateX(-100%);
        box-shadow: 0 0 40px rgba(0, 0, 0, 0.2);
      }

      .sidebar.mobile-open {
        transform: translateX(0);
      }

      .mobile-close-btn {
        display: flex;
      }
    }
  `]
})
export class SidebarComponent {
  private readonly studentService = inject(StudentService);
  private readonly authService = inject(AuthService);

  isOpen = input<boolean>(false);
  closeNav = output<void>();

  isFaculty = this.authService.isFaculty;
  studentProfile = this.studentService.studentProfile;

  userName(): string {
    if (this.isFaculty()) {
      return this.authService.currentFaculty()?.fullName || 'Faculty Member';
    }
    return this.authService.currentUser()?.fullName || this.studentProfile()?.fullName || 'Demo Student';
  }

  userIdentifier(): string {
    if (this.isFaculty()) {
      return this.authService.currentFaculty()?.employeeCode || 'FAC-DEMO-001';
    }
    return this.authService.currentUser()?.enrollmentNumber || this.studentService.activeEnrollmentNumber();
  }

  userInitials(): string {
    const name = this.userName();
    const parts = name.split(' ').filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase() || (this.isFaculty() ? 'FC' : 'ST');
  }

  onLinkClick(): void {
    if (window.innerWidth <= 900) {
      this.closeNav.emit();
    }
  }

  logout(): void {
    this.authService.logout();
  }
}
