export type Role = "user" | "assistant";
export type Variant = "normal" | "error" | "typing";

export type ApiSession = {
  id?: string | number;
  session_id?: string | number;
  topic?: string;
  created_at?: string;
};

export type ApiChatItem = {
  id: string | number;
  created_at?: string;
  text: string;
  owner: "user" | "assistant";
  session_id?: string | number;
};

export type Session = { id: string; topic: string; createdAt?: string };

export type MsgStatus = "streaming" | "complete" | "cancelled" | "error";

export type Msg = {
  id: number;
  role: "user" | "assistant";
  content: string;
  variant: "normal" | "typing" | "error";
  status?: MsgStatus;
};
