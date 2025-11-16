"use client";

import React, { useState } from "react";

// Mock data for testing
const mockDocuments = [
  {
    id: "doc-001",
    file_name: "2024_Q4_예산_보고서.pdf",
    file_path: "/shared/finance/2024_Q4_예산_보고서.pdf",
    parsed_text: "2024년 4분기 예산 보고서입니다. 전체 예산은 5억원이며, 주요 항목별 배분 내역은 다음과 같습니다...",
    access_level: "department",
    allowed_departments: ["재무팀", "경영지원팀"],
    created_at: "2024-11-01T09:00:00Z",
  },
  {
    id: "doc-002",
    file_name: "노드태스크_프로젝트_계획서.docx",
    file_path: "/shared/projects/노드태스크_프로젝트_계획서.docx",
    parsed_text: "노드태스크 프로젝트 개발 계획서. 목표: 업무 관리 시스템 구축. 담당자: 홍길동, 도현...",
    access_level: "department",
    allowed_departments: ["개발팀", "기획팀"],
    created_at: "2024-10-15T14:30:00Z",
  },
  {
    id: "doc-003",
    file_name: "인사_규정_개정안.pdf",
    file_path: "/shared/hr/인사_규정_개정안.pdf",
    parsed_text: "2024년 인사 규정 개정안입니다. 주요 변경사항: 재택근무 정책, 연차 사용 규정...",
    access_level: "restricted",
    allowed_departments: ["인사팀"],
    created_at: "2024-09-20T10:00:00Z",
  },
  {
    id: "doc-004",
    file_name: "마케팅_캠페인_결과_분석.xlsx",
    file_path: "/shared/marketing/마케팅_캠페인_결과_분석.xlsx",
    parsed_text: "2024년 상반기 마케팅 캠페인 결과 분석 보고서. ROI 350%, 신규 고객 1,500명 확보...",
    access_level: "public",
    allowed_departments: [],
    created_at: "2024-08-10T16:45:00Z",
  },
  {
    id: "doc-005",
    file_name: "기술_스택_선정_가이드.pdf",
    file_path: "/shared/tech/기술_스택_선정_가이드.pdf",
    parsed_text: "프로젝트 기술 스택 선정 가이드. Next.js, React, PostgreSQL, n8n 활용 방안...",
    access_level: "department",
    allowed_departments: ["개발팀"],
    created_at: "2024-07-25T11:20:00Z",
  },
];

const mockRequests = [
  {
    id: "req-001",
    requester_email: "hong@company.com",
    requester_department: "개발팀",
    keyword: "예산 보고서",
    approver_email: "finance@company.com",
    status: "pending",
    urgency: "high",
    created_at: "2024-11-15T09:30:00Z",
  },
  {
    id: "req-002",
    requester_email: "hong@company.com",
    requester_department: "개발팀",
    keyword: "마케팅 캠페인",
    approver_email: "marketing@company.com",
    status: "approved",
    approved_document_id: "doc-004",
    sharing_link: "https://docs.company.com/share/abc123",
    urgency: "normal",
    created_at: "2024-11-10T14:00:00Z",
  },
  {
    id: "req-003",
    requester_email: "hong@company.com",
    requester_department: "개발팀",
    keyword: "인사 규정",
    approver_email: "hr@company.com",
    status: "rejected",
    rejection_reason: "기밀 문서로 외부 공유가 제한됩니다.",
    urgency: "low",
    created_at: "2024-11-05T10:15:00Z",
  },
];

