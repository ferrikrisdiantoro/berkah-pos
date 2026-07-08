// Utilitas cetak untuk aplikasi native (Capacitor). Di web/TWA biasa, fungsi
// isNativeApp() = false sehingga tombol cetak langsung tidak muncul.

export interface ReceiptData {
  storeName: string;
  address?: string | null;
  phone?: string | null;
  footer?: string | null;
  title: string;
  number: string;
  dateLabel: string;
  contactRole: string; // "Pelanggan" | "Supplier"
  contactName: string;
  items: { description: string; qtyPrice: string; total: string }[];
  subtotal: string;
  total: string;
  bayar: string;
  sisa: string;
}

const W = 32; // lebar kolom umum untuk kertas 58mm

function lr(left: string, right: string): string {
  const gap = Math.max(1, W - left.length - right.length);
  return left + " ".repeat(gap) + right;
}
function center(text: string): string {
  const pad = Math.max(0, Math.floor((W - text.length) / 2));
  return " ".repeat(pad) + text;
}
function wrap(text: string): string {
  const out: string[] = [];
  let s = text;
  while (s.length > W) {
    out.push(s.slice(0, W));
    s = s.slice(W);
  }
  out.push(s);
  return out.join("\n");
}
const div = "-".repeat(W);

/** Struk teks polos (didukung mayoritas printer thermal ESC/POS). */
export function buildReceiptText(d: ReceiptData): string {
  const L: string[] = [];
  L.push(center(d.storeName));
  if (d.address) L.push(wrap(d.address));
  if (d.phone) L.push(center("Telp: " + d.phone));
  L.push(div);
  L.push(lr(d.title, ""));
  L.push(lr("No", d.number));
  L.push(lr("Tgl", d.dateLabel));
  L.push(lr(d.contactRole, d.contactName));
  L.push(div);
  for (const it of d.items) {
    L.push(it.description);
    L.push(lr(it.qtyPrice, it.total));
  }
  L.push(div);
  L.push(lr("Subtotal", d.subtotal));
  L.push(lr("TOTAL", d.total));
  L.push(lr("Bayar", d.bayar));
  L.push(lr("Sisa", d.sisa));
  L.push(div);
  if (d.footer) L.push(center(d.footer));
  L.push(center("--- " + d.storeName + " ---"));
  L.push("\n\n\n");
  return L.join("\n");
}

export function isNativeApp(): boolean {
  if (typeof window === "undefined") return false;
  const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  return !!cap?.isNativePlatform?.();
}

/**
 * Kirim teks struk ke printer Bluetooth via plugin native.
 * Integrasi plugin dilakukan di aplikasi Capacitor (lihat berkah-pos-apk/README-BUILD-APK.md).
 * Kita panggil lewat window.Capacitor.Plugins agar tetap berfungsi walau halaman di-load remote.
 */
export async function printReceiptNative(
  text: string,
): Promise<{ ok: boolean; error?: string }> {
  const cap = (window as unknown as {
    Capacitor?: { Plugins?: Record<string, unknown> };
  }).Capacitor;
  const plugins = cap?.Plugins ?? {};
  // Nama plugin bisa berbeda tergantung yang dipasang; coba beberapa yang umum.
  const printer =
    (plugins["ThermalPrinter"] as PrinterPlugin | undefined) ??
    (plugins["BluetoothPrinter"] as PrinterPlugin | undefined) ??
    (plugins["CapacitorThermalPrinter"] as PrinterPlugin | undefined);

  if (!printer || typeof printer.print !== "function") {
    return {
      ok: false,
      error: "Plugin printer belum aktif di aplikasi. Cek pemasangan di app native.",
    };
  }
  try {
    await printer.print({ text });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Gagal mencetak." };
  }
}

interface PrinterPlugin {
  print: (opts: { text: string }) => Promise<unknown>;
}
