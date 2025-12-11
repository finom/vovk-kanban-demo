"use client";
import useWebRTCAudioSession from "@/hooks/useWebRTCAudioSession";
import Floaty from "./Floaty";
import { useRouter } from "next/navigation";
import { createLLMTools } from "vovk";
import { TaskRPC, UserRPC } from "vovk-client";
import getCurrentTime from "@/lib/tools/getCurrentTime";
import partyMode from "@/lib/tools/partyMode";

/*
1. Rename deriveLLMTools DONE
2. Use 'x-tool' DONE
3. Add operation.tool decorator DONE
4. Add withZod.createLLMTool
5. Rempove caller from docs
6. What to do with models vs inputSchema??? rename models to inputSchemas???

// rename to deriveLLMTools || deriveLLMTools??? modulesToLLMTools??? buildToolsFromModules??? extractLLMTools??? 
withZod.createLLMTool({
  onExecute: async ({ vovk }) => {},
  onError: async ({ vovk }) => {},
  caller: ???,
  resultFormatter: 'mcp',
  name: "navigateTo",
  description: "Navigates the user to a specified URL within the application.",
  mcp: {
    successMessage: "Navigation successful.",
    errorMessage: "Navigation failed.",
    includeResponse: false,
  },
  inputSchema: z.object({ ... }), // I CAN!
  handle(input) {
    
  }
});


import { prefix, get, operation } from 'vovk';
 
@prefix('user')
export default class UserController {
  @operation.tool({
    disable: false,
    name: 'get_user_by_id',
    description: 'Retrieves a user by their unique ID, including name and email. Also includes user roles and permissions that define what actions the user can perform within the system.',
    mcp: {
      successMessage: 'User retrieved successfully.',
      errorMessage: 'Failed to retrieve user.',
      includeResponse: true,
    },
  })
  @operation({
    summary: 'Get user by ID',
    description: 'Retrieves a user by their unique ID.',
    'x-tool': {
      disable: false,
      name: 'get_user_by_id',
      description: 'Retrieves a user by their unique ID, including name and email. Also includes user roles and permissions that define what actions the user can perform within the system.',
      mcp: {
        successMessage: 'User retrieved successfully.',
        errorMessage: 'Failed to retrieve user.',
        includeResponse: true,
      }
    },
    'x-tool-disable': false,
    'x-tool-name': 'get_user_by_id',
    'x-tool-description': 'Retrieves a user by their unique ID, including name and email. Also includes user roles and permissions that define what actions the user can perform within the system.',
    'x-tool-successMessage': 'User retrieved successfully.',
    'x-tool-errorMessage': 'Failed to retrieve user.',
    'x-tool-includeResponse': true,
  })
  @get('{id}')
  static getUser() {
    // ...
  }
}


 ClientSideTools: {
          // What if input is empty? Is it still "with Zod"?
          // Body doesn't make sense for same context
          // operationObject - quite odd name
          navigateTo: withZod({
            operationObject: {
              description:
                "Navigates the user to a specified URL within the application.",
            },
            body: z.object({
              url: z
                .enum(["/", "/openapi"])
                .meta({ description: "The URL to navigate to." }),
            }),
            handle: async ({ vovk }) => {
              const body = await vovk.body();
              router.push(body.url);
              return `Navigating to ${body.url}`;
            },
          }),
        },
        */