export default function TestDocRequestPage() {
  const [selectedTab, setSelectedTab] = useState<"documents" | "requests" | "test">("documents");
  const [testKeyword, setTestKeyword] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);

  const handleSearch = () => {
    if (!testKeyword.trim()) {
      setSearchResults([]);
      return;
    }

    // Simple mock search
    const results = mockDocuments.filter((doc) =>
      doc.parsed_text.toLowerCase().includes(testKeyword.toLowerCase()) ||
      doc.file_name.toLowerCase().includes(testKeyword.toLowerCase())
    );
    setSearchResults(results);
  };

  const cardStyle: React.CSSProperties = {
    background: "white",
    borderRadius: 14,
    boxShadow: "0 18px 40px rgba(15,23,42,0.18), 0 0 0 1px rgba(148,163,184,0.25)",
    padding: 20,
    marginBottom: 16,
  };

  const badgeStyle = (color: string): React.CSSProperties => ({
    display: "inline-block",
    padding: "4px 12px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 500,
    background: color,
    color: "white",
    marginRight: 8,
  });

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "radial-gradient(circle at top, #1d4ed8 0, #020617 55%, #020617 100%)",
        padding: "40px 20px",
        fontFamily: '-apple-system, BlinkMacSystemFont, system-ui, "SF Pro Text", sans-serif',
      }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div
          style={{
            ...cardStyle,
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            color: "white",
            marginBottom: 24,
          }}
        >
          <h1 style={{ fontSize: 32, fontWeight: 700, margin: 0, marginBottom: 8 }}>
            문서 요청 시스템 테스트
          </h1>
          <p style={{ fontSize: 16, opacity: 0.9, margin: 0 }}>
            사용자: 홍길동 (hong@company.com) - 개발팀
          </p>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
          <button
            onClick={() => setSelectedTab("documents")}
            style={{
              padding: "12px 24px",
              fontSize: 14,
              fontWeight: 600,
              border: "none",
              borderRadius: 8,
              background: selectedTab === "documents" ? "#3b82f6" : "white",
              color: selectedTab === "documents" ? "white" : "#0f172a",
              cursor: "pointer",
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            }}
          >
            문서 목록 ({mockDocuments.length})
          </button>
          <button
            onClick={() => setSelectedTab("requests")}
            style={{
              padding: "12px 24px",
              fontSize: 14,
              fontWeight: 600,
              border: "none",
              borderRadius: 8,
              background: selectedTab === "requests" ? "#3b82f6" : "white",
              color: selectedTab === "requests" ? "white" : "#0f172a",
              cursor: "pointer",
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            }}
          >
            내 요청 ({mockRequests.length})
          </button>
          <button
            onClick={() => setSelectedTab("test")}
            style={{
              padding: "12px 24px",
              fontSize: 14,
              fontWeight: 600,
              border: "none",
              borderRadius: 8,
              background: selectedTab === "test" ? "#3b82f6" : "white",
              color: selectedTab === "test" ? "white" : "#0f172a",
              cursor: "pointer",
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            }}
          >
            검색 테스트
          </button>
        </div>

        {/* Documents Tab */}
        {selectedTab === "documents" && (
          <div>
            <h2 style={{ color: "white", fontSize: 24, marginBottom: 16 }}>
              시스템에 인덱싱된 문서 목록
            </h2>
            {mockDocuments.map((doc) => (
              <div key={doc.id} style={cardStyle}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                  <h3 style={{ fontSize: 18, fontWeight: 600, color: "#0f172a", margin: 0 }}>
                    {doc.file_name}
                  </h3>
                  <span
                    style={badgeStyle(
                      doc.access_level === "public"
                        ? "#10b981"
                        : doc.access_level === "department"
                        ? "#3b82f6"
                        : "#ef4444"
                    )}
                  >
                    {doc.access_level === "public"
                      ? "공개"
                      : doc.access_level === "department"
                      ? "부서"
                      : "제한"}
                  </span>
                </div>
                <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 8 }}>
                  경로: {doc.file_path}
                </p>
                <p style={{ fontSize: 14, color: "#374151", marginBottom: 12, lineHeight: 1.6 }}>
                  {doc.parsed_text}
                </p>
                {doc.allowed_departments.length > 0 && (
                  <div style={{ fontSize: 12, color: "#6b7280" }}>
                    접근 가능 부서:{" "}
                    {doc.allowed_departments.map((dept, i) => (
                      <span key={i} style={badgeStyle("#8b5cf6")}>
                        {dept}
                      </span>
                    ))}
                  </div>
                )}
                <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 8 }}>
                  생성일: {new Date(doc.created_at).toLocaleString("ko-KR")}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Requests Tab */}
        {selectedTab === "requests" && (
          <div>
            <h2 style={{ color: "white", fontSize: 24, marginBottom: 16 }}>
              홍길동님의 문서 요청 내역
            </h2>
            {mockRequests.map((req) => (
              <div key={req.id} style={cardStyle}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                  <div>
                    <h3 style={{ fontSize: 18, fontWeight: 600, color: "#0f172a", margin: 0, marginBottom: 4 }}>
                      검색어: "{req.keyword}"
                    </h3>
                    <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>
                      승인자: {req.approver_email}
                    </p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span
                      style={badgeStyle(
                        req.status === "approved"
                          ? "#10b981"
                          : req.status === "rejected"
                          ? "#ef4444"
                          : "#f59e0b"
                      )}
                    >
                      {req.status === "approved"
                        ? "승인됨"
                        : req.status === "rejected"
                        ? "거절됨"
                        : "대기중"}
                    </span>
                    <span
                      style={badgeStyle(
                        req.urgency === "high" ? "#ef4444" : req.urgency === "low" ? "#6b7280" : "#3b82f6"
                      )}
                    >
                      {req.urgency === "high" ? "긴급" : req.urgency === "low" ? "낮음" : "보통"}
                    </span>
                  </div>
                </div>

                {req.status === "approved" && req.sharing_link && (
                  <div
                    style={{
                      background: "rgba(16, 185, 129, 0.1)",
                      padding: 12,
                      borderRadius: 8,
                      marginTop: 12,
                    }}
                  >
                    <p style={{ fontSize: 13, color: "#065f46", margin: 0, marginBottom: 4 }}>
                      승인된 문서 공유 링크:
                    </p>
                    <a
                      href={req.sharing_link}
                      style={{ fontSize: 13, color: "#059669", wordBreak: "break-all" }}
                    >
                      {req.sharing_link}
                    </a>
                  </div>
                )}

                {req.status === "rejected" && req.rejection_reason && (
                  <div
                    style={{
                      background: "rgba(239, 68, 68, 0.1)",
                      padding: 12,
                      borderRadius: 8,
                      marginTop: 12,
                    }}
                  >
                    <p style={{ fontSize: 13, color: "#991b1b", margin: 0, marginBottom: 4 }}>
                      거절 사유:
                    </p>
                    <p style={{ fontSize: 13, color: "#7f1d1d", margin: 0 }}>{req.rejection_reason}</p>
                  </div>
                )}

                <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 12 }}>
                  요청일: {new Date(req.created_at).toLocaleString("ko-KR")}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Test Tab */}
        {selectedTab === "test" && (
          <div>
            <h2 style={{ color: "white", fontSize: 24, marginBottom: 16 }}>문서 검색 테스트</h2>
            <div style={cardStyle}>
              <p style={{ fontSize: 14, color: "#6b7280", marginBottom: 12 }}>
                키워드를 입력하여 문서를 검색해보세요. 실제 시스템에서는 PostgreSQL의 Full-Text
                Search를 사용합니다.
              </p>
              <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
                <input
                  type="text"
                  value={testKeyword}
                  onChange={(e) => setTestKeyword(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                  placeholder="검색 키워드 입력 (예: 예산, 프로젝트, 마케팅)"
                  style={{
                    flex: 1,
                    padding: "12px 16px",
                    fontSize: 14,
                    border: "1px solid #d1d5db",
                    borderRadius: 8,
                    outline: "none",
                  }}
                />
                <button
                  onClick={handleSearch}
                  style={{
                    padding: "12px 24px",
                    fontSize: 14,
                    fontWeight: 600,
                    background: "linear-gradient(135deg, #2563eb, #4f46e5)",
                    color: "white",
                    border: "none",
                    borderRadius: 8,
                    cursor: "pointer",
                  }}
                >
                  검색
                </button>
              </div>

              {searchResults.length > 0 && (
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 600, color: "#0f172a", marginBottom: 12 }}>
                    검색 결과: {searchResults.length}개 문서 발견
                  </h3>
                  {searchResults.map((doc) => (
                    <div
                      key={doc.id}
                      style={{
                        background: "#f9fafb",
                        padding: 16,
                        borderRadius: 8,
                        marginBottom: 12,
                        border: "1px solid #e5e7eb",
                      }}
                    >
                      <h4 style={{ fontSize: 15, fontWeight: 600, color: "#0f172a", margin: 0, marginBottom: 8 }}>
                        {doc.file_name}
                      </h4>
                      <p style={{ fontSize: 13, color: "#6b7280", margin: 0, marginBottom: 8 }}>
                        {doc.file_path}
                      </p>
                      <p style={{ fontSize: 13, color: "#374151", margin: 0 }}>
                        {doc.parsed_text.substring(0, 150)}...
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {testKeyword && searchResults.length === 0 && (
                <div
                  style={{
                    background: "rgba(239, 68, 68, 0.1)",
                    padding: 16,
                    borderRadius: 8,
                    textAlign: "center",
                  }}
                >
                  <p style={{ fontSize: 14, color: "#991b1b", margin: 0 }}>
                    "{testKeyword}"에 대한 검색 결과가 없습니다.
                  </p>
                </div>
              )}
            </div>

            <div style={{ marginTop: 24 }}>
              <h3 style={{ color: "white", fontSize: 20, marginBottom: 12 }}>테스트 시나리오</h3>
              <div style={cardStyle}>
                <ol style={{ paddingLeft: 20, margin: 0, lineHeight: 1.8 }}>
                  <li>
                    <strong>문서 검색 테스트:</strong> 위의 검색창에 "예산", "프로젝트", "마케팅" 등의 키워드를
                    입력하여 검색해보세요.
                  </li>
                  <li>
                    <strong>실제 요청 흐름:</strong> <a href="/document-request" style={{ color: "#3b82f6" }}>문서 요청 양식</a>으로
                    이동하여 새로운 요청을 제출해보세요.
                  </li>
                  <li>
                    <strong>승인 프로세스:</strong> 승인자 이메일로 전송된 링크를 클릭하여 승인/거절 양식을 테스트해보세요.
                  </li>
                  <li>
                    <strong>API 테스트:</strong> Postman이나 cURL을 사용하여 <code>/api/documents/request</code> 엔드포인트를
                    직접 호출해보세요.
                  </li>
                </ol>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
