export interface Message {
  id: string;
  role: 'user' | 'agent';
  text: string;
  timestamp: number;
}

export interface SessionResponse {
  output: {
    id: string;
    app_name: string;
    userId: string;
    events: any[];
    lastUpdateTime: string;
  };
}

export interface StreamEvent {
  id: string;
  timestamp: string;
  author: string;
  content: {
    role: string;
    parts: Array<{
      text: string;
    }>;
  };
}
