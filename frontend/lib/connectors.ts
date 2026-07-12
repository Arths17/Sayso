export type ConnectorKind = "trigger" | "action";

export interface ConnectorField {
  key: string;
  label: string;
  type: "string" | "text" | "dict" | "json";
  required?: boolean;
}

export interface ConnectorMeta {
  name: string;
  label: string;
  kind: ConnectorKind;
  icon: string;
  fields: ConnectorField[];
  outputs: string[];
}

export const CONNECTORS: Record<string, ConnectorMeta> = {
  GmailTrigger: {
    name: "GmailTrigger",
    label: "Gmail Trigger",
    kind: "trigger",
    icon: "mail",
    fields: [{ key: "query", label: "Search query", type: "string" }],
    outputs: ["message_id", "from", "subject", "attachment_id"],
  },
  GmailSend: {
    name: "GmailSend",
    label: "Send Gmail",
    kind: "action",
    icon: "send",
    fields: [
      { key: "to", label: "To", type: "string", required: true },
      { key: "subject", label: "Subject", type: "string" },
      { key: "body", label: "Body", type: "text", required: true },
    ],
    outputs: ["sent", "to"],
  },
  DriveUpload: {
    name: "DriveUpload",
    label: "Drive Upload",
    kind: "action",
    icon: "upload",
    fields: [
      { key: "filename", label: "Filename", type: "string" },
      { key: "content", label: "Content", type: "text" },
    ],
    outputs: ["file_id", "url"],
  },
  SheetsAppend: {
    name: "SheetsAppend",
    label: "Sheets Append Row",
    kind: "action",
    icon: "table",
    fields: [
      { key: "spreadsheet_id", label: "Spreadsheet ID", type: "string", required: true },
      { key: "range", label: "Range", type: "string" },
      { key: "row", label: "Row", type: "dict" },
    ],
    outputs: ["appended", "row", "updated_range"],
  },
  SheetsReadRows: {
    name: "SheetsReadRows",
    label: "Sheets Read Rows",
    kind: "action",
    icon: "table",
    fields: [
      { key: "spreadsheet_id", label: "Spreadsheet ID", type: "string", required: true },
      { key: "range", label: "Range", type: "string" },
    ],
    outputs: ["rows"],
  },
  SlackNotify: {
    name: "SlackNotify",
    label: "Slack Notify",
    kind: "action",
    icon: "message-square",
    fields: [
      { key: "channel", label: "Channel", type: "string", required: true },
      { key: "text", label: "Message", type: "text" },
    ],
    outputs: ["ok", "channel", "ts"],
  },
  HTTPRequest: {
    name: "HTTPRequest",
    label: "HTTP Request",
    kind: "action",
    icon: "globe",
    fields: [
      { key: "method", label: "Method", type: "string" },
      { key: "url", label: "URL", type: "string", required: true },
      { key: "json", label: "JSON body", type: "json" },
      { key: "headers", label: "Headers", type: "dict" },
    ],
    outputs: ["status_code", "body"],
  },
  PDFExtractText: {
    name: "PDFExtractText",
    label: "Extract PDF Text",
    kind: "action",
    icon: "file-text",
    fields: [{ key: "source", label: "Source (base64 or Gmail attachment ref)", type: "json" }],
    outputs: ["text"],
  },
  LLMExtractFields: {
    name: "LLMExtractFields",
    label: "AI Extract Fields",
    kind: "action",
    icon: "sparkles",
    fields: [
      { key: "schema", label: "Schema (field: type)", type: "dict" },
      { key: "text", label: "Text", type: "text" },
    ],
    outputs: ["fields"],
  },
};

export function connectorMeta(name: string | null | undefined): ConnectorMeta | undefined {
  if (!name) return undefined;
  return CONNECTORS[name];
}
