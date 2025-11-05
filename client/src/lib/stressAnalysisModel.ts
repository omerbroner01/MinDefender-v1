/**
 * Advanced Stress Analysis Model powered by MediaPipe FaceMesh.
 *
 * This implementation keeps the public API identical to the previous
 * TensorFlow-based version but switches to MediaPipe's highly optimised
 * WebAssembly pipeline. The result is faster, more reliable face tracking
 * and meaningful stress metrics that update every frame.
 */

import type { Results as FaceMeshResults } from '@mediapipe/face_mesh';
import { FaceMesh } from '@mediapipe/face_mesh';

export type StressLevel = 'low' | 'medium' | 'high';

export interface StressAnalysisResult {
  faceDetected: boolean;
  stressScore: number; // 0-100 (0=calm, 100=extreme stress)
  stressLevel: StressLevel; // Classification: low (0-35), medium (36-65), high (66-100)
  isHighStress: boolean; // true if stressScore >= 70
  blinkRate: number; // blinks per minute
  metrics: {
    browTension: number; // 0-100
    jawClench: number; // 0-100
    lipPress: number; // 0-100
    blinkRateAbnormal: number; // 0-100
    microExpressionTension: number; // 0-100
    headMovement: number; // 0-100
    gazeInstability: number; // 0-100
    foreheadTension: number; // 0-100
    noseFlare: number; // 0-100
    eyeDarting: number; // 0-100
    mouthAsymmetry: number; // 0-100
  };
  confidence: number; // 0-1 signal quality
  eyeAspectRatio: number;
  blinkMetrics: {
    totalBlinksInWindow: number;
    avgBlinkDuration: number;
    lastBlinkTimestamp: number | null;
  };
  fps?: number;
  latencyMs?: number;
}

interface Landmark {
  x: number;
  y: number;
  z?: number;
}

interface BlinkEvent {
  timestamp: number;
  duration: number;
}

// MediaPipe FaceMesh landmark indices used for metric extraction
const LANDMARKS = {
  LEFT_EYE: [33, 160, 158, 133, 153, 144],
  RIGHT_EYE: [263, 387, 385, 362, 380, 373],
  LEFT_EYE_TOP: [159, 160, 161, 246],
  LEFT_EYE_BOTTOM: [144, 145, 153, 154],
  RIGHT_EYE_TOP: [386, 385, 384, 398],
  RIGHT_EYE_BOTTOM: [373, 374, 380, 381],
  LEFT_BROW_INNER: 66,
  LEFT_BROW_CENTER: 70,
  RIGHT_BROW_INNER: 296,
  RIGHT_BROW_CENTER: 300,
  NOSE_BRIDGE: 168,
  NOSE_TIP: 1,
  LEFT_CHEEK: 234,
  RIGHT_CHEEK: 454,
  CHIN: 152,
  UPPER_LIP_TOP: 13,
  LOWER_LIP_BOTTOM: 14,
  MOUTH_LEFT: 61,
  MOUTH_RIGHT: 291,
  LEFT_IRIS_CENTER: 468,
  RIGHT_IRIS_CENTER: 473,
  LEFT_NOSTRIL: 49,
  RIGHT_NOSTRIL: 279,
  LEFT_MOUTH_UPPER: 78,
  LEFT_MOUTH_LOWER: 95,
  RIGHT_MOUTH_UPPER: 308,
  RIGHT_MOUTH_LOWER: 324,
  FOREHEAD: 10,
};

const NORMAL_BLINK_RATE = 16; // blinks per minute
const BLINK_RATE_VARIANCE = 6;
const HIGH_STRESS_THRESHOLD = 70; // Increased threshold - only flag truly high stress
const FPS_WINDOW = 45;
const STRESS_HISTORY_WINDOW = 120; // Keep last 120 scores for trend analysis
const OUTLIER_THRESHOLD = 25; // Max change in stress score between frames

// Stress level classification thresholds
const STRESS_LOW_MAX = 35; // 0-35 = Low stress (calm, relaxed)
const STRESS_MEDIUM_MAX = 65; // 36-65 = Medium stress (elevated, concerned)
// 66-100 = High stress (tense, anxious, danger)

function classifyStressLevel(stressScore: number): StressLevel {
  if (stressScore <= STRESS_LOW_MAX) return 'low';
  if (stressScore <= STRESS_MEDIUM_MAX) return 'medium';
  return 'high';
}

export interface StressAnalysisConfig {
  blinkCloseThreshold: number;
  blinkOpenThreshold: number;
  minDetectionConfidence: number;
  minTrackingConfidence: number;
  isMobile?: boolean; // Mobile-specific optimizations
}

class StressAnalysisModel {
  private faceMesh: FaceMesh | null = null;
  private isInitialized = false;

  private config: StressAnalysisConfig = {
    blinkCloseThreshold: 0.2,
    blinkOpenThreshold: 0.27,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5,
    isMobile: false,
  };

  private blinkHistory: BlinkEvent[] = [];
  private isBlinking = false;
  private lastBlinkStart = 0;
  private previousNosePosition: Landmark | null = null;
  private previousGazeAnchor: Landmark | null = null;
  private previousGazeVector: { left: number; right: number } | null = null;
  private fpsHistory: number[] = [];
  private frameStartTime = 0;
  private lastFrameTimestamp = 0;
  private processingFrame = false;
  private pendingResolvers: Array<(result: StressAnalysisResult) => void> = [];
  private lastResult: StressAnalysisResult = this.getEmptyResult(false);
  private smoothedBlinkRate = NORMAL_BLINK_RATE;
  private smoothedStressScore = 0;
  private smoothedBrowTension = 0;
  private smoothedGazeStability = 0.75; // start mid-range to avoid 0s
  private smoothedLipPress = 0;
  private smoothedForeheadTension = 0;
  private smoothedNoseFlare = 0;
  private smoothedMouthAsymmetry = 0;
  private smoothedEyeDarting = 10;
  private smoothedJawClench = 0;
  private previousGazeTimestamp = 0;
  
  // Enhanced stress signal tracking
  private smoothedEyeStrain = 0;
  private smoothedCheekTension = 0;
  private smoothedUpperLipTension = 0;
  private smoothedChinTension = 0;
  private smoothedMicroTremor = 0;
  
  // Advanced tracking for stability
  private recentStressScores: number[] = [];
  private stressScoreHistory: Array<{ value: number; timestamp: number }> = [];
  private faceDetectionConsecutiveFrames = 0;
  private lastFaceDetectionQuality = 0;
  private highStressStreak = 0;
  private lowStressStreak = 0;
  
