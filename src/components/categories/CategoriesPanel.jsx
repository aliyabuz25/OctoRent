import EntityListPanel from "../common/EntityListPanel.jsx";

const columns = [
  { title: "Ad", field: "name", width: 200, headerFilter: "input", editor: false },
  { title: "Kod", field: "code", width: 120, headerFilter: "input" },
  { title: "Açıqlama", field: "description", width: 300, headerFilter: "input" },
  { title: "Yaradılıb", field: "createdAt", width: 160 },
  { title: "Yenilənib", field: "updated", width: 120 },
];

const fields = [
  { key: "name", label: "Ad *", wide: true },
  { key: "code", label: "Kod" },
  { key: "description", label: "Açıqlama", type: "textarea", rows: 3, wide: true },
];

export default function CategoriesPanel() {
  return <EntityListPanel entity="categories" columns={columns} fields={fields} title="Kateqoriyalar" />;
}
