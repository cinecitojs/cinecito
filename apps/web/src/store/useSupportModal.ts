// apps/web/src/store/useSupportModal.ts
// Control global del modal de apoyo: cualquier botón "Apoyar" lo abre (→ Ko-fi).
import { create } from 'zustand';
import type { SupportTier } from '../lib/support';

interface SupportModalState {
  open: boolean;
  focusTier: SupportTier | null;
  openModal: (tier?: SupportTier | null) => void;
  closeModal: () => void;
}

export const useSupportModal = create<SupportModalState>((set) => ({
  open: false,
  focusTier: null,
  openModal: (tier = null) => set({ open: true, focusTier: tier }),
  closeModal: () => set({ open: false }),
}));
