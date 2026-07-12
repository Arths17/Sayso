"use client";

import { useState } from "react";
import { apiClient } from "@/app/api/index";
import type { ClarificationRequest, GenerateResponse } from "@/app/api/index";

function formatFailure(res: GenerateResponse): string {
  if (res.status === "invalid" && res.validation) {
    const reasons = res.validation.errors.map((e) => (e.node_id ? `${e.node_id}: ${e.reason}` : e.reason));
    return `Couldn't build a valid workflow from that: ${reasons.join("; ")}`;
  }
  return "Something went wrong.";
}

const EXAMPLE_PROMPTS = [
  "Whenever I receive a new email in Gmail, log the sender, subject, and date to my Inbox Log Google Sheet.",
  "Whenever I receive a new email in Gmail, automatically send a reply letting them know I received it and will respond soon.",
  "Whenever I receive a new email in Gmail, send an automatic reply letting them know I got it, and also log the sender, subject, and date to my Inbox Log Google Sheet.",
];

export default function NewWorkflowCard({
  showExamples,
  onCreated,
}: {
  showExamples: boolean;
  onCreated: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clarification, setClarification] = useState<{
    workflowId: string;
    req: ClarificationRequest;
  } | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const reset = () => {
    setOpen(false);
    setPrompt("");
    setError(null);
    setClarification(null);
    setAnswers({});
  };

  const handleGenerate = async (text: string) => {
    if (!text.trim() || submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await apiClient.generate({ prompt: text });
      if (res.status === "needs_clarification" && res.clarification) {
        setClarification({ workflowId: res.workflow_id, req: res.clarification });
        setAnswers({});
      } else if (res.status === "invalid") {
        setError(formatFailure(res));
      } else {
        reset();
        onCreated();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClarify = async () => {
    if (!clarification) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await apiClient.clarify(clarification.workflowId, { answers });
      if (res.status === "needs_clarification" && res.clarification) {
        setClarification({ workflowId: clarification.workflowId, req: res.clarification });
      } else if (res.status === "invalid") {
        setError(formatFailure(res));
      } else {
        reset();
        onCreated();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) {
    return (
      <button type="button" className="nw-card nw-card--collapsed" onClick={() => setOpen(true)}>
        <span className="nw-plus">+</span>
        <span className="ts-13px color-white-50 mono all-caps">New Workflow</span>

        <style>{`
          .nw-card--collapsed {
            border: 1px dashed var(--color--grey-700);
            background-color: transparent;
            padding: 1.5em;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 0.5em;
            cursor: pointer;
            min-height: 9em;
            width: 100%;
            transition: border-color 0.2s, background-color 0.2s;
          }

          .nw-card--collapsed:hover {
            border-color: var(--color--primary-blue);
            background-color: var(--color--grey-900);
          }

          .nw-plus {
            font-size: 1.5em;
            line-height: 1;
            color: var(--color--grey-300);
          }
        `}</style>
      </button>
    );
  }

  return (
    <div className="nw-card nw-card--open">
      {clarification ? (
        <>
          <h3 className="ts-14px color-white nw-title">Just a couple questions</h3>
          <p className="ts-13px color-white-50 nw-sub">
            {clarification.req.reasoning || "Answer these so I can finish the plan."}
          </p>
          <div className="nw-clarify-list">
            {clarification.req.questions.map((q, i) => (
              <div key={i} className="nw-clarify-item">
                <label className="ts-11px color-white-50 mono all-caps">{q}</label>
                <div className="w-layout-hflex hs-input_wrapper">
                  <input
                    className="hs-input"
                    value={answers[q] ?? ""}
                    onChange={(e) => setAnswers({ ...answers, [q]: e.target.value })}
                  />
                </div>
              </div>
            ))}
          </div>
          {error && <p className="ts-12px nw-error">{error}</p>}
          <div className="nw-actions">
            <button type="button" className="nw-cancel" onClick={reset}>
              <span className="ts-12px color-white-50 mono all-caps">Cancel</span>
            </button>
            <button
              type="button"
              className="cta-button is--blue nw-submit"
              onClick={handleClarify}
              disabled={submitting}
            >
              {submitting ? "Thinking..." : "Continue"}
            </button>
          </div>
        </>
      ) : (
        <>
          <h3 className="ts-14px color-white nw-title">Describe what you want to automate</h3>
          <p className="ts-13px color-white-50 nw-sub">Plain English in, a working pipeline out.</p>
          <form
            className="nw-form"
            onSubmit={(e) => {
              e.preventDefault();
              handleGenerate(prompt);
            }}
          >
            <textarea
              className="hs-input nw-textarea"
              placeholder="Whenever I receive an invoice PDF in Gmail, extract the invoice number..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
              autoFocus
              required
            />
            {error && <p className="ts-12px nw-error">{error}</p>}
            <div className="nw-actions">
              <button type="button" className="nw-cancel" onClick={reset} disabled={submitting}>
                <span className="ts-12px color-white-50 mono all-caps">Cancel</span>
              </button>
              <button type="submit" className="cta-button is--blue nw-submit" disabled={submitting}>
                {submitting ? "Building..." : "Build workflow"}
              </button>
            </div>
          </form>

          {showExamples && (
            <div className="nw-examples">
              <span className="ts-11px color-white-50 mono all-caps nw-examples-label">
                Or try an example
              </span>
              <div className="nw-examples-list">
                {EXAMPLE_PROMPTS.map((ex) => (
                  <button
                    key={ex}
                    type="button"
                    className="nw-example"
                    onClick={() => {
                      setPrompt(ex);
                      handleGenerate(ex);
                    }}
                    disabled={submitting}
                  >
                    <span className="ts-12px color-white-50">{ex}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <style>{`
        .nw-card--open {
          grid-column: 1 / -1;
          border: 1px solid var(--color--grey-800);
          background-color: var(--color--grey-900);
          padding: 1.75em 2em;
        }

        .nw-title {
          margin: 0 0 0.25em;
        }

        .nw-sub {
          margin: 0 0 1.25em;
        }

        .nw-form {
          display: flex;
          flex-direction: column;
        }

        .nw-textarea {
          resize: vertical;
          min-height: 5em;
          font-family: inherit;
        }

        .nw-error {
          margin: 0.75em 0 0;
          color: var(--orange);
        }

        .nw-actions {
          display: flex;
          align-items: center;
          gap: 1.5em;
          margin-top: 1.125em;
        }

        .nw-submit {
          border: none;
          cursor: pointer;
        }

        .nw-cancel {
          border: none;
          background: none;
          cursor: pointer;
          padding: 0;
        }

        .nw-cancel:hover span {
          color: var(--color--white) !important;
        }

        .nw-clarify-list {
          display: flex;
          flex-direction: column;
          gap: 1em;
        }

        .nw-clarify-item label {
          display: block;
          margin-bottom: 0.375em;
        }

        .nw-examples {
          margin-top: 1.75em;
          padding-top: 1.5em;
          border-top: 1px solid var(--color--grey-800);
        }

        .nw-examples-label {
          display: block;
          margin-bottom: 0.875em;
        }

        .nw-examples-list {
          display: flex;
          flex-direction: column;
          gap: 0.625em;
        }

        .nw-example {
          text-align: left;
          border: 1px solid var(--color--grey-800);
          background-color: transparent;
          padding: 0.875em 1.125em;
          cursor: pointer;
          transition: border-color 0.2s, background-color 0.2s;
        }

        .nw-example:hover {
          border-color: var(--color--grey-700);
          background-color: var(--color--grey-800);
        }
      `}</style>
    </div>
  );
}
