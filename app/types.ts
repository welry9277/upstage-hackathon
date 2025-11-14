// app/types.ts

export type TaskStatus = "TODO" | "IN_PROGRESS" | "DONE";
export type TaskRelationType = "SUBTASK" | "RELATED" | "CROSS_DEPT";

export interface Task {
  id: string;            // 예: SCRUM-2
  title: string;
  description: string;
  status: TaskStatus;
  assignee?: string;     // 담당자 이름 (간단하게 string으로)
  createdAt: string;     // ISO
  updatedAt: string;     // ISO
}

export interface TaskRelation {
  id: string;
  fromTaskId: string;    // 기준 작업
  toTaskId: string;      // 연결된 작업
  type: TaskRelationType;
}

export interface TaskLog {
  id: string;
  taskId: string;
  text: string;
  author?: string;
  createdAt: string;     // ISO
}

export interface Notification {
  id: string;
  userId: string;        // 알림 받을 사용자 (여기선 assignee 이름 그대로 씀)
  taskId: string;
  message: string;
  createdAt: string;     // ISO
}

/**
 * n8n Webhook으로 넘길 페이로드 형태
 */
export interface WebhookPayload {
  taskId: string;
  title: string;
  description: string;
  status: TaskStatus;
  assignee?: string;
  actor?: string;
  finishedAt: string;

  logs: {
    id: string;
    text: string;
    author?: string;
    createdAt: string;
  }[];

  subTaskIds: string[];
  relatedTaskIds: string[];

  app: string;           // 예: "jira-like-task-graph"
}
