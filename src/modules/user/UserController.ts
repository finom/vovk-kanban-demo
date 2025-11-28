import { prefix, get, put, post, del, operation } from "vovk";
import { z } from "zod";
import { TaskSchema, UserSchema } from "@schemas/index";
import { sessionGuard } from "@/decorators/sessionGuard";
import { withZod } from "@/lib/withZod";
import { BASE_FIELDS } from "@/constants";
import UserService from "./UserService";

@prefix("users")
export default class UserController {
  @operation({
    summary: "Get all users",
    description: "Retrieves a list of all users.",
    "x-tool-disable": true, // Make it to be used as an endpoint only, excluding from the list of available tools
  })
  @get()
  @sessionGuard()
  static getUsers = withZod({
    output: UserSchema.array(),
    handle: UserService.getUsers,
  });

  @operation({
    summary: "Find users by ID, full name, or email",
    description:
      "Retrieves users that match the provided ID, full name, or email. Used to search the users when they need to be updated or deleted.",
    "x-tool-successMessage": "Users found successfully",
  })
  @get("search")
  @sessionGuard()
  static findUsers = withZod({
    query: z.object({
      search: z.string().meta({
        description: "Search term for users",
        examples: ["john.doe", "Jane"],
      }),
    }),
    output: UserSchema.array(),
    handle: ({ vovk }) => UserService.findUsers(vovk.query().search),
  });

  @operation({
    summary: "Create user",
    description: "Creates a new user with the provided details.",
    "x-tool-successMessage": "User created successfully",
  })
  @post()
  @sessionGuard()
  static createUser = withZod({
    body: UserSchema.omit(BASE_FIELDS),
    output: UserSchema,
    handle: async ({ vovk }) => UserService.createUser(await vovk.body()),
  });

  @operation({
    summary: "Update user",
    description:
      "Updates an existing user with the provided details, such as their email or name.",
    "x-tool-successMessage": "User updated successfully",
  })
  @put("{id}")
  @sessionGuard()
  static updateUser = withZod({
    body: UserSchema.omit(BASE_FIELDS).partial(),
    params: UserSchema.pick({ id: true }),
    output: UserSchema,
    handle: async ({ vovk }) =>
      UserService.updateUser(vovk.params().id, await vovk.body()),
  });

  @operation({
    summary: "Delete user",
    description: "Deletes a user by ID.",
    "x-tool-successMessage": "User deleted successfully",
  })
  @del("{id}")
  @sessionGuard()
  static deleteUser = withZod({
    params: UserSchema.pick({ id: true }),
    output: UserSchema.partial().extend({
      __isDeleted: z.literal(true),
      tasks: TaskSchema.partial()
        .extend({ __isDeleted: z.literal(true) })
        .array(),
    }),
    handle: async ({ vovk }) => UserService.deleteUser(vovk.params().id),
  });
}
