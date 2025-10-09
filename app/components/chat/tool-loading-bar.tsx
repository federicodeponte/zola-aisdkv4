"use client";

import type { ReactNode } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Info,
  WarningCircle,
  CheckCircle,
  HourglassHigh,
  DownloadSimple,
} from "@phosphor-icons/react";

type ToolLoadingBarVariant = "preparing" | "running" | "success" | "error";

type StatusDetail = {
  label: string;
  value: string;
};

type StatusProgress = {
  percentage?: number | null;
  current?: number;
  total?: number;
  label?: string;
};

type StatusDownload = {
  url: string;
  label?: string;
};

type StatusRetry = {
  onRetry: () => void;
  label?: string;
  disabled?: boolean;
};

export type ToolLoadingBarProps = {
  variant: ToolLoadingBarVariant;
  title: string;
  description?: string;
  icon?: ReactNode;
  progress?: StatusProgress;
  eta?: string;
  currentRow?: string;
  details?: StatusDetail[];
  download?: StatusDownload;
  errorDetails?: string;
  actions?: ReactNode;
  retry?: StatusRetry;
  className?: string;
};

function getVariantIcon(variant: ToolLoadingBarVariant) {
  switch (variant) {
    case "preparing":
      return <HourglassHigh className="text-primary size-5" />;
    case "running":
      return <HourglassHigh className="text-primary size-5 animate-spin" />;
    case "success":
      return <CheckCircle className="text-emerald-500 size-5" weight="fill" />;
    case "error":
      return <WarningCircle className="text-destructive size-5" weight="fill" />;
  }
}

export function ToolLoadingBar({
  variant,
  title,
  description,
  progress,
  eta,
  currentRow,
  details,
  download,
  errorDetails,
  actions,
  retry,
  icon,
  className,
}: ToolLoadingBarProps) {
  const resolvedIcon = icon ?? getVariantIcon(variant);
  const shouldRenderProgress = variant === "running";
  const computedPercentage = progress?.percentage ?? null;
  const hasDeterminateProgress =
    typeof computedPercentage === "number" && !Number.isNaN(computedPercentage);

  return (
    <Card className={cn("border-primary/30 bg-muted/30", className)}>
      <CardHeader className="flex flex-row items-start gap-3">
        <div className="mt-0.5 flex-shrink-0">{resolvedIcon}</div>
        <div className="space-y-1">
          <CardTitle className="text-base font-semibold">{title}</CardTitle>
          {description ? (
            <CardDescription className="text-sm leading-relaxed">
              {description}
            </CardDescription>
          ) : null}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {shouldRenderProgress ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{progress?.label ?? "Progress"}</span>
              {hasDeterminateProgress ? (
                <span>{computedPercentage}%</span>
              ) : (
                <Info className="size-3" />
              )}
            </div>
            <Progress
              value={
                hasDeterminateProgress
                  ? Math.min(Math.max(computedPercentage ?? 0, 0), 100)
                  : undefined
              }
              className={cn("h-2", hasDeterminateProgress ? "" : "bg-primary/30")}
            />
            <div className="grid gap-1 text-xs text-muted-foreground">
              {hasDeterminateProgress &&
              typeof progress?.current === "number" &&
              typeof progress?.total === "number" ? (
                <span>
                  {progress.current} of {progress.total} rows completed
                </span>
              ) : null}
              {currentRow ? (
                <span className="rounded-md border border-dashed border-muted bg-background/50 px-2 py-1 text-[11px]">
                  Current row: {currentRow}
                </span>
              ) : null}
              {eta ? <span>Estimated time remaining: {eta}</span> : null}
            </div>
          </div>
        ) : null}

        {variant === "success" && Array.isArray(details) && details.length > 0 ? (
          <dl className="grid gap-2 text-sm">
            {details.map((detail) => (
              <div
                key={`${detail.label}:${detail.value}`}
                className="flex justify-between gap-4 text-muted-foreground"
              >
                <dt className="font-medium text-foreground">{detail.label}</dt>
                <dd className="text-right">{detail.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}

        {variant === "error" && errorDetails ? (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            {errorDetails}
          </div>
        ) : null}
      </CardContent>

      {(download || actions || retry) && (
        <CardFooter className="flex flex-wrap items-center gap-2">
          {download ? (
            <Button asChild size="sm">
              <a href={download.url} download className="flex items-center gap-2">
                <DownloadSimple className="size-4" />
                Download {download.label ?? "results"}
              </a>
            </Button>
          ) : null}

          {retry ? (
            <Button
              size="sm"
              variant="outline"
              onClick={retry.onRetry}
              disabled={retry.disabled}
            >
              {retry.label ?? "Retry"}
            </Button>
          ) : null}

          {actions}
        </CardFooter>
      )}
    </Card>
  );
}


