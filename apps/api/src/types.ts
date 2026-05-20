export interface Client {
  id: string;
  name: string;
  company: string;
  industry: string;
  pain_points: string;
  notes: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  min_price: number;
  suggested_price: number;
  features: string[];
}

export interface Seller {
  id: string;
  name: string;
  coaching_notes: string;
}

export interface PastCall {
  id: string;
  ai_notes: string;
  created_at: string;
  outcome: string;
}

export interface SessionContext {
  client: Client;
  product: Product;
  seller: Seller;
  pastCalls: PastCall[];
}

export interface TranscriptEntry {
  speaker: 'seller' | 'client';
  text: string;
  timestamp: number;
}

// Client → Server
export type ClientMessage =
  | { type: 'start_session'; clientId: string; productId: string; sellerId: string }
  | { type: 'end_session' }
  | { type: 'set_seller_speaker'; speakerId: number };

// Server → Client
export type ServerMessage =
  | { type: 'session_started'; callId: string }
  | { type: 'transcript'; text: string; speaker: 'seller' | 'client'; speakerId: number; isFinal: boolean; timestamp: number }
  | { type: 'suggestion_chunk'; text: string }
  | { type: 'suggestion_complete'; text: string }
  | { type: 'session_ended' }
  | { type: 'error'; message: string };
