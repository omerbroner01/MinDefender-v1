import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { ReactionConsistencyMetrics } from "@/types/tradePause";

interface ReactionConsistencyTestProps {
  onComplete(metrics: ReactionConsistencyMetrics): void;
  onCancel?: () => void;
  trials?: number;
}

type TestPhase = "intro" | "running" | "summary";

type CueState = "waiting" | "armed" | "active";

interface TrialOutcome {
  reactionTimeMs: number | null;
  anticipatory: boolean;
  late: boolean;
}

const DEFAULT_TRIALS = 12;
const MIN_DELAY_MS = 700;
const MAX_DELAY_MS = 1700;
const RESPONSE_WINDOW_MS = 1400;

export function ReactionConsistencyTest({
  onComplete,
  onCancel,
  trials = DEFAULT_TRIALS,
}: ReactionConsistencyTestProps) {
  const [phase, setPhase] = useState<TestPhase>("intro");
  const [trialIndex, setTrialIndex] = useState(-1);
  const [cueState, setCueState] = useState<CueState>("waiting");
  const [timeRemaining, setTimeRemaining] = useState<number>(0);

  const delayTimersRef = useRef<number | null>(null);
  const responseTimerRef = useRef<number | null>(null);
  const cueStartRef = useRef<number>(0);
  const outcomesRef = useRef<TrialOutcome[]>([]);

  function scheduleTrial() {
    if (delayTimersRef.current) {
      clearTimeout(delayTimersRef.current);
    }

    const delay = MIN_DELAY_MS + Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS);
    setCueState("armed");
    delayTimersRef.current = window.setTimeout(() => {
      startCue();
    }, delay) as unknown as number;
  }

  function startCue() {
    setCueState("active");
    cueStartRef.current = performance.now();
    setTimeRemaining(RESPONSE_WINDOW_MS);

    if (responseTimerRef.current) {
      clearTimeout(responseTimerRef.current);
    }
    responseTimerRef.current = window.setTimeout(() => {
      registerOutcome({ reactionTimeMs: null, anticipatory: false, late: true });
    }, RESPONSE_WINDOW_MS) as unknown as number;
  }

  useEffect(() => {
    if (phase !== "running") {
      return;
    }

    if (trialIndex >= trials) {
      finish();
      return;
    }

    if (trialIndex >= 0) {
      scheduleTrial();
    }

    return () => {
      if (delayTimersRef.current) {
        clearTimeout(delayTimersRef.current);
        delayTimersRef.current = null;
      }
      if (responseTimerRef.current) {
        clearTimeout(responseTimerRef.current);
        responseTimerRef.current = null;
      }
    };
  }, [phase, trialIndex, trials]);

  useEffect(() => {
    if (cueState !== "active") {
      return;
    }

    let frame: number;
    const tick = () => {
      if (cueState !== "active") {
        return;
      }
      const elapsed = performance.now() - cueStartRef.current;
      setTimeRemaining(Math.max(0, RESPONSE_WINDOW_MS - elapsed));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [cueState]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.code === "Space" || event.key === " ") {
        event.preventDefault();
        handleResponse();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  });

  const handleResponse = () => {
    if (phase !== "running") {
      return;
    }

    if (cueState !== "active") {
      registerOutcome({ reactionTimeMs: null, anticipatory: true, late: false });
      return;
    }

    const reaction = performance.now() - cueStartRef.current;
    registerOutcome({ reactionTimeMs: reaction, anticipatory: false, late: false });
  };

  function registerOutcome(outcome: TrialOutcome) {
    outcomesRef.current.push(outcome);

    if (delayTimersRef.current) {
      clearTimeout(delayTimersRef.current);
      delayTimersRef.current = null;
    }
    if (responseTimerRef.current) {
      clearTimeout(responseTimerRef.current);
      responseTimerRef.current = null;
    }

    setCueState("waiting");
    setTimeRemaining(0);

    window.setTimeout(() => {
      setTrialIndex((prev) => prev + 1);
    }, 250);
  }

  function finish() {
    setPhase("summary");
    const metrics = calculateMetrics(outcomesRef.current);
    onComplete(metrics);
  }

  const progress = Math.max(0, Math.min(100, Math.round(((trialIndex + 1) / trials) * 100)));

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Reaction Consistency Test</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {phase === "intro" && (
          <div className="space-y-4 text-sm text-muted-foreground">
            <p>
              When the circle flashes <span className="font-semibold text-foreground">NOW</span>, tap the button or press the space bar immediately.
              Reacting too early or too late will reduce your consistency score.
            </p>
            <div className="flex gap-2">
              <Button
                className="flex-1"
                onClick={() => {
                  outcomesRef.current = [];
                  setCueState("waiting");
                  setTimeRemaining(0);
                  setTrialIndex(0);
                  setPhase("running");
                }}
              >
                Start Reaction Test
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
            <div className="h-36 flex items-center justify-center">
              <div
                className={`w-24 h-24 rounded-full border-4 flex items-center justify-center transition-colors duration-150 ${
                  cueState === "active" ? "border-emerald-500 text-emerald-500" : cueState === "armed" ? "border-primary text-muted-foreground" : "border-muted text-muted-foreground"
                }`}
              >
                {cueState === "active" ? "NOW" : cueState === "armed" ? "READY" : "WAIT"}
              </div>
            </div>
            <div className="text-center text-sm text-muted-foreground h-6">
              {cueState === "active" && (
                <span>Time left: {(timeRemaining / 1000).toFixed(2)}s</span>
              )}
            </div>
            <Button className="w-full" size="lg" onClick={handleResponse}>
              React
            </Button>
          </div>
        )}

        {phase === "summary" && (
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>Analyzing reaction profile…</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function calculateMetrics(outcomes: TrialOutcome[]): ReactionConsistencyMetrics {
  const validReactions = outcomes
    .map((outcome) => outcome.reactionTimeMs)
    .filter((value): value is number => typeof value === "number");

  const anticipations = outcomes.filter((outcome) => outcome.anticipatory).length;
  const lateResponses = outcomes.filter((outcome) => outcome.late).length;

  const averageMs = validReactions.length ? average(validReactions) : 0;
  const bestMs = validReactions.length ? Math.min(...validReactions) : 0;
  const worstMs = validReactions.length ? Math.max(...validReactions) : 0;
  const variability = validReactions.length ? standardDeviation(validReactions, averageMs) : 0;
  const stabilityScore = clamp(1 - variability / Math.max(averageMs, 1));

  return {
    trials: outcomes.length,
    averageMs,
    bestMs,
    worstMs,
    variability,
    stabilityScore,
    anticipations,
    lateResponses,
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