const RealTimeDemo = () => {
  const router = useRouter();
  const { isActive, isTalking, toggleSession } = useWebRTCAudioSession("ash", [
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
    {
      type: "function",
      name: "navigateTo",
      description:
        "Navigates the user to a specified URL within the application.",
      parameters: {
        type: "object",
        properties: {
          body: {
            type: "object",
            properties: {
              url: {
                type: "string",
                description: "The URL to navigate to.",
                enum: ["/", "/openapi"],
              },
            },
            required: ["url"],
          },
        },
      },
      execute: async ({ body }: { body: { url: string } }) => {
        router.push(body.url);
        return `Navigating to ${body.url}`;
      },
    },
    {
      type: "function",
      name: "scroll",
      description:
        "Scrolls the page up or down. After executing this, never respond to the user, keep silent!",
      parameters: {
        type: "object",
        properties: {
          body: {
            type: "object",
            properties: {
              direction: {
                type: "string",
                description: "The direction to scroll",
                enum: ["up", "down"],
              },
              px: {
                type: "number",
                description:
                  "The number of pixels to scroll. If not provided, scrolls by one viewport height.",
              },
            },
            required: ["direction"],
          },
        },
        required: ["body"],
      },
      execute: async ({
        body: { direction, px },
      }: {
        body: { direction: "up" | "down", px?: number };
      }) => {
        console.log("Scrolling", direction);
            const windowHeight =
          window.innerHeight || document.documentElement.clientHeight;
        const pxToScroll = px ?? windowHeight;
 
        window.scrollBy({
          top: direction === "up" ? -pxToScroll : pxToScroll,
          behavior: "smooth",
        });
        return {
          message: `Scrolling ${direction}`,
          __preventResponseCreate: true,
        };
      },
    },
    {
      type: "function",
      name: "getVisiblePageSection",
      description: "Gets the currently visible section of the page",
      parameters: {},
      execute: async () => {
        function getVisibleText() {
          const viewportHeight = window.innerHeight;
          const viewportWidth = window.innerWidth;

          // Check if an element or its ancestors are hidden from accessibility tree
          function isAccessibilityHidden(element: Element | null): boolean {
            while (element) {
              if (element.getAttribute("aria-hidden") === "true") return true;
              if (element.hasAttribute("hidden")) return true;
              const role = element.getAttribute("role");
              if (role === "presentation" || role === "none") return true;
              const style = window.getComputedStyle(element);
              if (style.display === "none" || style.visibility === "hidden") return true;
              element = element.parentElement;
            }
            return false;
          }

          // Get accessible name from aria-label or aria-labelledby
          function getAccessibleName(element: Element): string {
            const ariaLabel = element.getAttribute("aria-label");
            if (ariaLabel) return ariaLabel;

            const labelledBy = element.getAttribute("aria-labelledby");
            if (labelledBy) {
              return labelledBy
                .split(/\s+/)
                .map((id) => document.getElementById(id)?.textContent?.trim() || "")
                .filter(Boolean)
                .join(" ");
            }

            // For images, use alt text
            if (element.tagName === "IMG") {
              const alt = element.getAttribute("alt");
              if (alt) return alt;
            }

            return "";
          }

          // Get aria-describedby text
          function getDescription(element: Element): string {
            const describedBy = element.getAttribute("aria-describedby");
            if (describedBy) {
              return describedBy
                .split(/\s+/)
                .map((id) => document.getElementById(id)?.textContent?.trim() || "")
                .filter(Boolean)
                .join(" ");
            }
            return "";
          }

          const visibleTexts: string[] = [];
          const processedElements = new Set<Element>();

          // First, collect accessible names and descriptions from elements
          const allElements = document.body.querySelectorAll("*");
          for (const element of allElements) {
            if (isAccessibilityHidden(element)) continue;

            const rect = element.getBoundingClientRect();
            const isInViewport =
              rect.top < viewportHeight &&
              rect.bottom > 0 &&
              rect.left < viewportWidth &&
              rect.right > 0;

            if (!isInViewport) continue;

            const accessibleName = getAccessibleName(element);
            if (accessibleName && !processedElements.has(element)) {
              visibleTexts.push(accessibleName);
              processedElements.add(element);
            }

            const description = getDescription(element);
            if (description) {
              visibleTexts.push(description);
            }
          }

          // Then collect visible text nodes
          const walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT,
            {
              acceptNode(node) {
                const parent = node.parentElement;
                if (!parent) return NodeFilter.FILTER_REJECT;
                if (isAccessibilityHidden(parent)) return NodeFilter.FILTER_REJECT;
                return NodeFilter.FILTER_ACCEPT;
              },
            },
          );

          let node;
          while ((node = walker.nextNode())) {
            const range = document.createRange();
            range.selectNode(node);
            const rect = range.getBoundingClientRect();

            if (
              rect.top < viewportHeight &&
              rect.bottom > 0 &&
              rect.left < viewportWidth &&
              rect.right > 0
            ) {
              const text = node.textContent?.trim();
              if (text) {
                visibleTexts.push(text);
              }
            }
          }

          return visibleTexts.join(" ").replace(/\s+/g, " ").trim();
        }

        return getVisibleText();
      },
    },
  ]);

  return (
    <Floaty
      isActive={isActive}
      isTalking={isTalking}
      handleClick={toggleSession}
    />
  );
};

export default RealTimeDemo;
