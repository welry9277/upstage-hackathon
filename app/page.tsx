"use client";

import React, { useMemo, useState } from "react";
import ReactFlow, {
  Node as FlowNode,
  Edge as FlowEdge,
} from "reactflow";
import "reactflow/dist/style.css";

import {
  Task,
  TaskStatus,
  TaskRelation,
  TaskRelationType,
  TaskLog,
  Notification,
  WebhookPayload,
} from "./types";

// ---- 초기 더미 데이터 ----

const nowIso = () => new Date().toISOString();

const initialTasks: Task[] = [
  {
    id: "SCRUM-2",
    title: "작업 2 (메인 업무)",
    description: "백엔드 API 설계 및 기본 엔드포인트 구현",
    status: "IN_PROGRESS",
    assignee: "도현",
    createdAt: nowIso(),
    updatedAt: nowIso(),
  },
  {
    id: "SCRUM-5",
    title: "Node.js 서비스 프로토타입 작성",
    description: "작업 관리용 Node.js 서비스 초안 구현",
    status: "TODO",
    assignee: "홍길동",
    createdAt: nowIso(),
    updatedAt: nowIso(),
  },
];

const initialRelations: TaskRelation[] = [
  {
    id: "rel-2-5",
    fromTaskId: "SCRUM-2",
    toTaskId: "SCRUM-5",
    type: "SUBTASK", // SCRUM-2 → SCRUM-5 하위업무
  },
];

// ---- 유틸: 계층형 레이아웃 계산 (SUBTASK 기준) ----

function computeLevels(tasks: Task[], relations: TaskRelation[]) {
  const inDeg: Record<string, number> = {};
  const level: Record<string, number> = {};

  tasks.forEach((t) => {
    inDeg[t.id] = 0;
    level[t.id] = 0;
  });

  relations.forEach((rel) => {
    if (rel.type === "SUBTASK") {
      inDeg[rel.toTaskId] = (inDeg[rel.toTaskId] ?? 0) + 1;
    }
  });

  const queue: string[] = [];
  tasks.forEach((t) => {
    if (!inDeg[t.id]) {
      level[t.id] = 0;
      queue.push(t.id);
    }
  });

  while (queue.length > 0) {
    const cur = queue.shift() as string;
    const curLevel = level[cur] ?? 0;
    relations
      .filter(
        (rel) => rel.type === "SUBTASK" && rel.fromTaskId === cur
      )
      .forEach((rel) => {
        const child = rel.toTaskId;
        const nextLevel = curLevel + 1;
        if (level[child] == null || nextLevel > level[child]) {
          level[child] = nextLevel;
          queue.push(child);
        }
      });
  }

  tasks.forEach((t) => {
    if (level[t.id] == null) level[t.id] = 0;
  });

  return level;
}

function getNeighbors(
  taskId: string,
  tasks: Task[],
  relations: TaskRelation[]
): Task[] {
  const neighborIds = new Set<string>();
  relations.forEach((rel) => {
    if (rel.fromTaskId === taskId) neighborIds.add(rel.toTaskId);
    if (rel.toTaskId === taskId) neighborIds.add(rel.fromTaskId);
  });
  return tasks.filter((t) => neighborIds.has(t.id));
}

function getParents(
  taskId: string,
  tasks: Task[],
  relations: TaskRelation[]
): Task[] {
  const parentIds = relations
    .filter((rel) => rel.type === "SUBTASK" && rel.toTaskId === taskId)
    .map((rel) => rel.fromTaskId);
  return tasks.filter((t) => parentIds.includes(t.id));
}

// ---- 공통 스타일 유틸 ----

const cardStyle: React.CSSProperties = {
  background: "white",
  borderRadius: 14,
  boxShadow:
    "0 18px 40px rgba(15,23,42,0.18), 0 0 0 1px rgba(148,163,184,0.25)",
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 600,
  letterSpacing: 0.2,
  color: "#0f172a",
};

const pill: React.CSSProperties = {
  display: "inline-block",
  borderRadius: 999,
  padding: "2px 10px",
  fontSize: 11,
  fontWeight: 500,
};

function statusPill(status: TaskStatus): React.CSSProperties {
  if (status === "TODO")
    return {
      ...pill,
      background: "rgba(15,118,110,0.08)",
      color: "#0f766e",
      border: "1px solid rgba(45,212,191,0.6)",
    };
  if (status === "IN_PROGRESS")
    return {
      ...pill,
      background: "rgba(59,130,246,0.08)",
      color: "#1d4ed8",
      border: "1px solid rgba(96,165,250,0.7)",
    };
  return {
    ...pill,
    background: "rgba(21,128,61,0.08)",
    color: "#15803d",
    border: "1px solid rgba(74,222,128,0.7)",
  };
}

// ---- 메인 컴포넌트 ----

