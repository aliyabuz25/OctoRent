import EntityListPanel from "../common/EntityListPanel.jsx";
const columns = [
  { title: "Müştəri Adı", field: "name", width: 220, minWidth: 160, sorter: "string" },
  { title: "Telefon", field: "phone", width: 150, minWidth: 110 },
  { title: "Email", field: "email", width: 180, minWidth: 130 },
  { title: "VÖEN", field: "taxNo", width: 140, minWidth: 100 },
  { title: "Ünvan", field: "address", minWidth: 200 },
  { title: "Qeyd", field: "note", width: 160, minWidth: 110 },
  { title: "Yaradılıb", field: "createdAt", width: 150, minWidth: 120 },
];
const fields=[
  {key:"name",label:"Ad *",wide:true},
  {key:"phone",label:"Telefon"},
  {key:"email",label:"Email"},
  {key:"taxNo",label:"VÖEN"},
  {key:"address",label:"Ünvan",type:"textarea",rows:2,wide:true},
  {key:"note",label:"Qeyd",type:"textarea",rows:2,wide:true},
];
export default function CustomersPanel(){ return <EntityListPanel entity="customers" columns={columns} fields={fields}/> }
