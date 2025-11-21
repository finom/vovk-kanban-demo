import {
  createLLMTools,
  post,
  prefix,
  operation,
  type VovkRequest,
} from "vovk";
import {
  convertToModelMessages,
  jsonSchema,
  stepCountIs,
  streamText,
  tool,
  type JSONSchema7,
  type UIMessage,
} from "ai";
import { openai } from "@ai-sdk/openai";
import UserController from "../user/UserController";
import TaskController from "../task/TaskController";
import { sessionGuard } from "@/decorators/sessionGuard";

@prefix("ai-sdk")
export default class AiSdkController {
  @operation({
    summary: "Function Calling",
    description:
      "Uses [@ai-sdk/openai](https://www.npmjs.com/package/@ai-sdk/openai) and ai packages to call UserController and TaskController functions based on the provided messages.",
  })
  @post("function-calling")
  @sessionGuard()
  static async functionCalling(req: VovkRequest<{ messages: UIMessage[] }>) {
    const { messages } = await req.json();
    const { tools } = createLLMTools({
      modules: {
        UserController,
        TaskController,
      },
    });

    return streamText({
      model: openai("gpt-5"),
      system: "You execute functions sequentially, one by one.",
      messages: convertToModelMessages(messages),
      tools: Object.fromEntries(
        tools.map(({ name, execute, description, parameters }) => [
          name,
          tool({
            execute,
            description,
            inputSchema: jsonSchema(parameters),
          }),
        ]),
      ),
      stopWhen: stepCountIs(16),
      onError: (e) => console.error("streamText error", e),
      onFinish: ({ finishReason, toolCalls }) => {
        if (finishReason === "tool-calls") {
          console.log("Tool calls finished", toolCalls);
        }
      },
    }).toUIMessageStreamResponse();
  }
}
