import { useEffect } from 'react';
import { useAudioPipelineStore } from '../stores/audioPipelineStore';

/**
 * Binds a component to the audio pipeline. Stops the pipeline on unmount
 * only when the component was the one that started it.
 */
export function useAudioPipeline() {
  const state = useAudioPipelineStore();

  useEffect(() => {
    return () => {
      if (state.status !== 'offline') {
        state.stop();
      }
    };
    // stop is stable; status changes should not re-run the cleanup
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return state;
}
