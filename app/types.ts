// app/types.ts

export type TaskStatus = "TODO" | "IN_PROGRESS" | "DONE";
export type TaskRelationType = "SUBTASK" | "RELATED" | "CROSS_DEPT" | "CROSS_BOARD";

export interface Board {
  id: string;            // 보드 ID
  name: string;          // 보드 이름 (프로젝트 이름)
  description?: string;  // 보드 설명
  createdAt: string;     // ISO
  updatedAt: string;     // ISO
}

export interface Task {
  id: string;            // 예: SCRUM-2
  boardId: string;       // 속한 보드 ID
  title: string;
  description: string;
  status: TaskStatus;
  assignee?: string;     // 담당자 이름 (간단하게 string으로)
  isImportant?: boolean; // 중요 업무 여부
  createdAt: string;     // ISO
  updatedAt: string;     // ISO
}

export interface TaskRelation {
  id: string;
  fromTaskId: string;    // 기준 작업
  toTaskId: string;      // 연결된 작업
  type: TaskRelationType;
  fromBoardId?: string;  // 보드 간 연결 시 사용
  toBoardId?: string;    // 보드 간 연결 시 사용
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
  taskId?: string;
  message: string;
  createdAt: string;     // ISO
  type?: "task" | "document_request"; // 알림 타입
  documentRequest?: DocumentRequest;  // 문서 요청 데이터
}

export interface DocumentRequest {
  id: string;
  requester_email: string;
  requester_name: string;
  question: string;
  status: "pending" | "answered" | "rejected";
  answer?: string;
  sources?: DocumentSource[];
  createdAt: string;
}

export interface DocumentSource {
  id: string;
  fileName: string;
  content: string;
  selected: boolean;
}

export interface TeamMember {
  id: string;
  email: string;
  name: string;
  role: "owner" | "admin" | "member";
  status: "active" | "invited" | "pending";
  invitedAt: string; // ISO
  joinedAt?: string; // ISO
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
