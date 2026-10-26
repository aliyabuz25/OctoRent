export const TABS = [
  { id: "tenants", label: "İşletmeler", perm: "tenants", icon: "Shield" },
  { id: "dashboard", label: "Dashboard", perm: "read", icon: "Activity" },
  { id: "stock", label: "Stok", perm: "read", icon: "Package" },
  { id: "categories", label: "Kateqoriyalar", perm: "write", icon: "Folder" },
  { id: "brands", label: "Markalar", perm: "write", icon: "Bookmark" },
  { id: "suppliers", label: "Təchizatçılar", perm: "write", icon: "Truck" },
  { id: "customers", label: "Müştərilər", perm: "write", icon: "Users" },
  { id: "warehouses", label: "Anbarlar", perm: "write", icon: "Home" },
  { id: "movements", label: "Hərəkətlər", perm: "stock", icon: "Repeat" },
  { id: "purchases", label: "Alışlar", perm: "documents", icon: "ShoppingCart" },
  { id: "sales", label: "Satışlar", perm: "documents", icon: "FileText" },
  { id: "rentals", label: "Kirayələr", perm: "documents", icon: "Calendar" },
  { id: "invoices", label: "Fakturalar", perm: "documents", icon: "CreditCard" },
  { id: "maintenance", label: "Servis & Təmir", perm: "write", icon: "Tool" },
  { id: "cashflow", label: "Kassa & Maliyyə", perm: "documents", icon: "DollarSign" },
  { id: "reports", label: "Hesabatlar", perm: "read", icon: "BarChart2" },
  { id: "audit", label: "Audit", perm: "employees", icon: "Clock" },
  { id: "employees", label: "İstifadəçilər", perm: "employees", icon: "User" },
  { id: "settings", label: "Ayarlar", perm: "settings", icon: "Settings" },
];

export const MENUS = [
  {
    label: "Fayl",
    items: [
      ["Yeni", "Ctrl+N", "new"],
      ["İxrac et (CSV)", "Ctrl+E", "export"],
      ["Çıxış", "Alt+Q", "logout"],
    ],
  },
  {
    label: "Baxış",
    items: [["Yenilə", "F5", "refresh"], ["Tam ekran", "F11", "fullscreen"]],
  },
];
