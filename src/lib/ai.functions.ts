import { createServerFn } from "@tanstack/react-start";
import {
  briefInputSchema,
  briefingInputSchema,
  emailInputSchema,
  plannerInputSchema,
  runBriefingGeneration,
  runEmailGeneration,
  runMarketBriefGeneration,
  runPlanGeneration,
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
