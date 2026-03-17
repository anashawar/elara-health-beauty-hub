import { useState, useRef, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { CameraPreview } from "@capacitor-community/camera-preview";
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import { Camera, ArrowLeft, RotateCcw } from "lucide-react";

// Key landmark groups
const FACE_OVAL = [10,338,297,332,284,251,389,356,454,323,361,288,397,365,379,378,400,377,152,148,176,149,150,136,172,58,132,93,234,127,162,21,54,103,67,109,10];
const LEFT_EYE = [362,382,381,380,374,373,390,249,263,466,388,387,386,385,384,398,362];
const RIGHT_EYE = [33,7,163,144,145,153,154,155,133,173,157,158,159,160,161,246,33];
const LIPS_OUTER = [61,146,91,181,84,17,314,405,321,375,291,409,270,269,267,0,37,39,40,185,61];
const NOSE_BRIDGE = [168,6,197,195,5];
const LEFT_EYEBROW = [276,283,282,295,285,300,293,334,296,336];
const RIGHT_EYEBROW = [46,53,52,65,55,70,63,105,66,107];
const CROSS_HAIR_POINTS = [168,6,195,4,1,2,98,327];

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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const landmarkerRef = useRef<FaceLandmarker | null>(null);
  const rafRef = useRef<number>(0);
  const captureIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hiddenImgRef = useRef<HTMLImageElement | null>(null);
  const activeRef = useRef(true);

  // Start native camera preview
  const startCamera = useCallback(async () => {
    try {
      await CameraPreview.start({
        parent: "camera-preview-container",
        position: useFront ? "front" : "rear",
        toBack: true, // camera renders behind webview
        disableAudio: true,
        storeToFile: false,
        enableZoom: false,
        width: window.innerWidth,
        height: Math.round(window.innerWidth * (4 / 3)),
      });
      setCameraReady(true);
    } catch (err) {
      console.error("[NativeScanner] Camera start failed:", err);
    }
  }, [useFront]);

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

  // Draw futuristic overlay
  const drawOverlay = useCallback(
    (ctx: CanvasRenderingContext2D, landmarks: { x: number; y: number; z: number }[], w: number, h: number) => {
      const time = Date.now() / 1000;
      const pt = (idx: number) => ({ x: landmarks[idx].x * w, y: landmarks[idx].y * h });

      ctx.clearRect(0, 0, w, h);

      // Mirror for front camera
      if (useFront) {
        ctx.save();
        ctx.translate(w, 0);
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

      // Load into hidden image for MediaPipe
      const img = hiddenImgRef.current || new Image();
      hiddenImgRef.current = img;

      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject();
        img.src = `data:image/jpeg;base64,${base64}`;
      });

      const canvas = canvasRef.current;
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const results = landmarkerRef.current.detect(img);
      if (results.faceLandmarks && results.faceLandmarks.length > 0) {
        setFaceDetected(true);
        drawOverlay(ctx, results.faceLandmarks[0], canvas.width, canvas.height);
      } else {
        setFaceDetected(false);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    } catch {
      // skip frame
    }
  }, [drawOverlay]);

  // Start frame capture loop
  useEffect(() => {
    if (!cameraReady) return;

    // Process at ~12fps
    captureIntervalRef.current = setInterval(processFrame, 83);

    return () => {
      if (captureIntervalRef.current) clearInterval(captureIntervalRef.current);
    };
  }, [cameraReady, processFrame]);

  // Init everything
  useEffect(() => {
    activeRef.current = true;
    startCamera();
    initLandmarker();

    return () => {
      activeRef.current = false;
      if (captureIntervalRef.current) clearInterval(captureIntervalRef.current);
      cancelAnimationFrame(rafRef.current);
      landmarkerRef.current?.close();
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

  return (
    <div className="fixed inset-0 z-50 bg-transparent">
      {/* Native camera renders behind webview into this container */}
      <div id="camera-preview-container" className="absolute inset-0" />

      {/* Face tracking canvas overlay */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full pointer-events-none z-10"
        style={{ height: `${Math.round(window.innerWidth * (4 / 3))}px` }}
      />

      {/* UI Overlay */}
      <div className="absolute inset-0 pointer-events-none z-20">
        {/* Corner brackets */}
        <div className="absolute top-20 left-8 w-10 h-10 border-t-2 border-l-2 border-primary/60 rounded-tl-lg" />
        <div className="absolute top-20 right-8 w-10 h-10 border-t-2 border-r-2 border-primary/60 rounded-tr-lg" />
        <div className="absolute left-8 w-10 h-10 border-b-2 border-l-2 border-primary/60 rounded-bl-lg" style={{ top: `${Math.round(window.innerWidth * (4 / 3)) - 40}px` }} />
        <div className="absolute right-8 w-10 h-10 border-b-2 border-r-2 border-primary/60 rounded-br-lg" style={{ top: `${Math.round(window.innerWidth * (4 / 3)) - 40}px` }} />

        {/* Scan line */}
        <motion.div
          animate={{ y: [80, Math.round(window.innerWidth * (4 / 3)) - 40, 80] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent"
        />

        {/* Top branding */}
        <div className="absolute top-12 left-0 right-0 text-center pointer-events-none">
          <span className="text-[10px] font-bold tracking-widest text-white/70 bg-black/40 backdrop-blur-md px-4 py-1.5 rounded-full">
            ELARA AI • LIVE TRACKING
          </span>
        </div>

        {/* Face detection status */}
        <div className="absolute left-0 right-0 text-center" style={{ top: `${Math.round(window.innerWidth * (4 / 3)) + 8}px` }}>
          {modelLoading ? (
            <span className="text-xs text-muted-foreground animate-pulse">
              {language === "ar" ? "جاري تحميل الذكاء الاصطناعي..." : language === "ku" ? "AI بارکردنی..." : "Loading AI model..."}
            </span>
          ) : faceDetected ? (
            <motion.span
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-xs font-semibold text-green-500 flex items-center justify-center gap-1.5"
            >
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              {language === "ar" ? "تم اكتشاف الوجه" : language === "ku" ? "دەموچاو دۆزرایەوە" : "Face detected"}
            </motion.span>
          ) : (
            <span className="text-xs text-muted-foreground">
              {language === "ar" ? "وجّه وجهك للكاميرا" : language === "ku" ? "دەموچاوت بکە بەرەو کامێرا" : "Position your face in view"}
            </span>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="absolute bottom-0 left-0 right-0 z-30 pb-safe">
        <div className="flex items-center justify-center gap-6 pb-8 pt-4 pointer-events-auto">
          <button
            onClick={onClose}
            className="w-12 h-12 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center shadow-lg"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <button
            onClick={handleCapture}
            className="w-18 h-18 rounded-full bg-primary flex items-center justify-center shadow-xl border-4 border-background/50"
            style={{ width: 72, height: 72 }}
          >
            <Camera className="w-8 h-8 text-primary-foreground" />
          </button>
          <button
            onClick={flipCamera}
            className="w-12 h-12 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center shadow-lg"
          >
            <RotateCcw className="w-5 h-5 text-foreground" />
          </button>
        </div>
      </div>
    </div>
  );
}
