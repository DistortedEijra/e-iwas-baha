import { useMemo, useEffect, useRef } from 'react';
import type { RouteFeature } from '../types.ts';
import type { LatLng } from '../types.ts';
import { buildSteps, findCurrentStep, type StepType } from '../lib/directions.ts';

const ICON: Record<StepType, string> = {
  depart: '◉',
  'turn-left': '↰',
  'turn-right': '↱',
  straight: '↑',
  arrive: '★',
};

interface Props {
  features: RouteFeature[];
  destinationName: string;
  userPosition: LatLng | null;
}

export function DirectionSteps({ features, destinationName, userPosition }: Props) {
  const steps = useMemo(
    () => buildSteps(features, destinationName),
    [features, destinationName],
  );

  const currentStep = useMemo(() => {
    if (!userPosition) return 0;
    return findCurrentStep(steps, features, userPosition.lat, userPosition.lng);
  }, [steps, features, userPosition]);

  const currentRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    currentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [currentStep]);

  if (steps.length === 0) return null;

  return (
    <div className="direction-steps">
      <p className="steps-title">Directions</p>
      {steps.map((step, i) => {
        const isCurrent = i === currentStep;
        const isDone = i < currentStep;
        return (
          <div
            key={i}
            ref={isCurrent ? currentRef : undefined}
            className={`step ${isCurrent ? 'step-current' : isDone ? 'step-done' : ''}`}
          >
            <div className="step-icon-wrap">
              <span className="step-icon">{ICON[step.type]}</span>
              {i < steps.length - 1 && <div className="step-line" />}
            </div>
            <div className="step-body">
              <div className="step-instruction">{step.instruction}</div>
              {step.distanceM > 0 && (
                <div className="step-meta">
                  <span>
                    {step.distanceM < 1000
                      ? `${Math.round(step.distanceM)} m`
                      : `${(step.distanceM / 1000).toFixed(1)} km`}
                  </span>
                  {step.hasFlood && (
                    <span className="step-flood-tag">⚠ Flooded</span>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