export default function HomePage() {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [relations, setRelations] =
    useState<TaskRelation[]>(initialRelations);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialTasks[0]?.id ?? null
  );

  const [logsByTask, setLogsByTask] = useState<Record<string, TaskLog[]>>({});
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const assigneeOptions = Array.from(
    new Set(
      tasks
        .map((t) => t.assignee)
        .filter((v): v is string => !!v)
    )
  );
  const [currentUser, setCurrentUser] = useState<string>(
    assigneeOptions[0] ?? "도현"
  );

  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newAssignee, setNewAssignee] = useState("");
  const [newParentId, setNewParentId] = useState<string>("");
  const [newRelationType, setNewRelationType] =
    useState<TaskRelationType | "NONE">("NONE");

  const [logDraft, setLogDraft] = useState("");

  // 업무 수정 상태
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editAssignee, setEditAssignee] = useState("");
  const [editParentId, setEditParentId] = useState<string>("");
  const [editRelationType, setEditRelationType] = useState<TaskRelationType | "NONE">("NONE");

  // 문서 요청 상태
  const [docRequestQuestion, setDocRequestQuestion] = useState("");
  const [docRequestApprover, setDocRequestApprover] = useState("");
  const [docRequestMessage, setDocRequestMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [isSubmittingDocRequest, setIsSubmittingDocRequest] = useState(false);

  // 문서 요청 모달 상태
  const [selectedDocRequest, setSelectedDocRequest] = useState<Notification | null>(null);
  const [docAnswer, setDocAnswer] = useState("");
  const [searchedDocs, setSearchedDocs] = useState<any[]>([]);

  // 자동 답변 생성 함수
  const generateAutoAnswer = (question: string) => {
    // Mock 문서 데이터
    const mockDocs = [
      {
        id: "doc1",
        fileName: "2024_Q4_예산_보고서.pdf",
        content: "마케팅 비용은 1.5억원으로 책정되었습니다. 전체 예산의 30%를 차지하며",
        page: 2,
        relevance: 95,
      },
      {
        id: "doc2",
        fileName: "마케팅_캠페인_결과_분석.xlsx",
        content: "총 광고비 집행 내역: 디지털 마케팅 8천만원, TV광고 7천만원",
        page: 1,
        relevance: 82,
      },
    ];

    // 질문에 따른 자동 답변 생성
    const answer = `안녕하세요, ${question}에 대한 답변입니다.

검색된 관련 문서를 바탕으로 다음과 같이 안내드립니다:

1. ${mockDocs[0].fileName} (페이지 ${mockDocs[0].page})에 따르면:
   "${mockDocs[0].content}"

2. ${mockDocs[1].fileName}에서 확인한 내용:
   "${mockDocs[1].content}"

추가로 필요하신 정보가 있으시면 말씀해주세요.

감사합니다.`;

    return answer;
  };

  // 모달 닫기 헬퍼 함수
  const closeDocRequestModal = () => {
    setSelectedDocRequest(null);
    setDocAnswer("");
    setSearchedDocs([]);
  };

  const selectedTask: Task | null =
    tasks.find((t) => t.id === selectedId) ?? null;

  // 승인자 목록 (기존 담당자 + 추가 승인자)
  const approverOptions = Array.from(
    new Set([...assigneeOptions, "재무팀", "인사팀", "마케팅팀", "IT보안팀"])
  );

  // ---- 강조 대상 ----

  const { highlightedNodeIds, highlightedEdgeIds } = useMemo(() => {
    if (!selectedTask) {
      return {
        highlightedNodeIds: new Set<string>(),
        highlightedEdgeIds: new Set<string>(),
      };
    }
    const nodeSet = new Set<string>();
    const edgeSet = new Set<string>();

    nodeSet.add(selectedTask.id);
    relations.forEach((rel) => {
      if (
        rel.fromTaskId === selectedTask.id ||
        rel.toTaskId === selectedTask.id
      ) {
        nodeSet.add(rel.fromTaskId);
        nodeSet.add(rel.toTaskId);
        edgeSet.add(rel.id);
      }
    });

    return { highlightedNodeIds: nodeSet, highlightedEdgeIds: edgeSet };
  }, [selectedTask, relations]);

  // ---- 그래프 노드/엣지 ----

  const flowNodes: FlowNode[] = useMemo(() => {
    const levels = computeLevels(tasks, relations);
    const grouped = new Map<number, Task[]>();

    tasks.forEach((t) => {
      const lv = levels[t.id] ?? 0;
      if (!grouped.has(lv)) grouped.set(lv, []);
      grouped.get(lv)!.push(t);
    });

    const nodes: FlowNode[] = [];
    const xGap = 240;
    const yGap = 160;

    Array.from(grouped.entries())
      .sort(([a], [b]) => a - b)
      .forEach(([lv, levelTasks]) => {
        levelTasks.forEach((t, idx) => {
          const isHighlighted = highlightedNodeIds.has(t.id);
          const dimOthers =
            highlightedNodeIds.size > 0 && !isHighlighted;

          // 상태별 배경색 설정 (하이라이트 여부와 관계없이 상태 색상 유지)
          let backgroundColor: string;
          let borderColor: string;
          let highlightBorderColor: string; // 하이라이트 시 테두리 색상
          let highlightShadowColor: string; // 하이라이트 시 그림자 색상

          // 상태별 기본 색상 설정
          switch (t.status) {
            case "TODO":
              backgroundColor = "#f3f4f6"; // 옅은 회색
              borderColor = "rgba(209,213,219,0.8)";
              highlightBorderColor = "rgba(59,130,246,0.9)"; // 하이라이트 시 파란색 테두리
              highlightShadowColor = "rgba(59,130,246,0.25)"; // 하이라이트 시 그림자
              break;
            case "IN_PROGRESS":
              backgroundColor = "#bfdbfe"; // 진한 하늘색
              borderColor = "rgba(96,165,250,0.8)";
              highlightBorderColor = "rgba(59,130,246,0.9)"; // 하이라이트 시 파란색 테두리
              highlightShadowColor = "rgba(59,130,246,0.25)"; // 하이라이트 시 그림자
              break;
            case "DONE":
              backgroundColor = "#d1fae5"; // 옅은 초록색
              borderColor = "rgba(110,231,183,0.8)";
              highlightBorderColor = "rgba(34,197,94,0.9)"; // 하이라이트 시 초록색 테두리
              highlightShadowColor = "rgba(34,197,94,0.25)"; // 하이라이트 시 그림자
              break;
            default:
              backgroundColor = "#0f172a";
              borderColor = "rgba(148,163,184,0.5)";
              highlightBorderColor = "rgba(148,163,184,0.9)";
              highlightShadowColor = "rgba(148,163,184,0.25)";
          }

          // 하이라이트 시 사용할 테두리 색상
          const finalBorderColor = isHighlighted ? highlightBorderColor : borderColor;

          // 텍스트 색상 (밝은 배경에는 어두운 텍스트)
          const textColor = "#111827"; // 상태 색상이 밝으므로 항상 어두운 텍스트

          // 노드 스타일 객체 생성
          const nodeStyle: React.CSSProperties = {
            borderRadius: 999,
            padding: "6px 14px",
            backgroundColor: backgroundColor, // 상태별 색상 유지
            color: textColor,
            fontSize: 12,
            border: isHighlighted
              ? `2px solid ${finalBorderColor}` // 하이라이트 시 더 두꺼운 테두리
              : `1px solid ${finalBorderColor}`,
            boxShadow: isHighlighted
              ? `0 0 0 2px ${highlightShadowColor}, 0 10px 25px rgba(15,23,42,0.7)` // 하이라이트 시 강한 그림자
              : "0 8px 18px rgba(15,23,42,0.6)",
            opacity: dimOthers ? 0.3 : 1,
            fontWeight: isHighlighted ? 600 : 500, // 하이라이트 시 더 굵게
            cursor: "pointer",
          };

          nodes.push({
            id: t.id,
            position: { x: idx * xGap, y: lv * yGap },
            data: { label: t.title },
            style: nodeStyle,
          });
        });
      });

    return nodes;
  }, [tasks, relations, highlightedNodeIds]);

  const flowEdges: FlowEdge[] = useMemo(
    () =>
      relations.map((rel) => {
        const isHighlighted = highlightedEdgeIds.has(rel.id);
        const dimOthers =
          highlightedEdgeIds.size > 0 && !isHighlighted;

        const color =
          rel.type === "SUBTASK"
            ? "#38bdf8"
            : rel.type === "RELATED"
            ? "#a855f7"
            : "#f97316";

        return {
          id: rel.id,
          source: rel.fromTaskId,
          target: rel.toTaskId,
          label: rel.type,
          style: {
            strokeWidth: isHighlighted ? 3 : 1.5,
            stroke: color,
            opacity: dimOthers ? 0.15 : 0.9,
          },
          labelBgStyle: {
            fill: "#020617",
            stroke: "rgba(15,23,42,0.8)",
            fillOpacity: 0.85,
            strokeWidth: 0.5,
          },
          labelStyle: {
            fontSize: 10,
            fill: "#e5e7eb",
          },
        };
      }),
    [relations, highlightedEdgeIds]
  );

  // ---- 하위/관련 업무 ----

  const subTasks: Task[] = useMemo(() => {
    if (!selectedTask) return [];
    const childIds = relations
      .filter(
        (rel) => rel.type === "SUBTASK" && rel.fromTaskId === selectedTask.id
      )
      .map((rel) => rel.toTaskId);
    return tasks.filter((t) => childIds.includes(t.id));
  }, [selectedTask, relations, tasks]);

  const relatedTasks: Task[] = useMemo(() => {
    if (!selectedTask) return [];
    const relatedIds = relations
      .filter((rel) => rel.type === "RELATED")
      .flatMap((rel) => {
        if (rel.fromTaskId === selectedTask.id) return [rel.toTaskId];
        if (rel.toTaskId === selectedTask.id) return [rel.fromTaskId];
        return [];
      });
    return tasks.filter((t) => relatedIds.includes(t.id));
  }, [selectedTask, relations, tasks]);

  const logsForSelected: TaskLog[] =
    (selectedTask && logsByTask[selectedTask.id]) ?? [];

  // ---- 상태 변경 + 알림 + webhook ----

  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? { ...t, status: newStatus, updatedAt: nowIso() }
          : t
      )
    );

    if (newStatus !== "DONE") return;

    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    const now = new Date();

    // 작업 완료 시 담당자에게 알림
    setNotifications((prev) => {
      if (!task.assignee) return prev;

      const msg = `"${task.title}" (ID: ${task.id}) 작업이 DONE 상태로 변경되었습니다.`;
      const newNotif: Notification = {
        id: `${now.getTime()}-${taskId}`,
        userId: task.assignee,
        taskId: task.id,
        message: msg,
        createdAt: now.toISOString(),
        type: "task",
      };

      return [newNotif, ...prev];
    });

    const logs = logsByTask[taskId] ?? [];
    const outgoing = relations.filter(
      (rel) => rel.fromTaskId === taskId
    );

    const payload: WebhookPayload = {
      taskId: task.id,
      title: task.title,
      description: task.description,
      status: newStatus,
      assignee: task.assignee,
      actor: currentUser,
      finishedAt: now.toISOString(),
      logs: logs.map((log) => ({
        id: log.id,
        text: log.text,
        author: log.author,
        createdAt: log.createdAt,
      })),
      subTaskIds: outgoing
        .filter((rel) => rel.type === "SUBTASK")
        .map((rel) => rel.toTaskId),
      relatedTaskIds: outgoing
        .filter((rel) => rel.type === "RELATED")
        .map((rel) => rel.toTaskId),
      app: "N-TASK",
    };

    const webhookUrl = process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL;
    if (webhookUrl) {
      try {
        await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } catch (err) {
        console.error("n8n webhook 호출 실패:", err);
      }
    } else {
      console.log("n8n webhook URL 미설정. payload:", payload);
    }
  };

  // ---- 로그 추가 ----

  const handleAddLog = () => {
    if (!selectedTask || !logDraft.trim()) return;

    const now = new Date();
    const newLog: TaskLog = {
      id: `${selectedTask.id}-${now.getTime()}`,
      taskId: selectedTask.id,
      text: logDraft.trim(),
      author: currentUser,
      createdAt: now.toISOString(),
    };

    setLogsByTask((prev) => {
      const prevLogs = prev[selectedTask.id] ?? [];
      return {
        ...prev,
        [selectedTask.id]: [newLog, ...prevLogs],
      };
    });
    setLogDraft("");
  };

  // ---- 새 업무 추가 ----

  const handleAddTask = () => {
    if (!newTitle.trim()) return;

    const now = new Date();
    const newId = `TASK-${now.getTime()}`;

    const newTask: Task = {
      id: newId,
      title: newTitle.trim(),
      description: newDescription.trim() || "(설명 없음)",
      status: "TODO",
      assignee: newAssignee.trim() || undefined,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    setTasks((prev) => [...prev, newTask]);

    if (newParentId && newRelationType !== "NONE") {
      const rel: TaskRelation = {
        id: `rel-${newParentId}-${newId}-${newRelationType}-${now.getTime()}`,
        fromTaskId: newParentId,
        toTaskId: newId,
        type: newRelationType,
      };
      setRelations((prev) => [...prev, rel]);
    }

    // 담당자가 있으면 알림 생성
    if (newTask.assignee) {
      const notification: Notification = {
        id: `new-task-${now.getTime()}`,
        userId: newTask.assignee,
        taskId: newTask.id,
        message: `새로운 작업이 배정되었습니다: "${newTask.title}" (ID: ${newTask.id})`,
        createdAt: now.toISOString(),
        type: "task",
      };
      setNotifications((prev) => [notification, ...prev]);
    }

    setNewTitle("");
    setNewDescription("");
    setNewAssignee("");
    setNewParentId("");
    setNewRelationType("NONE");
    setSelectedId(newId);
  };

  // ---- 업무 수정 ----

  const handleStartEdit = () => {
    if (!selectedTask) return;

    setEditTitle(selectedTask.title);
    setEditDescription(selectedTask.description);
    setEditAssignee(selectedTask.assignee || "");

    // 현재 작업의 부모 관계 찾기
    const parentRelation = relations.find(
      (rel) => rel.toTaskId === selectedTask.id && rel.type !== "RELATED"
    );

    if (parentRelation) {
      setEditParentId(parentRelation.fromTaskId);
      setEditRelationType(parentRelation.type);
    } else {
      setEditParentId("");
      setEditRelationType("NONE");
    }

    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    if (!selectedTask || !editTitle.trim()) return;

    const now = new Date();
    const oldAssignee = selectedTask.assignee;

    // 작업 업데이트
    setTasks((prev) =>
      prev.map((t) =>
        t.id === selectedTask.id
          ? {
              ...t,
              title: editTitle.trim(),
              description: editDescription.trim() || "(설명 없음)",
              assignee: editAssignee.trim() || undefined,
              updatedAt: now.toISOString(),
            }
          : t
      )
    );

    // 기존 부모 관계 제거 (RELATED는 제외)
    setRelations((prev) =>
      prev.filter(
        (rel) => !(rel.toTaskId === selectedTask.id && rel.type !== "RELATED")
      )
    );

    // 새 부모 관계 추가
    if (editParentId && editRelationType !== "NONE") {
      const rel: TaskRelation = {
        id: `rel-${editParentId}-${selectedTask.id}-${editRelationType}-${now.getTime()}`,
        fromTaskId: editParentId,
        toTaskId: selectedTask.id,
        type: editRelationType,
      };
      setRelations((prev) => [...prev, rel]);
    }

    // 담당자가 변경되었고 새 담당자가 있으면 알림
    if (editAssignee && editAssignee !== oldAssignee) {
      const notification: Notification = {
        id: `task-reassigned-${now.getTime()}`,
        userId: editAssignee,
        taskId: selectedTask.id,
        message: `작업이 재배정되었습니다: "${editTitle.trim()}" (ID: ${selectedTask.id})`,
        createdAt: now.toISOString(),
        type: "task",
      };
      setNotifications((prev) => [notification, ...prev]);
    }

    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditTitle("");
    setEditDescription("");
    setEditAssignee("");
    setEditParentId("");
    setEditRelationType("NONE");
  };

  // ---- 문서 정보 요청 제출 ----

  const handleDocumentRequest = async () => {
    if (!docRequestQuestion.trim() || !docRequestApprover) {
      setDocRequestMessage({
        type: "error",
        text: "질문 내용과 승인자를 선택해주세요.",
      });
      return;
    }

    setIsSubmittingDocRequest(true);
    setDocRequestMessage(null);

    try {
      const response = await fetch("/api/documents/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requester_email: `${currentUser.toLowerCase().replace(/\s+/g, "")}@company.com`,
          requester_department: "개발팀",
          keyword: docRequestQuestion,
          approver_email: `${docRequestApprover.toLowerCase().replace(/\s+/g, "")}@company.com`,
          urgency: "normal",
        }),
      });

      const data = await response.json();

      if (data.success) {
        // 승인자에게 알림 추가
        const newNotification: Notification = {
          id: `doc-req-${Date.now()}`,
          userId: docRequestApprover,
          message: `${currentUser}님이 문서 정보를 요청했습니다: "${docRequestQuestion.substring(0, 50)}${docRequestQuestion.length > 50 ? '...' : ''}"`,
          createdAt: new Date().toISOString(),
          type: "document_request",
          documentRequest: {
            id: data.request.id,
            requester_email: `${currentUser.toLowerCase().replace(/\s+/g, "")}@company.com`,
            requester_name: currentUser,
            question: docRequestQuestion,
            status: "pending",
            createdAt: new Date().toISOString(),
          },
        };

        setNotifications((prev) => [newNotification, ...prev]);

        setDocRequestMessage({
          type: "success",
          text: `${docRequestApprover}에게 질문이 전송되었습니다.`,
        });
        setDocRequestQuestion("");
        setDocRequestApprover("");
      } else {
        setDocRequestMessage({
          type: "error",
          text: data.error || "요청 실패",
        });
      }
    } catch {
      setDocRequestMessage({
        type: "error",
        text: "요청 중 오류가 발생했습니다.",
      });
    } finally {
      setIsSubmittingDocRequest(false);
    }
  };

  const userNotifications = notifications.filter(
    (n) => n.userId === currentUser
  );

  // ---- 렌더링 ----

  return (
    <div
      style={{
        height: "100vh",
        width: "100vw",
        background:
          "radial-gradient(circle at top, #1d4ed8 0, #020617 55%, #020617 100%)",
        color: "#0f172a",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: 16,
        boxSizing: "border-box",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, system-ui, "SF Pro Text", sans-serif',
      }}
    >
      <div
        style={{
          display: "flex",
          maxWidth: 1400,
          width: "100%",
          height: "100%",
          gap: 16,
        }}
      >
        {/* 왼쪽: 그래프 카드 */}
        <div
          style={{
            flex: 1.4,
            ...cardStyle,
            background:
              "radial-gradient(circle at top, #1e293b 0, #020617 65%, #020617 100%)",
            borderRadius: 18,
            padding: 16,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 8,
            }}
          >
            <div style={{ color: "#e5e7eb", fontWeight: 600, fontSize: 14 }}>
              작업 그래프
            </div>
            <div
              style={{
                fontSize: 11,
                color: "#9ca3af",
                display: "flex",
                gap: 10,
                alignItems: "center",
              }}
            >
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 999,
                  background:
                    "radial-gradient(circle at 30% 0, #22d3ee, #1d4ed8)",
                  display: "inline-block",
                }}
              ></span>
              노드를 클릭하면 연결 관계가 강조됩니다.
            </div>
          </div>

          <div
            style={{
              flex: 1,
              borderRadius: 14,
              overflow: "hidden",
              border: "1px solid rgba(148,163,184,0.4)",
              background:
                "radial-gradient(circle at top, #020617, #020617 60%, #030712 100%)",
            }}
          >
            <ReactFlow
              nodes={flowNodes}
              edges={flowEdges}
              fitView
              onNodeClick={(_, node) =>
                setSelectedId((prev) => (prev === node.id ? null : node.id))
              }
            />
          </div>
        </div>

        {/* 오른쪽: 상세/로그/알림 카드 */}
        <div
          style={{
            flex: 1.1,
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          {/* 상단 헤더 카드 */}
          <div
            style={{
              ...cardStyle,
              padding: 12,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background:
                "linear-gradient(135deg, #f9fafb, #e5f0ff 55%, #eff6ff)",
            }}
          >
            <div style={{ fontSize: 15, fontWeight: 600, color: "#0f172a" }}>
              NodeTask
            </div>
            <div
              style={{
                fontSize: 12,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span style={{ color: "#6b7280" }}>현재 사용자</span>
              <select
                value={currentUser}
                onChange={(e) => setCurrentUser(e.target.value)}
                style={{
                  borderRadius: 999,
                  border: "1px solid #cbd5f5",
                  padding: "4px 10px",
                  fontSize: 12,
                  background: "white",
                }}
              >
                {assigneeOptions.length === 0 && (
                  <option value={currentUser}>{currentUser}</option>
                )}
                {assigneeOptions.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 중간: 작업 상세 카드 */}
          <div
            style={{
              ...cardStyle,
              padding: 16,
              flexShrink: 0,
            }}
          >
            {selectedTask ? (
              <>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: 12,
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: "#6b7280",
                        marginBottom: 2,
                      }}
                    >
                      {selectedTask.id}
                    </div>
                    <h2
                      style={{
                        fontSize: 18,
                        fontWeight: 600,
                        color: "#0f172a",
                        marginBottom: 4,
                      }}
                    >
                      {selectedTask.title}
                    </h2>
                    <div style={{ fontSize: 13, color: "#4b5563" }}>
                      {selectedTask.description}
                    </div>
                  </div>
                  <div style={{ textAlign: "right", minWidth: 140 }}>
                    <div style={{ marginBottom: 6 }}>
                      <span style={{ fontSize: 11, color: "#6b7280" }}>
                        상태
                      </span>
                      <div style={{ marginTop: 2 }}>
                        <span style={statusPill(selectedTask.status)}>
                          {selectedTask.status === "TODO"
                            ? "TODO"
                            : selectedTask.status === "IN_PROGRESS"
                            ? "IN_PROGRESS"
                            : "DONE"}
                        </span>
                      </div>
                    </div>
                    <select
                      value={selectedTask.status}
                      onChange={(e) =>
                        handleStatusChange(
                          selectedTask.id,
                          e.target.value as TaskStatus
                        )
                      }
                      style={{
                        borderRadius: 999,
                        border: "1px solid #cbd5f5",
                        padding: "4px 8px",
                        fontSize: 12,
                        background: "white",
                        width: "100%",
                      }}
                    >
                      <option value="TODO">TODO</option>
                      <option value="IN_PROGRESS">IN_PROGRESS</option>
                      <option value="DONE">DONE</option>
                    </select>
                    <div style={{ marginTop: 8 }}>
                      <span
                        style={{
                          fontSize: 11,
                          color: "#6b7280",
                          display: "block",
                        }}
                      >
                        담당자
                      </span>
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 500,
                          color: "#111827",
                        }}
                      >
                        {selectedTask.assignee ?? "미지정"}
                      </span>
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    marginTop: 12,
                    paddingTop: 10,
                    borderTop: "1px solid #e5e7eb",
                    display: "flex",
                    gap: 24,
                    fontSize: 13,
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={sectionTitleStyle}>하위 업무</div>
                    {subTasks.length === 0 ? (
                      <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 4 }}>
                        연결된 하위 업무가 없습니다.
                      </p>
                    ) : (
                      <ul
                        style={{
                          marginTop: 4,
                          paddingLeft: 14,
                          listStyle: "disc",
                        }}
                      >
                        {subTasks.map((t) => (
                          <li
                            key={t.id}
                            style={{
                              cursor: "pointer",
                              marginBottom: 2,
                              color: "#1f2933",
                            }}
                            onClick={() => setSelectedId(t.id)}
                          >
                            {t.id} - {t.title}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={sectionTitleStyle}>관련 업무</div>
                    {relatedTasks.length === 0 ? (
                      <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 4 }}>
                        연결된 관련 업무가 없습니다.
                      </p>
                    ) : (
                      <ul
                        style={{
                          marginTop: 4,
                          paddingLeft: 14,
                          listStyle: "disc",
                        }}
                      >
                        {relatedTasks.map((t) => (
                          <li
                            key={t.id}
                            style={{
                              cursor: "pointer",
                              marginBottom: 2,
                              color: "#1f2933",
                            }}
                            onClick={() => setSelectedId(t.id)}
                          >
                            {t.id} - {t.title}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <p style={{ fontSize: 13, color: "#6b7280" }}>
                왼쪽 그래프에서 작업 노드를 클릭하면 상세 정보가 보입니다.
              </p>
            )}
          </div>

          {/* 하단: 좌 (로그+문서요청), 우 (알림+업무추가) */}
          <div
            style={{
              display: "flex",
              flex: 1,
              gap: 12,
              minHeight: 0,
            }}
          >
            {/* 왼쪽 컬럼: 로그 + 문서요청 */}
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                gap: 12,
                minHeight: 0,
              }}
            >
              {/* 업무 로그 */}
              <div
                style={{
                  ...cardStyle,
                  flex: 1,
                  padding: 14,
                  display: "flex",
                  flexDirection: "column",
                  minHeight: 0,
                }}
              >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={sectionTitleStyle}>업무 로그</div>
                {selectedTask && !isEditing && (
                  <button
                    onClick={handleStartEdit}
                    style={{
                      border: "1px solid #8b5cf6",
                      borderRadius: 999,
                      padding: "4px 12px",
                      fontSize: 11,
                      fontWeight: 500,
                      background: "white",
                      color: "#8b5cf6",
                      cursor: "pointer",
                    }}
                  >
                    업무 수정
                  </button>
                )}
              </div>
              {selectedTask && !isEditing && (
                <>
                  <textarea
                    value={logDraft}
                    onChange={(e) => setLogDraft(e.target.value)}
                    placeholder="특이사항, 진행 상황 등을 기록하세요."
                    style={{
                      marginTop: 8,
                      width: "100%",
                      minHeight: 60,
                      resize: "vertical",
                      borderRadius: 10,
                      border: "1px solid #e5e7eb",
                      padding: 8,
                      fontSize: 13,
                      outline: "none",
                    }}
                  />
                  <button
                    onClick={handleAddLog}
                    style={{
                      marginTop: 6,
                      alignSelf: "flex-end",
                      border: "none",
                      borderRadius: 999,
                      padding: "5px 14px",
                      fontSize: 12,
                      fontWeight: 500,
                      background:
                        "linear-gradient(135deg, #2563eb, #4f46e5)",
                      color: "white",
                      cursor: "pointer",
                    }}
                  >
                    로그 추가
                  </button>
                </>
              )}

              {/* 업무 수정 폼 */}
              {selectedTask && isEditing && (
                <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                  <div>
                    <label style={{ fontSize: 11, color: "#6b7280", display: "block", marginBottom: 4 }}>
                      제목
                    </label>
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      style={{
                        width: "100%",
                        padding: 8,
                        borderRadius: 8,
                        border: "1px solid #e5e7eb",
                        fontSize: 13,
                        outline: "none",
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: 11, color: "#6b7280", display: "block", marginBottom: 4 }}>
                      설명
                    </label>
                    <textarea
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      rows={3}
                      style={{
                        width: "100%",
                        padding: 8,
                        borderRadius: 8,
                        border: "1px solid #e5e7eb",
                        fontSize: 13,
                        outline: "none",
                        resize: "vertical",
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: 11, color: "#6b7280", display: "block", marginBottom: 4 }}>
                      담당자
                    </label>
                    <input
                      type="text"
                      value={editAssignee}
                      onChange={(e) => setEditAssignee(e.target.value)}
                      placeholder="담당자 이름"
                      style={{
                        width: "100%",
                        padding: 8,
                        borderRadius: 8,
                        border: "1px solid #e5e7eb",
                        fontSize: 13,
                        outline: "none",
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: 11, color: "#6b7280", display: "block", marginBottom: 4 }}>
                      부모 업무
                    </label>
                    <select
                      value={editParentId}
                      onChange={(e) => setEditParentId(e.target.value)}
                      style={{
                        width: "100%",
                        padding: 8,
                        borderRadius: 8,
                        border: "1px solid #e5e7eb",
                        fontSize: 13,
                        outline: "none",
                      }}
                    >
                      <option value="">없음</option>
                      {tasks
                        .filter((t) => t.id !== selectedTask.id)
                        .map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.id}: {t.title}
                          </option>
                        ))}
                    </select>
                  </div>

                  {editParentId && (
                    <div>
                      <label style={{ fontSize: 11, color: "#6b7280", display: "block", marginBottom: 4 }}>
                        관계 유형
                      </label>
                      <select
                        value={editRelationType}
                        onChange={(e) =>
                          setEditRelationType(e.target.value as TaskRelationType | "NONE")
                        }
                        style={{
                          width: "100%",
                          padding: 8,
                          borderRadius: 8,
                          border: "1px solid #e5e7eb",
                          fontSize: 13,
                          outline: "none",
                        }}
                      >
                        <option value="BLOCKS">BLOCKS (차단)</option>
                        <option value="DEPENDS_ON">DEPENDS_ON (의존)</option>
                        <option value="SUBTASK">SUBTASK (하위 작업)</option>
                      </select>
                    </div>
                  )}

                  <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                    <button
                      onClick={handleSaveEdit}
                      style={{
                        flex: 1,
                        padding: "8px 16px",
                        fontSize: 13,
                        fontWeight: 600,
                        background: "linear-gradient(135deg, #8b5cf6, #7c3aed)",
                        color: "white",
                        border: "none",
                        borderRadius: 8,
                        cursor: "pointer",
                      }}
                    >
                      저장
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      style={{
                        flex: 1,
                        padding: "8px 16px",
                        fontSize: 13,
                        fontWeight: 600,
                        background: "#6b7280",
                        color: "white",
                        border: "none",
                        borderRadius: 8,
                        cursor: "pointer",
                      }}
                    >
                      취소
                    </button>
                  </div>
                </div>
              )}

              <div
                style={{
                  marginTop: 10,
                  overflowY: "auto",
                  fontSize: 13,
                  flex: 1,
                  paddingRight: 4,
                }}
              >
                {logsForSelected.length === 0 ? (
                  <p style={{ color: "#9ca3af", fontSize: 12 }}>
                    아직 이 작업에 대한 로그가 없습니다.
                  </p>
                ) : (
                  logsForSelected.map((log: TaskLog) => (
                    <div
                      key={log.id}
                      style={{
                        marginBottom: 8,
                        padding: 8,
                        borderRadius: 10,
                        border: "1px solid #e5e7eb",
                        background: "#f9fafb",
                      }}
                    >
                      <div>{log.text}</div>
                      <div
                        style={{
                          fontSize: 11,
                          color: "#9ca3af",
                          marginTop: 4,
                        }}
                      >
                        {log.author && <span>{log.author} · </span>}
                        {new Date(log.createdAt).toLocaleString()}
                      </div>
                    </div>
                  ))
                )}
              </div>
              </div>

              {/* 문서 정보 요청 카드 */}
              <div
                style={{
                  ...cardStyle,
                  padding: 14,
                }}
              >
              <div style={sectionTitleStyle}>문서 정보 요청</div>
              <p style={{ fontSize: 11, color: "#6b7280", margin: "4px 0 10px" }}>
                다른 부서에 문서 내용을 질문하세요
              </p>

              {docRequestMessage && (
                <div
                  style={{
                    padding: 10,
                    borderRadius: 8,
                    marginBottom: 10,
                    fontSize: 12,
                    background:
                      docRequestMessage.type === "success"
                        ? "rgba(16, 185, 129, 0.1)"
                        : "rgba(239, 68, 68, 0.1)",
                    color:
                      docRequestMessage.type === "success"
                        ? "#065f46"
                        : "#991b1b",
                    border: `1px solid ${
                      docRequestMessage.type === "success" ? "#10b981" : "#ef4444"
                    }`,
                  }}
                >
                  {docRequestMessage.text}
                </div>
              )}

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                <label style={{ fontSize: 11, color: "#6b7280", fontWeight: 500 }}>
                  질문 또는 필요한 정보
                </label>
                <textarea
                  value={docRequestQuestion}
                  onChange={(e) => setDocRequestQuestion(e.target.value)}
                  placeholder="예: Q4 예산 중 마케팅 비용이 얼마인가요?"
                  rows={3}
                  style={{
                    borderRadius: 8,
                    border: "1px solid #e5e7eb",
                    padding: "8px 10px",
                    fontSize: 13,
                    outline: "none",
                    resize: "vertical",
                    fontFamily: "inherit",
                  }}
                />

                <label style={{ fontSize: 11, color: "#6b7280", fontWeight: 500, marginTop: 4 }}>
                  답변 받을 담당자
                </label>
                <select
                  value={docRequestApprover}
                  onChange={(e) => setDocRequestApprover(e.target.value)}
                  style={{
                    borderRadius: 8,
                    border: "1px solid #e5e7eb",
                    padding: "8px 10px",
                    fontSize: 13,
                    outline: "none",
                    background: "white",
                  }}
                >
                  <option value="">담당자 선택...</option>
                  {approverOptions.map((approver) => (
                    <option key={approver} value={approver}>
                      {approver}
                    </option>
                  ))}
                </select>

                <button
                  onClick={handleDocumentRequest}
                  disabled={isSubmittingDocRequest}
                  style={{
                    marginTop: 6,
                    border: "none",
                    borderRadius: 999,
                    padding: "8px 16px",
                    fontSize: 13,
                    fontWeight: 600,
                    background: isSubmittingDocRequest
                      ? "#9ca3af"
                      : "linear-gradient(135deg, #8b5cf6, #7c3aed)",
                    color: "white",
                    cursor: isSubmittingDocRequest ? "not-allowed" : "pointer",
                  }}
                >
                  {isSubmittingDocRequest ? "전송 중..." : "질문 전송"}
                </button>
              </div>
              </div>
            </div>

            {/* 오른쪽 컬럼: 알림 + 새 업무 추가 */}
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              <div
                style={{
                  ...cardStyle,
                  padding: 14,
                  flex: 1,
                  minHeight: 0,
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <div style={sectionTitleStyle}>
                  내 알림 <span style={{ color: "#6b7280" }}>(for {currentUser})</span>
                </div>
                <div
                  style={{
                    marginTop: 8,
                    overflowY: "auto",
                    fontSize: 13,
                    paddingRight: 4,
                  }}
                >
                  {userNotifications.length === 0 ? (
                    <p style={{ fontSize: 12, color: "#9ca3af" }}>
                      아직 {currentUser}에게 온 알림이 없습니다.
                    </p>
                  ) : (
                    userNotifications.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => {
                          if (n.type === "document_request" && n.documentRequest) {
                            setSelectedDocRequest(n);
                            // 답변이 이미 있으면 답변 표시, 없으면 자동 생성
                            if (n.documentRequest.answer) {
                              setDocAnswer(n.documentRequest.answer);
                            } else {
                              const autoAnswer = generateAutoAnswer(n.documentRequest.question);
                              setDocAnswer(autoAnswer);
                            }
                            // 문서 선택 초기화
                            setSearchedDocs(["doc1", "doc2"]); // 기본으로 모든 문서 선택
                          }
                        }}
                        style={{
                          marginBottom: 8,
                          padding: 8,
                          borderRadius: 10,
                          border: `1px solid ${n.type === "document_request" ? "#a78bfa" : "#e5e7eb"}`,
                          background: n.type === "document_request" ? "rgba(139, 92, 246, 0.1)" : "#fefce8",
                          cursor: n.type === "document_request" ? "pointer" : "default",
                        }}
                      >
                        <div>{n.message}</div>
                        <div
                          style={{
                            fontSize: 11,
                            color: "#9ca3af",
                            marginTop: 4,
                          }}
                        >
                          {n.taskId ? `작업: ${n.taskId} · ` : ""}
                          {new Date(n.createdAt).toLocaleString()}
                          {n.type === "document_request" && n.documentRequest && (
                            <span style={{ marginLeft: 8, color: "#8b5cf6", fontWeight: 500 }}>
                              {n.documentRequest.status === "pending"
                                ? "클릭하여 답변하기"
                                : n.documentRequest.status === "answered"
                                ? "클릭하여 답변 보기"
                                : "클릭하여 상세보기"}
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div
                style={{
                  ...cardStyle,
                  padding: 14,
                }}
              >
                <div style={sectionTitleStyle}>새 업무 추가</div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                    marginTop: 8,
                    fontSize: 13,
                  }}
                >
                  <input
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="업무 제목"
                    style={{
                      borderRadius: 8,
                      border: "1px solid #e5e7eb",
                      padding: "6px 8px",
                      fontSize: 13,
                    }}
                  />
                  <textarea
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="업무 설명"
                    style={{
                      borderRadius: 8,
                      border: "1px solid #e5e7eb",
                      padding: "6px 8px",
                      fontSize: 13,
                      resize: "vertical",
                      minHeight: 40,
                    }}
                  />
                  <input
                    value={newAssignee}
                    onChange={(e) => setNewAssignee(e.target.value)}
                    placeholder="담당자 이름 (선택)"
                    style={{
                      borderRadius: 8,
                      border: "1px solid #e5e7eb",
                      padding: "6px 8px",
                      fontSize: 13,
                    }}
                  />

                  <label
                    style={{
                      fontSize: 11,
                      color: "#6b7280",
                      marginTop: 4,
                    }}
                  >
                    (선택) 부모 업무 / 관계
                  </label>
                  <select
                    value={newParentId}
                    onChange={(e) => setNewParentId(e.target.value)}
                    style={{
                      borderRadius: 8,
                      border: "1px solid #e5e7eb",
                      padding: "5px 8px",
                      fontSize: 13,
                    }}
                  >
                    <option value="">부모 없음 (독립 업무)</option>
                    {tasks.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.id} - {t.title}
                      </option>
                    ))}
                  </select>

                  <select
                    value={newRelationType}
                    onChange={(e) =>
                      setNewRelationType(
                        e.target.value as TaskRelationType | "NONE"
                      )
                    }
                    style={{
                      borderRadius: 8,
                      border: "1px solid #e5e7eb",
                      padding: "5px 8px",
                      fontSize: 13,
                    }}
                  >
                    <option value="NONE">관계 없음</option>
                    <option value="SUBTASK">SUBTASK (하위 업무)</option>
                    <option value="RELATED">RELATED (관련 업무)</option>
                    <option value="CROSS_DEPT">
                      CROSS_DEPT (유관부서)
                    </option>
                  </select>

                  <button
                    onClick={handleAddTask}
                    style={{
                      marginTop: 4,
                      alignSelf: "flex-end",
                      border: "none",
                      borderRadius: 999,
                      padding: "6px 14px",
                      fontSize: 12,
                      fontWeight: 500,
                      background:
                        "linear-gradient(135deg, #22c55e, #16a34a)",
                      color: "white",
                      cursor: "pointer",
                    }}
                  >
                    업무 추가
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 문서 요청 답변 모달 */}
      {selectedDocRequest && selectedDocRequest.documentRequest && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: 20,
          }}
          onClick={closeDocRequestModal}
        >
          <div
            style={{
              background: "white",
              borderRadius: 16,
              width: "90%",
              maxWidth: 1200,
              height: "80%",
              display: "flex",
              overflow: "hidden",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 왼쪽: Q&A 영역 */}
            <div
              style={{
                flex: 1,
                padding: 24,
                display: "flex",
                flexDirection: "column",
                borderRight: "1px solid #e5e7eb",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: "#0f172a", margin: 0 }}>
                  문서 정보 요청
                </h2>
                <button
                  onClick={closeDocRequestModal}
                  style={{
                    border: "none",
                    background: "none",
                    fontSize: 24,
                    cursor: "pointer",
                    color: "#6b7280",
                  }}
                >
                  ×
                </button>
              </div>

              {/* 채팅 스타일 Q&A */}
              <div style={{ flex: 1, overflowY: "auto", marginBottom: 20 }}>
                {/* 질문 */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4 }}>
                    {selectedDocRequest.documentRequest.requester_name} 님의 질문
                  </div>
                  <div
                    style={{
                      background: "#f3f4f6",
                      padding: 12,
                      borderRadius: 12,
                      fontSize: 14,
                      color: "#111827",
                      lineHeight: 1.6,
                    }}
                  >
                    {selectedDocRequest.documentRequest.question}
                  </div>
                </div>

                {/* 답변 작성/보기 */}
                <div>
                  <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4 }}>
                    {selectedDocRequest.documentRequest.status === "answered"
                      ? "답변 내용"
                      : selectedDocRequest.documentRequest.status === "rejected"
                      ? "거절됨"
                      : "답변 작성"}
                    {selectedDocRequest.documentRequest.status === "answered" && (
                      <span style={{ marginLeft: 8, color: "#10b981", fontWeight: 600 }}>✓ 답변 완료</span>
                    )}
                    {selectedDocRequest.documentRequest.status === "rejected" && (
                      <span style={{ marginLeft: 8, color: "#ef4444", fontWeight: 600 }}>✗ 거절됨</span>
                    )}
                  </div>
                  <textarea
                    value={docAnswer}
                    onChange={(e) => setDocAnswer(e.target.value)}
                    placeholder="답변을 작성하세요..."
                    rows={6}
                    readOnly={selectedDocRequest.documentRequest.status !== "pending"}
                    style={{
                      width: "100%",
                      padding: 12,
                      borderRadius: 12,
                      border: "1px solid #e5e7eb",
                      fontSize: 14,
                      outline: "none",
                      resize: "vertical",
                      fontFamily: "inherit",
                      background: selectedDocRequest.documentRequest.status !== "pending" ? "#f9fafb" : "white",
                      cursor: selectedDocRequest.documentRequest.status !== "pending" ? "default" : "text",
                    }}
                  />
                </div>
              </div>

              {/* 하단 버튼 */}
              <div style={{ display: "flex", gap: 12 }}>
                {selectedDocRequest.documentRequest.status === "pending" ? (
                  <>
                    <button
                      onClick={() => {
                        if (!selectedDocRequest?.documentRequest) return;

                        const requesterName = selectedDocRequest.documentRequest.requester_name;

                        // 질문자에게 답변 알림 생성
                        const answerNotification: Notification = {
                          id: `answer-${Date.now()}`,
                          userId: requesterName,
                          message: `${currentUser}님이 문서 요청에 답변했습니다: "${selectedDocRequest.documentRequest.question.substring(0, 30)}${selectedDocRequest.documentRequest.question.length > 30 ? '...' : ''}"`,
                          createdAt: new Date().toISOString(),
                          type: "document_request",
                          documentRequest: {
                            ...selectedDocRequest.documentRequest,
                            status: "answered",
                            answer: docAnswer,
                          },
                        };

                        setNotifications((prev) => [answerNotification, ...prev]);

                        // 원래 알림 제거 (선택사항)
                        setNotifications((prev) =>
                          prev.filter(n => n.id !== selectedDocRequest.id)
                        );

                        console.log("답변 전송:", docAnswer);
                        console.log("선택된 문서:", searchedDocs);
                        closeDocRequestModal();
                      }}
                      style={{
                        flex: 1,
                        padding: "12px 24px",
                        fontSize: 14,
                        fontWeight: 600,
                        background: "linear-gradient(135deg, #8b5cf6, #7c3aed)",
                        color: "white",
                        border: "none",
                        borderRadius: 8,
                        cursor: "pointer",
                      }}
                    >
                      답변 전송
                    </button>
                    <button
                      onClick={() => {
                        if (!selectedDocRequest?.documentRequest) return;

                        const requesterName = selectedDocRequest.documentRequest.requester_name;

                        // 질문자에게 거절 알림 생성
                        const rejectNotification: Notification = {
                          id: `reject-${Date.now()}`,
                          userId: requesterName,
                          message: `${currentUser}님이 문서 요청을 거절했습니다: "${selectedDocRequest.documentRequest.question.substring(0, 30)}${selectedDocRequest.documentRequest.question.length > 30 ? '...' : ''}"`,
                          createdAt: new Date().toISOString(),
                          type: "document_request",
                          documentRequest: {
                            ...selectedDocRequest.documentRequest,
                            status: "rejected",
                          },
                        };

                        setNotifications((prev) => [rejectNotification, ...prev]);

                        // 원래 알림 제거
                        setNotifications((prev) =>
                          prev.filter(n => n.id !== selectedDocRequest.id)
                        );

                        console.log("요청 거절");
                        closeDocRequestModal();
                      }}
                      style={{
                        padding: "12px 24px",
                        fontSize: 14,
                        fontWeight: 600,
                        background: "#ef4444",
                        color: "white",
                        border: "none",
                        borderRadius: 8,
                        cursor: "pointer",
                      }}
                    >
                      거절
                    </button>
                  </>
                ) : (
                  <button
                    onClick={closeDocRequestModal}
                    style={{
                      flex: 1,
                      padding: "12px 24px",
                      fontSize: 14,
                      fontWeight: 600,
                      background: "#6b7280",
                      color: "white",
                      border: "none",
                      borderRadius: 8,
                      cursor: "pointer",
                    }}
                  >
                    닫기
                  </button>
                )}
              </div>
            </div>

            {/* 오른쪽: 문서 검색 결과 */}
            <div
              style={{
                flex: 1,
                padding: 24,
                background: "#f9fafb",
                overflowY: "auto",
              }}
            >
              <h3 style={{ fontSize: 16, fontWeight: 600, color: "#0f172a", marginTop: 0, marginBottom: 16 }}>
                관련 문서 검색 결과
              </h3>

              {/* Mock 문서 리스트 */}
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div
                  style={{
                    background: "white",
                    padding: 16,
                    borderRadius: 12,
                    border: "1px solid #e5e7eb",
                    cursor: "pointer",
                  }}
                  onClick={() => {
                    setSearchedDocs(prev =>
                      prev.includes("doc1")
                        ? prev.filter(id => id !== "doc1")
                        : [...prev, "doc1"]
                    );
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
                    <input
                      type="checkbox"
                      checked={searchedDocs.includes("doc1")}
                      onChange={() => {}}
                      style={{ marginRight: 8 }}
                    />
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>
                      2024_Q4_예산_보고서.pdf
                    </div>
                  </div>
                  <div style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.6 }}>
                    "...마케팅 비용은 <mark>1.5억원</mark>으로 책정되었습니다. 전체 예산의 30%를 차지하며..."
                  </div>
                  <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 8 }}>
                    페이지 2 · 관련도: 95%
                  </div>
                </div>

                <div
                  style={{
                    background: "white",
                    padding: 16,
                    borderRadius: 12,
                    border: "1px solid #e5e7eb",
                    cursor: "pointer",
                  }}
                  onClick={() => {
                    setSearchedDocs(prev =>
                      prev.includes("doc2")
                        ? prev.filter(id => id !== "doc2")
                        : [...prev, "doc2"]
                    );
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
                    <input
                      type="checkbox"
                      checked={searchedDocs.includes("doc2")}
                      onChange={() => {}}
                      style={{ marginRight: 8 }}
                    />
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>
                      마케팅_캠페인_결과_분석.xlsx
                    </div>
                  </div>
                  <div style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.6 }}>
                    "...총 <mark>광고비</mark> 집행 내역: 디지털 마케팅 8천만원, TV광고 7천만원..."
                  </div>
                  <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 8 }}>
                    시트 1 · 관련도: 82%
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 16, fontSize: 12, color: "#6b7280" }}>
                💡 체크박스를 선택하면 해당 문서가 답변의 근거로 포함됩니다.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
