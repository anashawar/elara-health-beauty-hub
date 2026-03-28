import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CameraPreview } from "@capgo/camera-preview";
import { Camera as CapCamera } from "@capacitor/camera";
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import { Camera, ArrowLeft, RotateCcw, ShieldAlert } from "lucide-react";

// Key landmark groups
const FACE_OVAL = [10,338,297,332,284,251,389,356,454,323,361,288,397,365,379,378,400,377,152,148,176,149,150,136,172,58,132,93,234,127,162,21,54,103,67,109,10];
const LEFT_EYE = [362,382,381,380,374,373,390,249,263,466,388,387,386,385,384,398,362];
const RIGHT_EYE = [33,7,163,144,145,153,154,155,133,173,157,158,159,160,161,246,33];
const LIPS_OUTER = [61,146,91,181,84,17,314,405,321,375,291,409,270,269,267,0,37,39,40,185,61];
const NOSE_BRIDGE = [168,6,197,195,5];
const LEFT_EYEBROW = [276,283,282,295,285,300,293,334,296,336];
const RIGHT_EYEBROW = [46,53,52,65,55,70,63,105,66,107];
const CROSS_HAIR_POINTS = [168,6,195,4,1,2,98,327];

const AUTO_CAPTURE_SECONDS = 5;

interface NativeFaceScannerProps {
  onCapture: (base64DataUrl: string) => void;
  onClose: () => void;
  language: string;
}

