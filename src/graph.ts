import { StateGraph, START, END, MemorySaver } from "@langchain/langgraph";
import { ResearchStateAnnotation, type ResearchState } from "./state";
import { plannerNode, researcherNode, drafterNode, criticNode } from "./node";

function shouldContinueOrEnd(state: ResearchState) {
  const MAX_REVISIONS = 2;

  if (state.critiqueScore >= 80 || state.revisionNumber >= MAX_REVISIONS) {
    console.log(
      "\n-> Route: Draft passed review (or max revisions reached). Ending research!",
    );
    return "end";
  }

  console.log(
    "\n-> Route: Score below threshold. Looping back to Drafter with feedback...",
  );
  return "refine";
}

export function buildResearchGraph() {
  const workflow = new StateGraph(ResearchStateAnnotation)
    .addNode("planner", plannerNode)
    .addNode("researcher", researcherNode)
    .addNode("drafter", drafterNode)
    .addNode("critic", criticNode)
    .addEdge(START, "planner")
    .addEdge("planner", "researcher")
    .addEdge("researcher", "drafter")
    .addEdge("drafter", "critic")
    .addConditionalEdges("critic", shouldContinueOrEnd, {
      refine: "drafter",
      end: END,
    });

  const checkpointer = new MemorySaver();
  return workflow.compile({ checkpointer });
}
