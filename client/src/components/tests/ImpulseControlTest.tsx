import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { ImpulseControlMetrics } from "@/types/tradePause";

interface ImpulseControlTestProps {
  onComplete(metrics: ImpulseControlMetrics): void;
  onCancel?: () => void;
  trialCount?: number;
}

interface TrialPlan {
  id: number;
  type: "go" | "no-go";
}

interface TrialResult {
  type: "go" | "no-go";
  reactionTimeMs: number | null;
  responded: boolean;
  correct: boolean;
  premature: boolean;
}

type TestPhase = "intro" | "countdown" | "running" | "summary";

const DEFAULT_TRIALS = 18;
const RESPONSE_WINDOW_MS = 1500; // Slightly reduced for faster flow
const REST_DELAY_MS = 200; // Faster rest between trials

export function ImpulseControlTest({
  onComplete,
  onCancel,
  trialCount = DEFAULT_TRIALS,
}: ImpulseControlTestProps) {
  const [phase, setPhase] = useState<TestPhase>("intro");
  const [countdown, setCountdown] = useState(3);
  const [trialIndex, setTrialIndex] = useState(-1);
  const [activeType, setActiveType] = useState<"go" | "no-go" | null>(null);
  const [awaitingResponse, setAwaitingResponse] = useState(false);

  const resultsRef = useRef<TrialResult[]>([]);
  const stimulusStartRef = useRef<number>(0);
  const preTimerRef = useRef<number | null>(null);
  const responseTimerRef = useRef<number | null>(null);
  const isProcessingRef = useRef(false);

  const plans = useMemo<TrialPlan[]>(() => {
    const trials: TrialPlan[] = [];
    for (let i = 0; i < trialCount; i++) {
      trials.push({
        id: i,
        type: Math.random() < 0.65 ? "go" : "no-go",
      });
    }
    return trials;
  }, [trialCount]);

  // Cleanup function to clear all timers
  const clearAllTimers = useCallback(() => {
    if (preTimerRef.current) {
      clearTimeout(preTimerRef.current);
      preTimerRef.current = null;
    }
    if (responseTimerRef.current) {
      clearTimeout(responseTimerRef.current);
      responseTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (phase !== "countdown") {
      return;
    }

    setCountdown(3);
    const handle = window.setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(handle);
          setPhase("running");
          setTrialIndex(0);
          return 0;
        }
        return prev - 1;
      });
    }, 600); // Faster countdown

    return () => clearInterval(handle);
  }, [phase]);

  useEffect(() => {
    if (phase !== "running") {
      return;
    }

    if (trialIndex >= plans.length) {
      finishTest();
      return;
    }

    if (trialIndex >= 0) {
      scheduleTrial();
    }

    return clearAllTimers;
  }, [phase, trialIndex, plans.length, clearAllTimers]);

  const scheduleTrial = useCallback(() => {
    if (isProcessingRef.current) return;
    
    clearAllTimers();
    setActiveType(null);
    setAwaitingResponse(false);

    const delay = 350 + Math.random() * 500; // Slightly faster delays
    preTimerRef.current = window.setTimeout(() => {
      const plan = plans[trialIndex];
      setActiveType(plan.type);
      setAwaitingResponse(true);
      stimulusStartRef.current = performance.now();

      responseTimerRef.current = window.setTimeout(() => {
        registerResult({
          type: plan.type,
          reactionTimeMs: null,
          responded: false,
          correct: plan.type === "no-go",
          premature: false,
        });
      }, RESPONSE_WINDOW_MS);
    }, delay);
  }, [plans, trialIndex, clearAllTimers]);

  const registerResult = useCallback((result: TrialResult) => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    resultsRef.current.push(result);
    setAwaitingResponse(false);
    clearAllTimers();

    // Faster transition to next trial
    setTimeout(() => {
      isProcessingRef.current = false;
      setTrialIndex((prev) => prev + 1);
    }, REST_DELAY_MS);
  }, [clearAllTimers]);

  const handleResponse = useCallback(() => {
    if (phase !== "running" || isProcessingRef.current) {
      return;
    }

    if (!awaitingResponse || activeType === null) {
      // Premature response
      registerResult({
        type: "no-go",
        reactionTimeMs: null,
        responded: true,
        correct: false,
        premature: true,
      });
      return;
    }

    const reaction = performance.now() - stimulusStartRef.current;
    const plan = plans[trialIndex];
    const correct = plan.type === "go";

    registerResult({
      type: plan.type,
      reactionTimeMs: reaction,
      responded: true,
      correct,
      premature: false,
    });
  }, [phase, awaitingResponse, activeType, plans, trialIndex, registerResult]);

  const finishTest = useCallback(() => {
    clearAllTimers();
    setPhase("summary");
    const metrics = calculateMetrics(resultsRef.current);
    // Use setTimeout to ensure UI updates before callback
    setTimeout(() => onComplete(metrics), 100);
  }, [clearAllTimers, onComplete]);

  const progress = Math.min(100, Math.round(((trialIndex >= 0 ? trialIndex : 0) / plans.length) * 100));

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Impulse Control Test</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {phase === "intro" && (
          <div className="space-y-4 text-sm text-muted-foreground">
            <p>
              When the screen says <span className="font-semibold text-foreground">GO</span>, tap the button as fast as you can.
              When it says <span className="font-semibold text-destructive">HOLD</span>, do not tap.
            </p>
            <p>
              The test measures impulse control and discipline under pressure. Avoid reacting before the signal appears.
            </p>
            <div className="flex gap-2">
              <Button onClick={() => setPhase("countdown")} className="flex-1">
                Begin Test
              </Button>
              {onCancel && (
                <Button variant="outline" onClick={onCancel} className="flex-1">
                  Cancel
                </Button>
              )}
            </div>
          </div>
        )}

        {phase === "countdown" && (
          <div className="text-center space-y-4">
            <p className="text-muted-foreground">Test starts in</p>
            <div className="text-5xl font-semibold text-foreground">{countdown}</div>
          </div>
        )}

        {phase === "running" && (
          <div className="space-y-4">
            <Progress value={progress} />
            <div className="h-36 border rounded-lg flex items-center justify-center text-2xl font-bold transition-colors duration-100">
              {activeType === "go" && <span className="text-emerald-500">GO!</span>}
              {activeType === "no-go" && <span className="text-destructive">HOLD</span>}
              {activeType === null && <span className="text-muted-foreground">Wait…</span>}
            </div>
            <Button
              size="lg"
              onClick={handleResponse}
              className="w-full"
              variant={activeType === "no-go" ? "secondary" : "default"}
            >
              Tap when GO appears
            </Button>
          </div>
        )}

        {phase === "summary" && (
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>Collecting metrics…</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function calculateMetrics(results: TrialResult[]): ImpulseControlMetrics {
  const goTrials = results.filter((trial) => trial.type === "go");
  const noGoTrials = results.filter((trial) => trial.type === "no-go");

  const goCorrect = goTrials.filter((trial) => trial.correct);
  const noGoCorrect = noGoTrials.filter((trial) => !trial.responded);
  const impulsiveErrors = noGoTrials.length - noGoCorrect.length;
  const prematureResponses = results.filter((trial) => trial.premature).length;

  const reactionTimes = goCorrect
    .map((trial) => trial.reactionTimeMs)
    .filter((value): value is number => typeof value === "number");

  const avgReactionTimeMs = reactionTimes.length ? average(reactionTimes) : 0;
  const reactionStdDevMs = reactionTimes.length ? standardDeviation(reactionTimes, avgReactionTimeMs) : 0;

  const goAccuracy = goTrials.length ? goCorrect.length / goTrials.length : 0;
  const noGoAccuracy = noGoTrials.length ? noGoCorrect.length / noGoTrials.length : 0;

  const responseConsistency = clamp(1 - reactionStdDevMs / Math.max(avgReactionTimeMs, 1));

  return {
    totalTrials: results.length,
    goAccuracy,
    noGoAccuracy,
    avgReactionTimeMs,
    reactionStdDevMs,
    impulsiveErrors,
    responseConsistency,
    prematureResponses,
  };
}

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
  const variance = values.reduce((sum, value) => sum + (value - m) * (value - m), 0) / values.length;
  return Math.sqrt(variance);
}

function clamp(value: number, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}
