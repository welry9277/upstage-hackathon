"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";

function ApproveFormContent() {
  const searchParams = useSearchParams();
  const requestId = searchParams.get("request_id");

  const [documentId, setDocumentId] = useState("");
  const [sharingLink, setSharingLink] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [requestInfo, setRequestInfo] = useState<any>(null);

  useEffect(() => {
    if (requestId) {
      // In a real implementation, fetch request details
      setRequestInfo({
        id: requestId,
        requester: "Loading...",
        keyword: "Loading...",
      });
    }
  }, [requestId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch("/api/documents/approve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          request_id: requestId,
          action: "approve",
          document_id: documentId,
          sharing_link: sharingLink,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage({
          type: "success",
          text: "Request approved successfully! The requester has been notified.",
        });
        // Reset form
        setDocumentId("");
        setSharingLink("");
      } else {
        setMessage({
          type: "error",
          text: data.error || "Failed to approve request",
        });
      }
    } catch (error) {
      setMessage({
        type: "error",
        text: "An error occurred while approving the request",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!requestId) {
    return (
      <div style={{ textAlign: "center", padding: 40 }}>
        <h2 style={{ color: "#ef4444" }}>Invalid Request</h2>
        <p>No request ID provided.</p>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top, #10b981 0, #020617 55%, #020617 100%)",
        padding: "40px 20px",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, system-ui, "SF Pro Text", sans-serif',
      }}
    >
      <div
        style={{
          maxWidth: 600,
          margin: "0 auto",
          background: "white",
          borderRadius: 18,
          boxShadow:
            "0 18px 40px rgba(15,23,42,0.18), 0 0 0 1px rgba(148,163,184,0.25)",
          padding: 32,
        }}
      >
        <div style={{ marginBottom: 24 }}>
          <h1
            style={{
              fontSize: 28,
              fontWeight: 700,
              color: "#0f172a",
              marginBottom: 8,
            }}
          >
            Approve Document Request
          </h1>
          <p style={{ fontSize: 14, color: "#64748b", lineHeight: 1.6 }}>
            Provide the document details and sharing link to approve this
            request.
          </p>
        </div>

        {requestInfo && (
          <div
            style={{
              padding: 16,
              borderRadius: 10,
              marginBottom: 24,
              background: "rgba(59, 130, 246, 0.1)",
              border: "1px solid #3b82f6",
            }}
          >
            <p style={{ fontSize: 13, color: "#1e40af", marginBottom: 4 }}>
              <strong>Request ID:</strong> {requestId}
            </p>
          </div>
        )}

        {message && (
          <div
            style={{
              padding: 16,
              borderRadius: 10,
              marginBottom: 24,
              background:
                message.type === "success"
                  ? "rgba(16, 185, 129, 0.1)"
                  : "rgba(239, 68, 68, 0.1)",
              border: `1px solid ${
                message.type === "success" ? "#10b981" : "#ef4444"
              }`,
              color: message.type === "success" ? "#065f46" : "#991b1b",
            }}
          >
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 20 }}>
            <label
              style={{
                display: "block",
                fontSize: 14,
                fontWeight: 600,
                color: "#374151",
                marginBottom: 6,
              }}
            >
              Document ID <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <input
              type="text"
              value={documentId}
              onChange={(e) => setDocumentId(e.target.value)}
              required
              placeholder="Enter the document ID to share"
              style={{
                width: "100%",
                padding: "10px 14px",
                fontSize: 14,
                border: "1px solid #d1d5db",
                borderRadius: 8,
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label
              style={{
                display: "block",
                fontSize: 14,
                fontWeight: 600,
                color: "#374151",
                marginBottom: 6,
              }}
            >
              Sharing Link <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <input
              type="url"
              value={sharingLink}
              onChange={(e) => setSharingLink(e.target.value)}
              required
              placeholder="https://..."
              style={{
                width: "100%",
                padding: "10px 14px",
                fontSize: 14,
                border: "1px solid #d1d5db",
                borderRadius: 8,
                outline: "none",
                boxSizing: "border-box",
              }}
            />
            <p
              style={{
                fontSize: 12,
                color: "#6b7280",
                marginTop: 4,
              }}
            >
              Provide a secure sharing link for the requester to access the
              document
            </p>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              width: "100%",
              padding: "12px 24px",
              fontSize: 16,
              fontWeight: 600,
              background: isSubmitting
                ? "#9ca3af"
                : "linear-gradient(135deg, #10b981, #059669)",
              color: "white",
              border: "none",
              borderRadius: 8,
              cursor: isSubmitting ? "not-allowed" : "pointer",
            }}
          >
            {isSubmitting ? "Approving..." : "Approve Request"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function ApproveFormPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ApproveFormContent />
    </Suspense>
  );
}
