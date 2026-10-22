import { Injectable, signal } from '@angular/core';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title?: string;
  message: string;
  duration?: number;
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  readonly toasts = signal<ToastMessage[]>([]);

  show(toast: Omit<ToastMessage, 'id'>): void {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast: ToastMessage = { ...toast, id };
    
    this.toasts.update(current => [...current, newToast]);

    const duration = toast.duration ?? 4500;
    setTimeout(() => {
      this.dismiss(id);
    }, duration);
  }

  success(message: string, title?: string): void {
    this.show({ type: 'success', message, title });
  }

  error(message: string, title?: string): void {
    this.show({ type: 'error', message, title });
  }

  info(message: string, title?: string): void {
    this.show({ type: 'info', message, title });
  }

  warning(message: string, title?: string): void {
    this.show({ type: 'warning', message, title });
  }

  dismiss(id: string): void {
    this.toasts.update(current => current.filter(t => t.id !== id));
  }
}
