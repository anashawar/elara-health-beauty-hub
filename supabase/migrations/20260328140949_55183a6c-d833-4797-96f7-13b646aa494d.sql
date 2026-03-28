
CREATE TABLE public.app_config (
  id text PRIMARY KEY DEFAULT 'main',
  min_ios_version text NOT NULL DEFAULT '1.0.0',
  min_android_version text NOT NULL DEFAULT '1.0.0',
  update_message text DEFAULT 'A new version of ELARA is available. Please update to continue.',
  update_message_ar text DEFAULT 'إصدار جديد من ELARA متاح. يرجى التحديث للمتابعة.',
  update_message_ku text DEFAULT 'وەشانێکی نوێی ELARA بەردەستە. تکایە نوێ بکەرەوە بۆ بەردەوامبوون.',
  ios_store_url text DEFAULT 'https://apps.apple.com/us/app/elara-beauty-health/id6761014159',
  android_store_url text DEFAULT 'https://play.google.com/store/apps/details?id=com.elarashop.app',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read app config"
ON public.app_config FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Admins can update app config"
ON public.app_config FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.app_config (id, min_ios_version, min_android_version) 
VALUES ('main', '1.0.0', '1.0.0');
