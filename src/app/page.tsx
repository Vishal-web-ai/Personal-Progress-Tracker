import { MobileProgress } from "@/components/dashboard/MobileProgress";
import { TaskList } from "@/components/dashboard/TaskList";

export default function DashboardPage() {
  return (
    <div className="space-y-5">
      <MobileProgress>
        <TaskList />
      </MobileProgress>
    </div>
  );
}