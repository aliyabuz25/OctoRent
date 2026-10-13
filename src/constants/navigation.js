export const TABS = [
  { id: "stock", label: "Stok" },
  { id: "movements", label: "Hareketler" },
  { id: "reports", label: "Raporlar" },
  { id: "settings", label: "Ayarlar" },
];

export const MENUS = [
  {
    label: "Dosya",
    items: [
      ["Yeni Kayıt", "Ctrl+N"],
      ["Aç...", "Ctrl+O"],
      null,
      ["Kaydet", "Ctrl+S"],
      ["Yazdır", "Ctrl+P"],
      null,
      ["Çıkış", "Alt+F4"],
    ],
  },
  {
    label: "Düzen",
    items: [
      ["Geri Al", "Ctrl+Z"],
      ["Yinele", "Ctrl+Y"],
      null,
      ["Kes", "Ctrl+X"],
      ["Kopyala", "Ctrl+C"],
      ["Yapıştır", "Ctrl+V"],
    ],
  },
  {
    label: "Görünüm",
    items: [
      ["Nesneler", "F8"],
      ["Yenile", "F5"],
      null,
      ["Durum Çubuğu"],
    ],
  },
  {
    label: "Veri",
    items: [
      ["İçeri Aktar..."],
      ["Dışarı Aktar (CSV)..."],
      null,
      ["Yenile", "F5"],
    ],
  },
  {
    label: "Araçlar",
    items: [["Seçenekler..."]],
  },
  {
    label: "Yardım",
    items: [["Yardımı Görüntüle", "F1"], ["Hakkında"]],
  },
];
