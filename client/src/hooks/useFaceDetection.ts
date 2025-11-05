import { useState, useEffect, useCallback, useRef } from 'react';
import { faceDetectionService, type FaceMetrics, type BlinkEvent, type FaceDetectionSettings } from '@/lib/faceDetection';

export interface FaceDetectionHook {
  metrics: FaceMetrics | null;
  isActive: boolean;
  isInitialized: boolean;
  error: string | null;
  blinkHistory: BlinkEvent[];
  startDetection: () => Promise<void>;
  stopDetection: () => void;
  clearHistory: () => void;
  updateSettings: (settings: Partial<FaceDetectionSettings>) => void;
  settings: FaceDetectionSettings;
}

export function useFaceDetection(): FaceDetectionHook {
  const [metrics, setMetrics] = useState<FaceMetrics | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [blinkHistory, setBlinkHistory] = useState<BlinkEvent[]>([]);
  const [settings, setSettings] = useState<FaceDetectionSettings>(faceDetectionService.getSettings());
  
  // Use ref to track if component is mounted to prevent state updates after unmount
  const isMountedRef = useRef(true);
  
  // Use ref to store the callback to avoid recreating it on every render
  const updateMetricsRef = useRef((newMetrics: FaceMetrics) => {
    if (isMountedRef.current) {
      setMetrics(newMetrics);
      setBlinkHistory(faceDetectionService.getBlinkHistory());
    }
  });
  
  // Update ref when it changes
  useEffect(() => {
    updateMetricsRef.current = (newMetrics: FaceMetrics) => {
      if (isMountedRef.current) {
        setMetrics(newMetrics);
        setBlinkHistory(faceDetectionService.getBlinkHistory());
      }
    };
  });

  const startDetection = useCallback(async () => {
    if (isActive) {
      console.warn('Face detection already active');
      return;
    }

    try {
      setError(null);
      
      if (!isInitialized) {
        await faceDetectionService.initialize();
        if (isMountedRef.current) {
          setIsInitialized(true);
        }
      }

      faceDetectionService.startDetection(updateMetricsRef.current);
      if (isMountedRef.current) {
        setIsActive(true);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start face detection';
      if (isMountedRef.current) {
        setError(errorMessage);
      }
      console.error('Face detection start error:', err);
    }
  }, [isActive, isInitialized]);

  const stopDetection = useCallback(() => {
    if (!isActive) {
      return;
    }

    faceDetectionService.stopDetection();
    if (isMountedRef.current) {
      setIsActive(false);
      setMetrics(null);
    }
  }, [isActive]);

  const clearHistory = useCallback(() => {
    faceDetectionService.clearBlinkHistory();
    if (isMountedRef.current) {
      setBlinkHistory([]);
    }
  }, []);

  const updateSettings = useCallback((partial: Partial<FaceDetectionSettings>) => {
    faceDetectionService.setSettings(partial);
    if (isMountedRef.current) {
      setSettings(faceDetectionService.getSettings());
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    
    return () => {
      isMountedRef.current = false;
      if (isActive) {
        faceDetectionService.stopDetection();
      }
    };
  }, [isActive]);

  return {
    metrics,
    isActive,
    isInitialized,
    error,
    blinkHistory,
    startDetection,
    stopDetection,
    clearHistory,
    updateSettings,
    settings,
  };
}