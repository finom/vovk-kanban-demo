"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { useRegistry } from "@/registry";
import type { UserType } from "@schemas/models/User.schema";
import type { TaskType } from "@schemas/models/Task.schema";

export default function HydrateRegistry({
  users,
  tasks,
}: {
  users: UserType[];
  tasks: TaskType[];
}) {
  const syncedRef = useRef(false);
  useEffect(() => {
    if (!syncedRef.current) {
      useRegistry.getState().parse({ users, tasks });
      syncedRef.current = true;
    }
  }, [users, tasks]);

  return null;
}