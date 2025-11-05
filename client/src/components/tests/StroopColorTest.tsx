import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { FocusStabilityMetrics } from "@/types/tradePause";

interface StroopColorTestProps {
  onComplete(metrics: FocusStabilityMetrics): void;
  onCancel?: () => void;
  trialsCount?: number;
  autoAdvanceMs?: number; // NEW: Auto-advance timeout
}

type TestPhase = "intro" | "running" | "summary";

interface ColorTrial {
  id: number;
  wordText: string; // ENGLISH color name
  wordColor: string; // Actual ink color
  correctAnswer: string; // Should match wordColor (English name)
}

interface TrialResult {
  wordText: string;
  wordColor: string;
  userResponse: string | null;
  reactionTimeMs: number | null;
  correct: boolean;
  timeout: boolean;
}

// ENGLISH color names mapped to their hex colors
const COLORS = {
  "RED": "#ef4444",
  "BLUE": "#3b82f6",
  "GREEN": "#22c55e",
  "YELLOW": "#eab308",
  "PURPLE": "#a855f7",
};

const COLOR_NAMES = Object.keys(COLORS) as Array<keyof typeof COLORS>;
const DEFAULT_TRIALS = 20;
const DISPLAY_MS = 2000; // Fallback time window (reduced from 2500)
const AUTO_ADVANCE_MS = 2000; // FASTER: Auto-advance time (2.0 seconds, was 2.5)
const GAP_MS = 300; // FASTER: Gap between trials (was 400ms)

