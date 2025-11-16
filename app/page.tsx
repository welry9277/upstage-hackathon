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

  // 문서 요청 상태
  const [docRequestQuestion, setDocRequestQuestion] = useState("");
  const [docRequestApprover, setDocRequestApprover] = useState("");
  const [docRequestMessage, setDocRequestMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [isSubmittingDocRequest, setIsSubmittingDocRequest] = useState(false);

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

          nodes.push({
            id: t.id,
            position: { x: idx * xGap, y: lv * yGap },
            data: { label: `${t.id}` },
            style: {
              borderRadius: 999,
              padding: "6px 14px",
              background: isHighlighted
                ? "linear-gradient(135deg, #2563eb, #4f46e5)"
                : "#0f172a",
              color: "#e5e7eb",
              fontSize: 12,
              border: isHighlighted
                ? "2px solid rgba(191,219,254,0.9)"
                : "1px solid rgba(148,163,184,0.5)",
              boxShadow: isHighlighted
                ? "0 0 0 1px rgba(191,219,254,0.4), 0 10px 25px rgba(15,23,42,0.7)"
                : "0 8px 18px rgba(15,23,42,0.6)",
              opacity: dimOthers ? 0.3 : 1,
              fontWeight: 500,
              cursor: "pointer",
            },
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

    const directNeighbors = getNeighbors(taskId, tasks, relations);
    const parents = getParents(taskId, tasks, relations);
    const parentNeighbors = parents.flatMap((p) =>
      getNeighbors(p.id, tasks, relations)
    );

    const allTargets = [...directNeighbors, ...parentNeighbors].filter(
      (t) => t.id !== taskId
    );
    const uniqueTargets = new Map<string, Task>();
    allTargets.forEach((t) => uniqueTargets.set(t.id, t));

    setNotifications((prev) => {
      const newNotifs: Notification[] = [];
      uniqueTargets.forEach((targetTask) => {
        if (!targetTask.assignee) return;
        const msg = `"${task.title}" (ID: ${task.id}) 작업이 완료되었습니다. 관련 작업: ${targetTask.id} (${targetTask.title}) 확인 필요`;
        newNotifs.push({
          id: `${now.getTime()}-${taskId}-${targetTask.id}`,
          userId: targetTask.assignee,
          taskId: targetTask.id,
          message: msg,
          createdAt: now.toISOString(),
        });
      });
      return [...newNotifs, ...prev];
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

    setNewTitle("");
    setNewDescription("");
    setNewAssignee("");
    setNewParentId("");
    setNewRelationType("NONE");
    setSelectedId(newId);
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
        setDocRequestMessage({
          type: "success",
          text: `${docRequestApprover}에게 질문이 전송되었습니다. 문서 검색 후 답변 예정입니다.`,
        });
        setDocRequestQuestion("");
        setDocRequestApprover("");
      } else {
        setDocRequestMessage({
          type: "error",
          text: data.error || "요청 실패",
        });
      }
    } catch (error) {
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

          {/* 하단: 좌 로그, 우 알림+업무추가 */}
          <div
            style={{
              display: "flex",
              flex: 1,
              gap: 12,
              minHeight: 0,
            }}
          >
            {/* 로그 */}
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
              <div style={sectionTitleStyle}>업무 로그</div>
              {selectedTask && (
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
                flex: 1,
                padding: 14,
                display: "flex",
                flexDirection: "column",
                minHeight: 0,
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

            {/* 알림 + 새 업무 추가 */}
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
                        style={{
                          marginBottom: 8,
                          padding: 8,
                          borderRadius: 10,
                          border: "1px solid #e5e7eb",
                          background: "#fefce8",
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
                          작업: {n.taskId} ·{" "}
                          {new Date(n.createdAt).toLocaleString()}
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
    </div>
  );
}
