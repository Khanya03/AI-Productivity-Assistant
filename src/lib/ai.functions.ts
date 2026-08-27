import { createServerFn } from "@tanstack/react-start";
import {
  briefInputSchema,
  briefingInputSchema,
  dailyBriefInputSchema,
  emailInputSchema,
  guardrailsInputSchema,
  plannerInputSchema,
  runBriefingGeneration,
  runDailyBriefGeneration,
  runEmailGeneration,
  runMarketBriefGeneration,
  runGuardrailsGeneration,
  runPlanGeneration,
  runStakeholderGeneration,
  stakeholderInputSchema,
} from "./ai.server";

export const generateExecEmail = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => emailInputSchema.parse(input))
  .handler(async ({ data }) =>
    runEmailGeneration(data, process.env["LOVABLE_API_KEY"]),
  );

export const generateBriefing = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => briefingInputSchema.parse(input))
  .handler(async ({ data }) =>
    runBriefingGeneration(data, process.env["LOVABLE_API_KEY"]),
  );

export const generatePlan = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => plannerInputSchema.parse(input))
  .handler(async ({ data }) =>
    runPlanGeneration(data, process.env["LOVABLE_API_KEY"]),
  );

export const generateMarketBrief = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => briefInputSchema.parse(input))
  .handler(async ({ data }) =>
    runMarketBriefGeneration(data, process.env["LOVABLE_API_KEY"]),
  );

export const generateDailyBrief = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => dailyBriefInputSchema.parse(input))
  .handler(async ({ data }) =>
    runDailyBriefGeneration(data, process.env["LOVABLE_API_KEY"]),
  );

export const generateGuardrails = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => guardrailsInputSchema.parse(input))
  .handler(async ({ data }) =>
    runGuardrailsGeneration(data, process.env["LOVABLE_API_KEY"]),
  );

export const generateStakeholderInsight = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => stakeholderInputSchema.parse(input))
  .handler(async ({ data }) =>
    runStakeholderGeneration(data, process.env["LOVABLE_API_KEY"]),
  );
