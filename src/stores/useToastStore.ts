import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastAction {
  label: string;
  onPress: () => void;
}

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  action?: ToastAction;
  duration?: number;
}

interface ToastState {
  toasts: Toast[];
  show: (toast: Omit<Toast, 'id'>) => void;
  dismiss: (id: string) => void;
  dismissAll: () => void;
}

let nextId = 0;

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],

  show: (toast) => {
    const id = `toast-${++nextId}`;
    set((state) => ({
      toasts: [...state.toasts, { ...toast, id }],
    }));
  },

  dismiss: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },

  dismissAll: () => {
    set({ toasts: [] });
  },
}));
