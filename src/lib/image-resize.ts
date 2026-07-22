/**
 * Baca file gambar dari <input type=file>, perkecil di browser, kembalikan
 * sebagai data URI (jpeg). Dipakai untuk upload tanpa storage terpisah —
 * gambar disimpan langsung sebagai teks di kolom DB.
 */
export async function fileToResizedDataUrl(
  file: File,
  maxSize = 400,
  quality = 0.85,
): Promise<string> {
  const url = await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = reject;
    r.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = url;
  });
  const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) return url;
  // Latar putih agar PNG transparan tetap rapi saat dicetak.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", quality);
}
