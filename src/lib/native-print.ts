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

interface BluetoothPrinterPlugin {
  getPaired: () => Promise<{ devices: { name?: string; address: string }[] }>;
  printText: (opts: { address: string; text: string }) => Promise<unknown>;
}

const PRINTER_KEY = "berkahpos_printer_addr";

export function clearSavedPrinter() {
  if (typeof localStorage !== "undefined") localStorage.removeItem(PRINTER_KEY);
}

/**
 * Kirim struk ke printer Bluetooth via plugin native BluetoothPrinter
 * (Bluetooth Classic / ESC-POS). Printer dipilih sekali lalu diingat.
 */
export async function printReceiptNative(
  text: string,
): Promise<{ ok: boolean; error?: string }> {
  const cap = (window as unknown as {
    Capacitor?: { Plugins?: Record<string, unknown> };
  }).Capacitor;
  const printer = cap?.Plugins?.["BluetoothPrinter"] as BluetoothPrinterPlugin | undefined;

  if (!printer || typeof printer.printText !== "function") {
    return { ok: false, error: "Plugin printer belum aktif. Buka lewat aplikasi (APK)." };
  }

  try {
    let address = localStorage.getItem(PRINTER_KEY);
    if (!address) {
      const { devices } = await printer.getPaired();
      if (!devices || devices.length === 0) {
        return {
          ok: false,
          error: "Belum ada printer ter-pair. Pair dulu di Setelan Bluetooth HP.",
        };
      }
      if (devices.length === 1) {
        address = devices[0].address;
      } else {
        const list = devices.map((d, i) => `${i + 1}. ${d.name || d.address}`).join("\n");
        const choice = window.prompt(`Pilih printer:\n${list}`, "1");
        const idx = Number(choice) - 1;
        if (Number.isNaN(idx) || idx < 0 || idx >= devices.length) {
          return { ok: false, error: "Pemilihan printer dibatalkan." };
        }
        address = devices[idx].address;
      }
      localStorage.setItem(PRINTER_KEY, address);
    }

    await printer.printText({ address, text });
    return { ok: true };
  } catch (e) {
    // Reset pilihan agar bisa pilih ulang printer lain di percobaan berikutnya.
    clearSavedPrinter();
    return { ok: false, error: e instanceof Error ? e.message : "Gagal mencetak." };
  }
}
