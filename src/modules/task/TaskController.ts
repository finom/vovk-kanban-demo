import { prefix, get, put, post, del, operation } from "vovk";
import { z } from "zod";
import { BASE_FIELDS } from "@/constants";
import { TaskSchema, UserSchema } from "@schemas/index";
import { sessionGuard } from "@/decorators/sessionGuard";
import { withZod } from "@/lib/withZod";
import TaskService from "./TaskService";

@prefix("tasks")
export default class TaskController {
  @operation({
    summary: "Get all tasks",
    description: "Retrieves a list of all tasks.",
    "x-tool-disable": true, // Make it to be used as an endpoint only, excluding from the list of available tools
  })
  @get()
  @sessionGuard()
  static getTasks = withZod({
    output: TaskSchema.array(),
    handle: TaskService.getTasks,
  });

  @operation({
    summary: "Find tasks by ID, title or description",
    description:
      "Retrieves tasks that match the provided ID, title, or description. Used to search the tasks when they need to be updated or deleted.",
    "x-tool-successMessage": "Tasks found successfully",
  })
  @get("search")
  @sessionGuard()
  static findTasks = withZod({
    query: z.object({
      search: z.string().meta({
        description: "Search term for tasks",
        examples: ["bug", "feature"],
      }),
    }),
    output: TaskSchema.array(),
    handle: async ({ vovk }) => TaskService.findTasks(vovk.query().search),
  });

  @operation({
    summary: "Get tasks assigned to a specific user",
    description: "Retrieves all tasks associated with a specific user ID.",
    "x-tool-successMessage": "Tasks retrieved successfully",
  })
  @get("by-user/{userId}")
  @sessionGuard()
  static getTasksByUserId = withZod({
    params: z.object({ userId: UserSchema.shape.id }),
    output: TaskSchema.array(),
    handle: async ({ vovk }) =>
      TaskService.getTasksByUserId(vovk.params().userId),
  });

  @operation({
    summary: "Create a new task",
    description:
      "Creates a new task with the provided details, such as its title and description.",
    "x-tool-successMessage": "Task created successfully",
  })
  @post()
  @sessionGuard()
  static createTask = withZod({
    body: TaskSchema.omit(BASE_FIELDS),
    output: TaskSchema,
    handle: async ({ vovk }) => TaskService.createTask(await vovk.body()),
  });

  @operation({
    summary: "Update task",
    description:
      "Updates an existing task with the provided details, such as its title or description.",
    "x-tool-successMessage": "Task updated successfully",
  })
  @put("{id}")
  @sessionGuard()
  static updateTask = withZod({
    body: TaskSchema.omit(BASE_FIELDS).partial(),
    params: TaskSchema.pick({ id: true }),
    output: TaskSchema,
    handle: async ({ vovk }) =>
      TaskService.updateTask(vovk.params().id, await vovk.body()),
  });

  @operation({
    summary: "Delete task",
    description: "Deletes a task by ID.",
    "x-tool-successMessage": "Task deleted successfully",
  })
  @del("{id}")
  @sessionGuard()
  static deleteTask = withZod({
    params: TaskSchema.pick({ id: true }),
    output: TaskSchema.partial().extend({
      __isDeleted: z.literal(true),
    }),
    handle: async ({ vovk }) => TaskService.deleteTask(vovk.params().id),
  });
}
