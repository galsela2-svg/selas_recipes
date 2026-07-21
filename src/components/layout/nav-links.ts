import {
  LayoutGrid,
  Plus,
  Search,
  ShoppingCart,
  type LucideIcon,
} from "lucide-react";

export type NavLink = {
  href: string;
  label: string;
  icon: LucideIcon;
  emphasized?: boolean;
};

export const navLinks: NavLink[] = [
  { href: "/dashboard", label: "מתכונים", icon: LayoutGrid },
  { href: "/search", label: "חיפוש", icon: Search },
  { href: "/recipes/new", label: "חדש", icon: Plus, emphasized: true },
  { href: "/shopping-list", label: "קניות", icon: ShoppingCart },
];
