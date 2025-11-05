import { useState, useEffect, useMemo, type ChangeEvent } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, Camera, CameraOff, Eye, User, ChevronDown, ChevronUp } from 'lucide-react';
import { useFaceDetection } from '@/hooks/useFaceDetection';
import type { FaceMetrics } from '@/lib/faceDetection';

interface FaceDetectionDisplayProps {
  onMetricsUpdate?: (metrics: FaceMetrics) => void;
  autoStart?: boolean;
}

export function FaceDetectionDisplay({ onMetricsUpdate, autoStart = false }: FaceDetectionDisplayProps) {
  const { 
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
  } = useFaceDetection();
  
  const [sessionDuration, setSessionDuration] = useState(0);
  const [hasAutoStarted, setHasAutoStarted] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Update parent component with metrics
  useEffect(() => {
    if (metrics && onMetricsUpdate) {
      try {
        // STRESS DETECTION: Log stress score for debugging
        if (metrics.isPresent) {
          console.log(`📹 Face Stress Detection:`, {
            stressScore: metrics.stressScore,
            isHighStress: metrics.isHighStress,
            signals: metrics.signals
          });
        }
        onMetricsUpdate(metrics);
      } catch (e) {
        console.error('Error in onMetricsUpdate callback:', e);
      }
    }
  }, [metrics, onMetricsUpdate]);

  // Auto-start if requested (only once)
  useEffect(() => {
    if (autoStart && !isActive && !error && !hasAutoStarted) {
      setHasAutoStarted(true);
      startDetection().catch(err => {
        console.error('Auto-start failed:', err);
      });
    }
  }, [autoStart, isActive, error, hasAutoStarted, startDetection]);

  // Track session duration
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    
    if (isActive) {
      interval = setInterval(() => {
        setSessionDuration((prev: number) => prev + 1);
      }, 1000);
    } else {
      setSessionDuration(0);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive]);

  const handleToggleDetection = async () => {
    if (isActive) {
      stopDetection();
    } else {
      try {
        await startDetection();
      } catch (err) {
        console.error('Failed to start detection:', err);
      }
    }
  };

  const handleConfidenceChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value) && isFinite(value)) {
      updateSettings({ 
        minDetectionConfidence: value, 
        minTrackingConfidence: value 
      });
    }
  };

  const handleBlinkThresholdChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value) && isFinite(value)) {
      // Keep open slightly above close to preserve hysteresis
      updateSettings({ 
        blinkCloseThreshold: value, 
        blinkOpenThreshold: Math.min(0.35, value + 0.04) 
      });
    }
  };

  const formatDuration = (seconds: number): string => {
    if (!isFinite(seconds) || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStressLevel = useMemo(() => (metrics: FaceMetrics | null): 'low' | 'medium' | 'high' => {
    if (!metrics || !metrics.isPresent) return 'low';
    
    const blinkRateScore = metrics.blinkRate > 25 ? 1 : metrics.blinkRate > 15 ? 0.5 : 0;
    const browFurrowScore = metrics.browFurrow > 0.6 ? 1 : metrics.browFurrow > 0.3 ? 0.5 : 0;
    const gazeScore = metrics.gazeStability < 0.5 ? 1 : metrics.gazeStability < 0.8 ? 0.5 : 0;
    
    const totalScore = (blinkRateScore + browFurrowScore + gazeScore) / 3;
    
    if (totalScore > 0.6) return 'high';
    if (totalScore > 0.3) return 'medium';
    return 'low';
  }, []);

  const getStressColor = (level: 'low' | 'medium' | 'high'): string => {
    switch (level) {
      case 'low': return 'bg-chart-1 text-white';
      case 'medium': return 'bg-chart-5 text-white';
      case 'high': return 'bg-chart-3 text-white';
    }
  };

  const stressLevel = useMemo(() => getStressLevel(metrics), [metrics, getStressLevel]);

  return (
    <Card className="w-full max-w-full overflow-hidden">
      <CardHeader className="pb-3 sm:pb-6">
        <CardTitle className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <Eye className="w-5 h-5 flex-shrink-0" />
            <span className="text-base sm:text-lg">Facial Analysis</span>
          </div>
          <Button
            variant={isActive ? "destructive" : "default"}
            size="sm"
            onClick={handleToggleDetection}
            disabled={false}
            className="w-full sm:w-auto min-h-[44px]"
            data-testid="button-toggle-face-detection"
          >
            {isActive ? (
              <>
                <CameraOff className="w-4 h-4 mr-2" />
                Stop Camera
              </>
            ) : (
              <>
                <Camera className="w-4 h-4 mr-2" />
                Start Camera
              </>
            )}
          </Button>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-3 sm:space-y-4 px-4 sm:px-6">
        {error && (
          <div className="flex items-start space-x-2 text-destructive bg-destructive/10 p-3 rounded-md">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium leading-tight whitespace-pre-line">{error}</p>
              {error.includes('permission') && (
                <p className="text-xs mt-1 text-muted-foreground">
                  Check your browser settings to allow camera access for this site.
                </p>
              )}
              {error.includes('not found') && (
                <p className="text-xs mt-1 text-muted-foreground">
                  Make sure your camera is properly connected and not being used by another app.
                </p>
              )}
              {error.includes('HTTPS') && (
                <div className="text-xs mt-2 text-muted-foreground space-y-1">
                  <p className="font-semibold">📱 Mobile Browser Requirement:</p>
                  <p>Mobile browsers require HTTPS for camera access due to security policies.</p>
                  <p className="mt-1">If testing locally, try accessing via your computer's IP address with HTTPS enabled.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {isActive && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
            <span className="flex items-center gap-2">
              <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              Duration: <strong className="text-foreground">{formatDuration(sessionDuration)}</strong>
            </span>
            <span>
              Blinks: <strong className="text-foreground">{blinkHistory.length}</strong>
            </span>
          </div>
        )}

        {metrics ? (
          <div className="space-y-3 sm:space-y-4">
            {/* Presence & Overall Status */}
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center space-x-2">
                <User className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Face Detected</span>
              </div>
              <Badge 
                variant={metrics.isPresent ? "default" : "secondary"}
                className="text-xs px-3 py-1"
                data-testid="badge-face-present"
              >
                {metrics.isPresent ? "Yes" : "No"}
              </Badge>
            </div>

            {metrics.isPresent && (
              <>
                {/* Stress Level Indicator */}
                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <span className="text-sm font-medium">Stress Level</span>
                  <Badge 
                    className={`${getStressColor(stressLevel)} text-xs px-3 py-1`}
                    data-testid="badge-stress-level"
                  >
                    {stressLevel.toUpperCase()}
                  </Badge>
                </div>

                {/* STRESS DETECTION: Comprehensive Stress Score */}
                {metrics.stressScore !== undefined && (
                  <div className="border border-border rounded-lg p-4 bg-card/50">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-sm sm:text-base font-semibold">AI Stress Score</span>
                      <span className="text-2xl sm:text-3xl font-bold tabular-nums" data-testid="text-stress-score">
                        {metrics.stressScore}<span className="text-lg sm:text-xl text-muted-foreground">/100</span>
                      </span>
                    </div>
                    <Progress 
                      value={metrics.stressScore} 
                      className={`h-3 sm:h-4 ${metrics.isHighStress ? 'bg-red-100' : 'bg-green-100'}`}
                    />
                    {metrics.isHighStress && (
                      <div className="flex items-start gap-2 text-xs sm:text-sm text-red-600 font-semibold mt-2 p-2 bg-red-50 rounded">
                        <span className="text-base">⚠️</span>
                        <span className="leading-tight">High stress detected - trading may be restricted</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Core Metrics - Always Visible */}
                <div className="space-y-3">
                  <div className="bg-muted/20 p-3 rounded-lg">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="font-medium">Blink Rate</span>
                      <span className="font-semibold tabular-nums" data-testid="text-blink-rate">
                        {Math.max(0, Math.min(60, metrics.blinkRate))}/min
                      </span>
                    </div>
                    <Progress 
                      value={Math.min((metrics.blinkRate / 60) * 100, 100)} 
                      className="h-2"
                    />
                    <div className="text-xs text-muted-foreground mt-1">
                      Normal: 12-20/min
                    </div>
                  </div>

                  <div className="bg-muted/20 p-3 rounded-lg">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="font-medium">Brow Tension</span>
                      <span className="font-semibold tabular-nums" data-testid="text-brow-furrow">
                        {Math.round(Math.max(0, Math.min(1, metrics.browFurrow)) * 100)}%
                      </span>
                    </div>
                    <Progress 
                      value={Math.max(0, Math.min(100, metrics.browFurrow * 100))} 
                      className="h-2"
                    />
                  </div>

                  <div className="bg-muted/20 p-3 rounded-lg">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="font-medium">Gaze Stability</span>
                      <span className="font-semibold tabular-nums" data-testid="text-gaze-stability">
                        {Math.round(Math.max(0, Math.min(1, metrics.gazeStability)) * 100)}%
                      </span>
                    </div>
                    <Progress 
                      value={Math.max(0, Math.min(100, metrics.gazeStability * 100))} 
                      className="h-2"
                    />
                  </div>
                </div>

                {/* Advanced Metrics - Collapsible on Mobile */}
                <button
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="flex items-center justify-between w-full p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <span className="text-sm font-medium">Advanced Metrics</span>
                  {showAdvanced ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>

                {showAdvanced && (
                  <div className="space-y-3 animate-in slide-in-from-top-2">
                    <div className="bg-muted/20 p-3 rounded-lg">
                      <div className="flex justify-between text-sm mb-2">
                        <span className="font-medium">Eye Openness</span>
                        <span className="font-semibold tabular-nums" data-testid="text-eye-openness">
                          {Math.round(Math.max(0, Math.min(1, metrics.eyeAspectRatio)) * 100)}%
                        </span>
                      </div>
                      <Progress 
                        value={Math.max(0, Math.min(100, metrics.eyeAspectRatio * 100))} 
                        className="h-2"
                      />
                    </div>

                    <div className="bg-muted/20 p-3 rounded-lg">
                      <div className="flex justify-between text-sm mb-2">
                        <span className="font-medium">Processing FPS</span>
                        <span className="font-semibold tabular-nums" data-testid="text-fps">{metrics.fps ?? 0}</span>
                      </div>
                      <Progress 
                        value={Math.min(((metrics.fps ?? 0) / 30) * 100, 100)} 
                        className="h-2"
                      />
                    </div>

                    <div className="bg-muted/20 p-3 rounded-lg">
                      <div className="flex justify-between text-sm mb-2">
                        <span className="font-medium">Latency</span>
                        <span className="font-semibold tabular-nums" data-testid="text-latency">
                          {Math.max(0, metrics.latencyMs ?? 0)} ms
                        </span>
                      </div>
                      <Progress 
                        value={Math.max(0, Math.min(100, 100 - ((metrics.latencyMs ?? 0) / 120) * 100))} 
                        className="h-2"
                      />
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        ) : isActive ? (
          <div className="text-center text-muted-foreground py-8">
            <Camera className="w-12 h-12 mx-auto mb-3 animate-pulse" />
            <p className="text-sm sm:text-base">Analyzing facial features...</p>
            <p className="text-xs text-muted-foreground mt-1">Please look at the camera</p>
          </div>
        ) : (
          <div className="text-center text-muted-foreground py-8">
            <CameraOff className="w-12 h-12 mx-auto mb-3" />
            <p className="text-sm sm:text-base font-medium">Camera Inactive</p>
            <p className="text-xs text-muted-foreground mt-1">Tap "Start Camera" to begin</p>
          </div>
        )}

        {isActive && showAdvanced && (
          <div className="border-t pt-4 space-y-3">
            <Button
              variant="outline"
              size="sm"
              onClick={clearHistory}
              className="w-full min-h-[44px]"
              data-testid="button-clear-history"
            >
              Clear Blink History
            </Button>
            
            <div className="space-y-3 text-sm">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-muted-foreground">Detection Confidence</span>
                  <span className="font-mono">{settings.minDetectionConfidence.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min={0.3}
                  max={0.9}
                  step={0.01}
                  value={settings.minDetectionConfidence}
                  onChange={handleConfidenceChange}
                  className="w-full h-2 rounded-lg appearance-none bg-muted cursor-pointer"
                />
              </div>
              
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-muted-foreground">Blink Threshold</span>
                  <span className="font-mono">{settings.blinkCloseThreshold.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min={0.12}
                  max={0.3}
                  step={0.01}
                  value={settings.blinkCloseThreshold}
                  onChange={handleBlinkThresholdChange}
                  className="w-full h-2 rounded-lg appearance-none bg-muted cursor-pointer"
                />
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}