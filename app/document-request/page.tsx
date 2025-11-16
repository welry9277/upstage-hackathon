"use client";

import React, { useState } from "react";

export default function DocumentRequestPage() {
  const [requesterEmail, setRequesterEmail] = useState("");
  const [requesterDepartment, setRequesterDepartment] = useState("");
  const [keyword, setKeyword] = useState("");
  const [approverEmail, setApproverEmail] = useState("");
  const [urgency, setUrgency] = useState<"low" | "normal" | "high">("normal");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch("/api/documents/request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requester_email: requesterEmail,
          requester_department: requesterDepartment || undefined,
          keyword,
          approver_email: approverEmail,
          urgency,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage({
          type: "success",
          text: `Request submitted successfully! Found ${data.matchingDocuments} matching document(s). An approval notification has been sent to ${approverEmail}.`,
        });
        // Reset form
        setRequesterEmail("");
        setRequesterDepartment("");
        setKeyword("");
        setApproverEmail("");
        setUrgency("normal");
      } else {
        setMessage({
          type: "error",
          text: data.error || "Failed to submit request",
        });
      }
    } catch (error) {
      setMessage({
        type: "error",
        text: "An error occurred while submitting the request",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top, #1d4ed8 0, #020617 55%, #020617 100%)",
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
            Document Request Form
          </h1>
          <p style={{ fontSize: 14, color: "#64748b", lineHeight: 1.6 }}>
            Submit a request to access documents from another department.
            The system will search for matching documents and send an approval
            request to the designated approver.
          </p>
        </div>

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
              Your Email Address <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <input
              type="email"
              value={requesterEmail}
              onChange={(e) => setRequesterEmail(e.target.value)}
              required
              placeholder="your.email@company.com"
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
              Your Department
            </label>
            <input
              type="text"
              value={requesterDepartment}
              onChange={(e) => setRequesterDepartment(e.target.value)}
              placeholder="e.g., Engineering, Sales, Marketing"
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
              Search Keyword <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              required
              placeholder="e.g., Q4 report, project plan, budget"
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
              Enter keywords to search for the document you need
            </p>
          </div>

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
              Approver Email <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <input
              type="email"
              value={approverEmail}
              onChange={(e) => setApproverEmail(e.target.value)}
              required
              placeholder="approver.email@company.com"
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
              Email of the person who can approve access to the document
            </p>
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
              Urgency
            </label>
            <select
              value={urgency}
              onChange={(e) =>
                setUrgency(e.target.value as "low" | "normal" | "high")
              }
              style={{
                width: "100%",
                padding: "10px 14px",
                fontSize: 14,
                border: "1px solid #d1d5db",
                borderRadius: 8,
                outline: "none",
                background: "white",
                boxSizing: "border-box",
              }}
            >
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
            </select>
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
                : "linear-gradient(135deg, #2563eb, #4f46e5)",
              color: "white",
              border: "none",
              borderRadius: 8,
              cursor: isSubmitting ? "not-allowed" : "pointer",
            }}
          >
            {isSubmitting ? "Submitting..." : "Submit Request"}
          </button>
        </form>
      </div>
    </div>
  );
}
