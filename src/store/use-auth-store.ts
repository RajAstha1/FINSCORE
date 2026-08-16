import { create } from 'zustand';
import type { AuthUser, UserRole } from '@/lib/auth';

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  login: (user: AuthUser, token: string) => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
  hasRole: (...roles: UserRole[]) => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  
  login: (user, token) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('arogya_token', token);
      localStorage.setItem('arogya_user', JSON.stringify(user));
    }
    set({ user, token, isAuthenticated: true, isLoading: false });
  },
  
  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('arogya_token');
      localStorage.removeItem('arogya_user');
    }
    set({ user: null, token: null, isAuthenticated: false, isLoading: false });
  },
  
  setLoading: (loading) => set({ isLoading: loading }),
  
  hasRole: (...roles) => {
    const { user } = get();
    return user ? roles.includes(user.role) : false;
  },
}));