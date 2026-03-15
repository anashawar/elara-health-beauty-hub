import { useState, useCallback, useRef } from "react";
import { Languages, Play, Pause, CheckCircle2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

const AdminTranslate = () => {
  const [running, setRunning] = useState(false);
  const [total] = useState(2848);
  const [translated, setTranslated] = useState(0);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const stopRef = useRef(false);

  const runBatch = useCallback(async () => {
    setRunning(true);
    setError(null);
    stopRef.current = false;
    let batchCount = 0;

    while (!stopRef.current) {
      try {
        const { data, error: fnError } = await supabase.functions.invoke("translate-products", {
          body: { offset: 0, limit: 3 },
        });

        if (fnError) {
          setError(fnError.message);
          break;
        }

        if (data.error) {
          setError(data.error);
          break;
        }

        batchCount += data.translated || 0;
        setTranslated(prev => prev + (data.translated || 0));
        setRemaining(data.remaining);

        if (data.done || data.remaining === 0) {
          setDone(true);
          break;
        }

        // Small delay to avoid rate limiting
        await new Promise(r => setTimeout(r, 500));
      } catch (e: any) {
        setError(e.message);
        break;
      }
    }

    setRunning(false);
  }, []);

  const stop = () => {
    stopRef.current = true;
  };

  const progress = remaining !== null ? ((total - remaining) / total) * 100 : (translated / total) * 100;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Languages className="w-6 h-6" />
          Bulk Product Translation
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Automatically translate all product data into Arabic and Kurdish using AI
        </p>
      </div>

      <div className="bg-card rounded-xl p-6 border">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm font-medium">Progress</p>
            <p className="text-xs text-muted-foreground">
              {remaining !== null
                ? `${total - remaining} / ${total} products translated`
                : `${translated} translated so far`}
            </p>
          </div>
          {done && (
            <div className="flex items-center gap-2 text-emerald-600">
              <CheckCircle2 className="w-5 h-5" />
              <span className="text-sm font-bold">Complete!</span>
            </div>
          )}
        </div>

        <Progress value={progress} className="h-3 mb-4" />

        {error && (
          <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          {!running ? (
            <Button onClick={runBatch} disabled={done} className="gap-2">
              <Play className="w-4 h-4" />
              {translated > 0 ? "Resume Translation" : "Start Translation"}
            </Button>
          ) : (
            <Button onClick={stop} variant="outline" className="gap-2">
              <Pause className="w-4 h-4" />
              Pause
            </Button>
          )}
          {running && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              Translating batch of 3 products...
            </div>
          )}
        </div>
      </div>

      <div className="bg-card rounded-xl p-6 border">
        <h3 className="font-semibold mb-2">How it works</h3>
        <ul className="text-sm text-muted-foreground space-y-1.5 list-disc list-inside">
          <li>AI translates product titles, descriptions, benefits, and usage instructions</li>
          <li>Brand names are preserved in English</li>
          <li>Arabic and Kurdish (Sorani) translations are created</li>
          <li>Products are processed in batches of 3 to avoid timeouts</li>
          <li>You can pause and resume at any time — already translated products are skipped</li>
        </ul>
      </div>
    </div>
  );
};

export default AdminTranslate;
