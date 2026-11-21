import { ChatGroq } from "@langchain/groq";
import { z } from "zod";
import type { ResearchState } from "./state";

const model = new ChatGroq({
  model: "openai/gpt-oss-20b",
  temperature: 0.2,
});

// Node 1: PLANNER
// Goal: Takes the topic and breaks it into 3 targeted search questions.

export async function plannerNode(state: ResearchState) {
  console.log("\n[1. Planner] Generating research plan for:", state.topic);
  const planSchema = z.object({
    queries: z
      .array(z.string())
      .describe("3-4 specific search queries to investigate the topic"),
  });

  const structuredLlm = model.withStructuredOutput(planSchema);
  const response = await structuredLlm.invoke(
    `You are a research analyst. Break down the following topic into 3 specific, targeted web search queries:\nTopic: "${state.topic}"`,
  );

  return {
    plan: response.queries,
  };
}

// Node 2: RESEARCHER (Tool Execution)
// Goal: Executes searches for each query in the plan.
// (Here we simulate findings, but you can plug in Tavily/DuckDuckGo/Fetch API

interface TavilySearchResult {
  title: string;
  url: string;
  content: string;
}
interface TavilyResponse {
  results: TavilySearchResult[];
}

async function searchWithTavily(query: string): Promise<string> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    throw new Error("Missing TAVILY_API_KEY in your .env file!");
  }
  const response = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      api_key: apiKey,
      query: query,
      search_depth: "basic",
      max_results: 3,
    }),
  });
  const data = (await response.json()) as TavilyResponse;
  // Format Tavily's output as clean markdown bullet points
  return data.results
    .map((r: any) => `- **${r.title}**: ${r.content} (Source: ${r.url})`)
    .join("\n\n");
}

export async function researcherNode(state: ResearchState) {
  const gatheredNotes: string[] = [];

  for (const query of state.plan) {
    console.log(`Searching Tavily for: "${query}"`);

    const searchResult = await searchWithTavily(query);

    gatheredNotes.push(`### Research on "${query}":\n${searchResult}`);
  }

  return {
    researchNotes: gatheredNotes,
  };
}

// Node 3: DRAFTER
// Goal: Synthesizes research notes into a coherent markdown report.

export async function drafterNode(state: ResearchState) {
  console.log("\n[3. Drafter] Writing/Refining draft (Revision #" + state.revisionNumber + ")...");
  let prompt = `You are an expert technical writer. Write a comprehensive markdown report based on these research notes:
${state.researchNotes.join("\n\n")}`;
  // If we looped back because the critic had feedback, include it!
  if (state.critiqueFeedback) {
    prompt += `\n\nATTENTION: A reviewer critiqued your previous draft. Address this feedback in your new draft:
"${state.critiqueFeedback}"`;
  }
  const response = await model.invoke(prompt);
  return {
    draft: response.content as string,
    revisionNumber: 1, // Reducer will increment state.revisionNumber by 1
  };
}

// Node 4: CRITIC / EVALUATOR
// Goal: Objectively score the draft and provide constructive critique.

export async function criticNode(state: ResearchState) {
  console.log("\n[4. Critic] Reviewing draft...");

  const critiqueSchema = z.object({
    score: z
      .number()
      .min(0)
      .max(100)
      .describe("Quality score from 0 to 100 based on clarity and depth"),
    feedback: z
      .string()
      .describe(
        "Specific guidance on what is missing or what needs improvement",
      ),
    isApproved: z
      .boolean()
      .describe("True if score is >= 80 and report is well structured"),
  });

  const structuredLlm = model.withStructuredOutput(critiqueSchema);

  const critique = await structuredLlm.invoke(
    `Critique the following draft report for the topic "${state.topic}".
Check if it has good headings, thorough analysis, and clear structure.
Draft:
${state.draft}`,
  );

  console.log(
    `[4. Critic] Score: ${critique.score}/100 | Approved: ${critique.isApproved}`,
  );
  console.log(`[4. Critic] Feedback: ${critique.feedback}`);
  return {
    critiqueScore: critique.score,
    critiqueFeedback: critique.feedback,
  };
}
