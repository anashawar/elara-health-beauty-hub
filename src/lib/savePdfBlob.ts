import { Capacitor } from "@capacitor/core";

/**
 * Save a PDF blob — uses native Share sheet on iOS/Android,
 * falls back to <a> download on web.
 */
export async function savePdfBlob(blob: Blob, fileName: string) {
  if (Capacitor.isNativePlatform()) {
    const { Filesystem, Directory } = await import("@capacitor/filesystem");
    const { Share } = await import("@capacitor/share");

    // Convert blob to base64
    const reader = new FileReader();
    const base64 = await new Promise<string>((resolve, reject) => {
      reader.onloadend = () => {
        const result = reader.result as string;
        resolve(result.split(",")[1]); // strip data:...;base64,
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

    // Write to cache directory
    const result = await Filesystem.writeFile({
      path: fileName,
      data: base64,
      directory: Directory.Cache,
    });

    // Open native share sheet
    await Share.share({
      title: fileName,
      url: result.uri,
      dialogTitle: "Save Report",
    });
  } else {
    // Web fallback
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  }
}
