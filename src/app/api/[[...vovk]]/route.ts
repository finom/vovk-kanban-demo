import { initSegment } from "vovk";
import UserController from "../../../modules/user/UserController";
import TaskController from "../../../modules/task/TaskController";
import RealtimeController from "../../../modules/realtime/RealtimeController";
import TelegramController from "../../../modules/telegram/TelegramController";
import DatabasePollController from "../../../modules/database/DatabasePollController";
import AiSdkController from "../../../modules/ai/AiSdkController";

const controllers = {
  UserRPC: UserController,
  TaskRPC: TaskController,
  RealtimeRPC: RealtimeController,
  DatabasePollRPC: DatabasePollController,
  AiSdkRPC: AiSdkController,
  _TelegramAPI_: TelegramController,
};

export type Controllers = typeof controllers;

export const { GET, POST, PATCH, PUT, HEAD, OPTIONS, DELETE } = initSegment({
  emitSchema: true,
  controllers,
  onError: console.error,
});
