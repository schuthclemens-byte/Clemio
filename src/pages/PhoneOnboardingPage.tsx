import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Phone, Search, Users } from "lucide-react";
import CountryCodePicker, { detectCountryFromBrowser, type Country } from "@/components/auth/CountryCodePicker";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { isValidAuthPhone, normalizePhone } from "@/lib/authPhone";
import { toast } from "sonner";

const PhoneOnboardingPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [country, setCountry] = useState<Country>(detectCountryFromBrowser);
  const [localNumber, setLocalNumber] = useState("");
  const [saving, setSaving] = useState(false);

  const phoneDigits = localNumber.replace(/\D/g, "");
  const normalizedLocal = country.dial && phoneDigits.startsWith("0") ? phoneDigits.slice(1) : phoneDigits;
  const phone = `${country.dial}${normalizedLocal}`;

  const continueToApp = () => navigate("/chats", { replace: true });

  const skipForNow = () => {
    if (user) sessionStorage.setItem(`clemio_phone_prompt_skipped_${user.id}`, "true");
    continueToApp();
  };

  const savePhone = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user) return;

    if (!isValidAuthPhone(phone)) {
      toast.error("Bitte gib eine gültige Telefonnummer ein");
      return;
    }

    setSaving(true);
    const cleanPhone = `+${normalizePhone(phone)}`;
    const { error } = await supabase
      .from("profiles")
      .update({ phone_number: cleanPhone } as any)
      .eq("id", user.id);

    setSaving(false);
    if (error) {
      toast.error("Telefonnummer konnte nicht gespeichert werden");
      return;
    }

    sessionStorage.removeItem(`clemio_phone_prompt_skipped_${user.id}`);
    toast.success("Telefonnummer gespeichert");
    continueToApp();
  };

  return (
    <main className="min-h-screen bg-background text-foreground flex items-center justify-center px-5 py-8">
      <section className="w-full max-w-md space-y-8">
        <div className="space-y-5 text-center">
          <div className="mx-auto h-16 w-16 rounded-3xl bg-primary/10 text-primary flex items-center justify-center shadow-soft">
            <Phone className="h-7 w-7" />
          </div>
          <div className="space-y-3">
            <h1 className="text-3xl font-extrabold tracking-normal">Werde gefunden</h1>
            <p className="text-base leading-relaxed text-muted-foreground">
              Füge deine Telefonnummer hinzu, damit dich Freunde auf Clemio finden und deine Stimme hören können.
            </p>
            <p className="text-sm font-semibold text-foreground">
              Ohne Nummer bist du für Freunde nicht auffindbar.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-2xl bg-card border border-border p-4 space-y-2">
            <Search className="h-5 w-5 text-primary" />
            <p className="font-semibold">Kontakte finden</p>
          </div>
          <div className="rounded-2xl bg-card border border-border p-4 space-y-2">
            <Users className="h-5 w-5 text-primary" />
            <p className="font-semibold">Verbinden</p>
          </div>
        </div>

        <form onSubmit={savePhone} className="space-y-4">
          <div className="flex">
            <CountryCodePicker selected={country} onSelect={setCountry} />
            <input
              value={localNumber}
              onChange={(event) => setLocalNumber(event.target.value)}
              inputMode="tel"
              autoComplete="tel-national"
              placeholder="Telefonnummer"
              className="h-14 min-w-0 flex-1 rounded-r-2xl border border-border bg-card px-4 text-base outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <Button type="submit" disabled={saving} className="w-full h-14 rounded-2xl text-base font-bold gap-2">
            Telefonnummer hinzufügen
            <ArrowRight className="h-5 w-5" />
          </Button>

          <button
            type="button"
            onClick={skipForNow}
            className="mx-auto block px-4 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            Später
          </button>
        </form>
      </section>
    </main>
  );
};

export default PhoneOnboardingPage;