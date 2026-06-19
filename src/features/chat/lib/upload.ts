export function uploadFileXHR(
  file: File,
  conversationId: string,
  onProgress: (pct: number) => void,
  signal: AbortSignal,
): Promise<{ url: string; mimeType: string; filename: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try { resolve(JSON.parse(xhr.responseText) as { url: string; mimeType: string; filename: string }); }
        catch { reject(new Error("Invalid response")); }
      } else {
        reject(new Error(`Upload failed: ${xhr.status}`));
      }
    });

    xhr.addEventListener("error", () => reject(new Error("Network error")));
    xhr.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));

    signal.addEventListener("abort", () => xhr.abort(), { once: true });

    const form = new FormData();
    form.set("file", file);
    form.set("conversationId", conversationId);

    xhr.open("POST", "/api/chat/upload");
    xhr.withCredentials = true;
    xhr.send(form);
  });
}