export function StroopColorTest({
  onComplete,
  onCancel,
  trialsCount = DEFAULT_TRIALS,
  autoAdvanceMs = AUTO_ADVANCE_MS, // NEW: Auto-advance enabled by default
}: StroopColorTestProps) {
  const [phase, setPhase] = useState<TestPhase>("intro");
  const [trialIndex, setTrialIndex] = useState(-1);
  const [currentTrial, setCurrentTrial] = useState<ColorTrial | null>(null);
  const [awaitingResponse, setAwaitingResponse] = useState(false);

  const trialStartRef = useRef<number>(0);
  const timeoutRef = useRef<number | null>(null);
  const gapTimerRef = useRef<number | null>(null);
  const resultsRef = useRef<TrialResult[]>([]);
  const isProcessingRef = useRef(false);

  // Generate trials: mix of congruent (word matches color) and incongruent (conflict)
  const trials = useMemo<ColorTrial[]>(() => {
    const generated: ColorTrial[] = [];
    
    for (let i = 0; i < trialsCount; i++) {
      const wordText = COLOR_NAMES[Math.floor(Math.random() * COLOR_NAMES.length)];
      
      // 70% incongruent (conflict) trials for better stress testing
      const isCongruent = Math.random() < 0.3;
      const wordColor = isCongruent 
        ? COLORS[wordText]
        : COLORS[COLOR_NAMES.filter(name => name !== wordText)[Math.floor(Math.random() * (COLOR_NAMES.length - 1))]];
      
      generated.push({
        id: i,
        wordText,
        wordColor,
        correctAnswer: wordColor,
      });
    }
    
    return generated;
  }, [trialsCount]);

  const clearAllTimers = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (gapTimerRef.current) {
      clearTimeout(gapTimerRef.current);
      gapTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (phase !== "running") {
      return;
    }

    if (trialIndex >= trials.length) {
      finalize();
      return;
    }

    if (trialIndex >= 0) {
      presentTrial();
    }

    return clearAllTimers;
  }, [phase, trialIndex, trials.length, clearAllTimers]);

  const presentTrial = useCallback(() => {
    if (isProcessingRef.current) return;
    
    clearAllTimers();
    const trial = trials[trialIndex];
    setCurrentTrial(trial);
    setAwaitingResponse(true);
    trialStartRef.current = performance.now();

    // NEW: Auto-timeout to force advancement (prevents infinite waiting)
    const timeoutDuration = autoAdvanceMs || DISPLAY_MS;
    timeoutRef.current = window.setTimeout(() => {
      // Auto-advance: treat as no response (timeout)
      registerResult({
        wordText: trial.wordText,
        wordColor: trial.wordColor,
        userResponse: null,
        reactionTimeMs: null,
        correct: false,
        timeout: true,
      });
    }, timeoutDuration);
  }, [trials, trialIndex, clearAllTimers, autoAdvanceMs]);

  const registerResult = useCallback((result: TrialResult) => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    resultsRef.current.push(result);
    setAwaitingResponse(false);
    clearAllTimers();
    setCurrentTrial(null);

    // Short gap before next trial
    gapTimerRef.current = window.setTimeout(() => {
      isProcessingRef.current = false;
      setTrialIndex((prev) => prev + 1);
    }, GAP_MS);
  }, [clearAllTimers]);

  const handleColorChoice = useCallback((chosenColor: string) => {
    if (!awaitingResponse || !currentTrial || isProcessingRef.current) {
      return;
    }

    const reaction = performance.now() - trialStartRef.current;
    registerResult({
      wordText: currentTrial.wordText,
      wordColor: currentTrial.wordColor,
      userResponse: chosenColor,
      reactionTimeMs: reaction,
      correct: chosenColor === currentTrial.correctAnswer,
      timeout: false,
    });
  }, [awaitingResponse, currentTrial, registerResult]);

  const finalize = useCallback(() => {
    clearAllTimers();
    setPhase("summary");
    const metrics = calculateStroopMetrics(resultsRef.current);
    setTimeout(() => onComplete(metrics), 100);
  }, [clearAllTimers, onComplete]);

  const progress = Math.max(0, Math.min(100, Math.round(((trialIndex + 1) / trials.length) * 100)));

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Attention & Control Test</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {phase === "intro" && (
          <div className="space-y-4 text-sm text-muted-foreground">
            <p>
              You will see a <span className="font-semibold text-foreground">color word in ENGLISH</span> displayed in a specific color ink.
            </p>
            <p>
              <span className="font-semibold text-foreground">Your task:</span> Click the button that matches the <span className="underline">actual COLOR OF THE TEXT</span>, NOT what the word says.
            </p>
            <div className="bg-muted p-3 rounded-md">
              <p className="text-xs font-medium mb-2">Example:</p>
              <p className="text-xs">
                Word says: <span style={{ color: "#eab308", fontWeight: "bold" }}>GREEN</span>
                <br />
                Text color is: <span className="font-semibold">YELLOW</span>
                <br />
                Correct answer: <span className="font-semibold">YELLOW</span> (the ink color, NOT the word meaning)
              </p>
            </div>
            <p className="text-xs font-semibold text-yellow-600 dark:text-yellow-500">
              ⚠️ Each word appears for only {(autoAdvanceMs / 1000).toFixed(1)} seconds - react quickly!
            </p>
            <p className="text-xs">
              This tests impulse control and focus under cognitive conflict and time pressure.
            </p>
            <div className="flex gap-2">
              <Button className="flex-1" onClick={() => { setTrialIndex(0); setPhase("running"); }}>
                Start Color Test
              </Button>
              {onCancel && (
                <Button variant="outline" className="flex-1" onClick={onCancel}>
                  Cancel
                </Button>
              )}
            </div>
          </div>
        )}

        {phase === "running" && (
          <div className="space-y-4">
            <Progress value={progress} />
            
            {/* Stimulus Display */}
            <div className="h-40 border rounded-lg flex items-center justify-center bg-white dark:bg-gray-900">
              {currentTrial ? (
                <div
                  className="text-5xl font-bold transition-colors duration-100"
                  style={{ color: currentTrial.wordColor }}
                >
                  {currentTrial.wordText}
                </div>
              ) : (
                <span className="text-muted-foreground">Get ready…</span>
              )}
            </div>

            {/* Response Buttons */}
            <div className="grid grid-cols-3 gap-2">
              {COLOR_NAMES.map((colorName) => (
                <Button
                  key={colorName}
                  onClick={() => handleColorChoice(COLORS[colorName])}
                  disabled={!awaitingResponse}
                  variant="outline"
                  className="h-14 font-medium"
                  style={{
                    backgroundColor: awaitingResponse ? COLORS[colorName] : undefined,
                    color: awaitingResponse ? "#fff" : undefined,
                    borderColor: COLORS[colorName],
                    borderWidth: "2px",
                  }}
                >
                  {colorName}
                </Button>
              ))}
            </div>
          </div>
        )}

        {phase === "summary" && (
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>Analyzing focus and impulse control…</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function calculateStroopMetrics(results: TrialResult[]): FocusStabilityMetrics {
  const correctResponses = results.filter((r) => r.correct);
  const incorrectResponses = results.filter((r) => !r.correct && !r.timeout);
  const timeouts = results.filter((r) => r.timeout);

  const reactionTimes = results
    .map((r) => r.reactionTimeMs)
    .filter((rt): rt is number => typeof rt === "number");

  const avgReactionTimeMs = reactionTimes.length ? average(reactionTimes) : 0;
  const reactionStdDevMs = reactionTimes.length ? standardDeviation(reactionTimes, avgReactionTimeMs) : 0;

  // Calculate metrics compatible with FocusStabilityMetrics
  const totalStimuli = results.length;
  const matchesPresented = Math.floor(totalStimuli * 0.3); // Approximate congruent trials
  const correctMatches = correctResponses.length;
  const missedMatches = timeouts.length;
  const falseAlarms = incorrectResponses.length;
  
  // Sustained attention score based on accuracy and response rate
  const sustainedAttention = clamp(correctResponses.length / Math.max(totalStimuli, 1));

  return {
    totalStimuli,
    matchesPresented,
    correctMatches,
    missedMatches,
    falseAlarms,
    avgReactionTimeMs,
    reactionStdDevMs,
    sustainedAttention,
  };
}

function average(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function standardDeviation(values: number[], mean?: number) {
  if (values.length <= 1) return 0;
  const m = mean ?? average(values);
  const variance = values.reduce((sum, value) => sum + (value - m) * (value - m), 0) / values.length;
  return Math.sqrt(variance);
}

function clamp(value: number, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}
