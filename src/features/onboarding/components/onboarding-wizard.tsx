"use client";

import Image from "next/image";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useCompleteOnboarding } from "../hooks/use-onboarding";

const HEAR_ABOUT_US_OPTIONS = [
  { value: "google", label: "Google" },
  { value: "youtube", label: "YouTube" },
  { value: "instagram", label: "Instagram" },
  { value: "facebook", label: "Facebook" },
  { value: "tiktok", label: "TikTok" },
  { value: "friend", label: "Un amigo" },
] as const;

const TEAM_SIZE_OPTIONS = [
  { value: "just_me", label: "Solo yo" },
  { value: "2_10", label: "2–10" },
  { value: "11_50", label: "11–50" },
  { value: "50_plus", label: "50+" },
] as const;

const USE_CASE_OPTIONS = [
  { value: "support", label: "Brindar soporte a mis clientes" },
  { value: "automation", label: "Automatizar mis conversaciones" },
  { value: "sales", label: "Capturar y calificar leads de ventas" },
  { value: "booking", label: "Agendar citas o reservas" },
] as const;

type HearAboutUs = (typeof HEAR_ABOUT_US_OPTIONS)[number]["value"];
type TeamSize = (typeof TEAM_SIZE_OPTIONS)[number]["value"];
type UseCase = (typeof USE_CASE_OPTIONS)[number]["value"];

const TOTAL_STEPS = 4;

export const OnboardingWizard = () => {
  const [step, setStep] = useState(1);
  const [hearAboutUs, setHearAboutUs] = useState<HearAboutUs | "">("");
  const [businessName, setBusinessName] = useState("");
  const [teamSize, setTeamSize] = useState<TeamSize | "">("");
  const [useCase, setUseCase] = useState<UseCase[]>([]);

  const completeOnboarding = useCompleteOnboarding();

  const toggleUseCase = (value: UseCase) => {
    setUseCase((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value]
    );
  };

  const canContinue =
    (step === 1 && hearAboutUs !== "") ||
    (step === 2 && businessName.trim().length > 0) ||
    (step === 3 && teamSize !== "") ||
    (step === 4 && useCase.length > 0);

  const handleNext = () => {
    if (step < TOTAL_STEPS) {
      setStep(step + 1);
      return;
    }

    if (hearAboutUs === "" || teamSize === "" || useCase.length === 0) return;

    completeOnboarding.mutate({
      hearAboutUs,
      businessName: businessName.trim(),
      teamSize,
      useCase,
    });
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  return (
    <div className="flex min-h-svh items-center justify-center bg-background px-4">
      <div className="w-full max-w-[360px]">
        <div className="mb-10 flex flex-col items-center gap-3">
          <Image src="/logos/logo.svg" alt="Nodebase" width={32} height={32} />
          <span className="text-lg font-semibold tracking-tight">Nodebase</span>
        </div>

        <Progress value={(step / TOTAL_STEPS) * 100} className="mb-8" />

        <div className="mb-8">
          {step === 1 && (
            <>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">¿Cómo te enteraste de nosotros?</h1>
              <p className="mt-1.5 text-sm text-muted-foreground">Ayúdanos a entender de dónde vienen nuestros usuarios.</p>
            </>
          )}
          {step === 2 && (
            <>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">¿Cuál es el nombre de tu negocio?</h1>
              <p className="mt-1.5 text-sm text-muted-foreground">Lo usaremos para configurar tu espacio de trabajo.</p>
            </>
          )}
          {step === 3 && (
            <>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">¿Qué tan grande es tu equipo?</h1>
              <p className="mt-1.5 text-sm text-muted-foreground">Esto nos ayuda a personalizar tu experiencia.</p>
            </>
          )}
          {step === 4 && (
            <>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">¿Cómo vas a usar Nodebase en tu negocio?</h1>
              <p className="mt-1.5 text-sm text-muted-foreground">Elige lo que más se acerque a lo que necesitas hoy.</p>
            </>
          )}
        </div>

        <div className="flex flex-col gap-4">
          {step === 1 && (
            <RadioGroup
              value={hearAboutUs}
              onValueChange={(value) => setHearAboutUs(value as HearAboutUs)}
              className="gap-2"
            >
              {HEAR_ABOUT_US_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  htmlFor={`hear-${option.value}`}
                  data-checked={hearAboutUs === option.value}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm text-foreground transition-colors cursor-pointer hover:bg-muted/60 data-[checked=true]:border-primary/60 data-[checked=true]:bg-muted/60"
                >
                  {option.label}
                  <RadioGroupItem value={option.value} id={`hear-${option.value}`} />
                </label>
              ))}
            </RadioGroup>
          )}

          {step === 2 && (
            <input
              type="text"
              placeholder="Acme Inc."
              value={businessName}
              onChange={(event) => setBusinessName(event.target.value)}
              disabled={completeOnboarding.isPending}
              className="w-full rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none transition-colors focus:border-primary/60 focus:bg-muted/60"
            />
          )}

          {step === 3 && (
            <RadioGroup
              value={teamSize}
              onValueChange={(value) => setTeamSize(value as TeamSize)}
              className="gap-2"
            >
              {TEAM_SIZE_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  htmlFor={`team-${option.value}`}
                  data-checked={teamSize === option.value}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm text-foreground transition-colors cursor-pointer hover:bg-muted/60 data-[checked=true]:border-primary/60 data-[checked=true]:bg-muted/60"
                >
                  {option.label}
                  <RadioGroupItem value={option.value} id={`team-${option.value}`} />
                </label>
              ))}
            </RadioGroup>
          )}

          {step === 4 && (
            <div className="flex flex-col gap-2">
              {USE_CASE_OPTIONS.map((option) => {
                const checked = useCase.includes(option.value);
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="checkbox"
                    aria-checked={checked}
                    data-checked={checked}
                    onClick={() => toggleUseCase(option.value)}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/40 px-4 py-3 text-left text-sm text-foreground transition-colors cursor-pointer hover:bg-muted/60 data-[checked=true]:border-primary/60 data-[checked=true]:bg-muted/60"
                  >
                    {option.label}
                    <span className="border-input aspect-square size-4 shrink-0 rounded-full border flex items-center justify-center">
                      {checked && <span className="size-2 rounded-full bg-primary" />}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          <Button
            type="button"
            onClick={handleNext}
            disabled={!canContinue || completeOnboarding.isPending}
            className="mt-2"
          >
            {step === TOTAL_STEPS
              ? completeOnboarding.isPending
                ? "Configurando..."
                : "Finalizar"
              : "Continuar"}
          </Button>
        </div>

        {step > 1 && (
          <p className="mt-6 text-center text-sm text-muted-foreground">
            <button
              type="button"
              onClick={handleBack}
              disabled={completeOnboarding.isPending}
              className="font-medium text-foreground underline underline-offset-4 hover:text-primary"
            >
              Atrás
            </button>
          </p>
        )}
      </div>
    </div>
  );
};
