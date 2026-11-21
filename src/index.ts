import { object } from "zod";
import { buildResearchGraph } from "./graph";

async function main() {
  const app = buildResearchGraph();
  const userTopic = prompt("What topic would you like to research? ");
  if (!userTopic || userTopic.trim() === "") {
    console.log("No topic provided. Exiting.");
    return;
  }
  const initialState = {
    topic: userTopic.trim(),
  };

  const config = {
    configurable: {
      thread_id: crypto.randomUUID(),
    },
  };

  console.log(`\n=== Starting Research on: "${userTopic}" ===\n`);

  const stream = await app.stream(initialState, config);

  for await (const step of stream) {
    const [nodeName] = Object.keys(step);
    console.log(`\n---Completed Node: [${nodeName}] ---`);
  }

  const finalState = await app.getState(config);

  console.log("\n================== FINAL REPORT ==================\n");
  console.log(finalState.values.draft);
  console.log("\n==================================================");
  console.log(`Revisions: ${finalState.values.revisionNumber}`);
  console.log(`Final Critic Score: ${finalState.values.critiqueScore}/100`);
}
main().catch(console.error);
