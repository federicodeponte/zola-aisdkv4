import type { ToolInvocationUIPart } from "@ai-sdk/ui-utils";
import type { HeavyToolStage } from "@/lib/tools/heavy-tool/types";

export function parseToolStage(toolData: ToolInvocationUIPart): HeavyToolStage | null {
  if (toolData.toolInvocation.state !== "result") {
    return null;
  }

  const content = toolData.toolInvocation.result?.content;
  if (!Array.isArray(content)) {
    return null;
  }

  const payloadText = content.find(
    (part): part is { type: "text"; text: string } =>
      typeof part === "object" &&
      part !== null &&
      part.type === "text" &&
      typeof part.text === "string" &&
      part.text.trim().startsWith("{\"stage\":")
  )?.text;

  if (!payloadText) {
    return null;
  }

  try {
    const parsed = JSON.parse(payloadText) as { stage?: unknown };
    if (!parsed || typeof parsed.stage !== "object" || parsed.stage === null) {
      return null;
    }

    const stageCandidate = parsed.stage as { type?: unknown };
    if (
      stageCandidate.type === "plan" ||
      stageCandidate.type === "executing" ||
      stageCandidate.type === "complete" ||
      stageCandidate.type === "error"
    ) {
      return stageCandidate as HeavyToolStage;
    }
  } catch (error) {
    console.error("Failed to parse tool stage payload", error);
  }

  return null;
}


