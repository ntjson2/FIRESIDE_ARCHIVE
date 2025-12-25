import { create } from 'zustand';

interface OutlineState {
  items: any[]; // Replace with proper type later
  addItem: (item: any) => void;
  removeItem: (id: string) => void;
}

export const useOutlineStore = create<OutlineState>((set) => ({
  items: [],
  addItem: (item) => set((state) => ({ items: [...state.items, item] })),
  removeItem: (id) => set((state) => ({ items: state.items.filter((i) => i.id !== id) })),
}));
