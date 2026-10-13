export const TABS = [
  { id: "dashboard", label: "Dashboard" },
  { id: "stock", label: "Stok" },
  { id: "categories", label: "Kateqoriyalar" },
  { id: "brands", label: "Markalar" },
  { id: "suppliers", label: "Təchizatçılar" },
  { id: "customers", label: "Müştərilər" },
  { id: "warehouses", label: "Anbarlar" },
  { id: "movements", label: "Hərəkətlər" },
  { id: "purchases", label: "Alışlar" },
  { id: "sales", label: "Satışlar" },
  { id: "reports", label: "Hesabatlar" },
  { id: "audit", label: "Audit" },
  { id: "settings", label: "Ayarlar" },
];

export const MENUS = [
  {
    label: "Fayl",
    items: [
      ["Yeni", "Ctrl+N"],
      ["Aç", "Ctrl+O"],
      null,
      ["Yadda saxla", "Ctrl+S"],
      ["İxrac et (CSV)", "Ctrl+E"],
      null,
      ["Çıxış", "Alt+F4"],
    ],
  },
  {
    label: "Redaktə",
    items: [
      ["Geri al", "Ctrl+Z"],
      ["Təkrarla", "Ctrl+Y"],
      null,
      ["Kəs", "Ctrl+X"],
      ["Kopyala", "Ctrl+C"],
      ["Yapışdır", "Ctrl+V"],
      null,
      ["Seçiləni sil", "Del"],
    ],
  },
  {
    label: "Baxış",
    items: [
      ["Yenilə", "F5"],
      ["Təkrarla", "F6"],
      null,
      ["Tam ekran", "F11"],
    ],
  },
  {
    label: "Alətlər",
    items: [
      ["Barcode çap et"],
      ["Kütləvi idxal"],
      ["Kütləvi dəyişiklik"],
      null,
      ["Seçimlər"],
    ],
  },
  {
    label: "Kömək",
    items: [["İstifadə təlimatı"], ["Haqqında"]],
  },
];
