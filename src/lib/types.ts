// Tipe domain aplikasi — dipetakan dari tabel Postgres (lihat supabase/migrations).

export type DocStatus = "draft" | "unpaid" | "partial" | "paid";
export type ContactType = "supplier" | "customer" | "both";
export type PaymentKind = "purchase" | "sale";

export interface BusinessSettings {
  id: number;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  logo_url: string | null;
  footer_note: string | null;
  /** Nomor rekening / info pembayaran — tampil di atas "--- NAMA USAHA ---" */
  bank_info: string | null;
  receipt_title_sale: string | null;
  receipt_title_purchase: string | null;
  signature_note: string | null;
}

export interface BankAccount {
  id: string;
  name: string;
  account_number: string | null;
  holder: string | null;
  is_cash: boolean;
  is_active: boolean;
}

export interface Unit {
  id: string;
  name: string;
}

export interface ProductCategory {
  id: string;
  name: string;
}

export interface Product {
  id: string;
  code: string | null;
  name: string;
  category_id: string | null;
  unit_id: string | null;
  buy_price: number;
  sell_price: number;
  track_stock: boolean;
  stock: number;
  min_stock: number;
  is_active: boolean;
  unit?: Unit | null;
  category?: ProductCategory | null;
}

export interface Contact {
  id: string;
  type: ContactType;
  category: string | null; // nelayan | petani | pemilik_barang | supplier | pelanggan | lainnya
  name: string;
  city: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  is_active: boolean;
}

export const CONTACT_CATEGORIES: { value: string; label: string }[] = [
  { value: "nelayan", label: "Nelayan" },
  { value: "petani", label: "Petani / Tambak" },
  { value: "pemilik_barang", label: "Pemilik Barang (Titipan)" },
  { value: "supplier", label: "Supplier / Pemasok" },
  { value: "pelanggan", label: "Pelanggan" },
  { value: "lainnya", label: "Lainnya" },
];

export interface DocItem {
  id: string;
  product_id: string | null;
  description: string;
  qty: number;
  unit_price: number;
  discount_pct: number;
  tax_pct: number;
  line_total: number;
  position: number;
  consignment_id?: string | null;
  owner_id?: string | null;
  commission_amount?: number;
  owner_amount?: number;
}

export type CommissionType = "percent" | "fixed_per_unit";

export interface Consignment {
  id: string;
  received_date: string;
  owner_id: string;
  product_id: string | null;
  product_name: string;
  unit: string | null;
  qty_in: number;
  qty_remaining: number;
  base_price: number;
  commission_type: CommissionType;
  commission_value: number;
  status: "open" | "closed";
  notes: string | null;
  owner?: Contact | null;
}

export interface OwnerPayment {
  id: string;
  owner_id: string;
  date: string;
  amount: number;
  notes: string | null;
}

export interface Purchase {
  id: string;
  number: string;
  contact_id: string | null;
  date: string;
  due_date: string | null;
  status: DocStatus;
  subtotal: number;
  discount_total: number;
  tax_total: number;
  total: number;
  paid_total: number;
  notes: string | null;
  share_token: string;
  created_at: string;
  contact?: Contact | null;
  items?: DocItem[];
}

export type Sale = Omit<Purchase, "items"> & { items?: DocItem[] };

export interface Payment {
  id: string;
  kind: PaymentKind;
  purchase_id: string | null;
  sale_id: string | null;
  account_id: string | null;
  date: string;
  amount: number;
  method: string | null;
  notes: string | null;
}

export const STATUS_LABEL: Record<DocStatus, string> = {
  draft: "Draft",
  unpaid: "Belum Bayar",
  partial: "Sebagian",
  paid: "Lunas",
};

export const STATUS_TONE: Record<DocStatus, "default" | "success" | "warning" | "danger" | "muted"> = {
  draft: "muted",
  unpaid: "danger",
  partial: "warning",
  paid: "success",
};
