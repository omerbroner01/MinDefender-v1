import { useCallback, useEffect, useRef, useState } from "react";
import "@tensorflow/tfjs-backend-webgl";
import { stressAnalysisModel, type StressAnalysisResult } from "@/lib/stressAnalysisModel";
import type { CameraSignals } from "@/types/tradePause";

interface EmotionSenseOptions {
  durationSeconds?: number;
}

type EmotionSenseStatus = "idle" | "initializing" | "running" | "completed" | "error";

const clamp = (value: number, min = 0, max = 1) => Math.max(min, Math.min(max, value));

function average(values: number[]) {
  if (!values.length) {
    return 0;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function standardDeviation(values: number[], mean?: number) {
  if (values.length <= 1) {
    return 0;
  }
  const m = mean ?? average(values);
  const variance = average(values.map((value) => (value - m) * (value - m)));
  return Math.sqrt(variance);
}

function getBrowserNavigator(): any | undefined {
  if (typeof navigator === "undefined") {
    return undefined;
  }
  return navigator as any;
}

function getLegacyGetUserMedia(nav: any) {
  return nav?.getUserMedia || nav?.webkitGetUserMedia || nav?.mozGetUserMedia || nav?.msGetUserMedia;
}

function hasCameraSupport(): boolean {
  const nav = getBrowserNavigator();
  if (!nav) return false;
  const mediaDevices = nav.mediaDevices;
  const legacy = getLegacyGetUserMedia(nav);
  return (
    (!!mediaDevices && typeof mediaDevices.getUserMedia === "function") ||
    typeof legacy === "function"
  );
}

async function requestUserMedia(constraints: MediaStreamConstraints): Promise<MediaStream> {
  const nav = getBrowserNavigator();
  if (!nav) {
    throw new Error("Camera API not available in this environment.");
  }

  const mediaDevices = nav.mediaDevices;
  if (mediaDevices && typeof mediaDevices.getUserMedia === "function") {
    return mediaDevices.getUserMedia.call(mediaDevices, constraints);
  }

  const legacyGetUserMedia = getLegacyGetUserMedia(nav);
  if (typeof legacyGetUserMedia === "function") {
    return new Promise<MediaStream>((resolve, reject) => {
      try {
        legacyGetUserMedia.call(nav, constraints, resolve, reject);
      } catch (err) {
        reject(err);
      }
    });
  }

  throw new Error("Camera API not available on this browser. Please update to a modern browser with camera support.");
}

export function useEmotionSense() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [status, setStatus] = useState<EmotionSenseStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<CameraSignals | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const modelRef = useRef<boolean>(false); // Just a flag that model is loaded
  const rafRef = useRef<number | null>(null);
  const summaryRef = useRef<CameraSignals | null>(null);
  const statusRef = useRef<EmotionSenseStatus>("idle");
  const errorRef = useRef<string | null>(null);

  const stop = useCallback(() => {
    // If we're running and have no summary yet, attempt to compute a final snapshot
    // from whatever was last set in summaryRef (live updates handle most cases).
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    // Reset stress model state
    stressAnalysisModel.reset();

    setStatus((prev) => (prev === "running" ? "completed" : prev));
  }, []);

  // Ensure mediaDevices exists and HTTPS requirement is clear on mobile
  const ensureMediaDevicesShim = () => {
    const nav: any = navigator as any;
    
    console.log('🔧 SHIM: Starting mediaDevices shim check...');
    console.log('🔧 SHIM: navigator.mediaDevices exists?', !!nav.mediaDevices);
    console.log('🔧 SHIM: getUserMedia type before shim:', typeof (nav.mediaDevices?.getUserMedia));
    
    // Create mediaDevices object if it doesn't exist (very old browsers)
    if (typeof nav.mediaDevices === 'undefined' || !nav.mediaDevices) {
      nav.mediaDevices = {};
      console.log('📱 INFO: Created mediaDevices object');
    }
    
    // Check if getUserMedia is actually a function (not just defined)
    if (typeof nav.mediaDevices.getUserMedia !== 'function') {
      console.warn('⚠️ WARNING: navigator.mediaDevices.getUserMedia is not a function, attempting polyfill...');
      
      // Try to find legacy getUserMedia API
      const legacyGetUserMedia = getLegacyGetUserMedia(nav);
      
      console.log('🔧 SHIM: Legacy API found?', !!legacyGetUserMedia, typeof legacyGetUserMedia);
      
      if (legacyGetUserMedia && typeof legacyGetUserMedia === 'function') {
        // Polyfill using legacy API - bind to navigator for proper context
        nav.mediaDevices.getUserMedia = function(constraints: MediaStreamConstraints) {
          console.log('📱 INFO: Using legacy getUserMedia polyfill');
          return new Promise<MediaStream>((resolve, reject) => {
            try {
              legacyGetUserMedia.call(nav, constraints, resolve, reject);
            } catch (err) {
              reject(err);
            }
          });
        };
        console.log('✅ SHIM: Polyfill created successfully');
      } else {
        // No API available - but DON'T throw here, let the later check handle it
        console.error('❌ ERROR: No camera API available (native or legacy)');
      }
    } else {
      console.log('✅ INFO: navigator.mediaDevices.getUserMedia is already available as function');
    }
    
    console.log('🔧 SHIM: getUserMedia type after shim:', typeof (nav.mediaDevices?.getUserMedia));
  };

  const start = useCallback(async (options?: EmotionSenseOptions): Promise<CameraSignals> => {
    if (status === "running") {
      throw new Error("EmotionSense is already running");
    }

    // Comprehensive secure context checking
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    const isLocalhost = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(hostname);
    const isLocalNetwork = /^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/.test(hostname);
    const isHTTPS = protocol === 'https:';
    const isSecure = window.isSecureContext;
    
    console.log('🔒 Security Context Check:', {
      protocol,
      hostname,
      isLocalhost,
      isLocalNetwork,
      isHTTPS,
      isSecureContext: isSecure,
      userAgent: navigator.userAgent.substring(0, 50) + '...'
    });

    // CRITICAL: Check secure context FIRST before checking camera API
    // This gives users the correct error message about HTTPS, not a misleading camera API error
    if (!isSecure) {
      // Desktop localhost is usually OK without HTTPS
      if (isLocalhost) {
        console.warn('⚠️ Running on localhost without HTTPS - some browsers may block camera');
      } else if (isLocalNetwork) {
        // Mobile browsers REQUIRE HTTPS even for local network
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        if (isMobile) {
          throw new Error(
            '🔒 HTTPS Required for Mobile Camera Access\n\n' +
            `This page is served over HTTP, not HTTPS.\n` +
            `Mobile browsers require HTTPS for camera access.\n\n` +
            `Current URL: ${protocol}//${hostname}\n\n` +
            `Quick Fix Options:\n\n` +
            `1. Use LocalTunnel (instant HTTPS):\n` +
            `   Run: npm run tunnel:local\n` +
            `   Then open the https:// URL on your phone\n\n` +
            `2. Enable HTTPS in development:\n` +
            `   Run: ./setup-https.ps1 (Windows) or ./setup-https.sh (macOS/Linux)\n` +
            `   See MOBILE_HTTPS_SETUP_GUIDE.md for details\n\n` +
            `Need help? Check the setup guide in your project folder.`
          );
        } else {
          throw new Error(
            'Camera access requires HTTPS or localhost.\n\n' +
            'See MOBILE_HTTPS_SETUP_GUIDE.md for setup instructions.'
          );
        }
      } else {
        // Public domain without HTTPS
        throw new Error(
          'Camera access requires HTTPS.\n\n' +
          'This site must be served over HTTPS to access the camera.\n' +
          'Contact your system administrator or see MOBILE_HTTPS_SETUP_GUIDE.md'
        );
      }
    }

    ensureMediaDevicesShim();

    if (!hasCameraSupport()) {
      // At this point we know we have a secure context but camera API is still missing
      // This is a different problem - either very old browser or API disabled
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      
      if (isMobile && !isHTTPS && !isLocalhost) {
        throw new Error(
          '📱 Mobile HTTPS Setup Required\n\n' +
          `Your mobile browser cannot access the camera because:\n` +
          `• This page is not served over trusted HTTPS\n` +
          `• Current URL: ${protocol}//${hostname}\n\n` +
          `Solution:\n` +
          `Run this on your computer:\n` +
          `  npm run tunnel:local\n\n` +
          `Then open the https:// URL on your phone.\n\n` +
          `Or follow the complete setup guide:\n` +
          `MOBILE_HTTPS_SETUP_GUIDE.md`
        );
      }
      
      throw new Error(
        'Camera API not available.\n\n' +
        'Possible causes:\n' +
        '• Browser does not support camera access\n' +
        '• Camera is disabled in browser settings\n' +
        '• Using a very old browser version\n\n' +
        'Try:\n' +
        '• Use the latest version of Chrome, Safari, or Edge\n' +
        '• Check browser permissions for this site\n' +
        '• Ensure camera is not being used by another app'
      );
    }

    // Default to 8s to match the UI camera scan countdown
    const durationMs = Math.max(10, Math.floor((options?.durationSeconds ?? 8) * 1000));
    setError(null);
    setSummary(null);
    summaryRef.current = null;
    setStatus("initializing");

    try {
    const videoElement = videoRef.current ?? document.createElement("video");
    videoElement.muted = true;
    videoElement.playsInline = true;
    // iOS Safari requires the lowercase attribute for inline playback
    videoElement.setAttribute('playsinline', 'true');
    videoElement.setAttribute('muted', 'true');
    videoElement.setAttribute("autoplay", "true");
      videoElement.width = 640;
      videoElement.height = 480;
      videoRef.current = videoElement;

      // CAMERA FIX: robust getUserMedia with retries and device fallback
  const getCameraStreamWithRetries = async (retries = 4) => {
        console.log('📹 INFO: Starting camera acquisition...');
        console.log('📹 DEBUG: navigator.mediaDevices exists?', !!navigator.mediaDevices);
        console.log('📹 DEBUG: getUserMedia type:', typeof (navigator.mediaDevices?.getUserMedia));
        console.log('📹 DEBUG: getUserMedia value:', navigator.mediaDevices?.getUserMedia);
        
        // Verify getUserMedia is available as a function
        if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
          console.error('❌ Camera API check failed:', {
            hasMediaDevices: !!navigator.mediaDevices,
            getUserMediaType: typeof (navigator.mediaDevices?.getUserMedia),
            getUserMediaValue: navigator.mediaDevices?.getUserMedia
          });
          // We already gate earlier, but keep this error as a safety net.
          throw new Error('Camera API not available. Please use a modern browser with camera support.');
        }
        
        const baseConstraints = {
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: 'user'
          },
          audio: false
        } as MediaStreamConstraints;

        // Try simple request first
        for (let attempt = 1; attempt <= retries; attempt++) {
          try {
            console.log(`🎯 INFO: getUserMedia attempt ${attempt}/${retries}`);
            
            // Prefer facingMode on first attempts
            if (attempt === 1) {
              const s = await requestUserMedia(baseConstraints);
              console.log('✅ SUCCESS: Camera acquired via facingMode');
              return s;
            }

            // Attempt 2: try back camera on mobile if front-facing fails
            if (attempt === 2) {
              console.log('🎯 INFO: Trying facingMode: environment (back camera)');
              const backConstraints: MediaStreamConstraints = {
                video: {
                  width: { ideal: 640 },
                  height: { ideal: 480 },
                  facingMode: { ideal: 'environment' },
                },
                audio: false,
              };
              try {
                const s = await requestUserMedia(backConstraints);
                console.log('✅ SUCCESS: Camera acquired via back camera');
                return s;
              } catch (e) {
                console.warn('⚠️ WARNING: environment facingMode failed, continuing...');
                // continue
              }
            }

            // On later attempts, try enumerating devices and request a front-facing deviceId
            console.log('🔍 INFO: Enumerating camera devices...');
            if (!navigator.mediaDevices || typeof navigator.mediaDevices.enumerateDevices !== 'function') {
              throw new Error('enumerateDevices not supported');
            }
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoInputs = devices.filter(d => d.kind === 'videoinput');
            console.log(`📹 INFO: Found ${videoInputs.length} video input(s)`);

            // Try to find a label that suggests front camera (may be empty before permission)
            let front = videoInputs.find(d => /front|face|user/i.test(d.label));
            let back = videoInputs.find(d => /back|rear|environment/i.test(d.label));
            if (!front && videoInputs.length > 0) front = videoInputs[0];

              if (front) {
                console.log(`🎯 INFO: Selecting camera: ${front.label || front.deviceId}`);
                const deviceConstraints: MediaStreamConstraints = {
                  video: { deviceId: { exact: front.deviceId }, width: { ideal: 640 }, height: { ideal: 480 } },
                  audio: false
                };
                try {
                  const s = await requestUserMedia(deviceConstraints);
                  console.log('✅ SUCCESS: Camera acquired via deviceId');
                  return s;
                } catch (e) {
                  console.warn('⚠️ WARNING: deviceId constraint failed, continuing...');
                  // ignore and continue to next attempt
                }
              }

              // Try back camera device if front not successful
              if (back) {
                console.log(`🎯 INFO: Trying alternate camera: ${back.label || back.deviceId}`);
                const backDeviceConstraints: MediaStreamConstraints = {
                  video: { deviceId: { exact: back.deviceId }, width: { ideal: 640 }, height: { ideal: 480 } },
                  audio: false,
                };
                try {
                  const s = await requestUserMedia(backDeviceConstraints);
                  console.log('✅ SUCCESS: Camera acquired via back deviceId');
                  return s;
                } catch (e) {
                  console.warn('⚠️ WARNING: back deviceId constraint failed, continuing...');
                }
              }

              // As a last resort, try with relaxed constraints
              console.log('🔄 INFO: Trying minimal constraints...');
              const relaxed = { video: true, audio: false } as MediaStreamConstraints;
              const s = await requestUserMedia(relaxed);
              console.log('✅ SUCCESS: Camera acquired with minimal constraints');
              return s;
            } catch (err) {
            const errorMsg = err instanceof Error ? err.message : String(err);
            console.error(`❌ ERROR: getUserMedia attempt ${attempt} failed:`, errorMsg);
            
            // Check for permission denied
            if (errorMsg.includes('Permission denied') || errorMsg.includes('NotAllowedError')) {
              throw new Error('Camera permission denied. Please allow camera access.');
            }
            
            // small backoff
            if (attempt < retries) {
              console.log(`⏳ INFO: Retrying in ${300 * attempt}ms...`);
              await new Promise(res => setTimeout(res, 300 * attempt));
              continue;
            }
          }
        }
        throw new Error('Unable to acquire camera after multiple attempts');
      }

      const stream = await getCameraStreamWithRetries(4);
      streamRef.current = stream;
      videoElement.srcObject = stream;
      console.log(`✅ INFO: Camera stream connected to video element`);

      // Wait for metadata to load (gives us video dimensions)
      console.log('⏳ INFO: Waiting for video metadata...');
      await new Promise<void>((resolve) => {
        if (videoElement.readyState >= 1) {
          resolve();
        } else {
          videoElement.addEventListener('loadedmetadata', () => resolve(), { once: true });
        }
      });
      
      console.log(`✅ INFO: Video metadata loaded (${videoElement.videoWidth}x${videoElement.videoHeight})`);
      
      await videoElement.play();
      console.log('▶️ INFO: Video playback started');
      
      // Wait for video to have actual frame data ready (readyState >= 2 means HAVE_CURRENT_DATA)
      console.log('⏳ INFO: Waiting for video frame data...');
      let frameAttempts = 0;
      const maxFrameAttempts = 50; // 5 seconds
      while (videoElement.readyState < 2 && frameAttempts < maxFrameAttempts) {
        await new Promise(resolve => setTimeout(resolve, 100));
        frameAttempts++;
      }
      
      if (videoElement.readyState < 2) {
        throw new Error(`Video frame data timeout (readyState: ${videoElement.readyState})`);
      }
      
      console.log(`✅ SUCCESS: Video frame data ready (readyState: ${videoElement.readyState})`);
      
      // Give an extra moment for WebGL context to be fully ready
      await new Promise(resolve => setTimeout(resolve, 300));

      // Initialize the stress analysis model (shared with desktop)
      if (!modelRef.current) {
        console.log('🧠 INFO: Loading advanced stress detection model...');
        await stressAnalysisModel.initialize();
        modelRef.current = true; // Just a flag that it's loaded
        console.log('✅ SUCCESS: Stress detection model loaded');
      }

      setStatus("running");

      const startTime = performance.now();
      
      // IMMEDIATE INITIALIZATION: Set baseline summary immediately so UI has values to display
      // This prevents the "stuck at 0%" problem during initial frames
      const initialSummary: CameraSignals = {
        stressLevel: 0,
        agitation: 0,
        focus: 0.5, // Start at neutral focus
        fatigue: 0,
        confidence: 0.1, // Low confidence initially
        signalQuality: 0,
        durationMs: 0,
        samples: 0,
        raw: {
          blinkRate: 16, // Normal baseline
          browTension: 0,
          gazeStability: 0.75, // Neutral stability
          headMovement: 0,
          microExpressionTension: 0,
          lipCompression: 0,
          jawClench: 0,
        },
        notes: ['Initializing analysis...'],
        stressScore: 0,
        isHighStress: false,
        signals: {
          browTension: 0,
          jawClench: 0,
          blinkRateAbnormal: 0,
          lipCompression: 0,
          microExpressionTension: 0,
          headMovement: 0,
          gazeInstability: 0,
        },
      };
      summaryRef.current = initialSummary;
      setSummary(initialSummary);
      
      type MetricBuckets = {
        stressScoreSamples: number[];
        blinkRateSamples: number[];
        browTensionSamples: number[];
        jawClenchSamples: number[];
        lipPressSamples: number[];
        microExpressionSamples: number[];
        headMovementSamples: number[];
        gazeInstabilitySamples: number[];
        validSamples: number;
        totalSamples: number;
      };

      const metrics: MetricBuckets = {
        stressScoreSamples: [],
        blinkRateSamples: [],
        browTensionSamples: [],
        jawClenchSamples: [],
        lipPressSamples: [],
        microExpressionSamples: [],
        headMovementSamples: [],
        gazeInstabilitySamples: [],
        validSamples: 0,
        totalSamples: 0,
      };

      const loop = async () => {
        if (!videoRef.current) {
          return;
        }

        const now = performance.now();
        const elapsed = now - startTime;

        try {
          // Verify video has valid dimensions before attempting analysis
          if (videoRef.current.videoWidth === 0 || videoRef.current.videoHeight === 0) {
            // Video not ready yet, skip this frame
            if (elapsed < durationMs) {
              rafRef.current = requestAnimationFrame(loop);
            }
            return;
          }

          // Use the new stress analysis model
          const result: StressAnalysisResult = await stressAnalysisModel.analyzeFrame(videoRef.current);
          metrics.totalSamples += 1;

          // ALWAYS update UI, even if no face detected - shows "searching..." state
          let shouldUpdateSummary = true;

          if (result.faceDetected) {
            metrics.validSamples += 1;
            
            // Collect stress metrics
            metrics.stressScoreSamples.push(result.stressScore);
            metrics.blinkRateSamples.push(result.blinkRate);
            metrics.browTensionSamples.push(result.metrics.browTension);
            metrics.jawClenchSamples.push(result.metrics.jawClench);
            metrics.lipPressSamples.push(result.metrics.lipPress);
            metrics.microExpressionSamples.push(result.metrics.microExpressionTension);
            metrics.headMovementSamples.push(result.metrics.headMovement);
            metrics.gazeInstabilitySamples.push(result.metrics.gazeInstability);
          }

          // LIVE UPDATE: compute rolling averages and publish interim summary for UI
          // Calculate from available samples, using defaults if no samples yet
          const avgStressScore = metrics.stressScoreSamples.length > 0 
            ? average(metrics.stressScoreSamples.slice(-Math.min(metrics.stressScoreSamples.length, 40))) 
            : 0;
          const avgBlinkRate = metrics.blinkRateSamples.length > 0 
            ? average(metrics.blinkRateSamples.slice(-40)) 
            : 16; // Normal baseline
          const avgBrowTension = metrics.browTensionSamples.length > 0 
            ? average(metrics.browTensionSamples.slice(-40)) 
            : 0;
          const avgJawClench = metrics.jawClenchSamples.length > 0 
            ? average(metrics.jawClenchSamples.slice(-40)) 
            : 0;
          const avgLipPress = metrics.lipPressSamples.length > 0 
            ? average(metrics.lipPressSamples.slice(-40)) 
            : 0;
          const avgMicroExpression = metrics.microExpressionSamples.length > 0 
            ? average(metrics.microExpressionSamples.slice(-40)) 
            : 0;
          const avgHeadMovement = metrics.headMovementSamples.length > 0 
            ? average(metrics.headMovementSamples.slice(-40)) 
            : 0;
          const avgGazeInstability = metrics.gazeInstabilitySamples.length > 0 
            ? average(metrics.gazeInstabilitySamples.slice(-40)) 
            : 20; // Slight instability baseline

          const detectionQuality = metrics.totalSamples > 0 ? metrics.validSamples / metrics.totalSamples : 0;
          const normalBlinkRate = 16;
          const blinkDeviation = Math.abs(avgBlinkRate - normalBlinkRate);
          const interimStressScore = Math.round(
            avgBrowTension * 0.25 +
            avgJawClench * 0.20 +
            avgMicroExpression * 0.18 +
            avgGazeInstability * 0.15 +
            avgLipPress * 0.10 +
            Math.min(100, (blinkDeviation / normalBlinkRate) * 100) * 0.07 +
            avgHeadMovement * 0.05
          );
          const clampedStressScore = Math.min(100, Math.max(0, interimStressScore));
          
          // Generate descriptive notes based on detection status
          const scanNotes: string[] = [];
          if (metrics.validSamples === 0) {
            scanNotes.push('Searching for face...');
          } else if (detectionQuality < 0.5) {
            scanNotes.push('Face detection unstable - please look directly at camera');
          } else if (metrics.validSamples < 5) {
            scanNotes.push('Face detected - analyzing...');
          } else {
            scanNotes.push('Active analysis in progress');
          }
          
          const interimSummary: CameraSignals = {
            stressLevel: clamp(clampedStressScore / 100),
            agitation: clamp((avgHeadMovement + avgGazeInstability) / 200),
            focus: clamp(1 - avgGazeInstability / 100),
            fatigue: clamp((blinkDeviation / normalBlinkRate + avgMicroExpression / 100) / 2),
            confidence: clamp(detectionQuality * 0.9),
            signalQuality: detectionQuality,
            durationMs: elapsed,
            samples: metrics.validSamples,
            raw: {
              blinkRate: avgBlinkRate,
              browTension: avgBrowTension / 100,
              gazeStability: clamp(1 - avgGazeInstability / 100),
              headMovement: avgHeadMovement / 100,
              microExpressionTension: avgMicroExpression / 100,
              lipCompression: avgLipPress / 100,
              jawClench: avgJawClench / 100,
            },
            notes: scanNotes.length > 0 ? scanNotes : undefined,
            stressScore: clampedStressScore,
            isHighStress: clampedStressScore >= 60,
            signals: {
              browTension: Math.round(avgBrowTension),
              jawClench: Math.round(avgJawClench),
              blinkRateAbnormal: Math.round(Math.min(100, (blinkDeviation / normalBlinkRate) * 100)),
              lipCompression: Math.round(avgLipPress),
              microExpressionTension: Math.round(avgMicroExpression),
              headMovement: Math.round(avgHeadMovement),
              gazeInstability: Math.round(avgGazeInstability),
            },
          };
          summaryRef.current = interimSummary;
          setSummary(interimSummary);
        } catch (error) {
          // Silently catch errors to prevent breaking the loop
          console.warn('⚠️ Stress analysis frame error (non-critical):', error instanceof Error ? error.message : error);
        }

        if (elapsed >= durationMs) {
          finalize(metrics, durationMs);
          return;
        }

        rafRef.current = requestAnimationFrame(loop);
      };

      const finalize = (buckets: MetricBuckets, duration: number) => {
        stop();

        // Calculate averages from collected samples
        const avgStressScore = average(buckets.stressScoreSamples);
        const avgBlinkRate = average(buckets.blinkRateSamples);
        const avgBrowTension = average(buckets.browTensionSamples);
        const avgJawClench = average(buckets.jawClenchSamples);
        const avgLipPress = average(buckets.lipPressSamples);
        const avgMicroExpression = average(buckets.microExpressionSamples);
        const avgHeadMovement = average(buckets.headMovementSamples);
        const avgGazeInstability = average(buckets.gazeInstabilitySamples);

        const detectionQuality = buckets.totalSamples > 0
          ? buckets.validSamples / buckets.totalSamples
          : 0;

        // Map to 0-1 scale for legacy compatibility
        const stressLevel = clamp(avgStressScore / 100);
        const agitation = clamp((avgHeadMovement + avgGazeInstability) / 200);
        const focus = clamp(1 - avgGazeInstability / 100);
        
        // Fatigue from blink rate deviation and micro-expressions
        const normalBlinkRate = 16;
        const blinkDeviation = Math.abs(avgBlinkRate - normalBlinkRate);
        const fatigue = clamp((blinkDeviation / normalBlinkRate + avgMicroExpression / 100) / 2);

        const confidence = clamp(detectionQuality * 0.9);

        // Calculate composite stress score (same algorithm as real-time)
        const stressScore = Math.round(
          avgBrowTension * 0.25 +
          avgJawClench * 0.20 +
          avgMicroExpression * 0.18 +
          avgGazeInstability * 0.15 +
          avgLipPress * 0.10 +
          Math.min(100, (blinkDeviation / normalBlinkRate) * 100) * 0.07 +
          avgHeadMovement * 0.05
        );

        const clampedStressScore = Math.min(100, Math.max(0, stressScore));
        const isHighStress = clampedStressScore >= 60;

        const summaryPayload: CameraSignals = {
          stressLevel,
          agitation,
          focus,
          fatigue,
          confidence,
          signalQuality: detectionQuality,
          durationMs: duration,
          samples: buckets.validSamples,
          raw: {
            blinkRate: avgBlinkRate,
            browTension: avgBrowTension / 100, // Convert to 0-1
            gazeStability: clamp(1 - avgGazeInstability / 100),
            headMovement: avgHeadMovement / 100,
            microExpressionTension: avgMicroExpression / 100,
            lipCompression: avgLipPress / 100,
            jawClench: avgJawClench / 100,
          },
          notes: detectionQuality < 0.6 ? ["Low signal quality detected"] : undefined,
          // STRESS DETECTION: Comprehensive stress analysis
          stressScore: clampedStressScore,
          isHighStress,
          signals: {
            browTension: Math.round(avgBrowTension),
            jawClench: Math.round(avgJawClench),
            blinkRateAbnormal: Math.round(Math.min(100, (blinkDeviation / normalBlinkRate) * 100)),
            lipCompression: Math.round(avgLipPress),
            microExpressionTension: Math.round(avgMicroExpression),
            headMovement: Math.round(avgHeadMovement),
            gazeInstability: Math.round(avgGazeInstability),
          },
        };

        summaryRef.current = summaryPayload;
        setSummary(summaryPayload);
        setStatus("completed");
      };

      rafRef.current = requestAnimationFrame(loop);

      return new Promise<CameraSignals>((resolve, reject) => {
        const checkCompletion = () => {
          if (statusRef.current === "error") {
            reject(new Error(errorRef.current ?? "Camera failed"));
            return;
          }

          if (summaryRef.current) {
            resolve(summaryRef.current);
            return;
          }

          requestAnimationFrame(checkCompletion);
        };

        requestAnimationFrame(checkCompletion);
      });
    } catch (err) {
      console.error("EmotionSense failed", err);
      const message = err instanceof Error ? err.message : "Unable to start camera scan";
      setError(message);
      setStatus("error");
      stop();
      throw err;
    }
  }, [error, status, stop]);

  useEffect(() => stop, [stop]);
  useEffect(() => {
    statusRef.current = status;
  }, [status]);
  useEffect(() => {
    errorRef.current = error;
  }, [error]);

  return {
    videoRef,
    status,
    error,
    summary,
    start,
    stop,
  };
}
