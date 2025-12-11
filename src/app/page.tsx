import { ExpandableChatDemo } from "@/components/ExpandableChatDemo";
import UserList from "@/components/UserList";
import UserController from "@/modules/user/UserController";
import UserKanban from "@/components/UserKanban";
import RealTimeDemo from "@/components/RealTimeDemo";
import TaskController from "@/modules/task/TaskController";
import HydrateRegistry from "@/components/HydrateRegistry";
import { UserType } from "@schemas/models/User.schema";
import { TaskType } from "@schemas/models/Task.schema";
import { verifySession } from "@/lib/dal";
import AppHeader from "@/components/AppHeader";

export const runtime = "nodejs";

export const revalidate = 0;

export default async function Home() {
  await verifySession();
  const [usersInitialData, tasksInitialData] = await Promise.all([
    UserController.getUsers.fn<UserType[]>(),
    TaskController.getTasks.fn<TaskType[]>(),
  ]);

  return (
    <>
      <AppHeader />
      <HydrateRegistry users={usersInitialData} tasks={tasksInitialData} />
      <UserList initialData={usersInitialData} />
      <UserKanban initialData={tasksInitialData} />
      <ExpandableChatDemo />
    </>
  );
}
