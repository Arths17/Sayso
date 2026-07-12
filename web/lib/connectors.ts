export interface ConnectorMeta {
  name: string;
  label: string;
  icon: string;
}

export const CONNECTORS: Record<string, ConnectorMeta> = {
  GmailTrigger: { name: "GmailTrigger", label: "Gmail Trigger", icon: "mail" },
  GmailSend: { name: "GmailSend", label: "Send Gmail", icon: "send" },
  DriveUpload: { name: "DriveUpload", label: "Drive Upload", icon: "upload" },
  SheetsAppend: { name: "SheetsAppend", label: "Sheets Append Row", icon: "table" },
  SheetsReadRows: { name: "SheetsReadRows", label: "Sheets Read Rows", icon: "table" },
  SlackNotify: { name: "SlackNotify", label: "Slack Notify", icon: "message-square" },
  HTTPRequest: { name: "HTTPRequest", label: "HTTP Request", icon: "globe" },
  PDFExtractText: { name: "PDFExtractText", label: "Extract PDF Text", icon: "file-text" },
  LLMExtractFields: { name: "LLMExtractFields", label: "AI Extract Fields", icon: "sparkles" },
};

export function connectorMeta(name: string | null | undefined): ConnectorMeta | undefined {
  if (!name) return undefined;
  return CONNECTORS[name];
}
