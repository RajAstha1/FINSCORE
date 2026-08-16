import { create } from 'zustand';

export type AppPage = 
  | 'login'
  | 'dashboard'
  | 'applications'
  | 'application-new'
  | 'application-detail'
  | 'beneficiaries'
  | 'beneficiary-detail'
  | 'model-monitoring'
  | 'fairness'
  | 'audit-logs'
  | 'admin-users'
  | 'admin-settings'
  | 'reports'
  | 'partner-portal';

interface AppState {
  currentPage: AppPage;
  pageParams: Record<string, string>;
  sidebarOpen: boolean;
  commandOpen: boolean;
  
  navigate: (page: AppPage, params?: Record<string, string>) => void;
  goBack: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setCommandOpen: (open: boolean) => void;
}

const NAVIGATION_HISTORY: AppPage[] = [];

export const useAppStore = create<AppState>((set, get) => ({
  currentPage: 'login',
  pageParams: {},
  sidebarOpen: true,
  commandOpen: false,
  
  navigate: (page, params = {}) => {
    const { currentPage } = get();
    if (currentPage !== 'login') {
      NAVIGATION_HISTORY.push(currentPage);
    }
    set({ currentPage: page, pageParams: params, sidebarOpen: false });
  },
  
  goBack: () => {
    const prev = NAVIGATION_HISTORY.pop();
    if (prev) {
      set({ currentPage: prev, pageParams: {} });
    }
  },
  
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setCommandOpen: (open) => set({ commandOpen: open }),
}));
