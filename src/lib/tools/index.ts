import { createLLMTools, type VovkLLMTool } from "vovk";
import { TaskRPC, UserRPC } from "vovk-client";
import getCurrentTime from "./getCurrentTime";
import partyMode from "./partyMode";

const tools: VovkLLMTool[] = [
  ...createLLMTools({
    modules: { TaskRPC, UserRPC },
  }).tools,
  {
    type: "function",
    name: "getCurrentTime",
    description: "Gets the current time in the user's timezone",
    parameters: {},
    execute: getCurrentTime,
  },
  {
    type: "function",
    name: "partyMode",
    description: "Triggers a confetti animation on the page",
    parameters: {},
    execute: partyMode,
  },
];

export default tools;
