<p align="center">
  <a href="https://vovk.dev">
    <picture>
      <source width="300" media="(prefers-color-scheme: dark)" srcset="https://vovk.dev/vovk-logo-white.svg">
      <source width="300" media="(prefers-color-scheme: light)" srcset="https://vovk.dev/vovk-logo.svg">
      <img width="300" alt="vovk" src="https://vovk.dev/vovk-logo.svg">
    </picture>
  </a>
  <br>
  <strong>Back-end for Next.js (beta)</strong>
  <br />
  <a href="https://vovk.dev/about">About Vovk.ts</a>
  &nbsp;
  <a href="https://vovk.dev/quick-install">Quick Start</a>
  &nbsp;
  <a href="https://github.com/finom/vovk">Github Repo</a>
</p>

---

## realtime-kanban

A proof of concept app, demonstrating utilization of [controllers](https://vovk.dev/controller) and RPC modules as AI tools, that work on server-side (with [AI SDK](https://npmjs.com/package/@ai-sdk/react)), client-side (with [OpenAI Realtime API](https://platform.openai.com/docs/guides/realtime)) and as MCP server (using [MCP Handler](https://npmjs.com/package/mcp-handler)).

The project and its idea explained in the series of articles at [Vovk.ts documentation](https://vovk.dev/):

- [LLM text chat completions](https://vovk.dev/llm) - brefly describes LLM chat completions served as [JSONLines](https://vovk.dev/controller/jsonlines) response or [AI SDK](https://npmjs.com/package/@ai-sdk/react).
- [Function Calling](https://vovk.dev/function-calling) - describes function calling framework that allows LLMs to invoke pre-defined functions made of controller modules or RPC modules.
- [Real-time UI](https://vovk.dev/realtime-ui) - describes building real-time user interfaces that can be controlled by LLMs via text chat or voice interface, updating UI components automatically.
- [Real-time Polling](https://vovk.dev/polling) - describes implementing real-time updates mechanisms by constantly polling Redis database to keep UI components in sync with server-side data.
- [MCP Server](https://vovk.dev/mcp) - describes building MCP servers from controllers and RPC modules using [MCP Handler](https://npmjs.com/package/mcp-handler).

## Getting Started

Clone the repository:

```bash
git clone https://github.com/finom/realtime-kanban.git
cd realtime-kanban
```

Install the dependencies:

```bash
yarn
```

Create a `.env` file in the root directory and add your OpenAI API key and database connection strings:

```env filename=".env"
OPENAI_API_KEY=change_me
DATABASE_URL="postgresql://postgres:password@localhost:5432/realtime-kanban-db?schema=public"
DATABASE_URL_UNPOOLED="postgresql://postgres:password@localhost:5432/realtime-kanban-db?schema=public"
REDIS_URL=redis://localhost:6379
PASSWORD=
```

Optionally, set `PASSWORD` to enable basic authentication for the app.

Run docker containers and development server

```bash
docker-compose up -d && yarn dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

More details about setting up the database can be found in the [Real-time UI](https://vovk.dev/realtime-ui) article.
