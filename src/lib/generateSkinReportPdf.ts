import jsPDF from "jspdf";

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

export async function generateSkinReportPdf(
  analysis: Analysis,
  userName: string,
  language: string,
): Promise<Blob> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const w = doc.internal.pageSize.getWidth();
  const isAr = language === "ar" || language === "ku";
  let y = 0;

  // ── HEADER GRADIENT BAR ──
  doc.setFillColor(219, 39, 119); // rose-500
  doc.rect(0, 0, w, 38, "F");
  doc.setFillColor(168, 85, 247); // violet-500
  doc.rect(w * 0.5, 0, w * 0.5, 38, "F");
  // Blend overlay (skip GState for iOS WKWebView compatibility)
  doc.setFillColor(190, 60, 180);
  doc.rect(w * 0.4, 0, w * 0.2, 38, "F");

  // Brand name
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("ELARA", 15, 16);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("AI Skin Analyzer Report", 15, 23);
  
  // Date & user
  doc.setFontSize(8);
  doc.text(new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }), w - 15, 16, { align: "right" });
  if (userName) doc.text(userName, w - 15, 22, { align: "right" });

  // Tagline
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);
  doc.text("Iraq's First AI-Powered Skin Analysis", 15, 33);

  y = 46;

  // ── OVERALL SCORE ──
  doc.setFillColor(250, 245, 255);
  doc.roundedRect(15, y, w - 30, 36, 4, 4, "F");
  doc.setDrawColor(219, 39, 119);
  doc.setLineWidth(0.3);
  doc.roundedRect(15, y, w - 30, 36, 4, 4, "S");

  // Score circle
  const cx = 38, cy = y + 18, cr = 12;
  doc.setFillColor(255, 255, 255);
  doc.circle(cx, cy, cr, "F");
  doc.setDrawColor(...hexColor(analysis.overall_score));
  doc.setLineWidth(2);
  doc.circle(cx, cy, cr, "S");
  doc.setTextColor(...hexColor(analysis.overall_score));
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(String(analysis.overall_score), cx, cy + 2, { align: "center" });
  doc.setFontSize(6);
  doc.text("/100", cx, cy + 7, { align: "center" });

  // Labels
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("Overall Skin Health", 58, y + 13);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text(`Skin Type: ${analysis.skin_type?.charAt(0).toUpperCase()}${analysis.skin_type?.slice(1) || "Unknown"}`, 58, y + 20);
  
  if (analysis.summary) {
    doc.setFontSize(7.5);
    doc.setTextColor(120, 120, 120);
    const summaryLines = doc.splitTextToSize(`"${analysis.summary}"`, w - 78);
    doc.text(summaryLines.slice(0, 2), 58, y + 27);
  }

  y += 44;

  // ── DETAILED BREAKDOWN ──
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 30, 30);
  doc.text("Detailed Breakdown", 15, y);
  y += 6;

  const baseScores = [
    { label: "Hydration", score: analysis.hydration_score },
    { label: "Elasticity", score: analysis.elasticity_score },
    { label: "Clarity", score: analysis.clarity_score },
    { label: "Texture", score: analysis.texture_score },
  ];

  const colW = (w - 30) / 4;
  baseScores.forEach((item, i) => {
    const bx = 15 + i * colW;
    doc.setFillColor(248, 248, 252);
    doc.roundedRect(bx, y, colW - 3, 22, 2, 2, "F");
    doc.setFontSize(15);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...hexColor(item.score));
    doc.text(String(item.score), bx + (colW - 3) / 2, y + 11, { align: "center" });
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text(item.label, bx + (colW - 3) / 2, y + 18, { align: "center" });
  });

  y += 28;

  // ── COMMON CONCERNS RATING ──
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 30, 30);
  doc.text("Common Concerns Rating", 15, y);
  y += 6;

  const concerns = [
    { label: "Acne", score: analysis.acne_score ?? 0 },
    { label: "Pigmentation", score: analysis.pigmentation_score ?? 0 },
    { label: "Dryness", score: analysis.dryness_score ?? 0 },
    { label: "Oiliness", score: analysis.oiliness_score ?? 0 },
    { label: "Pores", score: analysis.pores_score ?? 0 },
    { label: "Dark Circles", score: analysis.dark_circles_score ?? 0 },
  ];

  concerns.forEach((item) => {
    // Label
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(60, 60, 60);
    doc.text(item.label, 15, y + 3.5);

    // Bar background
    const barX = 55, barW = w - 95, barH = 4;
    doc.setFillColor(230, 230, 235);
    doc.roundedRect(barX, y, barW, barH, 2, 2, "F");
    // Bar fill
    doc.setFillColor(...hexColor(item.score));
    const fillW = (item.score / 100) * barW;
    if (fillW > 0) doc.roundedRect(barX, y, Math.max(fillW, 4), barH, 2, 2, "F");

    // Score + status
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...hexColor(item.score));
    doc.text(`${item.score}  ${scoreLabel(item.score)}`, w - 15, y + 3.5, { align: "right" });

    y += 8;
  });

  y += 4;

  // ── CONCERNS DETECTED ──
  if (analysis.problems?.length > 0) {
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 30, 30);
    doc.text(`Concerns Detected (${analysis.problems.length})`, 15, y);
    y += 6;

    analysis.problems.forEach((p) => {
      if (y > 260) { doc.addPage(); y = 20; }
      doc.setFillColor(255, 251, 245);
      doc.roundedRect(15, y, w - 30, 16, 2, 2, "F");
      doc.setFontSize(8.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(50, 50, 50);
      doc.text(p.name, 19, y + 5.5);
      
      // Severity badge
      const sColor: [number, number, number] = p.severity === "mild" ? [34, 197, 94] : p.severity === "moderate" ? [245, 158, 11] : [239, 68, 68];
      doc.setFillColor(...sColor);
      const badgeX = 19 + doc.getTextWidth(p.name) + 3;
      doc.roundedRect(badgeX, y + 2, doc.getTextWidth(p.severity) + 4, 5, 1, 1, "F");
      doc.setFontSize(6);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(255, 255, 255);
      doc.text(p.severity, badgeX + 2, y + 5.5);

      doc.setFontSize(7);
      doc.setTextColor(100, 100, 100);
      doc.setFont("helvetica", "normal");
      const descLines = doc.splitTextToSize(p.description, w - 40);
      doc.text(descLines.slice(0, 2), 19, y + 11);
      y += 18;
    });

    y += 2;
  }

  // ── PERSONALIZED ROUTINE ──
  if (y > 230) { doc.addPage(); y = 20; }
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 30, 30);
  doc.text("Your Personalized Routine", 15, y);
  y += 7;

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
      doc.setFillColor(248, 248, 252);
      doc.circle(21, y + 1.5, 2.5, "F");
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(219, 39, 119);
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
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 30, 30);
    doc.text("Lifestyle Tips", 15, y);
    y += 6;
    analysis.lifestyle_tips.forEach((tip) => {
      if (y > 275) { doc.addPage(); y = 20; }
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(80, 80, 80);
      doc.text(`✦  ${tip}`, 17, y);
      y += 5;
    });
  }

  // ── FOOTER ──
  const addFooter = (pageNum: number) => {
    doc.setPage(pageNum);
    const ph = doc.internal.pageSize.getHeight();
    doc.setFillColor(248, 245, 250);
    doc.rect(0, ph - 14, w, 14, "F");
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(160, 160, 160);
    doc.text("Generated by ELARA AI Skin Analyzer · elara-health-beauty-hub.lovable.app", w / 2, ph - 7, { align: "center" });
    doc.text("This is an AI-generated analysis and not a medical diagnosis.", w / 2, ph - 3, { align: "center" });
  };

  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) addFooter(i);

  return doc.output("blob");
}
