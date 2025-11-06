import {
  createLLMTools,
  HttpException,
  HttpStatus,
  KnownAny,
  post,
  prefix,
  operation,
  type VovkRequest,
} from "vovk";
import {
  convertToModelMessages,
  jsonSchema,
  type JSONSchema7,
  stepCountIs,
  streamText,
  tool,
  type UIMessage,
} from "ai";
import { openai } from "@ai-sdk/openai";
// import { GithubIssuesAPI } from "vovk-client";
import UserController from "../user/UserController";
import TaskController from "../task/TaskController";
import { sessionGuard } from "@/decorators/sessionGuard";

@prefix("ai-sdk")
export default class AiSdkController {
  @operation({
    summary: "Function Calling",
    description:
      "Uses [@ai-sdk/openai](https://www.npmjs.com/package/@ai-sdk/openai) and ai packages to call a function",
  })
  @post("function-calling")
  @sessionGuard()
  static async functionCalling(req: VovkRequest<{ messages: UIMessage[] }>) {
    const { messages } = await req.json();
    const LIMIT = 20;
    /* const githubOptions = {
      init: {
        headers: {
          Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
          "X-GitHub-Api-Version": "2022-11-28",
        },
      },
    }; */
    const { tools } = createLLMTools({
      modules: {
        UserController,
        TaskController,
        // GithubIssuesAPI: [GithubIssuesAPI, githubOptions],
      },
      onExecute: (_d, { moduleName, handlerName }) =>
        console.log(`${moduleName}.${handlerName} executed`),
      onError: (e) => console.error("Error", e),
    });

    if (messages.filter(({ role }) => role === "user").length > LIMIT) {
      throw new HttpException(
        HttpStatus.BAD_REQUEST,
        `You can only send ${LIMIT} messages at a time`,
      );
    }

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
            inputSchema: jsonSchema(parameters as JSONSchema7),
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
