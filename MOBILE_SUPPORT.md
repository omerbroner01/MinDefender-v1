# EmotionGuard Mobile Support

## Overview

EmotionGuard now works **identically** on both desktop (webcam) and mobile (phone camera) platforms. All stress detection features, blink tracking, and AI decision logic produce the same results regardless of the input device.

## Cross-Platform Guarantees

### 1. **Stress Score (0-100)**
- ✅ Same calculation algorithm on desktop and mobile
- ✅ Same multi-signal validation logic
- ✅ Same temporal smoothing parameters
- ✅ Same threshold for high stress detection (>= 55)

### 2. **Blink Tracking**
- ✅ Real-time blink detection with hysteresis thresholds
- ✅ Same 60-second rolling window on both platforms
- ✅ Identical blink rate calculations (blinks per minute)
- ✅ Same data structure: `{ totalBlinksInWindow, blinkRatePerSecond, lastBlinkTimestamp, avgBlinkDuration }`

### 3. **Face Stress Analysis Pipeline**
- ✅ MediaPipe FaceMesh runs identically on desktop and mobile
- ✅ Same 468 facial landmark detection
- ✅ Identical eye aspect ratio (EAR) calculations
- ✅ Same jaw, brow, lip, and gaze metrics
- ✅ Platform-agnostic signal processing

### 4. **Output Format**
All platforms return the same `FaceMetrics` interface:

```typescript
interface FaceMetrics {
  // Detection status
  isPresent: boolean;
  confidence: number;
  
  // Stress analysis (0-100 scale)
  stressScore: number;        // Comprehensive stress level
  isHighStress: boolean;       // true if score >= 55
  
  // Individual stress signals (0-100 scale)
  signals: {
    browTension: number;
    jawClench: number;
    blinkRateAbnormal: number;
    lipCompression: number;
    microExpressionTension: number;
    headMovement: number;
    gazeInstability: number;
  };
  
  // Blink tracking
  blinkData: {
    totalBlinksInWindow: number;
    blinkRatePerSecond: number;
    lastBlinkTimestamp: number;
    avgBlinkDuration: number;
  };
  
  // Raw facial metrics
  blinkRate: number;           // Blinks per minute
  eyeAspectRatio: number;
  jawOpenness: number;
  browFurrow: number;
  gazeStability: number;
  
  // Expression indicators
  expressionCues: {
    concentration: number;
    stress: number;
    fatigue: number;
  };
  
  // Performance metrics
  fps?: number;
  latencyMs?: number;
  medianLatencyMs?: number;
}
```

## Mobile Optimizations

While maintaining **identical output and decision logic**, the mobile implementation includes performance optimizations:

### Camera Settings
- **Desktop**: 640x480 @ 30fps
- **Mobile**: 480x360 @ 24fps (optimized for battery and processing)

### Performance Tuning
- Adaptive resolution based on device capabilities
- Lower target FPS on mobile to conserve battery
- Same quality facial landmark detection at lower resolution
- No compromise on stress detection accuracy

### Device Detection
The system automatically detects mobile devices using:
- User agent string analysis
- Touch capability detection
- Screen size heuristics

## Usage

### Desktop (Webcam)
```typescript
import { useFaceDetection } from '@/hooks/useFaceDetection';

function DesktopComponent() {
  const { metrics, startDetection, stopDetection } = useFaceDetection();
  
  useEffect(() => {
    startDetection();
    return () => stopDetection();
  }, []);
  
  if (metrics?.isPresent) {
    console.log('Stress Score:', metrics.stressScore);
    console.log('High Stress?', metrics.isHighStress);
    console.log('Blink Rate:', metrics.blinkData.blinkRatePerSecond);
  }
}
```

### Mobile (Phone Camera)
```typescript
import { useFaceDetection } from '@/hooks/useFaceDetection';

function MobileComponent() {
  const { metrics, startDetection, stopDetection } = useFaceDetection();
  
  // IDENTICAL CODE - same hook, same behavior
  useEffect(() => {
    startDetection();
    return () => stopDetection();
  }, []);
  
  if (metrics?.isPresent) {
    console.log('Stress Score:', metrics.stressScore);       // 0-100
    console.log('High Stress?', metrics.isHighStress);        // boolean
    console.log('Blink Rate:', metrics.blinkData.blinkRatePerSecond);
  }
}
```

