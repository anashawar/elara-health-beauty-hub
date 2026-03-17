import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, User, Phone, Save, LogOut, Globe, Calendar, Camera, Loader2, Sparkles } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/components/ui/sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import BottomNav from "@/components/layout/BottomNav";
import DesktopHeader from "@/components/layout/DesktopHeader";
import SearchOverlay from "@/components/SearchOverlay";
import { motion } from "framer-motion";
import { useLanguage, type Language } from "@/i18n/LanguageContext";


const SettingsPage = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t, language, setLanguage } = useLanguage();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState("");
  const [birthdate, setBirthdate] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("user_id", user!.id).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setPhone(profile.phone || "");
      setGender(profile.gender || "");
      setBirthdate(profile.birthdate || "");
      setAvatarPreview(profile.avatar_url || null);
    } else if (user) {
      setFullName(user.user_metadata?.full_name || "");
      setGender(user.user_metadata?.gender || "");
      setBirthdate(user.user_metadata?.birthdate || "");
    }
  }, [profile, user]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");
      const updatePayload = {
        full_name: fullName || null,
        phone: phone || null,
        gender: gender || null,
        birthdate: birthdate || null,
      };
      if (profile) {
        const { error } = await supabase.from("profiles").update(updatePayload).eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("profiles").insert({
          user_id: user.id,
          ...updatePayload,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast(t("settings.profileUpdated"));
    },
    onError: (e: any) => {
      console.error("Profile save error:", e);
      toast(e.message || "Failed to save profile");
    },
  });

  const handleSignOut = async () => { await signOut(); toast(t("profile.signedOut")); navigate("/home"); };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // On iOS, HEIC files may have empty type — allow them
    const isImage = file.type.startsWith("image/") || /\.(jpe?g|png|gif|webp|heic|heif)$/i.test(file.name);
    if (!isImage) { toast(t("settings.selectImageFile")); return; }
    if (file.size > 5 * 1024 * 1024) { toast(t("settings.imageTooLarge")); return; }

    setUploadingAvatar(true);
    try {
      // Convert to JPEG blob for consistent format (handles HEIC on iOS)
      const bitmap = await createImageBitmap(file);
      const canvas = document.createElement("canvas");
      const maxSize = 512;
      const scale = Math.min(maxSize / bitmap.width, maxSize / bitmap.height, 1);
      canvas.width = Math.round(bitmap.width * scale);
      canvas.height = Math.round(bitmap.height * scale);
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      bitmap.close();

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(b => b ? resolve(b) : reject(new Error("Failed to process image")), "image/jpeg", 0.85);
      });

      const filePath = `${user.id}/avatar.jpg`;

      // Delete ALL old files in user's avatar folder (handles old .gif, .png etc)
      try {
        const { data: existingFiles } = await supabase.storage.from("avatars").list(user.id);
        if (existingFiles && existingFiles.length > 0) {
          const filesToDelete = existingFiles.map(f => `${user.id}/${f.name}`);
          await supabase.storage.from("avatars").remove(filesToDelete);
        }
      } catch {
        // Ignore errors when listing/deleting old files
      }

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, blob, { upsert: true, contentType: "image/jpeg" });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(filePath);
      const avatarUrl = `${publicUrl}?t=${Date.now()}`;

      // Show preview immediately
      setAvatarPreview(avatarUrl);

      // Update profile with avatar URL
      if (profile) {
        const { error } = await supabase.from("profiles").update({ avatar_url: avatarUrl }).eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("profiles").insert({ user_id: user.id, avatar_url: avatarUrl });
        if (error) throw error;
      }

      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast(t("settings.photoUpdated") || "Profile photo updated!");
    } catch (err: any) {
      console.error("Avatar upload error:", err);
      toast(err.message || "Failed to upload photo");
      // Revert preview on error
      setAvatarPreview(profile?.avatar_url || null);
    } finally {
      setUploadingAvatar(false);
      // Reset file input so same file can be re-selected
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
        fileInputRef.current.type = "text";
        fileInputRef.current.type = "file";
      }
    }
  };

  const languages: { code: Language; label: string; native: string }[] = [
    { code: "en", label: t("settings.english"), native: "English" },
    { code: "ar", label: t("settings.arabic"), native: "العربية" },
    { code: "ku", label: t("settings.kurdish"), native: "کوردی" },
  ];

  const { currentIcon, switchIcon, switching } = useAppIcon();

  if (authLoading) return null;

  const LanguageSelector = () => (
    <div className="bg-card rounded-2xl p-4 shadow-premium">
      <div className="flex items-center gap-2 mb-3">
        <Globe className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-bold text-foreground">{t("settings.language")}</h3>
      </div>
      <div className="flex gap-2">
        {languages.map(lang => (
          <button key={lang.code} onClick={() => setLanguage(lang.code)}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-semibold border transition-all ${language === lang.code ? "bg-primary text-primary-foreground border-primary" : "bg-card text-foreground border-border hover:border-primary/50"}`}
          >{lang.native}</button>
        ))}
      </div>
    </div>
  );

  if (!user) {
    return (
      <div className="min-h-screen bg-background pb-24 md:pb-8">
        <DesktopHeader onSearchClick={() => setSearchOpen(true)} />
        <SearchOverlay isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
        <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-lg border-b border-border md:hidden">
          <div className="flex items-center gap-3 px-4 py-3">
            <Link to="/profile" className="p-1"><ArrowLeft className="w-5 h-5 text-foreground rtl:rotate-180" /></Link>
            <h1 className="text-lg font-display font-bold text-foreground">{t("settings.title")}</h1>
          </div>
        </header>
        <div className="app-container">
          <div className="flex flex-col items-center justify-center py-20 px-4">
            <User className="w-16 h-16 text-muted-foreground/30 mb-4" />
            <p className="text-sm text-muted-foreground mb-4">{t("settings.signInToManage")}</p>
            <Link to="/auth" className="px-6 py-3 bg-primary text-primary-foreground font-semibold rounded-xl text-sm">{t("common.signIn")}</Link>
          </div>
          <div className="mx-4 md:mx-6 mt-4"><LanguageSelector /></div>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-8">
      <DesktopHeader onSearchClick={() => setSearchOpen(true)} />
      <SearchOverlay isOpen={searchOpen} onClose={() => setSearchOpen(false)} />

      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-lg border-b border-border md:hidden">
        <div className="flex items-center gap-3 px-4 py-3">
          <Link to="/profile" className="p-1"><ArrowLeft className="w-5 h-5 text-foreground rtl:rotate-180" /></Link>
          <h1 className="text-lg font-display font-bold text-foreground">{t("settings.title")}</h1>
        </div>
      </header>

      <div className="app-container">
        <div className="hidden md:flex items-center gap-2 px-6 pt-6 pb-2">
          <Link to="/profile" className="text-sm text-muted-foreground hover:text-foreground">← {t("profile.title")}</Link>
          <span className="text-sm text-muted-foreground">/</span>
          <h1 className="text-lg font-display font-bold text-foreground">{t("settings.title")}</h1>
        </div>

        <div className="md:max-w-2xl">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="px-4 md:px-6 mt-4 space-y-4">
              <LanguageSelector />

              {/* Avatar Upload */}
              <div className="bg-card rounded-2xl p-4 shadow-premium flex flex-col items-center gap-3">
                <div className="relative">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-accent overflow-hidden flex items-center justify-center">
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-3xl">👤</span>
                    )}
                  </div>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingAvatar}
                    className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md hover:opacity-90 transition-opacity"
                  >
                    {uploadingAvatar ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                  />
                </div>
                <p className="text-xs text-muted-foreground">{t("settings.changePhoto")}</p>
              </div>

              <div className="bg-card rounded-2xl p-4 shadow-premium space-y-4">
                <h3 className="text-sm font-bold text-foreground">{t("settings.profileInfo")}</h3>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">{t("auth.email")}</label>
                  <div className="h-11 px-4 rounded-xl bg-muted flex items-center">
                    <span className="text-sm text-muted-foreground">{user.email}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">{t("auth.fullName")}</label>
                  <div className="relative">
                    <User className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input value={fullName} onChange={e => setFullName(e.target.value)} placeholder={t("settings.yourName")} className="ps-10 h-11 rounded-xl bg-secondary border-border text-sm" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">{t("auth.phoneNumber")}</label>
                  <div className="relative">
                    <Phone className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+964 XXX XXX XXXX" type="tel" className="ps-10 h-11 rounded-xl bg-secondary border-border text-sm" />
                  </div>
                </div>

                {/* Gender */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">{t("auth.gender") || "Gender"}</label>
                  <div className="flex gap-2">
                    {[
                      { value: "female", label: t("auth.female") || "Female", emoji: "👩" },
                      { value: "male", label: t("auth.male") || "Male", emoji: "👨" },
                    ].map(g => (
                      <button
                        key={g.value}
                        type="button"
                        onClick={() => setGender(g.value)}
                        className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-semibold border transition-all flex items-center justify-center gap-2 ${
                          gender === g.value
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-card text-foreground border-border hover:border-primary/50"
                        }`}
                      >
                        <span>{g.emoji}</span>
                        {g.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Birthdate */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">{t("auth.birthdate") || "Date of Birth"}</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="date"
                      value={birthdate}
                      onChange={e => setBirthdate(e.target.value)}
                      max={new Date().toISOString().split("T")[0]}
                      className="ps-10 h-11 rounded-xl bg-secondary border-border text-sm"
                    />
                  </div>
                </div>
                <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="w-full h-11 rounded-xl text-sm font-semibold gap-2">
                  <Save className="w-4 h-4" />
                  {saveMutation.isPending ? t("auth.saving") : t("settings.saveChanges")}
                </Button>
              </div>


              <div className="bg-card rounded-2xl shadow-premium overflow-hidden">
                <button onClick={handleSignOut} className="w-full flex items-center gap-3 px-4 py-4 hover:bg-destructive/5 transition-colors text-destructive">
                  <LogOut className="w-5 h-5" />
                  <span className="text-sm font-medium">{t("common.signOut")}</span>
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default SettingsPage;
