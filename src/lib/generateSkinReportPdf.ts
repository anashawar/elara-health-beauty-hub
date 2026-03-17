import jsPDF from "jspdf";
import elaraLogo from "@/assets/elara-logo.png";

interface Analysis {
  overall_score: number;
  skin_type: string;
  hydration_score: number;
  elasticity_score: number;
  clarity_score: number;
  texture_score: number;
  acne_score?: number;
  pigmentation_score?: number;
  dryness_score?: number;
  oiliness_score?: number;
  pores_score?: number;
  dark_circles_score?: number;
  problems: { name: string; severity: string; description: string }[];
  routine: { morning: { step: number; action: string; details: string }[]; evening: { step: number; action: string; details: string }[] };
  lifestyle_tips: string[];
  summary: string;
}

function scoreLabel(s: number) {
  if (s >= 80) return "Great";
  if (s >= 60) return "Moderate";
  return "Needs Care";
}

function hexColor(s: number): [number, number, number] {
  if (s >= 80) return [34, 197, 94];
  if (s >= 60) return [245, 158, 11];
  return [239, 68, 68];
}

async function loadImageAsBase64(src: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = reject;
    img.src = src;
  });
}

export async function generateSkinReportPdf(
  analysis: Analysis,
  userName: string,
  language: string,
): Promise<Blob> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const w = doc.internal.pageSize.getWidth();
  let y = 0;

  // Load logo
  let logoData: string | null = null;
  try {
    logoData = await loadImageAsBase64(elaraLogo);
  } catch { /* fallback to text */ }

  // ── Brand colors ──
  const brandRose: [number, number, number] = [219, 39, 119];
  const brandDark: [number, number, number] = [30, 20, 35];

  // ── HEADER ──
  doc.setFillColor(...brandDark);
  doc.rect(0, 0, w, 40, "F");
  // Accent line
  doc.setFillColor(...brandRose);
  doc.rect(0, 40, w, 1.5, "F");

  // Logo
  if (logoData) {
    doc.addImage(logoData, "PNG", 14, 8, 28, 10);
  } else {
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text("ELARA", 15, 18);
  }

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("AI Skin Analysis Report", 14, 25);

  // Date & user (right side)
  doc.setFontSize(8);
  doc.setTextColor(200, 200, 210);
  doc.text(new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }), w - 14, 14, { align: "right" });
  if (userName) {
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.text(userName, w - 14, 21, { align: "right" });
  }

  // Tagline
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(180, 160, 190);
  doc.text("Iraq's First AI-Powered Skin Analysis", 14, 34);

  y = 50;

  // ── OVERALL SCORE ──
  doc.setFillColor(252, 247, 255);
  doc.roundedRect(14, y, w - 28, 38, 4, 4, "F");
  doc.setDrawColor(...brandRose);
  doc.setLineWidth(0.4);
  doc.roundedRect(14, y, w - 28, 38, 4, 4, "S");

  // Score circle
  const cx = 38, cy = y + 19, cr = 13;
  doc.setFillColor(255, 255, 255);
  doc.circle(cx, cy, cr, "F");
  doc.setDrawColor(...hexColor(analysis.overall_score));
  doc.setLineWidth(2.2);
  doc.circle(cx, cy, cr, "S");
  doc.setTextColor(...hexColor(analysis.overall_score));
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text(String(analysis.overall_score), cx, cy + 2, { align: "center" });
  doc.setFontSize(6);
  doc.text("/100", cx, cy + 7, { align: "center" });

  // Labels
  doc.setTextColor(...brandDark);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Overall Skin Health", 58, y + 13);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text(`Skin Type: ${analysis.skin_type?.charAt(0).toUpperCase()}${analysis.skin_type?.slice(1) || "Unknown"}`, 58, y + 21);

  if (analysis.summary) {
    doc.setFontSize(7.5);
    doc.setTextColor(120, 120, 120);
    const summaryLines = doc.splitTextToSize(`"${analysis.summary}"`, w - 78);
    doc.text(summaryLines.slice(0, 2), 58, y + 28);
  }

  y += 46;

  // ── Section heading helper ──
  const sectionHeading = (title: string) => {
    doc.setFillColor(...brandRose);
    doc.roundedRect(14, y - 1, 3, 6, 1, 1, "F");
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...brandDark);
    doc.text(title, 20, y + 3.5);
    y += 9;
  };

  // ── DETAILED BREAKDOWN ──
  sectionHeading("Detailed Breakdown");

  const baseScores = [
    { label: "Hydration", score: analysis.hydration_score },
    { label: "Elasticity", score: analysis.elasticity_score },
    { label: "Clarity", score: analysis.clarity_score },
    { label: "Texture", score: analysis.texture_score },
  ];

  const colW = (w - 28) / 4;
  baseScores.forEach((item, i) => {
    const bx = 14 + i * colW;
    doc.setFillColor(248, 248, 252);
    doc.roundedRect(bx, y, colW - 3, 24, 3, 3, "F");
    doc.setFontSize(17);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...hexColor(item.score));
    doc.text(String(item.score), bx + (colW - 3) / 2, y + 12, { align: "center" });
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text(item.label, bx + (colW - 3) / 2, y + 19, { align: "center" });
  });

  y += 30;

  // ── COMMON CONCERNS RATING ──
  sectionHeading("Common Concerns Rating");

  const concerns = [
    { label: "Acne", score: analysis.acne_score ?? 0 },
    { label: "Pigmentation", score: analysis.pigmentation_score ?? 0 },
    { label: "Dryness", score: analysis.dryness_score ?? 0 },
    { label: "Oiliness", score: analysis.oiliness_score ?? 0 },
    { label: "Pores", score: analysis.pores_score ?? 0 },
    { label: "Dark Circles", score: analysis.dark_circles_score ?? 0 },
  ];

  concerns.forEach((item) => {
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(60, 60, 60);
    doc.text(item.label, 15, y + 3.5);

    const barX = 55, barW = w - 95, barH = 4;
    doc.setFillColor(230, 230, 235);
    doc.roundedRect(barX, y, barW, barH, 2, 2, "F");
    doc.setFillColor(...hexColor(item.score));
    const fillW = (item.score / 100) * barW;
    if (fillW > 0) doc.roundedRect(barX, y, Math.max(fillW, 4), barH, 2, 2, "F");

    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...hexColor(item.score));
    doc.text(`${item.score}  ${scoreLabel(item.score)}`, w - 15, y + 3.5, { align: "right" });

    y += 8;
  });

  y += 6;

  // ── CONCERNS DETECTED ──
  if (analysis.problems?.length > 0) {
    if (y > 240) { doc.addPage(); y = 20; }
    sectionHeading(`Concerns Detected (${analysis.problems.length})`);

    analysis.problems.forEach((p) => {
      if (y > 260) { doc.addPage(); y = 20; }
      doc.setFillColor(255, 251, 245);
      doc.roundedRect(14, y, w - 28, 16, 3, 3, "F");
      doc.setFontSize(8.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(50, 50, 50);
      doc.text(p.name, 18, y + 5.5);

      const sColor: [number, number, number] = p.severity === "mild" ? [34, 197, 94] : p.severity === "moderate" ? [245, 158, 11] : [239, 68, 68];
      doc.setFillColor(...sColor);
      const badgeX = 18 + doc.getTextWidth(p.name) + 3;
      doc.roundedRect(badgeX, y + 2, doc.getTextWidth(p.severity) + 5, 5, 1.5, 1.5, "F");
      doc.setFontSize(6);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(255, 255, 255);
      doc.text(p.severity, badgeX + 2.5, y + 5.5);

      doc.setFontSize(7);
      doc.setTextColor(100, 100, 100);
      doc.setFont("helvetica", "normal");
      const descLines = doc.splitTextToSize(p.description, w - 40);
      doc.text(descLines.slice(0, 2), 18, y + 11);
      y += 18;
    });

    y += 2;
  }

  // ── PERSONALIZED ROUTINE ──
  if (y > 230) { doc.addPage(); y = 20; }
  sectionHeading("Your Personalized Routine");

  const renderRoutine = (title: string, steps: { step: number; action: string; details: string }[], emoji: string) => {
    if (!steps?.length) return;
    if (y > 250) { doc.addPage(); y = 20; }
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(80, 80, 80);
    doc.text(`${emoji}  ${title}`, 17, y);
    y += 5;

    steps.forEach((s) => {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.setFillColor(...brandRose);
      doc.circle(21, y + 1.5, 2.8, "F");
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(255, 255, 255);
      doc.text(String(s.step), 21, y + 2.5, { align: "center" });

      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(50, 50, 50);
      doc.text(s.action, 27, y + 2);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(110, 110, 110);
      const detailLines = doc.splitTextToSize(s.details, w - 50);
      doc.text(detailLines.slice(0, 1), 27, y + 6);
      y += 10;
    });
    y += 2;
  };

  renderRoutine("Morning Routine", analysis.routine?.morning, "☀️");
  renderRoutine("Evening Routine", analysis.routine?.evening, "🌙");

  // ── LIFESTYLE TIPS ──
  if (analysis.lifestyle_tips?.length > 0) {
    if (y > 250) { doc.addPage(); y = 20; }
    sectionHeading("Lifestyle Tips");
    analysis.lifestyle_tips.forEach((tip) => {
      if (y > 275) { doc.addPage(); y = 20; }
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(80, 80, 80);
      doc.text(`✦  ${tip}`, 17, y);
      y += 5;
    });
  }

  // ── FOOTER (all pages) ──
  const addFooter = (pageNum: number) => {
    doc.setPage(pageNum);
    const ph = doc.internal.pageSize.getHeight();

    // Footer bar
    doc.setFillColor(...brandDark);
    doc.rect(0, ph - 16, w, 16, "F");
    doc.setFillColor(...brandRose);
    doc.rect(0, ph - 16, w, 0.8, "F");

    // Logo in footer
    if (logoData) {
      doc.addImage(logoData, "PNG", 14, ph - 13, 18, 6.5);
    } else {
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text("ELARA", 14, ph - 7);
    }

    // App CTA
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text("Get ELARA app on iOS & Android", w / 2, ph - 10, { align: "center" });

    // Disclaimer
    doc.setFontSize(5.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(160, 160, 170);
    doc.text("AI-generated analysis · Not a medical diagnosis", w / 2, ph - 5, { align: "center" });

    // Page number
    doc.setFontSize(6);
    doc.setTextColor(140, 140, 150);
    doc.text(`${pageNum}`, w - 14, ph - 7, { align: "right" });
  };

  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) addFooter(i);

  return doc.output("blob");
}
