import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, User, Phone, Save, LogOut, Globe, Calendar, Camera, Loader2, Trash2, AlertTriangle, ShieldAlert, KeyRound, Mail, Pencil } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
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
import { useMemo } from "react";

/* ─── Birthdate Picker (3 dropdowns: Day / Month / Year) ─── */
function BirthdatePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { t } = useLanguage();
  const today = new Date();
  const currentYear = today.getFullYear();

  // Track partial selections internally so dropdowns don't reset
  const [localYear, setLocalYear] = useState("");
  const [localMonth, setLocalMonth] = useState("");
  const [localDay, setLocalDay] = useState("");
  const initializedRef = useRef(false);

  // Sync from prop on first load or when value changes externally
  useEffect(() => {
    if (value && value.includes("-")) {
      const [y, m, d] = value.split("-");
      setLocalYear(y || "");
      setLocalMonth(m || "");
      setLocalDay(d || "");
      initializedRef.current = true;
    } else if (!value && initializedRef.current) {
      setLocalYear("");
      setLocalMonth("");
      setLocalDay("");
    }
  }, [value]);

  const years = useMemo(() => {
    const arr: number[] = [];
    for (let y = currentYear; y >= currentYear - 100; y--) arr.push(y);
    return arr;
  }, [currentYear]);

  const months = useMemo(() =>
    Array.from({ length: 12 }, (_, i) => ({
      value: String(i + 1).padStart(2, "0"),
      label: new Date(2000, i).toLocaleString(undefined, { month: "long" }),
    })), []);

  const daysInMonth = useMemo(() => {
    if (!localYear || !localMonth) return 31;
    return new Date(Number(localYear), Number(localMonth), 0).getDate();
  }, [localYear, localMonth]);

  const handleChange = (field: "year" | "month" | "day", val: string) => {
    let nextYear = localYear, nextMonth = localMonth, nextDay = localDay;
    if (field === "year") { nextYear = val; setLocalYear(val); }
    if (field === "month") { nextMonth = val; setLocalMonth(val); }
    if (field === "day") { nextDay = val; setLocalDay(val); }

    if (nextYear && nextMonth && nextDay) {
      const maxDay = new Date(Number(nextYear), Number(nextMonth), 0).getDate();
      if (Number(nextDay) > maxDay) {
        nextDay = String(maxDay).padStart(2, "0");
        setLocalDay(nextDay);
      }
      onChange(`${nextYear}-${nextMonth}-${nextDay}`);
    }
  };

  const selectClass = "h-11 flex-1 rounded-xl bg-secondary border border-border text-sm px-3 text-foreground appearance-none";

  return (
    <div className="flex gap-2">
      <select value={localDay} onChange={e => handleChange("day", e.target.value)} className={selectClass}>
        <option value="">{t("auth.day") || "Day"}</option>
        {Array.from({ length: daysInMonth }, (_, i) => {
          const d = String(i + 1).padStart(2, "0");
          return <option key={d} value={d}>{i + 1}</option>;
        })}
      </select>
      <select value={localMonth} onChange={e => handleChange("month", e.target.value)} className={selectClass}>
        <option value="">{t("auth.month") || "Month"}</option>
        {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
      </select>
      <select value={localYear} onChange={e => handleChange("year", e.target.value)} className={selectClass}>
        <option value="">{t("auth.year") || "Year"}</option>
        {years.map(y => <option key={y} value={y}>{y}</option>)}
      </select>
    </div>
  );
}

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
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [emailUpdating, setEmailUpdating] = useState(false);
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

  // Only sync from profile/user once profile query has settled (not undefined)
  const profileLoaded = profile !== undefined;
  useEffect(() => {
    if (!user || !profileLoaded) return;

    setFullName(profile?.full_name || user.user_metadata?.full_name || "");
    setPhone(profile?.phone || user.phone || user.user_metadata?.phone || "");
    setGender(profile?.gender || user.user_metadata?.gender || "");
    setBirthdate(profile?.birthdate || user.user_metadata?.birthdate || "");
    setAvatarPreview(profile?.avatar_url || null);
  }, [profile, user, profileLoaded]);

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
                  <div className="h-11 px-4 rounded-xl bg-muted flex items-center justify-between">
                    <span className="text-sm text-muted-foreground truncate">{user.email}</span>
                    <button
                      onClick={() => setEmailDialogOpen(true)}
                      className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors shrink-0 ms-2"
                    >
                      <Pencil className="w-3 h-3" />
                      {t("settings.changeEmail")}
                    </button>
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
                  <BirthdatePicker value={birthdate} onChange={setBirthdate} />
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

              {/* Delete Account - Multi-step */}
              <DeleteAccountSection user={user} phone={phone} signOut={signOut} navigate={navigate} t={t} />
            </motion.div>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