  // Adaptive baseline tracking (for long-term normalization, not initial suppression)
  private userBaselineStress = 0;
  private calibrationFrameCount = 0;
  private readonly CALIBRATION_FRAMES = 60; // Track baseline over 60 frames (~10 seconds)
  
  // Warmup period - minimal suppression to show real-time values immediately
  private warmupFrames = 0;
  private readonly WARMUP_PERIOD = 3; // First 3 frames (~0.5 seconds) - very brief stabilization

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.info('ℹ️ StressAnalysisModel already initialised');
      return;
    }

    try {
      console.info('🧠 Loading MediaPipe FaceMesh for stress analysis');
      this.faceMesh = new FaceMesh({
        locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
      });

      this.faceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: this.config.minDetectionConfidence,
        minTrackingConfidence: this.config.minTrackingConfidence,
      });

      this.faceMesh.onResults(this.handleResults);
      this.isInitialized = true;
      console.info('✅ MediaPipe FaceMesh ready for stress analysis');
    } catch (error) {
      console.error('❌ Failed to initialise MediaPipe FaceMesh', error);
      this.faceMesh = null;
      this.isInitialized = false;
      throw new Error('Unable to load facial analysis model. Please refresh the page and try again.');
    }
  }

  updateConfig(partial: Partial<StressAnalysisConfig>): void {
    this.config = { ...this.config, ...partial };
    if (this.faceMesh) {
      // Mobile optimization: use very low confidence thresholds for better tracking
      // Mobile devices have varied camera quality and lighting conditions
      const detectionConf = this.config.isMobile 
        ? 0.25  // Fixed low threshold for mobile
        : this.config.minDetectionConfidence;
      const trackingConf = this.config.isMobile
        ? 0.25  // Fixed low threshold for mobile
        : this.config.minTrackingConfidence;
        
      this.faceMesh.setOptions({
        minDetectionConfidence: detectionConf,
        minTrackingConfidence: trackingConf,
        refineLandmarks: true,
        maxNumFaces: 1,
      });
      
      console.log(`📱 Updated model config: mobile=${this.config.isMobile}, detection=${detectionConf.toFixed(2)}, tracking=${trackingConf.toFixed(2)}`);
    }
  }

  async analyzeFrame(videoElement: HTMLVideoElement): Promise<StressAnalysisResult> {
    if (!this.isInitialized || !this.faceMesh) {
      throw new Error('Model not initialised. Call initialize() before analyzeFrame().');
    }

    if (!videoElement || videoElement.readyState < 2) {
      return this.getEmptyResult(false);
    }

    if (this.processingFrame) {
      return this.lastResult;
    }

    this.processingFrame = true;
    this.frameStartTime = performance.now();

    return new Promise<StressAnalysisResult>((resolve) => {
      this.pendingResolvers.push(resolve);
      this.faceMesh!
        .send({ image: videoElement })
        .catch((error) => {
          console.error('❌ FaceMesh processing error', error);
          this.processingFrame = false;
          const fallback = this.getEmptyResult(false);
          this.lastResult = fallback;
          this.resolvePending(fallback);
        });
    });
  }

  reset(): void {
    this.blinkHistory = [];
    this.isBlinking = false;
    this.lastBlinkStart = 0;
    this.previousNosePosition = null;
    this.previousGazeAnchor = null;
    this.previousGazeVector = null;
    this.fpsHistory = [];
    this.lastResult = this.getEmptyResult(false);
    this.smoothedBlinkRate = NORMAL_BLINK_RATE;
    this.smoothedStressScore = 0;
    this.smoothedBrowTension = 0;
    this.smoothedGazeStability = 0.75;
    this.smoothedLipPress = 0;
    this.smoothedForeheadTension = 0;
    this.smoothedNoseFlare = 0;
    this.smoothedMouthAsymmetry = 0;
    this.smoothedEyeDarting = 10;
    this.smoothedJawClench = 0;
    this.previousGazeTimestamp = 0;
    // Reset enhanced stress signals
    this.smoothedEyeStrain = 0;
    this.smoothedCheekTension = 0;
    this.smoothedUpperLipTension = 0;
    this.smoothedChinTension = 0;
    this.smoothedMicroTremor = 0;
    this.recentStressScores = [];
    this.stressScoreHistory = [];
    this.faceDetectionConsecutiveFrames = 0;
    this.lastFaceDetectionQuality = 0;
    this.userBaselineStress = 0;
    this.calibrationFrameCount = 0;
    this.warmupFrames = 0;
    this.processingFrame = false;
    this.highStressStreak = 0;
    this.lowStressStreak = 0;
  }

  async dispose(): Promise<void> {
    if (this.faceMesh && (this.faceMesh as any).close) {
      await (this.faceMesh as any).close();
    }
    this.faceMesh = null;
    this.isInitialized = false;
    this.reset();
  }

  private handleResults = (results: FaceMeshResults): void => {
    const now = performance.now();
    const latency = now - this.frameStartTime;
    this.updateFPS(now);

    if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
      this.faceDetectionConsecutiveFrames = 0;
      this.previousNosePosition = null;
      this.previousGazeVector = null;
      this.previousGazeAnchor = null;
      this.previousGazeTimestamp = 0;
      const empty = {
        ...this.getEmptyResult(false, latency, this.getCurrentFPS()),
        confidence: Math.max(0, this.lastResult.confidence * 0.75),
      };
      this.lastResult = empty;
      this.processingFrame = false;
      this.resolvePending(empty);
      return;
    }

    const landmarks = results.multiFaceLandmarks[0] as unknown as Landmark[];
    this.faceDetectionConsecutiveFrames++;

    // ===== EXTRACT ALL FACIAL SIGNALS =====
    
    // Eye metrics
    const avgEar = this.calculateBlinkMetrics(landmarks);
    const rawBlinkRate = this.calculateBlinkRate();
    this.smoothedBlinkRate = this.smoothValue(this.smoothedBlinkRate, rawBlinkRate, 0.25);
    const blinkRate = Math.round(this.smoothedBlinkRate * 10) / 10;
    const blinkRateAbnormal = this.calculateBlinkRateAbnormality(blinkRate);

    // Brow and forehead stress indicators - moderate smoothing
    const browTensionRaw = this.calculateBrowTension(landmarks);
    this.smoothedBrowTension = this.smoothValue(this.smoothedBrowTension, browTensionRaw, 0.30);
    const browTension = Math.round(this.smoothedBrowTension);

    const foreheadTensionRaw = this.calculateForeheadTension(landmarks);
    this.smoothedForeheadTension = this.smoothValue(this.smoothedForeheadTension, foreheadTensionRaw, 0.30);
    const foreheadTension = Math.round(this.smoothedForeheadTension);

    // Jaw and mouth stress indicators - moderate smoothing
    const jawClenchRaw = this.calculateJawClench(landmarks);
    this.smoothedJawClench = this.smoothValue(this.smoothedJawClench, jawClenchRaw, 0.30);
    const jawClench = Math.round(this.smoothedJawClench);

    const lipPressRaw = this.calculateLipPress(landmarks);
    this.smoothedLipPress = this.smoothValue(this.smoothedLipPress, lipPressRaw, 0.30);
    const lipPress = Math.round(this.smoothedLipPress);

    const mouthAsymmetryRaw = this.calculateMouthAsymmetry(landmarks);
    this.smoothedMouthAsymmetry = this.smoothValue(this.smoothedMouthAsymmetry, mouthAsymmetryRaw, 0.25);
    const mouthAsymmetry = Math.round(this.smoothedMouthAsymmetry);

    // Breathing and nostril indicators - moderate smoothing
    const noseFlareRaw = this.calculateNoseFlare(landmarks);
    this.smoothedNoseFlare = this.smoothValue(this.smoothedNoseFlare, noseFlareRaw, 0.25);
    const noseFlare = Math.round(this.smoothedNoseFlare);

    // Enhanced stress signals - moderate smoothing
    const eyeStrainRaw = this.calculateEyeStrain(landmarks, avgEar);
    this.smoothedEyeStrain = this.smoothValue(this.smoothedEyeStrain, eyeStrainRaw, 0.30);
    const eyeStrain = Math.round(this.smoothedEyeStrain);

    const cheekTensionRaw = this.calculateCheekTension(landmarks);
    this.smoothedCheekTension = this.smoothValue(this.smoothedCheekTension, cheekTensionRaw, 0.30);
    const cheekTension = Math.round(this.smoothedCheekTension);

    const upperLipTensionRaw = this.calculateUpperLipTension(landmarks);
    this.smoothedUpperLipTension = this.smoothValue(this.smoothedUpperLipTension, upperLipTensionRaw, 0.30);
    const upperLipTension = Math.round(this.smoothedUpperLipTension);

    const chinTensionRaw = this.calculateChinTension(landmarks);
    this.smoothedChinTension = this.smoothValue(this.smoothedChinTension, chinTensionRaw, 0.30);
    const chinTension = Math.round(this.smoothedChinTension);

    const microTremorRaw = this.calculateMicroTremor(landmarks);
    this.smoothedMicroTremor = this.smoothValue(this.smoothedMicroTremor, microTremorRaw, 0.25);
    const microTremor = Math.round(this.smoothedMicroTremor);

    // Micro-expression and composite metrics
    const microExpressionTension = this.calculateMicroExpressionTension(landmarks, browTension, lipPress, jawClench);
    
    // Head and gaze stability - lighter smoothing to track movement
    const headMovement = this.calculateHeadMovement(landmarks);
    const gazeMetrics = this.calculateGazeMetrics(landmarks, now);
    this.smoothedEyeDarting = this.smoothValue(this.smoothedEyeDarting, gazeMetrics.eyeDarting, 0.30);
    const eyeDarting = Math.round(this.smoothedEyeDarting);
    const gazeInstability = gazeMetrics.gazeInstability;

    const gazeStabilityInstant = Math.max(0, 1 - gazeInstability / 100);
    this.smoothedGazeStability = this.smoothValue(this.smoothedGazeStability, gazeStabilityInstant, 0.35);

    // Blink data for output
    const recentBlinks = this.getRecentBlinks();
    const lastBlink = recentBlinks.length ? recentBlinks[recentBlinks.length - 1] : null;
    const avgBlinkDuration = recentBlinks.length ? Math.round(this.average(recentBlinks.map((event) => event.duration))) : 0;
    const lastBlinkTimestamp = lastBlink ? Date.now() - (performance.now() - lastBlink.timestamp) : null;

    // ===== INTELLIGENT STRESS SCORING =====
    
    // Track warmup period for gentle startup
    this.warmupFrames++;
    const isWarmingUp = this.warmupFrames <= this.WARMUP_PERIOD;
    
    // Define weighted signal contributions
    // REDUCED weights for movement-based signals to prevent head motion from dominating
    const signals = [
      { name: 'browTension', value: browTension, weight: 1.3, priority: 'high' },      // PRIMARY
      { name: 'foreheadTension', value: foreheadTension, weight: 1.1, priority: 'high' }, // PRIMARY
      { name: 'jawClench', value: jawClench, weight: 1.2, priority: 'high' },          // PRIMARY
      { name: 'lipPress', value: lipPress, weight: 0.95, priority: 'medium' },
      { name: 'microExpression', value: microExpressionTension, weight: 0.9, priority: 'medium' },
      { name: 'gazeInstability', value: gazeInstability, weight: 0.6, priority: 'medium' }, // REDUCED from 1.0
      { name: 'eyeDarting', value: eyeDarting, weight: 0.5, priority: 'low' },         // REDUCED from 0.7
      { name: 'noseFlare', value: noseFlare, weight: 0.75, priority: 'medium' },
      { name: 'blinkRate', value: blinkRateAbnormal, weight: 0.6, priority: 'low' },
      { name: 'headMovement', value: headMovement, weight: 0.3, priority: 'low' },     // REDUCED from 0.5
      { name: 'mouthAsymmetry', value: mouthAsymmetry, weight: 0.35, priority: 'low' },
      // Enhanced facial stress signals
      { name: 'eyeStrain', value: eyeStrain, weight: 0.7, priority: 'medium' },
      { name: 'cheekTension', value: cheekTension, weight: 0.8, priority: 'medium' },
      { name: 'upperLipTension', value: upperLipTension, weight: 0.75, priority: 'medium' },
      { name: 'chinTension', value: chinTension, weight: 0.65, priority: 'medium' },
      { name: 'microTremor', value: microTremor, weight: 0.5, priority: 'low' },
    ];

    // Calculate weighted base stress
    const totalWeight = signals.reduce((sum, s) => sum + s.weight, 0);
    const weightedSum = signals.reduce((sum, s) => sum + (s.value / 100) * s.weight, 0);
    const baseStress = (weightedSum / totalWeight) * 100;

    // CALM DETECTION: Check if user is clearly calm
    // This provides gentle suppression without compressing the range
    const calmIndicators = [
      browTension < 30,          // Relaxed brow
      jawClench < 30,            // No jaw tension
      lipPress < 30,             // Lips relaxed
      gazeInstability < 40,      // Steady gaze (allow natural movement)
      foreheadTension < 30,      // Smooth forehead
      noseFlare < 25,            // Normal breathing
      eyeDarting < 35,           // Calm eye movement
      eyeStrain < 30,            // No squinting
      cheekTension < 35,         // Relaxed cheeks
      upperLipTension < 30,      // No lip pulling
      chinTension < 30,          // Relaxed chin
      microTremor < 25,          // Stable face
    ];
    const calmCount = calmIndicators.filter(Boolean).length;
    const isClearlyCalm = calmCount >= 9; // 9 out of 12 indicators show calm
    const isMostlyCalm = calmCount >= 7;  // 7 out of 12 indicators show calm

    // Apply gentle calm bias WITHOUT compressing the full range
    // This prevents false alarms while maintaining full 0-100 scale
    let adjustedStress = baseStress;
    if (isClearlyCalm && baseStress < 50) {
      // Only suppress if both calm AND low stress (prevents hiding real stress)
      adjustedStress *= 0.70; // Gentle reduction for clearly calm
    } else if (isMostlyCalm && baseStress < 40) {
      adjustedStress *= 0.85; // Very gentle reduction for mostly calm
    }

    // NO range compression - use the value as-is for full 0-100 scale
    const rawStress = Math.min(100, Math.max(0, adjustedStress));

    // Build baseline continuously for long-term trend analysis (does NOT suppress initial values)
    if (this.calibrationFrameCount < this.CALIBRATION_FRAMES) {
      this.userBaselineStress = this.smoothValue(this.userBaselineStress, rawStress, 0.03);
      this.calibrationFrameCount++;
    }

    // Minimal warmup scaling: start at 90% capacity and ramp to 100% over WARMUP_PERIOD
    // This ensures real-time values are visible from the start
    const warmupScale = isWarmingUp 
      ? 0.90 + (this.warmupFrames / this.WARMUP_PERIOD) * 0.10 
      : 1.0;
    
    const calibratedStress = rawStress * warmupScale;

    // INTELLIGENT SMOOTHING: Prevent spikes while maintaining full 0-100 range
    // Use adaptive smoothing based on movement characteristics
    const baseSmoothingFactor = isWarmingUp ? 0.40 : 0.20; // Responsive but stable
    
    // Detect if this is a rapid spike or gradual change
    let smoothingFactor = baseSmoothingFactor;
    if (this.recentStressScores.length >= 3) {
      const recentAvg = this.average(this.recentStressScores.slice(-5));
      const change = Math.abs(calibratedStress - recentAvg);
      
      // For large sudden changes (>20 points), use heavier smoothing to prevent spikes
      if (change > 20) {
        smoothingFactor = 0.10; // Very heavy for spikes
      } else if (change > 12) {
        smoothingFactor = 0.15; // Heavy for moderate jumps
      } else {
        // For gradual changes, use standard smoothing
        smoothingFactor = baseSmoothingFactor;
      }
    }
    
    // Initialize on first meaningful reading
    if (this.smoothedStressScore === 0 && calibratedStress > 5) {
      this.smoothedStressScore = calibratedStress * 0.6; // Start at 60% to ramp up naturally
    }
    
    this.smoothedStressScore = this.smoothValue(this.smoothedStressScore, calibratedStress, smoothingFactor);

    // Track stress history for trend analysis
    this.recentStressScores.push(calibratedStress);
    if (this.recentStressScores.length > 30) {
      this.recentStressScores.shift();
    }
    this.stressScoreHistory.push({ value: this.smoothedStressScore, timestamp: now });
    if (this.stressScoreHistory.length > STRESS_HISTORY_WINDOW) {
      this.stressScoreHistory.shift();
    }

    // Calculate confidence based on signal quality
    const confidence = this.calculateSignalConfidence({
      gazeInstability,
      headMovement,
      browTension,
      blinkRateAbnormal,
      foreheadTension,
      noseFlare,
      eyeDarting,
      faceDetectionQuality: Math.min(1, this.faceDetectionConsecutiveFrames / 10),
    });

    this.lastFaceDetectionQuality = confidence;

    // Apply confidence weighting to final stress
    const confidenceMultiplier = 0.5 + confidence * 0.5; // Range: 0.5 to 1.0
    let finalStress = this.smoothedStressScore * confidenceMultiplier;
    
    const stressScore = Math.round(Math.min(100, Math.max(0, finalStress)));
    
    // STRENGTHENED hysteresis: require very sustained stress before triggering
    // This prevents brief spikes and false alarms from calm users
    let isHighStress = false;
    if (stressScore >= HIGH_STRESS_THRESHOLD) {
      this.highStressStreak += 1;
      this.lowStressStreak = 0;
    } else {
      this.lowStressStreak += 1;
      this.highStressStreak = Math.max(0, this.highStressStreak - 2); // Faster decay
    }
    
    // Require 10 consecutive high-stress frames before triggering (~ 2 seconds at 5fps)
    // This ensures only sustained, real stress triggers the alarm
    if (this.highStressStreak >= 10) {
      isHighStress = true;
    }
    // Quick recovery: just 5 consecutive low frames clears the alarm
    if (this.lowStressStreak >= 5) {
      isHighStress = false;
      this.highStressStreak = 0;
    }

    const result: StressAnalysisResult = {
      faceDetected: true,
      stressScore,
      stressLevel: classifyStressLevel(stressScore),
      isHighStress,
      blinkRate,
      metrics: {
        browTension,
        jawClench,
        lipPress,
        blinkRateAbnormal,
        microExpressionTension,
        headMovement,
        gazeInstability,
        foreheadTension,
        noseFlare,
        eyeDarting,
        mouthAsymmetry,
      },
      confidence,
      eyeAspectRatio: Math.max(0.12, Math.min(0.5, parseFloat(avgEar.toFixed(3)))),
      blinkMetrics: {
        totalBlinksInWindow: recentBlinks.length,
        avgBlinkDuration,
        lastBlinkTimestamp,
      },
      fps: this.getCurrentFPS(),
      latencyMs: latency,
    };

    this.lastResult = result;
    this.processingFrame = false;
    this.resolvePending(result);
  };

  private resolvePending(result: StressAnalysisResult): void {
    while (this.pendingResolvers.length) {
      const resolve = this.pendingResolvers.shift();
      if (resolve) {
        resolve(result);
      }
    }
  }

  private getEmptyResult(faceDetected: boolean, latencyMs?: number, fps?: number): StressAnalysisResult {
    return {
      faceDetected,
      stressScore: 0,
      stressLevel: 'low',
      isHighStress: false,
      blinkRate: 0, // Show 0 when no face to avoid confusion
      metrics: {
        browTension: 0,
        jawClench: 0,
        lipPress: 0,
        blinkRateAbnormal: 0,
        microExpressionTension: 0,
        headMovement: 0,
        gazeInstability: 0,
        foreheadTension: 0,
        noseFlare: 0,
        eyeDarting: 0,
        mouthAsymmetry: 0,
      },
      confidence: 0,
      eyeAspectRatio: 0.26,
      blinkMetrics: {
        totalBlinksInWindow: 0,
        avgBlinkDuration: 0,
        lastBlinkTimestamp: null,
      },
      fps,
      latencyMs,
    };
  }

  private distance(a: Landmark, b: Landmark): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const dz = (a.z ?? 0) - (b.z ?? 0);
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  private average(values: number[]): number {
    if (!values.length) return 0;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }

  private smoothValue(current: number, next: number, alpha: number): number {
    return current * (1 - alpha) + next * alpha;
  }

  private calculateBlinkMetrics(landmarks: Landmark[]): number {
    const leftEar = this.calculateEyeAspectRatio(landmarks, LANDMARKS.LEFT_EYE as number[]);
    const rightEar = this.calculateEyeAspectRatio(landmarks, LANDMARKS.RIGHT_EYE as number[]);
    const avgEar = (leftEar + rightEar) / 2;

    const now = performance.now();

    if (avgEar < this.config.blinkCloseThreshold && !this.isBlinking) {
      this.isBlinking = true;
      this.lastBlinkStart = now;
    } else if (avgEar > this.config.blinkOpenThreshold && this.isBlinking) {
      this.isBlinking = false;
      const duration = now - this.lastBlinkStart;
      if (duration >= 45 && duration <= 550) {
        this.blinkHistory.push({
          timestamp: now,
          duration,
        });
        const windowMs = 120_000;
        const cutoff = now - windowMs;
        this.blinkHistory = this.blinkHistory.filter((event) => event.timestamp >= cutoff);
      }
    }

    return avgEar;
  }

  private calculateEyeAspectRatio(landmarks: Landmark[], indices: number[]): number {
    if (indices.length !== 6) {
      return 0.26;
    }

    const [p1, p2, p3, p4, p5, p6] = indices.map((index) => landmarks[index]).filter(Boolean) as Landmark[];
    if (!p1 || !p2 || !p3 || !p4 || !p5 || !p6) {
      return 0.26;
    }

    const vertical1 = this.distance(p2, p6);
    const vertical2 = this.distance(p3, p5);
    const horizontal = this.distance(p1, p4);

    if (horizontal === 0) {
      return 0.26;
    }

    const ear = ((vertical1 + vertical2) / (2 * horizontal));
    return Math.max(0.12, Math.min(0.45, ear));
  }

  private calculateBlinkRate(): number {
    if (!this.blinkHistory.length) {
      return NORMAL_BLINK_RATE;
    }

    const now = performance.now();
    const windowEvents = this.getRecentBlinks();

    if (!windowEvents.length) {
      return NORMAL_BLINK_RATE;
    }

    const durationMs = now - windowEvents[0].timestamp || 1;
    const ratePerMs = windowEvents.length / durationMs;
    return Math.max(2, Math.min(60, ratePerMs * 60_000));
  }

  private getRecentBlinks(windowMs = 60_000): BlinkEvent[] {
    const now = performance.now();
    const cutoff = now - windowMs;
    return this.blinkHistory.filter((event) => event.timestamp >= cutoff);
  }

  private calculateBlinkRateAbnormality(blinkRate: number): number {
    const deviation = Math.abs(blinkRate - NORMAL_BLINK_RATE);
    const abnormality = (deviation / BLINK_RATE_VARIANCE) * 50;
    return Math.max(0, Math.min(100, Math.round(abnormality)));
  }

  getBlinkHistory(windowMs = 120_000): BlinkEvent[] {
    return this.getRecentBlinks(windowMs).map((event) => ({ ...event }));
  }

  clearBlinkHistory(): void {
    this.blinkHistory = [];
  }

  private calculateBrowTension(landmarks: Landmark[]): number {
    const leftInner = landmarks[LANDMARKS.LEFT_BROW_INNER];
    const rightInner = landmarks[LANDMARKS.RIGHT_BROW_INNER];
    const leftCenter = landmarks[LANDMARKS.LEFT_BROW_CENTER];
    const rightCenter = landmarks[LANDMARKS.RIGHT_BROW_CENTER];
    const noseBridge = landmarks[LANDMARKS.NOSE_BRIDGE];

    if (!leftInner || !rightInner || !leftCenter || !rightCenter || !noseBridge) {
      return 0;
    }

    // Horizontal compression (brows pulled together)
    const browDistance = this.distance(leftInner, rightInner);
    const normalBrowDistance = 0.18; // Calibrated for relaxed state
    const horizontalCompression = Math.max(0, (normalBrowDistance - browDistance) / normalBrowDistance);

    // Vertical lift/compression (brows raised or lowered)
    const leftHeight = Math.abs(leftCenter.y - noseBridge.y);
    const rightHeight = Math.abs(rightCenter.y - noseBridge.y);
    const avgHeight = (leftHeight + rightHeight) / 2;
    const normalHeight = 0.09;
    const verticalTension = Math.abs(avgHeight - normalHeight) / normalHeight;

    // Brow furrow detection (balanced sensitivity)
    const browAsymmetry = Math.abs(leftHeight - rightHeight);
    const furrowIndicator = browAsymmetry * 3;

    // Combined tension - proper scaling for full 0-100 range
    const rawTension = (horizontalCompression * 0.6 + verticalTension * 0.25 + furrowIndicator * 0.15);
    // Use proper power curve: 0.7 expands low values, compresses high values (good for stress)
    const normalized = Math.pow(Math.min(rawTension, 1), 0.7);
    const tension = normalized * 100;

    return Math.max(0, Math.min(100, Math.round(tension)));
  }

  private calculateJawClench(landmarks: Landmark[]): number {
    const jawLeft = landmarks[172];
    const jawRight = landmarks[397];
    const chin = landmarks[LANDMARKS.CHIN];
    const noseTip = landmarks[LANDMARKS.NOSE_TIP];

    if (!jawLeft || !jawRight || !chin || !noseTip) {
      return 0;
    }

    const jawWidth = this.distance(jawLeft, jawRight);
    const faceHeight = this.distance(noseTip, chin);
    if (faceHeight === 0) {
      return 0;
    }

    const ratio = jawWidth / faceHeight;
    // Detect jaw tension from width ratio
    const normalRatio = 1.05;
    const deviation = Math.max(0, ratio - normalRatio);
    
    // Proper scaling for full 0-100 range
    // deviation of 0.15+ should give 100
    const normalized = Math.min(deviation / 0.15, 1);
    const clenchScore = Math.pow(normalized, 0.75) * 100;
    
    return Math.max(0, Math.min(100, Math.round(clenchScore)));
  }

  private calculateLipPress(landmarks: Landmark[]): number {
    const upperLip = landmarks[LANDMARKS.UPPER_LIP_TOP];
    const lowerLip = landmarks[LANDMARKS.LOWER_LIP_BOTTOM];
    const mouthLeft = landmarks[LANDMARKS.MOUTH_LEFT];
    const mouthRight = landmarks[LANDMARKS.MOUTH_RIGHT];

    if (!upperLip || !lowerLip || !mouthLeft || !mouthRight) {
      return 0;
    }

    const lipGap = this.distance(upperLip, lowerLip);
    const mouthWidth = this.distance(mouthLeft, mouthRight);
    if (mouthWidth === 0) {
      return 0;
    }

    const ratio = lipGap / mouthWidth;
    // Normal relaxed: ~0.14, pressed: <0.08
    const normalRatio = 0.14;
    const deviation = Math.max(0, normalRatio - ratio);
    
    // Proper scaling: deviation of 0.06+ should give 100
    const normalized = Math.min(deviation / 0.06, 1);
    const pressScore = Math.pow(normalized, 0.8) * 100;
    
    return Math.max(0, Math.min(100, Math.round(pressScore)));
  }

  private calculateForeheadTension(landmarks: Landmark[]): number {
    const forehead = landmarks[LANDMARKS.FOREHEAD];
    const leftBrow = landmarks[LANDMARKS.LEFT_BROW_CENTER];
    const rightBrow = landmarks[LANDMARKS.RIGHT_BROW_CENTER];
    const noseBridge = landmarks[LANDMARKS.NOSE_BRIDGE];

    if (!forehead || !leftBrow || !rightBrow || !noseBridge) {
      return 0;
    }

    const browAvgY = (leftBrow.y + rightBrow.y) / 2;
    const browGap = Math.abs(forehead.y - browAvgY);
    const foreheadDepth = Math.abs(forehead.y - noseBridge.y) || 1;

    const ratio = browGap / foreheadDepth;
    // Normal: ~0.28, tense: <0.20
    const normalRatio = 0.28;
    const deviation = Math.max(0, normalRatio - ratio);
    
    // Proper scaling: deviation of 0.08+ should give 100
    const normalized = Math.min(deviation / 0.08, 1);
    const tension = Math.pow(normalized, 0.8) * 100;
    
    return Math.max(0, Math.min(100, Math.round(tension)));
  }

  private calculateNoseFlare(landmarks: Landmark[]): number {
    const leftNostril = landmarks[LANDMARKS.LEFT_NOSTRIL];
    const rightNostril = landmarks[LANDMARKS.RIGHT_NOSTRIL];
    const mouthLeft = landmarks[LANDMARKS.MOUTH_LEFT];
    const mouthRight = landmarks[LANDMARKS.MOUTH_RIGHT];

    if (!leftNostril || !rightNostril || !mouthLeft || !mouthRight) {
      return 0;
    }

    const nostrilWidth = this.distance(leftNostril, rightNostril);
    const mouthWidth = this.distance(mouthLeft, mouthRight) || 1;
    const ratio = nostrilWidth / mouthWidth;
    
    // Normal: ~0.20, stressed: >0.26
    const normalRatio = 0.20;
    const deviation = Math.max(0, ratio - normalRatio);
    
    // Proper scaling: deviation of 0.06+ should give 100
    const normalized = Math.min(deviation / 0.06, 1);
    const flareScore = Math.pow(normalized, 0.85) * 100;
    
    return Math.max(0, Math.min(100, Math.round(flareScore)));
  }

  private calculateMouthAsymmetry(landmarks: Landmark[]): number {
    const leftUpper = landmarks[LANDMARKS.LEFT_MOUTH_UPPER];
    const leftLower = landmarks[LANDMARKS.LEFT_MOUTH_LOWER];
    const rightUpper = landmarks[LANDMARKS.RIGHT_MOUTH_UPPER];
    const rightLower = landmarks[LANDMARKS.RIGHT_MOUTH_LOWER];
    const mouthLeft = landmarks[LANDMARKS.MOUTH_LEFT];
    const mouthRight = landmarks[LANDMARKS.MOUTH_RIGHT];

    if (!leftUpper || !leftLower || !rightUpper || !rightLower || !mouthLeft || !mouthRight) {
      return 0;
    }

    const leftVertical = Math.abs(leftUpper.y - leftLower.y);
    const rightVertical = Math.abs(rightUpper.y - rightLower.y);
    const diff = Math.abs(leftVertical - rightVertical);
    const mouthWidth = this.distance(mouthLeft, mouthRight) || 1;

    const normalized = Math.max(0, Math.min(1, (diff / mouthWidth) * 6));
    return Math.round(normalized * 100);
  }

  // ===== NEW ENHANCED STRESS SIGNALS =====

  private calculateEyeStrain(landmarks: Landmark[], avgEar: number): number {
    // Detect eye fatigue/strain from prolonged squinting or eye tension
    // Low EAR (< 0.20) sustained indicates eye strain/stress
    const normalEar = 0.26;
    const strainThreshold = 0.20;
    
    if (avgEar >= normalEar) {
      return 0; // Eyes open normally, no strain
    }
    
    if (avgEar < strainThreshold) {
      // Eyes noticeably strained/squinted
      const strainIntensity = (strainThreshold - avgEar) / strainThreshold;
      return Math.round(Math.min(strainIntensity * 100, 100));
    }
    
    // Mild narrowing - slight strain
    const mildStrain = (normalEar - avgEar) / (normalEar - strainThreshold);
    return Math.round(Math.min(mildStrain * 50, 50)); // Cap at 50 for mild
  }

  private calculateCheekTension(landmarks: Landmark[]): number {
    // Detect raised/tense cheeks - common stress indicator
    const leftCheek = landmarks[LANDMARKS.LEFT_CHEEK];
    const rightCheek = landmarks[LANDMARKS.RIGHT_CHEEK];
    const noseTip = landmarks[LANDMARKS.NOSE_TIP];
    const chin = landmarks[LANDMARKS.CHIN];

    if (!leftCheek || !rightCheek || !noseTip || !chin) {
      return 0;
    }

    // Calculate cheek elevation relative to face
    const leftCheekY = leftCheek.y;
    const rightCheekY = rightCheek.y;
    const avgCheekY = (leftCheekY + rightCheekY) / 2;
    
    // Normal cheek position is about 55% down from nose to chin
    const faceHeight = Math.abs(chin.y - noseTip.y);
    const expectedCheekY = noseTip.y + faceHeight * 0.55;
    
    // If cheeks are raised (avgCheekY < expectedCheekY), indicates tension
    const elevation = Math.max(0, expectedCheekY - avgCheekY);
    const normalizedElevation = elevation / (faceHeight * 0.15); // 15% elevation = 100
    
    return Math.round(Math.min(normalizedElevation * 100, 100));
  }

  private calculateUpperLipTension(landmarks: Landmark[]): number {
    // Detect upper lip tension - pulling up or tightening
    const upperLip = landmarks[LANDMARKS.UPPER_LIP_TOP];
    const noseTip = landmarks[LANDMARKS.NOSE_TIP];
    const leftNostril = landmarks[LANDMARKS.LEFT_NOSTRIL];
    const rightNostril = landmarks[LANDMARKS.RIGHT_NOSTRIL];

    if (!upperLip || !noseTip || !leftNostril || !rightNostril) {
      return 0;
    }

    // Calculate upper lip to nose distance
    const lipToNose = Math.abs(upperLip.y - noseTip.y);
    const nostrilAvgY = (leftNostril.y + rightNostril.y) / 2;
    const nostrilToNose = Math.abs(nostrilAvgY - noseTip.y);
    
    if (nostrilToNose === 0) return 0;
    
    const ratio = lipToNose / nostrilToNose;
    // Normal: ~1.8-2.2, tense (pulled up): <1.5
    const normalRatio = 1.9;
    const deviation = Math.max(0, normalRatio - ratio);
    
    const normalized = Math.min(deviation / 0.4, 1); // deviation of 0.4+ = 100
    return Math.round(Math.pow(normalized, 0.8) * 100);
  }

  private calculateChinTension(landmarks: Landmark[]): number {
    // Detect chin tension/dimpling - "mental muscle" stress indicator
    const chin = landmarks[LANDMARKS.CHIN];
    const lowerLip = landmarks[LANDMARKS.LOWER_LIP_BOTTOM];
    const leftMouthLower = landmarks[LANDMARKS.LEFT_MOUTH_LOWER];
    const rightMouthLower = landmarks[LANDMARKS.RIGHT_MOUTH_LOWER];

    if (!chin || !lowerLip || !leftMouthLower || !rightMouthLower) {
      return 0;
    }

    // Measure chin compression (chin pulled up toward lower lip)
    const chinToLip = Math.abs(chin.y - lowerLip.y);
    const mouthLowerAvgY = (leftMouthLower.y + rightMouthLower.y) / 2;
    const mouthToLip = Math.abs(mouthLowerAvgY - lowerLip.y);
    
    if (mouthToLip === 0) return 0;
    
    // Also check horizontal chin tension (narrowing)
    const chinWidth = Math.abs(chin.x - ((leftMouthLower.x + rightMouthLower.x) / 2));
    
    const verticalRatio = chinToLip / mouthToLip;
    // Normal: ~5-7, tense (pulled up): <4
    const normalVertical = 6.0;
    const verticalTension = Math.max(0, normalVertical - verticalRatio) / 2;
    
    const tensionScore = Math.min(verticalTension * 100, 100);
    return Math.round(tensionScore);
  }

  private calculateMicroTremor(landmarks: Landmark[]): number {
    // Detect subtle facial instability/micro-tremors from landmark jitter
    // This requires tracking variance across recent frames
    
    // Use stable reference points that shouldn't move much
    const noseTip = landmarks[LANDMARKS.NOSE_TIP];
    const noseBridge = landmarks[LANDMARKS.NOSE_BRIDGE];
    
    if (!noseTip || !noseBridge || !this.previousNosePosition) {
      return 0;
    }

    // Calculate micro-movement (different from gross head movement)
    const microMovement = this.distance(noseTip, this.previousNosePosition);
    
    // Very small movements (< 0.002) are normal
    // Jittery movements (0.002-0.008) indicate tremor
    const tremorThreshold = 0.002;
    const maxTremor = 0.008;
    
    if (microMovement < tremorThreshold) {
      return 0; // Stable, no tremor
    }
    
    const tremorIntensity = (microMovement - tremorThreshold) / (maxTremor - tremorThreshold);
    return Math.round(Math.min(tremorIntensity * 100, 100));
  }

  private calculateMicroExpressionTension(
    landmarks: Landmark[],
    browTension: number,
    lipPress: number,
    jawClench: number,
  ): number {
    const leftCheek = landmarks[LANDMARKS.LEFT_CHEEK];
    const rightCheek = landmarks[LANDMARKS.RIGHT_CHEEK];
    const noseTip = landmarks[LANDMARKS.NOSE_TIP];
    const chin = landmarks[LANDMARKS.CHIN];

    if (!leftCheek || !rightCheek || !noseTip || !chin) {
      // Fallback to combined signals if face geometry unavailable
      return Math.round((browTension * 0.4 + lipPress * 0.35 + jawClench * 0.25));
    }

    const cheeksDistance = this.distance(leftCheek, rightCheek);
    const faceHeight = this.distance(noseTip, chin);

    if (!isFinite(cheeksDistance) || !isFinite(faceHeight) || faceHeight === 0) {
      return Math.round((browTension * 0.4 + lipPress * 0.35 + jawClench * 0.25));
    }

    // Face aspect ratio analysis for micro-expressions
    const aspectRatio = cheeksDistance / faceHeight;
    const aspectTension = Math.min(100, Math.abs(aspectRatio - 1.15) / 0.25 * 100);

    // Cheek elevation (smiling suppresses stress, lowering indicates tension)
    const avgCheekY = (leftCheek.y + rightCheek.y) / 2;
    const normalCheekPosition = noseTip.y + (chin.y - noseTip.y) * 0.45;
    const cheekDeviation = Math.max(0, avgCheekY - normalCheekPosition);
    const cheekTension = Math.min(100, (cheekDeviation / 0.03) * 100);

    // Multi-signal composite with weighted priorities
    const composite = 
      browTension * 0.30 +      // Primary stress indicator
      lipPress * 0.25 +          // Secondary stress indicator
      jawClench * 0.20 +         // Tertiary stress indicator
      aspectTension * 0.15 +     // Face geometry
      cheekTension * 0.10;       // Micro-expression

    return Math.max(0, Math.min(100, Math.round(composite)));
  }

  private calculateHeadMovement(landmarks: Landmark[]): number {
    const noseTip = landmarks[LANDMARKS.NOSE_TIP];
    if (!noseTip) {
      return 0;
    }

    if (!this.previousNosePosition) {
      this.previousNosePosition = { ...noseTip };
      return 5;
    }

    const movement = this.distance(this.previousNosePosition, noseTip);
    this.previousNosePosition = { ...noseTip };
    const scaled = Math.min(1, movement * 18);
    return Math.round(scaled * 100);
  }

  private calculateGazeMetrics(landmarks: Landmark[], timestamp: number): { gazeInstability: number; eyeDarting: number } {
    const noseTip = landmarks[LANDMARKS.NOSE_TIP];
    let gazeInstability = 5; // Start lower for calm baseline

    if (noseTip) {
      if (!this.previousGazeAnchor) {
        this.previousGazeAnchor = { ...noseTip };
      }
      const drift = this.previousGazeAnchor ? this.distance(this.previousGazeAnchor, noseTip) : 0;
      // VERY reduced sensitivity - natural head movement should not spike stress
      // Only register significant, sustained head instability
      gazeInstability = Math.min(100, drift * 10) * 100; // Reduced from 15
      this.previousGazeAnchor = { ...noseTip };
    } else {
      this.previousGazeAnchor = null;
    }

    const leftInner = landmarks[133];
    const leftOuter = landmarks[33];
    const rightInner = landmarks[362];
    const rightOuter = landmarks[263];
    const leftIris = landmarks[LANDMARKS.LEFT_IRIS_CENTER];
    const rightIris = landmarks[LANDMARKS.RIGHT_IRIS_CENTER];

    let eyeDarting = 10; // Default baseline for minimal movement

    if (leftInner && leftOuter && rightInner && rightOuter && leftIris && rightIris) {
      const leftWidth = Math.max(0.0001, this.distance(leftInner, leftOuter));
      const rightWidth = Math.max(0.0001, this.distance(rightInner, rightOuter));

      // Calculate iris position ratio within eye bounds
      const leftRatio = Math.max(0, Math.min(1, (leftIris.x - leftOuter.x) / leftWidth));
      const rightRatio = Math.max(0, Math.min(1, (rightIris.x - rightOuter.x) / rightWidth));
      const gazeVector = { left: leftRatio, right: rightRatio };

      if (this.previousGazeVector && this.previousGazeTimestamp) {
        const deltaLeft = Math.abs(gazeVector.left - this.previousGazeVector.left);
        const deltaRight = Math.abs(gazeVector.right - this.previousGazeVector.right);
        const magnitude = (deltaLeft + deltaRight) / 2;
        
        // REDUCED temporal sensitivity to avoid false positives
        const deltaTime = Math.max(16, timestamp - this.previousGazeTimestamp);
        const velocity = magnitude / (deltaTime / 1000);
        
        // REDUCED eye darting sensitivity - normal saccades should not spike stress
        const rawDarting = velocity * 120; // Reduced from 180
        const clampedDarting = Math.min(rawDarting, 100); // Linear, no power curve
        eyeDarting = Math.min(100, Math.max(5, clampedDarting));
        
        // REMOVED rapid direction change detection (was causing spikes)
      }

      this.previousGazeVector = gazeVector;
      this.previousGazeTimestamp = timestamp;
    } else {
      this.previousGazeVector = null;
      this.previousGazeTimestamp = 0;
    }

    return {
      gazeInstability: Math.round(gazeInstability),
      eyeDarting: Math.round(eyeDarting),
    };
  }

  private calculateSignalConfidence(metrics: {
    gazeInstability: number;
    headMovement: number;
    browTension: number;
    blinkRateAbnormal: number;
    foreheadTension: number;
    noseFlare: number;
    eyeDarting: number;
    faceDetectionQuality?: number;
  }): number {
    const stability = 1 - Math.min(1, (metrics.gazeInstability + metrics.headMovement) / 240);
    const blinkConsistency = 1 - Math.min(1, metrics.blinkRateAbnormal / 200);
    const focus = Math.min(1, (metrics.browTension + metrics.foreheadTension) / 200);
    const respiration = 1 - Math.min(1, metrics.noseFlare / 140);
    const ocularControl = 1 - Math.min(1, metrics.eyeDarting / 130);
    const faceQuality = metrics.faceDetectionQuality ?? 0.7;

    const combined = 
      stability * 0.28 + 
      blinkConsistency * 0.15 + 
      focus * 0.20 + 
      respiration * 0.10 + 
      ocularControl * 0.12 +
      faceQuality * 0.15;
    
    return Math.max(0.15, Math.min(0.99, parseFloat(combined.toFixed(3))));
  }

  private calculateAdaptiveSmoothingFactor(newValue: number, baseAlpha: number = 0.3): number {
    // During the first few frames, use lighter smoothing to show values quickly
    if (this.recentStressScores.length < 5) {
      return Math.min(0.40, baseAlpha * 1.3); // Allow faster initial response
    }

    // Calculate change from recent average
    const recentAvg = this.average(this.recentStressScores.slice(-5));
    const change = Math.abs(newValue - recentAvg);

    // Detect outliers (sudden large changes) - be aggressive about rejecting them
    if (change > OUTLIER_THRESHOLD) {
      // Use EXTREMELY heavy smoothing for outliers to prevent jumps
      return 0.08; // Only allow 8% of outlier value through
    }

    // Detect stable patterns (low variance) - reward stability with slightly faster response
    const variance = this.calculateVariance(this.recentStressScores.slice(-10));
    if (variance < 12) {
      // Low variance = stable, can respond a bit faster
      return Math.min(baseAlpha * 1.2, 0.35);
    }

    // Conservative adaptive smoothing based on change magnitude
    if (change > 18) {
      return 0.10; // Very heavy for large changes
    } else if (change > 12) {
      return 0.15; // Heavy for moderate-large changes
    } else if (change > 6) {
      return baseAlpha * 0.8; // Moderate for small-medium changes
    } else {
      return baseAlpha; // Use base alpha for tiny changes
    }
  }

  private calculateVariance(values: number[]): number {
    if (values.length < 2) return 0;
    const mean = this.average(values);
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
    return this.average(squaredDiffs);
  }

  private updateFPS(now: number): void {
    if (this.lastFrameTimestamp > 0) {
      const delta = now - this.lastFrameTimestamp;
      const fps = delta > 0 ? 1000 / delta : 0;
      if (fps > 0 && fps < 120) {
        this.fpsHistory.push(fps);
        if (this.fpsHistory.length > FPS_WINDOW) {
          this.fpsHistory.shift();
        }
      }
    }
    this.lastFrameTimestamp = now;
  }

  private getCurrentFPS(): number {
    if (!this.fpsHistory.length) {
      return 0;
    }
    const avg = this.average(this.fpsHistory);
    return Math.round(avg);
  }
}

export const stressAnalysisModel = new StressAnalysisModel();
