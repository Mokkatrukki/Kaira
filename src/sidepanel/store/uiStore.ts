import { create } from 'zustand';
import { UIState, LivePreviewInfo } from './types';

// Create a store for UI-related state
export const useStore = create<UIState>((set) => ({
  livePreviewInfo: null,
  showLivePreview: true,
  
  setLivePreviewInfo: (info: LivePreviewInfo | null) => set({ livePreviewInfo: info }),
  setShowLivePreview: (show: boolean) => set({ showLivePreview: show }),
})); 