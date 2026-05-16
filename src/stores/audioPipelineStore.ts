import { create } from 'zustand';
import { audioPipeline, type PipelineState } from '../services/audio/AudioPipelineService';

type AudioPipelineStore = PipelineState & {
  engage: () => Promise<void>;
  calibrate: () => Promise<void>;
  stop: () => void;
};

export const useAudioPipelineStore = create<AudioPipelineStore>((set) => {
  audioPipeline.subscribe((state) => set(state));

  return {
    ...audioPipeline.getState(),
    engage: () => audioPipeline.engage(),
    calibrate: () => audioPipeline.calibrate(),
    stop: () => audioPipeline.stop(),
  };
});