export default function NativeFaceScanner({ onCapture, onClose, language }: NativeFaceScannerProps) {
  const [cameraReady, setCameraReady] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [modelLoading, setModelLoading] = useState(true);
  const [useFront, setUseFront] = useState(true);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoCapturingRef = useRef(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const landmarkerRef = useRef<FaceLandmarker | null>(null);
  const captureIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hiddenImgRef = useRef<HTMLImageElement | null>(null);
  const activeRef = useRef(true);

  // Camera preview area height (4:3 aspect ratio based on screen width)
  const cameraHeight = Math.round(window.innerWidth * (4 / 3));

  // Request camera permission first, then start native camera preview
  const startCamera = useCallback(async () => {
    try {
      const permStatus = await CapCamera.checkPermissions();
      if (permStatus.camera === "denied") {
        const reqResult = await CapCamera.requestPermissions({ permissions: ["camera"] });
        if (reqResult.camera === "denied") {
          setPermissionDenied(true);
          return;
        }
      }

      await CameraPreview.start({
        parent: "camera-preview-container",
        position: useFront ? "front" : "rear",
        toBack: true,
        disableAudio: true,
        storeToFile: false,
        width: window.innerWidth,
        height: cameraHeight,
      });
      setCameraReady(true);
      setCameraError(null);
    } catch (err: any) {
      console.error("[NativeScanner] Camera start failed:", err);
      const msg = err?.message || String(err);
      if (msg.toLowerCase().includes("permission") || msg.toLowerCase().includes("denied")) {
        setPermissionDenied(true);
      } else {
        setCameraError(msg);
      }
    }
  }, [useFront, cameraHeight]);

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const root = document.getElementById("root");

    const previous = {
      htmlBackground: html.style.background,
      bodyBackground: body.style.background,
      rootBackground: root?.style.background ?? "",
    };

    html.style.background = "transparent";
    body.style.background = "transparent";
    if (root) root.style.background = "transparent";

    return () => {
      html.style.background = previous.htmlBackground;
      body.style.background = previous.bodyBackground;
      if (root) root.style.background = previous.rootBackground;
    };
  }, []);

  // Init MediaPipe
  const initLandmarker = useCallback(async () => {
    try {
      setModelLoading(true);
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
      );
      for (const delegate of ["GPU", "CPU"] as const) {
        try {
          const lm = await FaceLandmarker.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
              delegate,
            },
            runningMode: "IMAGE",
            numFaces: 1,
            outputFaceBlendshapes: false,
            outputFacialTransformationMatrixes: false,
          });
          landmarkerRef.current = lm;
          console.log(`[NativeScanner] MediaPipe initialized (${delegate})`);
          break;
        } catch (e) {
          console.warn(`[NativeScanner] ${delegate} failed`, e);
        }
      }
    } catch (err) {
      console.error("[NativeScanner] MediaPipe init failed:", err);
    } finally {
      setModelLoading(false);
    }
  }, []);

  // Draw futuristic overlay — normalized to the DISPLAY size (not image size)
  const drawOverlay = useCallback(
    (ctx: CanvasRenderingContext2D, landmarks: { x: number; y: number; z: number }[], imgW: number, imgH: number, displayW: number, displayH: number) => {
      const time = Date.now() / 1000;
      // Map landmark coordinates (0–1 normalized) to display dimensions
      const pt = (idx: number) => ({ x: landmarks[idx].x * displayW, y: landmarks[idx].y * displayH });

      ctx.clearRect(0, 0, displayW, displayH);

      // Mirror for front camera
      if (useFront) {
        ctx.save();
        ctx.translate(displayW, 0);
        ctx.scale(-1, 1);
      }

      // Face oval - pulsing glow
      const pulse = 0.4 + 0.3 * Math.sin(time * 2);
      ctx.beginPath();
      FACE_OVAL.forEach((idx, i) => {
        const p = pt(idx);
        i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
      });
      ctx.closePath();
      ctx.strokeStyle = `rgba(219, 39, 119, ${pulse})`;
      ctx.lineWidth = 2;
      ctx.shadowColor = "rgba(219, 39, 119, 0.6)";
      ctx.shadowBlur = 10;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Eyes - neon cyan
      [LEFT_EYE, RIGHT_EYE].forEach((eye) => {
        ctx.beginPath();
        eye.forEach((idx, i) => {
          const p = pt(idx);
          i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
        });
        ctx.closePath();
        ctx.strokeStyle = "rgba(56, 189, 248, 0.7)";
        ctx.lineWidth = 1.5;
        ctx.shadowColor = "rgba(56, 189, 248, 0.5)";
        ctx.shadowBlur = 6;
        ctx.stroke();
        ctx.shadowBlur = 0;
      });

      // Eyebrows - violet
      [LEFT_EYEBROW, RIGHT_EYEBROW].forEach((brow) => {
        ctx.beginPath();
        brow.forEach((idx, i) => {
          const p = pt(idx);
          i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
        });
        ctx.strokeStyle = "rgba(168, 85, 247, 0.5)";
        ctx.lineWidth = 1;
        ctx.stroke();
      });

      // Lips - pink
      ctx.beginPath();
      LIPS_OUTER.forEach((idx, i) => {
        const p = pt(idx);
        i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
      });
      ctx.closePath();
      ctx.strokeStyle = "rgba(244, 114, 182, 0.6)";
      ctx.lineWidth = 1.2;
      ctx.shadowColor = "rgba(244, 114, 182, 0.4)";
      ctx.shadowBlur = 5;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Nose bridge
      ctx.beginPath();
      NOSE_BRIDGE.forEach((idx, i) => {
        const p = pt(idx);
        i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
      });
      ctx.strokeStyle = "rgba(56, 189, 248, 0.4)";
      ctx.lineWidth = 1;
      ctx.stroke();

      // Crosshair points
      CROSS_HAIR_POINTS.forEach((idx) => {
        const p = pt(idx);
        const dp = 0.5 + 0.5 * Math.sin(time * 3 + idx);
        ctx.beginPath();
        ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(219, 39, 119, ${dp * 0.6})`;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(219, 39, 119, ${dp})`;
        ctx.fill();
      });

      // Center grid lines
      const nose = pt(4);
      const gridAlpha = 0.08 + 0.06 * Math.sin(time * 1.5);
      ctx.setLineDash([4, 6]);
      ctx.strokeStyle = `rgba(168, 85, 247, ${gridAlpha})`;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(nose.x, nose.y - 90);
      ctx.lineTo(nose.x, nose.y + 90);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(nose.x - 80, nose.y);
      ctx.lineTo(nose.x + 80, nose.y);
      ctx.stroke();
      ctx.setLineDash([]);

      // Data labels
      ctx.font = "bold 9px 'DM Sans', sans-serif";
      const labels = [
        { idx: 10, text: "T-ZONE", color: "rgba(56, 189, 248, 0.7)" },
        { idx: 234, text: "PORES", color: "rgba(168, 85, 247, 0.6)" },
        { idx: 454, text: "TEXTURE", color: "rgba(168, 85, 247, 0.6)" },
        { idx: 152, text: "CHIN", color: "rgba(244, 114, 182, 0.6)" },
      ];
      labels.forEach(({ idx, text, color }) => {
        const p = pt(idx);
        const a = 0.5 + 0.5 * Math.sin(time * 2 + idx * 0.5);
        ctx.globalAlpha = a;
        ctx.fillStyle = color;
        const ox = idx > 200 ? 30 : -30;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + ox, p.y - 14);
        ctx.strokeStyle = color;
        ctx.lineWidth = 0.7;
        ctx.stroke();
        ctx.fillText(text, p.x + ox + (idx > 200 ? 4 : -ctx.measureText(text).width - 4), p.y - 16);
        ctx.globalAlpha = 1;
      });

      if (useFront) ctx.restore();
    },
    [useFront]
  );

  // Capture frames and process
  const processFrame = useCallback(async () => {
    if (!activeRef.current || !landmarkerRef.current || !canvasRef.current) return;

    try {
      const result = await CameraPreview.captureSample({ quality: 50 });
      const base64 = result.value;
      if (!base64) return;

      const img = hiddenImgRef.current || new Image();
      hiddenImgRef.current = img;

      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject();
        img.src = `data:image/jpeg;base64,${base64}`;
      });

      const canvas = canvasRef.current;
      const displayW = canvas.clientWidth;
      const displayH = canvas.clientHeight;
      
      // Set canvas resolution to match display size (for crisp rendering)
      const dpr = window.devicePixelRatio || 1;
      canvas.width = displayW * dpr;
      canvas.height = displayH * dpr;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.scale(dpr, dpr);

      const results = landmarkerRef.current.detect(img);
      if (results.faceLandmarks && results.faceLandmarks.length > 0) {
        setFaceDetected(true);
        drawOverlay(ctx, results.faceLandmarks[0], img.naturalWidth, img.naturalHeight, displayW, displayH);
      } else {
        setFaceDetected(false);
        // Reset countdown if face lost
        if (countdownTimerRef.current) {
          clearInterval(countdownTimerRef.current);
          countdownTimerRef.current = null;
          setCountdown(null);
        }
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    } catch {
      // skip frame
    }
  }, [drawOverlay]);

  // Start frame capture loop
  useEffect(() => {
    if (!cameraReady) return;
    captureIntervalRef.current = setInterval(processFrame, 83);
    return () => {
      if (captureIntervalRef.current) clearInterval(captureIntervalRef.current);
    };
  }, [cameraReady, processFrame]);

  // Init everything
  useEffect(() => {
    activeRef.current = true;
    const initTimer = setTimeout(() => {
      if (!activeRef.current) return;
      startCamera();
      initLandmarker();
    }, 300);

    return () => {
      activeRef.current = false;
      clearTimeout(initTimer);
      if (captureIntervalRef.current) clearInterval(captureIntervalRef.current);
      try { landmarkerRef.current?.close(); } catch {}
      landmarkerRef.current = null;
      CameraPreview.stop().catch(() => {});
    };
  }, [startCamera, initLandmarker]);

  // Handle capture
  const handleCapture = useCallback(async () => {
    try {
      const result = await CameraPreview.capture({ quality: 85 });
      const base64 = result.value;
      if (base64) {
        await CameraPreview.stop();
        onCapture(`data:image/jpeg;base64,${base64}`);
      }
    } catch (err) {
      console.error("[NativeScanner] Capture failed:", err);
    }
  }, [onCapture]);

  // Flip camera
  const flipCamera = useCallback(async () => {
    try {
      await CameraPreview.flip();
      setUseFront((p) => !p);
    } catch (err) {
      console.error("[NativeScanner] Flip failed:", err);
    }
  }, []);

  // Permission denied or error state
  if (permissionDenied || cameraError) {
    return (
      <div className="fixed inset-0 z-[100] bg-background flex flex-col items-center justify-center px-8 text-center">
        <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
          <ShieldAlert className="w-8 h-8 text-destructive" />
        </div>
        <h2 className="text-lg font-display font-bold text-foreground mb-2">
          {permissionDenied
            ? (language === "ar" ? "يرجى السماح بالوصول للكاميرا" : "Camera Permission Required")
            : (language === "ar" ? "تعذر فتح الكاميرا" : "Camera Error")}
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          {permissionDenied
            ? (language === "ar" ? "افتح إعدادات التطبيق وفعّل إذن الكاميرا" : "Please enable camera access in your device settings for this app.")
            : cameraError}
        </p>
        <button onClick={onClose} className="px-6 py-3 bg-primary text-primary-foreground rounded-xl text-sm font-semibold">
          {language === "ar" ? "رجوع" : "Go Back"}
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex flex-col" style={{ backgroundColor: "transparent" }}>
      {/* Camera area */}
      <div className="relative flex-shrink-0" style={{ height: cameraHeight, backgroundColor: "transparent" }}>
        {/* Native camera renders behind the web layer inside this area */}
        <div id="camera-preview-container" className="absolute inset-0" style={{ backgroundColor: "transparent", zIndex: 0 }} />

        {/* Face tracking canvas overlay — matches camera area exactly */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ zIndex: 30, position: "absolute", willChange: "transform", transform: "translateZ(0)" }}
        />

        {/* Corner brackets */}
        <div className="absolute inset-0 pointer-events-none z-20">
          <div className="absolute top-6 left-6 w-10 h-10 border-t-2 border-l-2 border-primary/60 rounded-tl-lg" />
          <div className="absolute top-6 right-6 w-10 h-10 border-t-2 border-r-2 border-primary/60 rounded-tr-lg" />
          <div className="absolute bottom-6 left-6 w-10 h-10 border-b-2 border-l-2 border-primary/60 rounded-bl-lg" />
          <div className="absolute bottom-6 right-6 w-10 h-10 border-b-2 border-r-2 border-primary/60 rounded-br-lg" />

          {/* Scan line */}
          <motion.div
            animate={{ y: [24, cameraHeight - 40, 24] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent"
          />

          {/* Top branding */}
          <div className="absolute left-0 right-0 text-center" style={{ top: "env(safe-area-inset-top, 12px)", paddingTop: 12 }}>
            <span className="text-[10px] font-bold tracking-widest text-white/70 bg-black/40 backdrop-blur-md px-4 py-1.5 rounded-full">
              ELARA AI • LIVE TRACKING
            </span>
          </div>
        </div>
      </div>

      {/* Bottom section — opaque background so page content doesn't bleed through */}
      <div className="flex-1 bg-black flex flex-col items-center justify-between pt-3 pb-safe">
        {/* Face detection status */}
        <div className="text-center">
          {modelLoading ? (
            <span className="text-xs text-white/50 animate-pulse">
              {language === "ar" ? "جاري تحميل الذكاء الاصطناعي..." : language === "ku" ? "AI بارکردنی..." : "Loading AI model..."}
            </span>
          ) : faceDetected ? (
            <motion.span
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-xs font-semibold text-green-400 flex items-center justify-center gap-1.5"
            >
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              {language === "ar" ? "تم اكتشاف الوجه" : language === "ku" ? "دەموچاو دۆزرایەوە" : "Face detected"}
            </motion.span>
          ) : (
            <span className="text-xs text-white/50">
              {language === "ar" ? "وجّه وجهك للكاميرا" : language === "ku" ? "دەموچاوت بکە بەرەو کامێرا" : "Position your face in view"}
            </span>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-8 pb-6">
          <button
            onClick={() => {
              CameraPreview.stop().catch(() => {});
              onClose();
            }}
            className="w-12 h-12 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>

          {/* Main capture button */}
          <button
            onClick={handleCapture}
            disabled={!faceDetected && !modelLoading}
            className="relative w-20 h-20 rounded-full flex items-center justify-center disabled:opacity-40"
          >
            {/* Outer ring */}
            <div className="absolute inset-0 rounded-full border-4 border-white/30" />
            {/* Inner filled circle */}
            <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/40">
              <Camera className="w-7 h-7 text-primary-foreground" />
            </div>
          </button>

          <button
            onClick={flipCamera}
            className="w-12 h-12 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center"
          >
            <RotateCcw className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Hint text */}
        <p className="text-[10px] text-white/30 text-center pb-2">
          {language === "ar" ? "التقط صورة لتحليل بشرتك" : language === "ku" ? "وێنە بگرە بۆ شیکردنەوەی پێستت" : "Capture a photo to analyze your skin"}
        </p>
      </div>
    </div>
  );
}
