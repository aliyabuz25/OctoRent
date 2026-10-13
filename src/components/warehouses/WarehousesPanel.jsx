import EntityListPanel from "../common/EntityListPanel.jsx";
const columns=[
  {title:"Ad",field:"name",width:200,headerFilter:"input"},
  {title:"Kod",field:"code",width:120,headerFilter:"input"},
  {title:"Ünvan",field:"address",width:220,headerFilter:"input"},
  {title:"Müdir",field:"manager",width:160,headerFilter:"input"},
  {title:"Qeyd",field:"note",width:200,headerFilter:"input"},
  {title:"Yaradılıb",field:"createdAt",width:160},
];
const fields=[
  {key:"name",label:"Ad *",wide:true},
  {key:"code",label:"Kod"},
  {key:"manager",label:"Müdir"},
  {key:"address",label:"Ünvan",type:"textarea",rows:2,wide:true},
  {key:"note",label:"Qeyd",type:"textarea",rows:2,wide:true},
];
export default function WarehousesPanel(){ return <EntityListPanel entity="warehouses" columns={columns} fields={fields}/> }