## AI Decision Layer Compatibility

The server-side AI decision layer (`aiDecisionLayer.ts`) is **completely platform-agnostic**. It receives `CameraSignals` data and applies the same risk assessment logic regardless of whether the data came from desktop or mobile.

### Consistent Decision Making
- Same risk scoring algorithm
- Same threshold values
- Same cooldown enforcement
- Same intervention recommendations

### Example Flow
```
Mobile Phone Camera → Face Detection → Camera Signals → AI Decision Layer → Risk Score
Desktop Webcam     → Face Detection → Camera Signals → AI Decision Layer → Risk Score
                    (same algorithm)  (same format)   (same logic)       (same scale)
```

## Testing Mobile Support

### 1. **On Real Device**
- Open the app on your mobile phone
- Grant camera permissions
- Start face detection
- Verify real-time updates of stress score and blink data

### 2. **Chrome DevTools Mobile Emulation**
- Open Chrome DevTools (F12)
- Toggle device toolbar (Ctrl+Shift+M)
- Select a mobile device (iPhone, Android)
- The system will detect it as mobile and apply optimizations

### 3. **Verify Output Consistency**
```javascript
// This test should pass on both desktop and mobile
console.assert(metrics.stressScore >= 0 && metrics.stressScore <= 100);
console.assert(typeof metrics.isHighStress === 'boolean');
console.assert(metrics.blinkData.totalBlinksInWindow >= 0);
console.assert(typeof metrics.signals.browTension === 'number');
```

## Browser Compatibility

### Desktop
- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Edge 90+
- ✅ Safari 14+ (with WebRTC support)

### Mobile
- ✅ Chrome Mobile 90+ (Android)
- ✅ Safari Mobile 14+ (iOS)
- ✅ Firefox Mobile 88+ (Android)
- ✅ Samsung Internet 14+

## Troubleshooting

### Mobile Camera Not Detected
1. Check camera permissions in browser settings
2. Ensure HTTPS connection (required for camera access)
3. Try different browsers (Chrome Mobile recommended)

### Performance Issues on Mobile
1. Close other apps to free memory
2. Ensure good lighting for better landmark detection
3. Lower resolution is automatic on mobile

### Inconsistent Results Between Desktop and Mobile
- This should NOT happen - if you see different stress scores or risk assessments for the same facial expressions, it's a bug
- Both platforms use identical algorithms
- Report any discrepancies with device details and metrics

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        User's Face                          │
│                    (Desktop or Mobile)                      │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│              Camera Input (Auto-detected)                   │
│  Desktop: 640x480 @ 30fps │ Mobile: 480x360 @ 24fps        │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│          MediaPipe FaceMesh (Platform-Agnostic)             │
│              468 Facial Landmarks Detection                 │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│         Face Detection Service (Identical Logic)            │
│  • Blink Detection (same thresholds)                        │
│  • Eye Aspect Ratio (same calculation)                      │
│  • Jaw/Brow/Lip Analysis (same metrics)                     │
│  • Stress Score Calculation (same algorithm)                │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│              FaceMetrics Output (Identical)                 │
│  • stressScore: 0-100                                       │
│  • isHighStress: boolean                                    │
│  • blinkData: { ... }                                       │
│  • signals: { browTension, jawClench, ... }                 │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│          CameraSignals (Platform-Agnostic Type)             │
│              Sent to Server for AI Analysis                 │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│      AI Decision Layer (Server - No Platform Awareness)     │
│  • Risk Scoring (same algorithm)                            │
│  • Threshold Evaluation (same values)                       │
│  • Decision: Allow/Cooldown/Block                           │
└─────────────────────────────────────────────────────────────┘
```

## Summary

EmotionGuard's mobile support is **complete and production-ready**:

✅ Same stress detection logic on desktop and mobile  
✅ Same 0-100 stress score scale  
✅ Same blink tracking and data format  
✅ Same AI decision thresholds  
✅ Optimized performance for mobile devices  
✅ No platform-specific code in decision logic  
✅ Comprehensive testing on real devices  

**Result**: Traders get consistent risk protection whether they trade from their desktop workstation or their mobile phone.
