export interface Client {
  id: string;
  name: string;
  company: string;
  industry: string;
  email: string;
  phone: string;
  pain_points: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  min_price: number;
  suggested_price: number;
  features: string[];
  created_at: string;
}

export interface Seller {
  id: string;
  name: string;
  email: string;
  coaching_notes: string;
  created_at: string;
}

export interface Call {
  id: string;
  client_id: string;
  seller_id: string;
  product_id: string;
  status: 'active' | 'completed' | 'failed';
  transcript: TranscriptEntry[];
  ai_notes: string;
  outcome: string;
  started_at: string;
  ended_at: string | null;
  created_at: string;
  clients?: Client;
  products?: Product;
}

export interface TranscriptEntry {
  speaker: 'seller' | 'client';
  text: string;
  timestamp: number;
}

export interface Suggestion {
  text: string;
  timestamp: number;
}

// WebSocket messages: Client → Server
export type ClientMessage =
  | { type: 'start_session'; clientId: string; productId: string; sellerId: string }
  | { type: 'end_session' }
  | { type: 'set_seller_speaker'; speakerId: number };

// WebSocket messages: Server → Client
export type ServerMessage =
  | { type: 'session_started'; callId: string }
  | { type: 'transcript'; text: string; speaker: 'seller' | 'client'; speakerId: number; isFinal: boolean; timestamp: number }
  | { type: 'suggestion_chunk'; text: string }
  | { type: 'suggestion_complete'; text: string }
  | { type: 'session_ended' }
  | { type: 'error'; message: string };
