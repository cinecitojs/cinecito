import create from 'zustand';

type State = { token: string | null; setToken: (t: string | null) => void };

export const useAuthStore = create<State>((set) => ({
  token: typeof window !== 'undefined' ? localStorage.getItem('token') : null,
  setToken: (t) => { if (t) localStorage.setItem('token', t); else localStorage.removeItem('token'); set({ token: t }); }
}));
