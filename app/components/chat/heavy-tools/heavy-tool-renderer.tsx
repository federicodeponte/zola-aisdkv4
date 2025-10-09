"use client";

import type { ToolInvocationUIPart } from "@ai-sdk/ui-utils";
import { HeavyToolContainer } from "./heavy-tool-container";

export function HeavyToolRenderer({
  toolData,
  useStatusCard = false,
}: {
  toolData: ToolInvocationUIPart
  useStatusCard?: boolean
}) {
  return (
    <HeavyToolContainer toolData={toolData} useStatusCard={useStatusCard} />
  );
}

