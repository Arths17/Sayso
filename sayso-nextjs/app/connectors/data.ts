export type ConnectorStatus = "connected" | "not-connected";

export type Connector = {
  name: string;
  icon: string;
  kind: string;
  description: string;
  status: ConnectorStatus;
  className: string;
};

export const CONNECTORS: Connector[] = [
  {
    name: "Gmail",
    icon: "mail",
    kind: "trigger + action",
    description: "Watch for new mail or attachments, or send messages as an action step.",
    status: "connected",
    className: "GmailTrigger",
  },
  {
    name: "Google Sheets",
    icon: "table",
    kind: "action",
    description: "Append rows, read ranges, or loop over every row in a sheet.",
    status: "connected",
    className: "SheetsAction",
  },
  {
    name: "Google Drive",
    icon: "brand-google-drive",
    kind: "action",
    description: "Upload files produced mid-workflow — invoices, exports, generated reports.",
    status: "connected",
    className: "DriveUpload",
  },
  {
    name: "Slack",
    icon: "brand-slack",
    kind: "action",
    description: "Post a notification to a channel or DM a teammate when a step completes.",
    status: "connected",
    className: "SlackAction",
  },
  {
    name: "Discord",
    icon: "brand-discord",
    kind: "action",
    description: "Same shape as Slack — post to a server channel or DM a user directly.",
    status: "not-connected",
    className: "DiscordAction",
  },
  {
    name: "HTTP / webhook",
    icon: "webhook",
    kind: "trigger + action",
    description: "Call any external API, or receive one as a trigger. The escape hatch for everything else.",
    status: "connected",
    className: "HttpAction",
  },
];
