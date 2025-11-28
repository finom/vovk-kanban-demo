import type { UserType } from "@schemas/models/User.schema";
import type { TaskType } from "@schemas/models/Task.schema";
import type { BaseEntity } from "./types";
import { EntityType } from "@prisma/client";
import { create } from "zustand";
import fastDeepEqual from "fast-deep-equal";

interface Registry {
  [EntityType.user]: Record<UserType["id"], UserType>;
  [EntityType.task]: Record<TaskType["id"], TaskType>;
  parse: (data: unknown) => void;
}

export function getEntitiesFromData(
  data: unknown,
  entities: Partial<{
    [key in EntityType]: Record<BaseEntity["id"], BaseEntity>;
  }> = {},
) {
  if (Array.isArray(data)) {
    data.forEach((item) => getEntitiesFromData(item, entities));
  } else if (typeof data === "object" && data !== null) {
    Object.values(data).forEach((value) =>
      getEntitiesFromData(value, entities),
    );
    if ("entityType" in data && "id" in data) {
      const entityType = data.entityType as EntityType;
      const id = (data as BaseEntity).id;
      entities[entityType] ??= {};
      entities[entityType][id] = data as BaseEntity;
    }
  }
  return entities as Partial<Omit<Registry, "parse">>;
}

export const useRegistry = create<Registry>((set, get) => ({
  [EntityType.user]: {},
  [EntityType.task]: {},
  parse: (data) => {
    const entities = getEntitiesFromData(data);
    set((state) => {
      const newState: Record<string, unknown> = {};
      let isChanged = false;
      Object.entries(entities).forEach(([entityType, entityMap]) => {
        const type = entityType as EntityType;
        const descriptors = Object.getOwnPropertyDescriptors(state[type] ?? {});
        let areDescriptorsChanged = false;
        Object.values(entityMap).forEach((entity) => {
          const descriptorValue = descriptors[entity.id]?.value;
          const value = { ...descriptorValue, ...entity };
          const isCurrentChanged = !fastDeepEqual(descriptorValue, value);
          descriptors[entity.id] = isCurrentChanged
            ? ({
                value,
                configurable: true,
                writable: false,
                enumerable: !("__isDeleted" in entity),
              } satisfies PropertyDescriptor)
            : descriptors[entity.id];
          areDescriptorsChanged ||= isCurrentChanged;
        });
        newState[type] = areDescriptorsChanged ? Object.defineProperties({}, descriptors) : state[type];
        isChanged ||= areDescriptorsChanged;
      });
      return isChanged ? { ...state, ...newState } : state;
    });
  },
}));
