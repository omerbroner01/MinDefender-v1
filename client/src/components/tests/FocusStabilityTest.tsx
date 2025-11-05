import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { FocusStabilityMetrics } from "@/types/tradePause";

interface FocusStabilityTestProps {
  onComplete(metrics: FocusStabilityMetrics): void;
  onCancel?: () => void;
  stimuliCount?: number;
}

type TestPhase = "intro" | "running" | "summary";

interface Stimulus {
  id: number;
  color: string;
  matchesPrevious: boolean;
}

interface StimulusResult {
  matchesPrevious: boolean;
  responded: boolean;
  reactionTimeMs: number | null;
  correct: boolean;
}

const COLORS = ["#4ade80", "#60a5fa", "#f97316", "#f43f5e", "#c084fc"]; // green blue orange red purple
const DISPLAY_MS = 1200;
const GAP_MS = 350;
const DEFAULT_STIMULI = 22;

export function FocusStabilityTest({
  onComplete,
  onCancel,
  stimuliCount = DEFAULT_STIMULI,
}: FocusStabilityTestProps) {
  const [phase, setPhase] = useState<TestPhase>("intro");
  const [stimulusIndex, setStimulusIndex] = useState(-1);
  const [currentStimulus, setCurrentStimulus] = useState<Stimulus | null>(null);
  const [awaitingResponse, setAwaitingResponse] = useState(false);

  const scheduleRef = useRef<number | null>(null);
  const responseWindowRef = useRef<number | null>(null);
  const stimulusStartRef = useRef<number>(0);
  const resultsRef = useRef<StimulusResult[]>([]);

  const stimuli = useMemo<Stimulus[]>(() => {
    const generated: Stimulus[] = [];
    let lastColor = COLORS[Math.floor(Math.random() * COLORS.length)];

    for (let i = 0; i < stimuliCount; i++) {
      const shouldMatch = i > 0 && Math.random() < 0.35;
      const color = shouldMatch ? lastColor : pickDifferentColor(lastColor);
      generated.push({ id: i, color, matchesPrevious: shouldMatch });
      lastColor = color;
    }

    return generated;
  }, [stimuliCount]);

  useEffect(() => {
    if (phase !== "running") {
      return;
    }

    if (stimulusIndex >= stimuli.length) {
      finalize();
      return;
    }

    const stimulus = stimuli[stimulusIndex];
    setCurrentStimulus(stimulus);
    stimulusStartRef.current = performance.now();
    setAwaitingResponse(true);

    responseWindowRef.current = window.setTimeout(() => {
      registerResult({
        matchesPrevious: stimulus.matchesPrevious,
        responded: false,
        reactionTimeMs: null,
        correct: !stimulus.matchesPrevious,
      });
    }, DISPLAY_MS) as unknown as number;

    scheduleRef.current = window.setTimeout(() => {
      setAwaitingResponse(false);
      setCurrentStimulus(null);
      window.setTimeout(() => {
        setStimulusIndex((prev) => prev + 1);
      }, GAP_MS);
    }, DISPLAY_MS) as unknown as number;

    return () => {
      if (scheduleRef.current) {
        clearTimeout(scheduleRef.current);
        scheduleRef.current = null;
      }
      if (responseWindowRef.current) {
        clearTimeout(responseWindowRef.current);
        responseWindowRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, stimulusIndex]);

  const handleRespond = () => {
    if (!awaitingResponse || !currentStimulus) {
      return;
    }

    const reaction = performance.now() - stimulusStartRef.current;
    registerResult({
      matchesPrevious: currentStimulus.matchesPrevious,
      responded: true,
      reactionTimeMs: reaction,
      correct: currentStimulus.matchesPrevious,
    });
    setAwaitingResponse(false);
  };

  const registerResult = (result: StimulusResult) => {
    resultsRef.current.push(result);

    if (responseWindowRef.current) {
      clearTimeout(responseWindowRef.current);
      responseWindowRef.current = null;
    }
  };

  const finalize = () => {
    setPhase("summary");
    const metrics = calculateMetrics(resultsRef.current);
    onComplete(metrics);
  };

  const progress = Math.max(0, Math.min(100, Math.round(((stimulusIndex + 1) / stimuli.length) * 100)));

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Focus Stability Test</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {phase === "intro" && (
          <div className="space-y-4 text-sm text-muted-foreground">
            <p>
              Watch the color tiles. Press the button <span className="font-semibold text-foreground">only</span> when the current color matches the one immediately before it.
            </p>
            <p>
              This measures sustained attention and vigilance. False alarms and missed matches will reduce your score.
            </p>
            <div className="flex gap-2">
              <Button className="flex-1" onClick={() => setPhase("running")}>Start Focus Test</Button>
              {onCancel && (
                <Button variant="outline" className="flex-1" onClick={onCancel}>Cancel</Button>
              )}
            </div>
          </div>
        )}

        {phase === "running" && (
          <div className="space-y-4">
            <Progress value={progress} />
            <div className="h-36 border rounded-lg flex items-center justify-center">
              {currentStimulus ? (
                <div
                  className="w-24 h-24 rounded-md shadow-inner"
                  style={{ backgroundColor: currentStimulus.color, transition: "background-color 120ms ease" }}
                />
              ) : (
                <span className="text-muted-foreground">Prepare for next tile…</span>
              )}
            </div>
            <Button
              variant={awaitingResponse ? "default" : "secondary"}
              disabled={!awaitingResponse}
              onClick={handleRespond}
              className="w-full"
            >
              Match
            </Button>
          </div>
        )}

        {phase === "summary" && (
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>Aggregating focus metrics…</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function calculateMetrics(results: StimulusResult[]): FocusStabilityMetrics {
  const matches = results.filter((stimulus) => stimulus.matchesPrevious);
  const nonMatches = results.filter((stimulus) => !stimulus.matchesPrevious);

  const correctMatches = matches.filter((stimulus) => stimulus.correct);
  const missedMatches = matches.length - correctMatches.length;
  const falseAlarms = nonMatches.filter((stimulus) => stimulus.responded).length;

  const reactionTimes = correctMatches
    .map((stimulus) => stimulus.reactionTimeMs)
    .filter((value): value is number => typeof value === "number");

  const avgReactionTimeMs = reactionTimes.length ? average(reactionTimes) : 0;
  const reactionStdDevMs = reactionTimes.length ? standardDeviation(reactionTimes, avgReactionTimeMs) : 0;

  const sustainedAttention = clamp(1 - (missedMatches + falseAlarms) / Math.max(results.length, 1));

  return {
    totalStimuli: results.length,
    matchesPresented: matches.length,
    correctMatches: correctMatches.length,
    missedMatches,
    falseAlarms,
    avgReactionTimeMs,
    reactionStdDevMs,
    sustainedAttention,
  };
}

function pickDifferentColor(previous: string) {
  const options = COLORS.filter((color) => color !== previous);
  return options[Math.floor(Math.random() * options.length)];
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
