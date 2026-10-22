import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '../../core/services/toast.service';
import { IconComponent } from './icon.component';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    <div class="toast-container" aria-live="polite">
      @for (toast of toasts(); track toast.id) {
        <div class="toast" [class]="'toast-' + toast.type">
          <div class="toast-icon">
            @switch (toast.type) {
              @case ('success') { <app-icon name="check" [size]="18"></app-icon> }
              @case ('error') { <app-icon name="alert" [size]="18"></app-icon> }
              @case ('warning') { <app-icon name="alert" [size]="18"></app-icon> }
              @default { <app-icon name="assessments" [size]="18"></app-icon> }
            }
          </div>
          <div class="toast-content">
            @if (toast.title) {
              <div class="toast-title">{{ toast.title }}</div>
            }
            <div class="toast-message">{{ toast.message }}</div>
          </div>
          <button class="toast-close" (click)="dismiss(toast.id)" aria-label="Close notification">✕</button>
        </div>
      }
    </div>
  `,
  styles: [`
    .toast-container {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 10px;
      pointer-events: none;
    }

    .toast {
      pointer-events: auto;
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 14px 18px;
      background: var(--bg-surface);
      border-radius: var(--radius-md);
      box-shadow: 0 10px 30px rgba(32, 40, 36, 0.12), 0 2px 6px rgba(32, 40, 36, 0.06);
      border: 1px solid var(--border-subtle);
      min-width: 300px;
      max-width: 440px;
      animation: toast-slide 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes toast-slide {
      from { transform: translateY(12px) scale(0.96); opacity: 0; }
      to { transform: translateY(0) scale(1); opacity: 1; }
    }

    .toast-success {
      border-left: 4px solid var(--color-success);
    }
    .toast-success .toast-icon {
      color: var(--color-success);
    }

    .toast-error {
      border-left: 4px solid var(--color-danger);
    }
    .toast-error .toast-icon {
      color: var(--color-danger);
    }

    .toast-warning {
      border-left: 4px solid var(--color-amber-dark);
    }
    .toast-warning .toast-icon {
      color: var(--color-amber-dark);
    }

    .toast-info {
      border-left: 4px solid var(--color-teal);
    }
    .toast-info .toast-icon {
      color: var(--color-teal);
    }

    .toast-icon {
      margin-top: 2px;
      flex-shrink: 0;
    }

    .toast-content {
      flex: 1;
    }

    .toast-title {
      font-weight: 700;
      font-size: 13.5px;
      color: var(--text-main);
      margin-bottom: 2px;
    }

    .toast-message {
      font-size: 13px;
      color: var(--text-secondary);
      line-height: 1.4;
    }

    .toast-close {
      background: transparent;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      font-size: 14px;
      padding: 2px 4px;
      border-radius: var(--radius-xs);
    }
  `]
})
export class ToastContainerComponent {
  private readonly toastService = inject(ToastService);
  readonly toasts = this.toastService.toasts;

  dismiss(id: string): void {
    this.toastService.dismiss(id);
  }
}
