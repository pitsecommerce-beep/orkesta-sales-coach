export interface Client {
  id: string;
  name: string;
  company: string;
  industry: string;
  pain_points: string;
  notes: string;
  current_plan?: Record<string, unknown>;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  min_price: number;
  suggested_price: number;
  features: string[];
  pricing_model?: string;
  pricing_tiers?: Record<string, unknown>;
}

export interface AgentConfig {
  persona_name?: string;
  tts_voice?: string;
  personality?: string;
  sales_methodology?: string;
  forbidden_topics?: string[];
  escalation_triggers?: string[];
  language_style?: 'formal' | 'casual' | 'tecnico';
  llm_provider?: 'anthropic' | 'openai';
  llm_model?: string;
}

export interface Seller {
  id: string;
  name: string;
  coaching_notes: string;
  agent_config?: AgentConfig;
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
  speaker: 'agent' | 'client';
  text: string;
  timestamp: number;
}

// Client → Server
export type ClientMessage =
  | { type: 'start_session'; clientId: string; productId: string; sellerId: string }
  | { type: 'end_session' };

// Server → Client
export type ServerMessage =
  | { type: 'session_started'; callId: string }
  | { type: 'agent_intro'; text: string }
  | { type: 'transcript'; text: string; speaker: 'agent' | 'client'; isFinal: boolean; timestamp: number }
  | { type: 'agent_chunk'; text: string }
  | { type: 'agent_response'; text: string }
  | { type: 'agent_audio_ready' }
  | { type: 'session_ended' }
  | { type: 'error'; message: string };
