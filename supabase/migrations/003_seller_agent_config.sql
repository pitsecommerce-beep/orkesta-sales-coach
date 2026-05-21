-- Expand seller configuration into a structured JSONB agent_config column.
-- Shape: { persona_name, tts_voice, personality, sales_methodology,
--          forbidden_topics, escalation_triggers, language_style }
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS agent_config jsonb DEFAULT '{}'::jsonb;
