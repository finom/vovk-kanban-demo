import { createMcpHandler } from "mcp-handler";
import { createLLMTools, KnownAny } from "vovk";
import UserController from "@/modules/user/UserController";
import TaskController from "@/modules/task/TaskController";
import { jsonSchemaObjectToZodRawShape } from "zod-v3-via-v4-from-json-schema"; // TODO: Temporary fix
import { NextResponse } from "next/server";

const { tools } = createLLMTools({
  modules: {
    UserController,
    TaskController,
  },
  resultFormatter: "mcp",
  onExecute: (result, { moduleName, handlerName, body, query, params }) =>
    console.log(`${moduleName}.${handlerName} executed`, {
      body,
      query,
      params,
      result,
    }),
  onError: (e) => console.error("Error", e),
});

const handler = createMcpHandler(
  (server) => {
    tools.forEach(({ name, execute, description, parameters }) => {
      server.registerTool(
        name,
        {
          description,
          inputSchema: jsonSchemaObjectToZodRawShape(parameters) as KnownAny, // TODO: Temporary fix
        },
        execute,
      );
    });
  },
  {},
  { basePath: "/api" },
);

const authorizedHandler = async (req: Request) => {
  const { MCP_ACCESS_KEY } = process.env;
  const accessKey = new URL(req.url).searchParams.get("mcp_access_key");
  if (MCP_ACCESS_KEY && accessKey !== MCP_ACCESS_KEY) {
    console.log('BODY', await req.json());
    return NextResponse.json(
      {
        content: [
          {
            type: "text",
            text: "Unable to authorize the MCP request: mcp_access_key is invalid",
          },
        ],
      },
      { status: 401 },
    );
  }
  return handler(req);
};

export { authorizedHandler as GET, authorizedHandler as POST };
