import EntityListPanel from "../common/EntityListPanel.jsx";
const columns = [
  { title: "Anbar Adı", field: "name", width: 220, minWidth: 160, sorter: "string" },
  { title: "Kod", field: "code", width: 130, minWidth: 100 },
  { title: "Məsul Şəxs (Müdir)", field: "manager", width: 180, minWidth: 130 },
  { title: "Ünvan", field: "address", minWidth: 200 },
  { title: "Qeyd", field: "note", width: 160, minWidth: 110 },
  { title: "Yaradılıb", field: "createdAt", width: 150, minWidth: 120 },
];
const fields=[
  {key:"name",label:"Ad *",wide:true},
  {key:"code",label:"Kod"},
  {key:"manager",label:"Müdir"},
  {key:"address",label:"Ünvan",type:"textarea",rows:2,wide:true},
  {key:"note",label:"Qeyd",type:"textarea",rows:2,wide:true},
];
export default function WarehousesPanel(){ return <EntityListPanel entity="warehouses" columns={columns} fields={fields}/> }
