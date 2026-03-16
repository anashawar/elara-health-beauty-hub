
-- Support conversations table
CREATE TABLE public.support_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  subject text NOT NULL DEFAULT 'General Support',
  status text NOT NULL DEFAULT 'open',
  last_message_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Support messages table
CREATE TABLE public.support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.support_conversations(id) ON DELETE CASCADE,
  sender_type text NOT NULL DEFAULT 'user',
  sender_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.support_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

-- RLS policies for support_conversations
CREATE POLICY "Users can view their own support conversations"
  ON public.support_conversations FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own support conversations"
  ON public.support_conversations FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all support conversations"
  ON public.support_conversations FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update support conversations"
  ON public.support_conversations FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS policies for support_messages
CREATE POLICY "Users can view messages in their conversations"
  ON public.support_messages FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.support_conversations
    WHERE support_conversations.id = support_messages.conversation_id
    AND support_conversations.user_id = auth.uid()
  ));

CREATE POLICY "Users can send messages in their conversations"
  ON public.support_messages FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.support_conversations
    WHERE support_conversations.id = support_messages.conversation_id
    AND support_conversations.user_id = auth.uid()
  ) AND sender_type = 'user');

CREATE POLICY "Admins can view all support messages"
  ON public.support_messages FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can send messages in any conversation"
  ON public.support_messages FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') AND sender_type = 'admin');

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_conversations;

-- Indexes
CREATE INDEX idx_support_conversations_user_id ON public.support_conversations(user_id);
CREATE INDEX idx_support_conversations_status ON public.support_conversations(status);
CREATE INDEX idx_support_messages_conversation_id ON public.support_messages(conversation_id);
