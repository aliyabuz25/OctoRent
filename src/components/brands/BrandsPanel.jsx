import EntityListPanel from "../common/EntityListPanel.jsx";

const columns = [
  { title: "Marka Adı", field: "name", width: 220, minWidth: 160, sorter: "string" },
  { title: "Kod", field: "code", width: 130, minWidth: 100, sorter: "string" },
  { title: "Ölkə", field: "country", width: 150, minWidth: 110 },
  { title: "Açıqlama", field: "description", minWidth: 240 },
  { title: "Yaradılıb", field: "createdAt", width: 160, minWidth: 130 },
  { title: "Yenilənib", field: "updated", width: 140, minWidth: 120 },
];
const fields = [
  { key: "name", label: "Ad *", wide: true },
  { key: "code", label: "Kod" },
  { key: "country", label: "Ölkə" },
  { key: "description", label: "Açıqlama", type: "textarea", rows: 3, wide: true },
];
export default function BrandsPanel(){ return <EntityListPanel entity="brands" columns={columns} fields={fields}/> }
