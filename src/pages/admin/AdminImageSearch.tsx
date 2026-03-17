import { useState, useCallback, useEffect, useRef } from "react";
import { ImagePlus, Play, Pause, CheckCircle2, Loader2, RotateCcw, XCircle, Image, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

const BATCH_SIZE = 5;
const MAX_RETRIES = 3;
const RETRY_DELAY = 3000;
const MAX_CONSECUTIVE_BATCH_FAILURES = 5;
const STORAGE_KEY = "admin-image-search-session-v2";

interface ResultEntry {
  id: string;
  status: string;
  title?: string;
  url?: string;
  topScore?: number;
  error?: string;
}

interface PersistedSession {
  scanOffset: number;
  totalProducts: number | null;
  totalMissing: number | null;
  processed: number;
  found: number;
  failed: number;
  done: boolean;
  recentResults: ResultEntry[];
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function loadSession(): PersistedSession | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PersistedSession;
  } catch {
    return null;
  }
}

function saveSession(session: PersistedSession) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    // Ignore persistence failures
  }
}

function clearSession() {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore persistence failures
  }
}

const AdminImageSearch = () => {
  const initialSession = useRef(loadSession()).current;
  const [running, setRunning] = useState(false);
  const [totalMissing, setTotalMissing] = useState<number | null>(initialSession?.totalMissing ?? null);
  const [totalProducts, setTotalProducts] = useState<number | null>(initialSession?.totalProducts ?? null);
  const [scanOffset, setScanOffset] = useState(initialSession?.scanOffset ?? 0);
  const [processed, setProcessed] = useState(initialSession?.processed ?? 0);
  const [found, setFound] = useState(initialSession?.found ?? 0);
  const [failed, setFailed] = useState(initialSession?.failed ?? 0);
  const [done, setDone] = useState(initialSession?.done ?? false);
  const [error, setError] = useState<string | null>(null);
  const [recentResults, setRecentResults] = useState<ResultEntry[]>(initialSession?.recentResults ?? []);
  const [retryCount, setRetryCount] = useState(0);
  const stopRef = useRef(false);
  const offsetRef = useRef(scanOffset);
  const consecutiveFailureRef = useRef(0);

  useEffect(() => {
    offsetRef.current = scanOffset;
  }, [scanOffset]);

  useEffect(() => {
    saveSession({
      scanOffset,
      totalProducts,
      totalMissing,
      processed,
      found,
      failed,
      done,
      recentResults,
    });
  }, [scanOffset, totalProducts, totalMissing, processed, found, failed, done, recentResults]);

  const invokeBatch = async (attempt = 0): Promise<any> => {
    try {
      const resp = await supabase.functions.invoke("search-product-images", {
        body: {
          batch_size: BATCH_SIZE,
          scan_offset: offsetRef.current,
        },
      });

      if (resp.error) {
        throw new Error(resp.error.message || "Edge function failed");
      }

      return resp.data;
    } catch (err: any) {
      if (attempt < MAX_RETRIES && !stopRef.current) {
        setRetryCount(attempt + 1);
        setError(`Request failed, retrying (${attempt + 1}/${MAX_RETRIES})...`);
        await sleep(RETRY_DELAY * (attempt + 1));
        return invokeBatch(attempt + 1);
      }
      throw err;
    }
  };

  const runBatch = useCallback(async () => {
    setRunning(true);
    setError(null);
    setDone(false);
    stopRef.current = false;

    while (!stopRef.current) {
      try {
        setRetryCount(0);
        const result = await invokeBatch();
        consecutiveFailureRef.current = 0;

        if (!result) {
          throw new Error("No response from server");
        }

        if (typeof result.totalMissing === "number") {
          setTotalMissing(result.totalMissing);
        }

        if (typeof result.totalProducts === "number") {
          setTotalProducts(result.totalProducts);
        }

        if (typeof result.nextOffset === "number") {
          offsetRef.current = result.nextOffset;
          setScanOffset(result.nextOffset);
        }

        const batchFound = result.succeeded || 0;
        const batchFailed = result.failed || 0;
        const batchProcessed = batchFound + batchFailed + (result.skipped || 0);

        if (batchProcessed > 0) {
          setProcessed((prev) => prev + batchProcessed);
          setFound((prev) => prev + batchFound);
          setFailed((prev) => prev + batchFailed);
        }

        if (result.results) {
          setRecentResults((prev) =>
            [...(result.results as ResultEntry[]).filter((r) => r.status !== "skipped"), ...prev].slice(0, 50)
          );
        }

        if (result.results?.some((r: any) => r.status === "payment_required")) {
          setError("Serper API credits exhausted. Please top up your account.");
          break;
        }

        if (result.done || batchProcessed === 0) {
          setDone(true);
          setError(null);
          break;
        }

        setError(null);
        await sleep(800);
      } catch (e: any) {
        if (stopRef.current) {
          break;
        }

        consecutiveFailureRef.current += 1;
        const failureCount = consecutiveFailureRef.current;

        if (failureCount >= MAX_CONSECUTIVE_BATCH_FAILURES) {
          setError(`Stopped after ${failureCount} consecutive batch failures: ${e.message}`);
          break;
        }

        setError(`Batch failed (${failureCount}/${MAX_CONSECUTIVE_BATCH_FAILURES}). Waiting a few seconds, then continuing...`);
        await sleep(8000);
      }
    }

    setRunning(false);
    setRetryCount(0);
  }, []);

  const stop = () => {
    stopRef.current = true;
  };

  const resetSession = () => {
    stopRef.current = true;
    offsetRef.current = 0;
    consecutiveFailureRef.current = 0;
    setProcessed(0);
    setFound(0);
    setFailed(0);
    setDone(false);
    setError(null);
    setRecentResults([]);
    setTotalMissing(null);
    setTotalProducts(null);
    setScanOffset(0);
    clearSession();
  };

  const progress =
    totalProducts && totalProducts > 0
      ? Math.min(100, (scanOffset / totalProducts) * 100)
      : totalMissing !== null && totalMissing + processed > 0
        ? Math.min(100, (processed / (processed + totalMissing)) * 100)
        : 0;

  const successRate = processed > 0 ? Math.round((found / processed) * 100) : 0;
  const remainingLabel = totalMissing !== null ? "Missing Images" : "Products Left to Scan";
  const remainingValue =
    totalMissing !== null
      ? totalMissing
      : totalProducts !== null
        ? Math.max(totalProducts - scanOffset, 0)
        : "—";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <ImagePlus className="w-6 h-6" />
          AI Product Image Finder
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Searches multiple beauty retailers & CDNs for product images using AI-powered web search
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-card rounded-xl p-4 border text-center">
          <p className="text-2xl font-bold text-foreground">{remainingValue}</p>
          <p className="text-xs text-muted-foreground">{remainingLabel}</p>
        </div>
        <div className="bg-card rounded-xl p-4 border text-center">
          <p className="text-2xl font-bold text-emerald-600">{found}</p>
          <p className="text-xs text-muted-foreground">Found</p>
        </div>
        <div className="bg-card rounded-xl p-4 border text-center">
          <p className="text-2xl font-bold text-amber-600">{failed}</p>
          <p className="text-xs text-muted-foreground">Not Found</p>
        </div>
        <div className="bg-card rounded-xl p-4 border text-center">
          <p className="text-2xl font-bold text-primary">{successRate}%</p>
          <p className="text-xs text-muted-foreground">Success Rate</p>
        </div>
      </div>

      <div className="bg-card rounded-xl p-6 border">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm font-medium">Progress</p>
            <p className="text-xs text-muted-foreground">
              {processed > 0 && `${processed} processed this session`}
              {totalProducts !== null && ` · Scan position ${Math.min(scanOffset, totalProducts)}/${totalProducts}`}
              {retryCount > 0 && ` · Retry ${retryCount}/${MAX_RETRIES}`}
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

        <div className="flex gap-3 flex-wrap">
          {!running ? (
            <Button onClick={runBatch} disabled={done} className="gap-2">
              <Play className="w-4 h-4" />
              {processed > 0 || scanOffset > 0 ? "Resume Search" : "Start Search"}
            </Button>
          ) : (
            <Button onClick={stop} variant="outline" className="gap-2">
              <Pause className="w-4 h-4" />
              Pause
            </Button>
          )}
          {(processed > 0 || scanOffset > 0) && !running && (
            <Button onClick={resetSession} variant="ghost" className="gap-2">
              <RotateCcw className="w-4 h-4" />
              Reset Session
            </Button>
          )}
          {running && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              {retryCount > 0 ? "Retrying..." : `Searching images for batch of ${BATCH_SIZE}...`}
            </div>
          )}
        </div>
      </div>

      {recentResults.length > 0 && (
        <div className="bg-card rounded-xl p-6 border">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Image className="w-4 h-4" />
            Recent Results
          </h3>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {recentResults.map((r, i) => (
              <div key={`${r.id}-${i}`} className="flex items-center gap-3 p-2.5 rounded-lg bg-secondary/50 text-sm">
                {r.status === "success" ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                ) : r.status === "no_confident_match" || r.status === "no_images_found" ? (
                  <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                ) : (
                  <XCircle className="w-4 h-4 text-destructive flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {r.title || r.id.slice(0, 8)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {r.status === "success" && "Image found ✓"}
                    {r.status === "no_confident_match" && `No confident match (score: ${r.topScore || 0})`}
                    {r.status === "no_images_found" && "No verified images found"}
                    {r.status === "error" && (r.error || "Error")}
                    {r.status === "payment_required" && "API credits exhausted"}
                  </p>
                </div>
                {r.status === "success" && r.url && (
                  <img src={r.url} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0 border" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-card rounded-xl p-6 border">
        <h3 className="font-semibold mb-2">How it works</h3>
        <ul className="text-sm text-muted-foreground space-y-1.5 list-disc list-inside">
          <li>Scans the catalog progressively instead of rescanning the full database every batch</li>
          <li>Uses multiple search strategies per product — retailer sites, CDNs, and general web</li>
          <li>Scores images by brand match, title match, trusted CDN, and resolution</li>
          <li>Verifies each image exists and meets minimum quality (5KB+)</li>
          <li>Images are saved immediately — pause and resume anytime without losing progress</li>
          <li>Auto-retries failed requests and keeps going after transient batch errors</li>
          <li>Processes {BATCH_SIZE} products per batch to stay within API limits</li>
        </ul>
      </div>
    </div>
  );
};

export default AdminImageSearch;
