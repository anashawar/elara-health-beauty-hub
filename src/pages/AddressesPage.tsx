import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Plus, MapPin, Trash2, Star, Edit2, X } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/components/ui/sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import BottomNav from "@/components/layout/BottomNav";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "@/i18n/LanguageContext";

const cities = ["Baghdad", "Erbil", "Basra", "Sulaymaniyah", "Najaf", "Karbala", "Kirkuk", "Mosul", "Duhok"];

interface AddressForm {
  label: string;
  city: string;
  area: string;
  street: string;
  building: string;
  floor: string;
  phone: string;
}

const emptyForm: AddressForm = { label: "Home", city: "", area: "", street: "", building: "", floor: "", phone: "" };

const AddressesPage = () => {
  const { user, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<AddressForm>(emptyForm);

  const { data: addresses = [], isLoading } = useQuery({
    queryKey: ["addresses", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("addresses")
        .select("*")
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const saveMutation = useMutation({
    mutationFn: async (data: AddressForm & { id?: string }) => {
      if (!user) throw new Error("Not authenticated");
      const payload = {
        user_id: user.id,
        label: data.label,
        city: data.city,
        area: data.area || null,
        street: data.street || null,
        building: data.building || null,
        floor: data.floor || null,
        phone: data.phone || null,
      };
      if (data.id) {
        const { error } = await supabase.from("addresses").update(payload).eq("id", data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("addresses").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["addresses"] });
      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm);
      toast(t("addresses.addressSaved"));
    },
    onError: (e: any) => toast(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("addresses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["addresses"] });
      toast(t("addresses.addressDeleted"));
    },
  });

  const setDefaultMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!user) return;
      await supabase.from("addresses").update({ is_default: false }).eq("user_id", user.id);
      const { error } = await supabase.from("addresses").update({ is_default: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["addresses"] });
      toast(t("addresses.defaultUpdated"));
    },
  });

  const handleEdit = (addr: any) => {
    setForm({
      label: addr.label || "Home",
      city: addr.city,
      area: addr.area || "",
      street: addr.street || "",
      building: addr.building || "",
      floor: addr.floor || "",
      phone: addr.phone || "",
    });
    setEditingId(addr.id);
    setShowForm(true);
  };

  const handleSave = () => {
    if (!form.city) {
      toast(t("auth.selectCity"));
      return;
    }
    saveMutation.mutate({ ...form, id: editingId || undefined });
  };

  const labelMap: Record<string, string> = {
    Home: t("addresses.home"),
    Work: t("addresses.work"),
    Other: t("addresses.other"),
  };

  if (authLoading) return null;

  if (!user) {
    return (
      <div className="min-h-screen bg-background pb-24 max-w-lg mx-auto">
        <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-lg border-b border-border">
          <div className="flex items-center gap-3 px-4 py-3">
            <Link to="/profile" className="p-1"><ArrowLeft className="w-5 h-5 text-foreground rtl:rotate-180" /></Link>
            <h1 className="text-lg font-display font-bold text-foreground">{t("addresses.title")}</h1>
          </div>
        </header>
        <div className="flex flex-col items-center justify-center py-20 px-4">
          <MapPin className="w-16 h-16 text-muted-foreground/30 mb-4" />
          <p className="text-sm text-muted-foreground mb-4">{t("addresses.signInToManage")}</p>
          <Link to="/auth" className="px-6 py-3 bg-primary text-primary-foreground font-semibold rounded-xl text-sm">{t("common.signIn")}</Link>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24 max-w-lg mx-auto">
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-lg border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Link to="/profile" className="p-1"><ArrowLeft className="w-5 h-5 text-foreground rtl:rotate-180" /></Link>
            <h1 className="text-lg font-display font-bold text-foreground">{t("addresses.title")}</h1>
          </div>
          {!showForm && (
            <button
              onClick={() => { setForm(emptyForm); setEditingId(null); setShowForm(true); }}
              className="p-2 rounded-xl bg-primary/10 text-primary"
            >
              <Plus className="w-5 h-5" />
            </button>
          )}
        </div>
      </header>

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mx-4 mt-4 bg-card rounded-2xl p-4 shadow-premium overflow-hidden"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-foreground">{editingId ? t("addresses.editAddress") : t("addresses.newAddress")}</h3>
              <button onClick={() => { setShowForm(false); setEditingId(null); }}>
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex gap-2">
                {["Home", "Work", "Other"].map(l => (
                  <button
                    key={l}
                    onClick={() => setForm(f => ({ ...f, label: l }))}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${
                      form.label === l ? "bg-primary text-primary-foreground border-primary" : "bg-card text-foreground border-border"
                    }`}
                  >
                    {labelMap[l] || l}
                  </button>
                ))}
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t("auth.city")} *</label>
                <div className="grid grid-cols-3 gap-2">
                  {cities.map(c => (
                    <button
                      key={c}
                      onClick={() => setForm(f => ({ ...f, city: c }))}
                      className={`py-2 px-2 text-[11px] font-medium rounded-lg border transition-all ${
                        form.city === c ? "bg-primary text-primary-foreground border-primary" : "bg-card text-foreground border-border"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              <Input value={form.area} onChange={e => setForm(f => ({ ...f, area: e.target.value }))} placeholder={t("auth.area")} className="h-11 rounded-xl bg-secondary border-border text-sm" />
              <Input value={form.street} onChange={e => setForm(f => ({ ...f, street: e.target.value }))} placeholder={t("auth.streetPlaceholder")} className="h-11 rounded-xl bg-secondary border-border text-sm" />
              <div className="grid grid-cols-2 gap-3">
                <Input value={form.building} onChange={e => setForm(f => ({ ...f, building: e.target.value }))} placeholder={t("auth.building")} className="h-11 rounded-xl bg-secondary border-border text-sm" />
                <Input value={form.floor} onChange={e => setForm(f => ({ ...f, floor: e.target.value }))} placeholder={t("auth.floor")} className="h-11 rounded-xl bg-secondary border-border text-sm" />
              </div>
              <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder={t("auth.phoneNumber")} type="tel" className="h-11 rounded-xl bg-secondary border-border text-sm" />

              <Button onClick={handleSave} disabled={saveMutation.isPending} className="w-full h-11 rounded-xl text-sm font-semibold">
                {saveMutation.isPending ? t("auth.saving") : editingId ? t("addresses.updateAddress") : t("addresses.saveAddress")}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : addresses.length === 0 && !showForm ? (
        <div className="flex flex-col items-center justify-center py-20 px-4">
          <MapPin className="w-16 h-16 text-muted-foreground/30 mb-4" />
          <p className="text-base font-semibold text-foreground mb-1">{t("addresses.noAddresses")}</p>
          <p className="text-sm text-muted-foreground mb-4">{t("addresses.addFirst")}</p>
          <button
            onClick={() => setShowForm(true)}
            className="px-6 py-3 bg-primary text-primary-foreground font-semibold rounded-xl text-sm"
          >
            {t("addresses.addAddress")}
          </button>
        </div>
      ) : (
        <div className="px-4 mt-4 space-y-3">
          {addresses.map((addr, idx) => (
            <motion.div
              key={addr.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className={`bg-card rounded-2xl p-4 shadow-premium border-2 transition-colors ${
                addr.is_default ? "border-primary/40" : "border-transparent"
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-foreground bg-secondary px-2.5 py-1 rounded-lg">
                    {labelMap[addr.label || ""] || addr.label || t("addresses.title")}
                  </span>
                  {addr.is_default && (
                    <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">{t("addresses.default")}</span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => handleEdit(addr)} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
                    <Edit2 className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                  <button onClick={() => deleteMutation.mutate(addr.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors">
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </button>
                </div>
              </div>
              <p className="text-sm text-foreground">{addr.city}</p>
              <p className="text-xs text-muted-foreground">
                {[addr.area, addr.street, addr.building, addr.floor].filter(Boolean).join(", ")}
              </p>
              {addr.phone && <p className="text-xs text-muted-foreground mt-1">📞 {addr.phone}</p>}
              {!addr.is_default && (
                <button
                  onClick={() => setDefaultMutation.mutate(addr.id)}
                  className="mt-3 flex items-center gap-1.5 text-xs text-primary font-medium"
                >
                  <Star className="w-3.5 h-3.5" /> {t("addresses.setAsDefault")}
                </button>
              )}
            </motion.div>
          ))}
        </div>
      )}

      <BottomNav />
    </div>
  );
};

export default AddressesPage;
