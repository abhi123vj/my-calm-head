import {
  CalendarDays,
  House,
  Lightbulb,
  List,
  Plus,
  type LucideIcon,
} from "lucide-react";

/**
 * One definition of the primary navigation, shared by the mobile tab bar and
 * the desktop header, so the two can never drift apart.
 *
 * `primary` marks the app's core action. In the tab bar it becomes the raised
 * centre button; in the header it becomes the filled call to action. It is the
 * only entry that is emphasised, which is what keeps the rest of the bar calm.
 */
export type NavItem = {
  href: string;
  label: string;
  /** Shortened for the tab bar, where five labels have to fit at 320px. */
  shortLabel?: string;
  icon: LucideIcon;
  primary?: boolean;
};

export const NAV_ITEMS: readonly NavItem[] = [
  { href: "/", label: "Dashboard", shortLabel: "Home", icon: House },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/log", label: "Log episode", shortLabel: "Log", icon: Plus, primary: true },
  { href: "/history", label: "History", icon: List },
  { href: "/insights", label: "Insights", icon: Lightbulb },
] as const;

/**
 * The dashboard is only active on an exact match; every other section stays
 * active while you are inside it, so opening an episode keeps History lit
 * rather than leaving the bar looking as if you have navigated out of the app.
 */
export function isNavItemActive(href: string, pathname: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
