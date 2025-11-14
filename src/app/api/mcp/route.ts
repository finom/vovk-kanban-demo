import { createMcpHandler } from "mcp-handler";
import { createLLMTools } from "vovk";
import UserController from "@/modules/user/UserController";
import TaskController from "@/modules/task/TaskController";
import { convertJsonSchemaToZod } from "zod-from-json-schema";
import mapValues from "lodash/mapValues";

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
      console.log({ name, description, parameters }, mapValues(parameters?.properties ?? {}, convertJsonSchemaToZod).body);
      server.tool(
        name,
        description,
        mapValues(parameters?.properties ?? {}, convertJsonSchemaToZod),
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
    return new Response("mcp_access_key is invalid", { status: 401 });
  }
  return handler(req);
};

export { authorizedHandler as GET, authorizedHandler as POST };
