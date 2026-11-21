import { Annotation } from "@langchain/langgraph";

export const ResearchStateAnnotation = Annotation.Root({
  topic: Annotation<string>,
  plan: Annotation<string[]>,
  researchNotes: Annotation<string[]>({
    reducer: (current, update) => current.concat(update),
    default: () => [],
  }),

  draft: Annotation<string>({
    reducer: (_, update) => update,
    default: () => "",
  }),

  critiqueScore: Annotation<number>({
    reducer: (_, update) => update,
    default: ()=> 0,
  }),

  critiqueFeedback: Annotation<string>({
    reducer: (_, update) =>  update,
    default: () => "",
  }),

  revisionNumber: Annotation<number>({
    reducer: (current, update) => current + update,
    default: () => 0,
  }),
});


export type ResearchState = typeof ResearchStateAnnotation.State;