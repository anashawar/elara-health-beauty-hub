import { useEffect, useRef, useCallback } from "react";
import { FaceLandmarker, FilesetResolver, DrawingUtils } from "@mediapipe/tasks-vision";

interface FaceTrackingOverlayProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  mirrored?: boolean;
}

// Key landmark indices for futuristic overlay
const FACE_OVAL = [
  10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288,
  397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136,
  172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109, 10,
];

const LEFT_EYE = [362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387, 386, 385, 384, 398, 362];
const RIGHT_EYE = [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246, 33];
const LIPS_OUTER = [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 409, 270, 269, 267, 0, 37, 39, 40, 185, 61];
const NOSE_BRIDGE = [168, 6, 197, 195, 5];
const LEFT_EYEBROW = [276, 283, 282, 295, 285, 300, 293, 334, 296, 336];
const RIGHT_EYEBROW = [46, 53, 52, 65, 55, 70, 63, 105, 66, 107];

// Cross-hair points for futuristic effect
const CROSS_HAIR_POINTS = [168, 6, 195, 4, 1, 2, 98, 327]; // forehead, nose, chin area

export default function FaceTrackingOverlay({ videoRef, mirrored = false }: FaceTrackingOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const landmarkerRef = useRef<FaceLandmarker | null>(null);
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef(-1);
  const loadingRef = useRef(false);

  const initLandmarker = useCallback(async () => {
    if (loadingRef.current || landmarkerRef.current) return;
    loadingRef.current = true;
    try {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
      );
      const landmarker = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
          delegate: "GPU",
        },
        runningMode: "VIDEO",
        numFaces: 1,
        outputFaceBlendshapes: false,
        outputFacialTransformationMatrixes: false,
      });
      landmarkerRef.current = landmarker;
    } catch (err) {
      console.error("[FaceTracking] Failed to init:", err);
    } finally {
      loadingRef.current = false;
    }
  }, []);

  const drawFuturisticOverlay = useCallback(
    (ctx: CanvasRenderingContext2D, landmarks: { x: number; y: number; z: number }[], w: number, h: number) => {
      const time = Date.now() / 1000;

      // Helper to get canvas coords
      const pt = (idx: number) => {
        const lm = landmarks[idx];
        return { x: lm.x * w, y: lm.y * h };
      };

      ctx.clearRect(0, 0, w, h);

      if (mirrored) {
        ctx.save();
        ctx.translate(w, 0);
        ctx.scale(-1, 1);
      }

      // --- FACE OVAL - glowing outline ---
      const ovalPulse = 0.4 + 0.3 * Math.sin(time * 2);
      ctx.beginPath();
      FACE_OVAL.forEach((idx, i) => {
        const p = pt(idx);
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.closePath();
      ctx.strokeStyle = `rgba(219, 39, 119, ${ovalPulse})`;
      ctx.lineWidth = 1.5;
      ctx.shadowColor = "rgba(219, 39, 119, 0.6)";
      ctx.shadowBlur = 8;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // --- EYES - neon contour ---
      [LEFT_EYE, RIGHT_EYE].forEach((eye) => {
        ctx.beginPath();
        eye.forEach((idx, i) => {
          const p = pt(idx);
          if (i === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        });
        ctx.closePath();
        ctx.strokeStyle = "rgba(56, 189, 248, 0.7)";
        ctx.lineWidth = 1.2;
        ctx.shadowColor = "rgba(56, 189, 248, 0.5)";
        ctx.shadowBlur = 6;
        ctx.stroke();
        ctx.shadowBlur = 0;
      });

      // --- EYEBROWS ---
      [LEFT_EYEBROW, RIGHT_EYEBROW].forEach((brow) => {
        ctx.beginPath();
        brow.forEach((idx, i) => {
          const p = pt(idx);
          if (i === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        });
        ctx.strokeStyle = "rgba(168, 85, 247, 0.5)";
        ctx.lineWidth = 1;
        ctx.stroke();
      });

      // --- LIPS ---
      ctx.beginPath();
      LIPS_OUTER.forEach((idx, i) => {
        const p = pt(idx);
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.closePath();
      ctx.strokeStyle = "rgba(244, 114, 182, 0.6)";
      ctx.lineWidth = 1;
      ctx.shadowColor = "rgba(244, 114, 182, 0.4)";
      ctx.shadowBlur = 4;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // --- NOSE BRIDGE ---
      ctx.beginPath();
      NOSE_BRIDGE.forEach((idx, i) => {
        const p = pt(idx);
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.strokeStyle = "rgba(56, 189, 248, 0.4)";
      ctx.lineWidth = 1;
      ctx.stroke();

      // --- CROSSHAIR DOTS on key points ---
      CROSS_HAIR_POINTS.forEach((idx) => {
        const p = pt(idx);
        const dotPulse = 0.5 + 0.5 * Math.sin(time * 3 + idx);
        // Outer ring
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(219, 39, 119, ${dotPulse * 0.6})`;
        ctx.lineWidth = 0.8;
        ctx.stroke();
        // Inner dot
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(219, 39, 119, ${dotPulse})`;
        ctx.fill();
      });

      // --- SCANNING GRID LINES (vertical/horizontal through face center) ---
      const nose = pt(4);
      const scanLineAlpha = 0.08 + 0.06 * Math.sin(time * 1.5);
      ctx.setLineDash([4, 6]);
      ctx.strokeStyle = `rgba(168, 85, 247, ${scanLineAlpha})`;
      ctx.lineWidth = 0.5;
      // Vertical
      ctx.beginPath();
      ctx.moveTo(nose.x, nose.y - 80);
      ctx.lineTo(nose.x, nose.y + 80);
      ctx.stroke();
      // Horizontal
      ctx.beginPath();
      ctx.moveTo(nose.x - 70, nose.y);
      ctx.lineTo(nose.x + 70, nose.y);
      ctx.stroke();
      ctx.setLineDash([]);

      // --- DATA LABELS floating near key areas ---
      ctx.font = "600 8px 'DM Sans', sans-serif";
      const labels = [
        { idx: 10, text: "T-ZONE", color: "rgba(56, 189, 248, 0.7)" },
        { idx: 234, text: "PORES", color: "rgba(168, 85, 247, 0.6)" },
        { idx: 454, text: "TEXTURE", color: "rgba(168, 85, 247, 0.6)" },
        { idx: 152, text: "CHIN", color: "rgba(244, 114, 182, 0.6)" },
      ];
      labels.forEach(({ idx, text, color }) => {
        const p = pt(idx);
        const labelAlpha = 0.5 + 0.5 * Math.sin(time * 2 + idx * 0.5);
        ctx.globalAlpha = labelAlpha;
        ctx.fillStyle = color;
        // Small line from point to label
        const offsetX = idx > 200 ? 25 : -25;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + offsetX, p.y - 12);
        ctx.strokeStyle = color;
        ctx.lineWidth = 0.6;
        ctx.stroke();
        ctx.fillText(text, p.x + offsetX + (idx > 200 ? 3 : -ctx.measureText(text).width - 3), p.y - 14);
        ctx.globalAlpha = 1;
      });

      if (mirrored) {
        ctx.restore();
      }
    },
    [mirrored]
  );

  const detect = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const landmarker = landmarkerRef.current;

    if (!video || !canvas || !landmarker || video.readyState < 2) {
      rafRef.current = requestAnimationFrame(detect);
      return;
    }

    const now = performance.now();
    if (now === lastTimeRef.current) {
      rafRef.current = requestAnimationFrame(detect);
      return;
    }
    lastTimeRef.current = now;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      rafRef.current = requestAnimationFrame(detect);
      return;
    }

    try {
      const results = landmarker.detectForVideo(video, now);
      if (results.faceLandmarks && results.faceLandmarks.length > 0) {
        drawFuturisticOverlay(ctx, results.faceLandmarks[0], canvas.width, canvas.height);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    } catch {
      // skip frame on error
    }

    rafRef.current = requestAnimationFrame(detect);
  }, [videoRef, drawFuturisticOverlay]);

  useEffect(() => {
    initLandmarker().then(() => {
      rafRef.current = requestAnimationFrame(detect);
    });
    return () => {
      cancelAnimationFrame(rafRef.current);
      landmarkerRef.current?.close();
      landmarkerRef.current = null;
    };
  }, [initLandmarker, detect]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-10"
      style={mirrored ? { transform: "scaleX(-1)" } : {}}
    />
  );
}
