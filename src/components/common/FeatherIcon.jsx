import React from "react";
import * as LucideIcons from "lucide-react";
import * as FeatherIcons from "react-feather";

// Fast O(1) case-insensitive lookup table for all 6500+ Lucide icons
const LUCIDE_LOWER_MAP = new Map();
Object.keys(LucideIcons).forEach((key) => {
  LUCIDE_LOWER_MAP.set(key.toLowerCase(), LucideIcons[key]);
});

// Fallback O(1) case-insensitive lookup table for Feather icons
const FEATHER_LOWER_MAP = new Map();
Object.keys(FeatherIcons).forEach((key) => {
  FEATHER_LOWER_MAP.set(key.toLowerCase(), FeatherIcons[key]);
});

// Legacy / Custom Aliases
const ALIASES = {
  // Buildings & Tenants
  buildings: "building2",
  building: "building2",
  buildinggear: "building2",
  shield: "shield",
  shieldcheck: "shieldcheck",
  home: "home",
  shop: "store",
  store: "store",

  // Stock & Warehousing
  boxes: "boxes",
  boxseam: "boxes",
  box: "box",
  package: "package",
  packageplus: "packageplus",
  packageminus: "packageminus",
  packagecheck: "packagecheck",
  packagex: "packagex",
  warehouse: "warehouse",

  // Speedometer & Activity
  speedometer: "activity",
  speedometer2: "activity",
  activity: "activity",
  dashboard: "layoutdashboard",
  layoutdashboard: "layoutdashboard",

  // Movements & Arrows
  diagram: "gitmerge",
  diagram2: "gitmerge",
  diagram3: "foldertree",
  arrowleftright: "arrowleftright",
  arrowupright: "arrowupright",
  arrowdownleft: "arrowdownleft",
  repeat: "repeat",

  // Catalog & Tags
  bookmarkstar: "bookmarkcheck",
  bookmark: "bookmark",
  tag: "tag",
  tags: "tags",

  // Partners & Users
  truck: "truck",
  personlinesfill: "users",
  personbadge: "user",
  personcircle: "user",
  users: "users",
  user: "user",
  usercheck: "usercheck",
  userplus: "userplus",

  // Sales & Documents
  cartcheck: "shoppingcart",
  cart: "shoppingcart",
  shoppingcart: "shoppingcart",
  receipt: "receipt",
  receipttext: "receipttext",
  calendarrange: "calendarrange",
  calendar: "calendar",
  fileearmarktext: "filetext",
  fileearmarkpdf: "filetext",
  filepdf: "filetext",
  pdf: "filetext",
  filetext: "filetext",
  filespreadsheet: "filespreadsheet",

  // Tools & Maintenance
  tools: "wrench",
  tool: "wrench",
  wrench: "wrench",
  hammer: "hammer",

  // Finance & Cashflow
  wallet2: "wallet",
  wallet: "wallet",
  dollarsign: "dollarsign",
  creditcard: "creditcard",
  trendingup: "trendingup",
  trendingdown: "trendingdown",

  // Reports & Charts
  barchartline: "barchart3",
  barchart: "barchart3",
  barchart2: "barchart3",
  barchart3: "barchart3",
  linechart: "linechart",
  piechart: "piechart",

  // System & Navigation
  clockhistory: "clock",
  clock: "clock",
  gear: "settings",
  settings: "settings",
  sliders: "slidershorizontal",
  slidershorizontal: "slidershorizontal",
  dot: "dot",
  circle: "circle",
  windowsidebar: "panelleft",
  sidebar: "panelleft",
  starfill: "star",
  star: "star",
  gridfill: "layoutgrid",
  grid: "layoutgrid",
  layoutgrid: "layoutgrid",
  pinfill: "pin",
  pin: "pin",
  folderfill: "folder",
  folder: "folder",
  folder2: "folder",
  folder2open: "folderopen",
  folderminus: "folderminus",
  folderplus: "folderplus",
  foldertree: "foldertree",
  phone: "phone",
  smartphone: "smartphone",
  boxarrowright: "logout",
  boxarrowinright: "login",
  login: "login",
  logout: "logout",
  search: "search",
  x: "x",
  plus: "plus",
  pluslg: "plus",
  pluscircle: "pluscircle",
  dash: "minus",
  dashcircle: "minuscircle",
  minus: "minus",
  minuscircle: "minuscircle",
  trash: "trash2",
  trash2: "trash2",
  edit: "pencil",
  edit2: "pencil",
  pencil: "pencil",
  check: "check",
  checkcircle: "checkcircle2",
  checkcirclefill: "checkcircle2",
  checkcircle2: "checkcircle2",
  alertcircle: "alertcircle",
  alerttriangle: "alerttriangle",
  exclamationtriangle: "alerttriangle",
  inbox: "inbox",
  bell: "bell",
  chevronright: "chevronright",
  chevrondown: "chevrondown",
  chevronleft: "chevronleft",
  chevronup: "chevronup",
  arrowscollapse: "minimize2",
  arrowsexpand: "maximize2",
  eye: "eye",
  download: "download",
  upload: "upload",
  refresh: "refreshcw",
  refreshcw: "refreshcw",
  monitor: "monitor",
  camera: "camera",
  sparkles: "sparkles",
};

function resolveIcon(name) {
  if (!name) return LucideIcons.Circle || FeatherIcons.Circle;

  // Direct check first
  if (LucideIcons[name]) return LucideIcons[name];
  if (FeatherIcons[name]) return FeatherIcons[name];

  // Strip prefixes & normalize to lower without separator
  const clean = String(name)
    .replace(/^(bi-|feather-|lucide-)/i, "")
    .replace(/[-_]/g, "")
    .toLowerCase();

  // Check aliases
  const target = ALIASES[clean] || clean;

  // Look up in Lucide map
  if (LUCIDE_LOWER_MAP.has(target)) {
    return LUCIDE_LOWER_MAP.get(target);
  }

  // Look up in Feather map
  if (FEATHER_LOWER_MAP.has(target)) {
    return FEATHER_LOWER_MAP.get(target);
  }

  // Fallback
  return LucideIcons.Circle || FeatherIcons.Circle;
}

export default function FeatherIcon({
  name,
  size = 18,
  color,
  className = "",
  style = {},
  strokeWidth = 2,
  ...props
}) {
  const Component = resolveIcon(name);

  if (!Component) return null;

  return (
    <Component
      size={size}
      color={color}
      className={`app-icon feather-icon ${className}`.trim()}
      strokeWidth={strokeWidth}
      style={{
        display: "inline-block",
        verticalAlign: "middle",
        flexShrink: 0,
        ...style,
      }}
      {...props}
    />
  );
}
