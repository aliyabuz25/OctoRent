import EntityListPanel from "../common/EntityListPanel.jsx";

const columns = [
  { title: "Ad", field: "name", width: 200, headerFilter: "input" },
  { title: "Kod", field: "code", width: 120, headerFilter: "input" },
  { title: "Ölkə", field: "country", width: 140, headerFilter: "input" },
  { title: "Açıqlama", field: "description", width: 260, headerFilter: "input" },
  { title: "Yaradılıb", field: "createdAt", width: 160 },
  { title: "Yenilənib", field: "updated", width: 120 },
];
const fields = [
  { key: "name", label: "Ad *", wide: true },
  { key: "code", label: "Kod" },
  { key: "country", label: "Ölkə" },
  { key: "description", label: "Açıqlama", type: "textarea", rows: 3, wide: true },
];
export default function BrandsPanel(){ return <EntityListPanel entity="brands" columns={columns} fields={fields}/> }
