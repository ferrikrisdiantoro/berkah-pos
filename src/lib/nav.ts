import {
  LayoutDashboard,
  ShoppingCart,
  Receipt,
  Package,
  PackageOpen,
  HandCoins,
  Users,
  BarChart3,
  Settings,
  UserCog,
  Wallet,
  Scale,
  ReceiptText,
  ClipboardList,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  master: boolean;
}

/** Daftar menu bersama untuk sidebar (desktop) & drawer (mobile). */
export const NAV: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, master: false },
  { href: "/pembelian", label: "Pembelian", icon: ShoppingCart, master: false },
  { href: "/rekap-pembelian", label: "Rekap Beli", icon: ClipboardList, master: false },
  { href: "/penjualan", label: "Penjualan", icon: Receipt, master: false },
  { href: "/produk", label: "Produk", icon: Package, master: false },
  { href: "/titipan", label: "Titipan", icon: PackageOpen, master: false },
  { href: "/hak-pemilik", label: "Hak Pemilik", icon: HandCoins, master: false },
  { href: "/kontak", label: "Kontak", icon: Users, master: false },
  { href: "/pengeluaran", label: "Pengeluaran", icon: ReceiptText, master: false },
  { href: "/kas", label: "Buku Kas", icon: Wallet, master: true },
  { href: "/hutang-piutang", label: "Hutang & Piutang", icon: Scale, master: true },
  { href: "/laporan", label: "Laporan", icon: BarChart3, master: true },
  { href: "/pengguna", label: "Pengguna", icon: UserCog, master: true },
  { href: "/pengaturan", label: "Pengaturan", icon: Settings, master: true },
];
