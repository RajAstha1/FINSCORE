'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/store/use-auth-store';
import { useAppStore } from '@/store/use-app-store';
import LoginPage from '@/components/auth/login-page';
import AppShell from '@/components/layout/app-shell';

export default function Home() {
  const { isAuthenticated, token, setLoading } = useAuthStore();
  const { currentPage, navigate } = useAppStore();

  // Restore auth state from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const storedToken = localStorage.getItem('arogya_token');
    const storedUser = localStorage.getItem('arogya_user');

    if (storedToken && storedUser) {
      try {
        const user = JSON.parse(storedUser);
        useAuthStore.getState().login(user, storedToken);
      } catch {
        localStorage.removeItem('arogya_token');
        localStorage.removeItem('arogya_user');
      }
    } else {
      setLoading(false);
    }
  }, []);

  // Redirect to dashboard when authenticated and on login page
  useEffect(() => {
    if (isAuthenticated && currentPage === 'login') {
      navigate('dashboard');
    }
  }, [isAuthenticated, currentPage, navigate]);

  // Show login or app shell based on auth state
  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return <AppShell />;
}
