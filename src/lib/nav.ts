import {
  LayoutDashboard,
  ShoppingCart,
  Receipt,
  Package,
  Users,
  BarChart3,
  Settings,
  UserCog,
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
  { href: "/penjualan", label: "Penjualan", icon: Receipt, master: false },
  { href: "/produk", label: "Produk", icon: Package, master: false },
  { href: "/kontak", label: "Kontak", icon: Users, master: false },
  { href: "/laporan", label: "Laporan", icon: BarChart3, master: true },
  { href: "/pengguna", label: "Pengguna", icon: UserCog, master: true },
  { href: "/pengaturan", label: "Pengaturan", icon: Settings, master: true },
];
