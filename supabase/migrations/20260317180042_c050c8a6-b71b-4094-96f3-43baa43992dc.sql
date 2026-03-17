
-- Add resolution, rating, and feedback columns to support_conversations
ALTER TABLE public.support_conversations 
  ADD COLUMN IF NOT EXISTS resolution TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS rating INTEGER DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS feedback TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS closed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Users can update resolution/rating/feedback on their own conversations (already have UPDATE policy)
