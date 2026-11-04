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
      <!-- Brand Logo Header -->
      <div class="brand-container">
        <div class="brand-crest">
          <div class="crest-icon">
            <span class="crest-text">CR</span>
          </div>
          <div class="brand-text">
            <span class="brand-title">CRHDRI<span class="brand-accent">.AI</span></span>
            <span class="brand-subtitle">{{ isFaculty() ? 'Faculty Portal' : 'Student Portal' }}</span>
          </div>
        </div>
        <button class="mobile-close-btn" (click)="closeNav.emit()" aria-label="Close navigation menu">
          <app-icon name="close" [size]="18"></app-icon>
        </button>
      </div>

      <!-- Authenticated User Profile Summary -->
      <div class="user-card-clean">
        <div class="user-avatar" [class.faculty-avatar]="isFaculty()" [attr.aria-label]="userName()">
          {{ userInitials() }}
        </div>
        <div class="user-meta">
          <span class="user-name" [title]="userName()">{{ userName() }}</span>
          <span class="user-id font-mono">{{ userIdentifier() }}</span>
        </div>
        <div class="status-indicator" [title]="isFaculty() ? 'Active Faculty Session' : 'Active Enrollment Status'">
          <span class="active-dot"></span>
        </div>
      </div>

      <!-- Navigation Menu -->
      <nav class="nav-scroller" aria-label="Main Navigation">
        <div class="nav-group-label">{{ isFaculty() ? 'FACULTY OPERATIONS' : 'ACADEMIC PORTAL' }}</div>
        <ul class="nav-list">
          @if (isFaculty()) {
            <!-- Faculty Menu -->
            <li>
              <a routerLink="/faculty/dashboard" routerLinkActive="active" (click)="onLinkClick()" class="nav-link">
                <span class="nav-icon-wrap"><app-icon name="dashboard" [size]="18"></app-icon></span>
                <span class="nav-label">Faculty Dashboard</span>
              </a>
            </li>
            <li>
              <a routerLink="/faculty/classes" routerLinkActive="active" (click)="onLinkClick()" class="nav-link">
                <span class="nav-icon-wrap"><app-icon name="courses" [size]="18"></app-icon></span>
                <span class="nav-label">My Classes</span>
              </a>
            </li>
            <li>
              <a routerLink="/faculty/attendance" routerLinkActive="active" (click)="onLinkClick()" class="nav-link">
                <span class="nav-icon-wrap"><app-icon name="attendance" [size]="18"></app-icon></span>
                <span class="nav-label">Attendance Manager</span>
              </a>
            </li>
            <li>
              <a routerLink="/faculty/materials" routerLinkActive="active" (click)="onLinkClick()" class="nav-link">
                <span class="nav-icon-wrap"><app-icon name="materials" [size]="18"></app-icon></span>
                <span class="nav-label">Learning Materials</span>
              </a>
            </li>
            <li>
              <a routerLink="/faculty/assignments" routerLinkActive="active" (click)="onLinkClick()" class="nav-link">
                <span class="nav-icon-wrap"><app-icon name="assignments" [size]="18"></app-icon></span>
                <span class="nav-label">Grading & Tasks</span>
              </a>
            </li>
            <li>
              <a routerLink="/faculty/assessments" routerLinkActive="active" (click)="onLinkClick()" class="nav-link">
                <span class="nav-icon-wrap"><app-icon name="assessments" [size]="18"></app-icon></span>
                <span class="nav-label">Quiz & Assessments</span>
              </a>
            </li>
          } @else {
            <!-- Student Menu -->
            <li>
              <a routerLink="/dashboard" routerLinkActive="active" (click)="onLinkClick()" class="nav-link">
                <span class="nav-icon-wrap"><app-icon name="dashboard" [size]="18"></app-icon></span>
                <span class="nav-label">Dashboard</span>
              </a>
            </li>
            <li>
              <a routerLink="/courses" routerLinkActive="active" (click)="onLinkClick()" class="nav-link">
                <span class="nav-icon-wrap"><app-icon name="courses" [size]="18"></app-icon></span>
                <span class="nav-label">My Courses</span>
              </a>
            </li>
            <li>
              <a routerLink="/attendance" routerLinkActive="active" (click)="onLinkClick()" class="nav-link">
                <span class="nav-icon-wrap"><app-icon name="attendance" [size]="18"></app-icon></span>
                <span class="nav-label">Attendance</span>
              </a>
            </li>
            <li>
              <a routerLink="/assignments" routerLinkActive="active" (click)="onLinkClick()" class="nav-link">
                <span class="nav-icon-wrap"><app-icon name="assignments" [size]="18"></app-icon></span>
                <span class="nav-label">Assignments</span>
              </a>
            </li>
            <li>
              <a routerLink="/learning-materials" routerLinkActive="active" (click)="onLinkClick()" class="nav-link">
                <span class="nav-icon-wrap"><app-icon name="materials" [size]="18"></app-icon></span>
                <span class="nav-label">Learning Materials</span>
              </a>
            </li>
            <li>
              <a routerLink="/results" routerLinkActive="active" (click)="onLinkClick()" class="nav-link">
                <span class="nav-icon-wrap"><app-icon name="results" [size]="18"></app-icon></span>
                <span class="nav-label">Results</span>
              </a>
            </li>
            <li>
              <a routerLink="/assessments" routerLinkActive="active" (click)="onLinkClick()" class="nav-link">
                <span class="nav-icon-wrap"><app-icon name="assessments" [size]="18"></app-icon></span>
                <span class="nav-label">Quiz & Assessments</span>
              </a>
            </li>
            <li>
              <a routerLink="/profile" routerLinkActive="active" (click)="onLinkClick()" class="nav-link">
                <span class="nav-icon-wrap"><app-icon name="profile" [size]="18"></app-icon></span>
                <span class="nav-label">My Profile</span>
              </a>
            </li>
          }
        </ul>

        @if (!isFaculty()) {
          <div class="nav-group-label" style="margin-top: 20px;">EXPLORE</div>
          <ul class="nav-list">
            <li>
              <a routerLink="/ai-assistant" routerLinkActive="active" (click)="onLinkClick()" class="nav-link">
                <span class="nav-icon-wrap ai-icon"><app-icon name="ai" [size]="18"></app-icon></span>
                <span class="nav-label">AI Academic Copilot</span>
                <span class="badge badge-info" style="font-size: 10px; padding: 1px 6px;">Spec</span>
              </a>
            </li>
          </ul>
        }
      </nav>

      <!-- Sidebar Footer -->
      <div class="sidebar-footer">
        <button class="logout-btn-clean" (click)="logout()" title="Sign Out">
          <app-icon name="logout" [size]="16"></app-icon>
          <span>Sign Out</span>
        </button>
        <div class="footer-system-status">
          <span class="sys-dot"></span>
          <span class="sys-text">.NET 10 API &bull; PostgreSQL</span>
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
      width: 260px;
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
      padding: 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid var(--border-subtle);
    }

    .brand-crest {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .crest-icon {
      width: 36px;
      height: 36px;
      background: var(--color-teal);
      border-radius: var(--radius-md);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 4px rgba(15, 118, 110, 0.2);
    }

    .crest-text {
      color: #FFFFFF;
      font-size: 14px;
      font-weight: 800;
      letter-spacing: -0.02em;
    }

    .brand-text {
      display: flex;
      flex-direction: column;
    }

    .brand-title {
      font-size: 16px;
      font-weight: 800;
      letter-spacing: -0.02em;
      color: var(--text-main);
      line-height: 1.15;
    }

    .brand-accent {
      color: var(--color-teal);
    }

    .brand-subtitle {
      font-size: 10.5px;
      font-weight: 600;
      letter-spacing: 0.04em;
      color: var(--text-secondary);
      margin-top: 1px;
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

    /* User Mini Card */
    .user-card-clean {
      margin: 14px 14px 8px 14px;
      padding: 10px 12px;
      background-color: var(--bg-surface-subtle);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .user-avatar {
      width: 34px;
      height: 34px;
      border-radius: 50%;
      background: var(--color-teal-surface);
      color: var(--color-teal);
      border: 1px solid var(--color-teal-border);
      font-weight: 700;
      font-size: 12.5px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .user-avatar.faculty-avatar {
      background: var(--color-amber-surface);
      color: var(--color-amber);
      border-color: var(--color-amber-border);
    }

    .user-meta {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
    }

    .user-name {
      font-size: 12.5px;
      font-weight: 700;
      color: var(--text-main);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      line-height: 1.2;
    }

    .user-id {
      font-size: 11px;
      color: var(--text-secondary);
      margin-top: 2px;
    }

    .status-indicator {
      display: flex;
      align-items: center;
    }

    .active-dot {
      width: 7px;
      height: 7px;
      background-color: var(--color-success);
      border-radius: 50%;
      box-shadow: 0 0 0 2px rgba(21, 128, 61, 0.2);
    }

    /* Nav Scroller */
    .nav-scroller {
      flex: 1;
      padding: 8px 12px;
      overflow-y: auto;
    }

    .nav-group-label {
      font-size: 10.5px;
      font-weight: 700;
      letter-spacing: 0.06em;
      color: var(--text-muted);
      padding: 6px 10px 4px 10px;
    }

    .nav-list {
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .nav-link {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 12px;
      border-radius: var(--radius-md);
      color: var(--text-secondary);
      text-decoration: none;
      font-size: 13.5px;
      font-weight: 500;
      transition: all var(--transition-fast);
    }

    .nav-link:hover {
      background-color: var(--bg-surface-subtle);
      color: var(--text-main);
    }

    .nav-link.active {
      background-color: var(--color-teal-surface);
      color: var(--color-teal);
      font-weight: 600;
    }

    .nav-icon-wrap {
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--text-secondary);
      transition: color var(--transition-fast);
    }

    .nav-link.active .nav-icon-wrap {
      color: var(--color-teal);
    }

    .nav-label {
      flex: 1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .ai-icon {
      color: var(--color-info);
    }

    /* Footer */
    .sidebar-footer {
      padding: 12px 14px;
      border-top: 1px solid var(--border-subtle);
      background-color: var(--bg-surface);
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .logout-btn-clean {
      display: flex;
      align-items: center;
      gap: 8px;
      width: 100%;
      padding: 7px 10px;
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      background: var(--bg-surface);
      color: var(--text-secondary);
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all var(--transition-fast);
    }

    .logout-btn-clean:hover {
      background: var(--color-danger-surface);
      color: var(--color-danger);
      border-color: var(--color-danger-border);
    }

    .footer-system-status {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 10.5px;
      color: var(--text-muted);
      padding: 0 4px;
    }

    .sys-dot {
      width: 6px;
      height: 6px;
      background-color: var(--color-teal);
      border-radius: 50%;
    }

    @media (max-width: 900px) {
      .sidebar {
        position: fixed;
        left: 0;
        top: 0;
        bottom: 0;
        transform: translateX(-100%);
        box-shadow: 0 0 30px rgba(0, 0, 0, 0.15);
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
