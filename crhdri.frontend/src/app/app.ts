import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs';
import { SidebarComponent } from './layout/sidebar/sidebar.component';
import { TopbarComponent } from './layout/topbar/topbar.component';
import { ToastContainerComponent } from './shared/components/toast-container.component';
import { StudentService } from './core/services/student.service';
import { AuthService } from './core/services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, SidebarComponent, TopbarComponent, ToastContainerComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  private readonly studentService = inject(StudentService);
  readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  mobileNavOpen = signal<boolean>(false);
  isAuthRoute = signal<boolean>(false);

  constructor() {
    this.checkCurrentRoute(this.router.url);
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      this.checkCurrentRoute(event.urlAfterRedirects || event.url);
    });
  }

  ngOnInit(): void {
    if (this.authService.isStudent()) {
      this.studentService.getProfile().subscribe({
        error: (err) => console.warn('[CRHDRI] Initial profile load warning:', err.message)
      });
    }

    this.studentService.checkDatabaseHealth().subscribe({
      next: (h) => console.log('[CRHDRI] Backend connected:', h),
      error: (err) => console.warn('[CRHDRI] Health check failed:', err.message)
    });
  }

  private checkCurrentRoute(url: string): void {
    this.isAuthRoute.set(url.includes('/login'));
  }

  toggleMobileNav(): void {
    this.mobileNavOpen.update(v => !v);
  }

  closeMobileNav(): void {
    this.mobileNavOpen.set(false);
  }
}