/* ─── Delete Account Multi-Step Flow ─── */
function DeleteAccountSection({ user, phone, signOut, navigate, t }: { user: any; phone: string; signOut: () => Promise<void>; navigate: (path: string) => void; t: (key: string) => string }) {
  const [step, setStep] = useState<"idle" | "confirm" | "otp">("idle");
  const [otp, setOtp] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);

  const userPhone = phone || user?.phone || user?.user_metadata?.phone || "";

  // Normalize phone to +964 format
  const normalizePhone = (p: string) => {
    let n = p.replace(/[\s\-()]/g, "");
    if (n.startsWith("00964")) n = "+" + n.slice(2);
    if (n.startsWith("0964")) n = "+" + n;
    if (n.startsWith("964")) n = "+" + n;
    if (n.startsWith("07")) n = "+964" + n.slice(1);
    if (!n.startsWith("+")) n = "+964" + n;
    return n;
  };

  const openFlow = () => {
    setStep("confirm");
    setOtp("");
  };

  const proceedToOtp = async () => {
    if (!userPhone) {
      toast(t("settings.noPhoneForOtp") || "No phone number found on your account. Please add a phone number first.");
      return;
    }
    setSendingOtp(true);
    try {
      const normalized = normalizePhone(userPhone);
      const { data, error } = await supabase.functions.invoke("send-otp", {
        body: { phone: normalized },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setStep("otp");
      const masked = normalized.slice(0, 4) + "****" + normalized.slice(-3);
      toast(t("settings.otpSentWhatsApp") || `Verification code sent to ${masked} via WhatsApp`);
    } catch (err: any) {
      console.error("Send OTP error:", err);
      toast(err.message || "Failed to send verification code. Please try again.");
    } finally {
      setSendingOtp(false);
    }
  };

  const handleDelete = async () => {
    if (otp.length !== 6) return;
    setDeleting(true);
    try {
      // Verify OTP first
      const normalized = normalizePhone(userPhone);
      const { data: verifyData, error: verifyError } = await supabase.functions.invoke("verify-otp", {
        body: { phone: normalized, code: otp },
      });
      if (verifyError) throw verifyError;
      if (verifyData?.error) throw new Error(verifyData.error);
      if (!verifyData?.valid) {
        toast(t("settings.incorrectCode") || "Incorrect verification code. Please try again.");
        setDeleting(false);
        return;
      }

      // OTP verified, proceed with deletion
      const { data, error } = await supabase.functions.invoke("delete-account");
      if (error) throw error;
      try { await signOut(); } catch (_) { /* ignore */ }
      try { localStorage.removeItem("sb-mycpfwnfvtsgshdzggrm-auth-token"); } catch (_) { /* ignore */ }
      toast(t("settings.accountDeleted") || "Your account has been permanently deleted. We're sorry to see you go.");
      window.location.href = "/home";
    } catch (err: any) {
      console.error("Account deletion error:", err);
      toast(err.message || "Something went wrong. Please try again later.");
      setDeleting(false);
    }
  };

  const close = () => { setStep("idle"); setOtp(""); };

  return (
    <>
      <div className="bg-card rounded-2xl shadow-premium overflow-hidden">
        <button onClick={openFlow} className="w-full flex items-center gap-3 px-4 py-4 hover:bg-destructive/5 transition-colors text-destructive/70">
          <Trash2 className="w-5 h-5" />
          <div className="flex flex-col items-start">
            <span className="text-sm font-medium">Delete Account</span>
            <span className="text-[11px] text-muted-foreground">Permanently remove your account and all data</span>
          </div>
        </button>
      </div>

      {/* Step 1: Confirmation */}
      <AlertDialog open={step === "confirm"} onOpenChange={(open) => !open && close()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="mx-auto w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mb-2">
              <AlertTriangle className="w-7 h-7 text-destructive" />
            </div>
            <AlertDialogTitle className="text-center text-lg">
              {t("settings.deleteAccountTitle") || "Are you sure you want to delete your account?"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center space-y-3">
              <p>{t("settings.deleteAccountWarning") || "This action is permanent and cannot be reversed. Once deleted, there is no way to recover your account."}</p>
              <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-3 text-start space-y-1.5">
                <p className="text-xs font-semibold text-destructive flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  {t("settings.whatGetsDeleted") || "The following will be permanently deleted:"}
                </p>
                <ul className="text-xs text-muted-foreground space-y-1 ps-5 list-disc">
                  <li>{t("settings.deleteItem1") || "Your personal profile and account information"}</li>
                  <li>{t("settings.deleteItem2") || "Order history and saved addresses"}</li>
                  <li>{t("settings.deleteItem3") || "Wishlist, cart items, and preferences"}</li>
                  <li>{t("settings.deleteItem4") || "Skin analysis history and AI chat conversations"}</li>
                  <li>{t("settings.deleteItem5") || "Loyalty points and rewards"}</li>
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-col gap-2">
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 w-full"
              disabled={sendingOtp}
              onClick={(e) => { e.preventDefault(); proceedToOtp(); }}
            >
              {sendingOtp
                ? <><Loader2 className="w-4 h-4 animate-spin me-2" />{t("settings.sendingCode") || "Sending verification code..."}</>
                : t("settings.continueDelete") || "I understand, continue with deletion"
              }
            </AlertDialogAction>
            <AlertDialogCancel className="w-full mt-0">
              {t("settings.keepAccount") || "No, keep my account"}
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Step 2: OTP Verification */}
      <AlertDialog open={step === "otp"} onOpenChange={(open) => !open && close()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-2">
              <KeyRound className="w-7 h-7 text-primary" />
            </div>
            <AlertDialogTitle className="text-center text-lg">
              {t("settings.verifyIdentity") || "Verify your identity"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              <p>{t("settings.otpSentDescWhatsApp") || "We sent a 6-digit verification code to your phone via WhatsApp. Enter it below to confirm account deletion."}</p>
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="flex justify-center my-4">
            <InputOTP maxLength={6} value={otp} onChange={setOtp}>
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
          </div>

          <AlertDialogFooter className="flex-col sm:flex-col gap-2">
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 w-full"
              disabled={otp.length !== 6 || deleting}
              onClick={(e) => { e.preventDefault(); handleDelete(); }}
            >
              {deleting
                ? <><Loader2 className="w-4 h-4 animate-spin me-2" />{t("settings.deletingAccount") || "Deleting account..."}</>
                : t("settings.permanentlyDelete") || "Permanently delete my account"
              }
            </AlertDialogAction>
            <AlertDialogCancel className="w-full mt-0" onClick={close}>
              {t("common.cancel") || "Cancel"}
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default SettingsPage;
