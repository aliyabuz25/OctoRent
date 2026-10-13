import EntityListPanel from "../common/EntityListPanel.jsx";
const columns=[
  {title:"Ad",field:"name",width:200,headerFilter:"input"},
  {title:"VÖEN",field:"taxNo",width:120,headerFilter:"input"},
  {title:"Telefon",field:"phone",width:140,headerFilter:"input"},
  {title:"Email",field:"email",width:180,headerFilter:"input"},
  {title:"Ünvan",field:"address",width:220,headerFilter:"input"},
  {title:"Qeyd",field:"note",width:200,headerFilter:"input"},
  {title:"Yaradılıb",field:"createdAt",width:160},
];
const fields=[
  {key:"name",label:"Ad *",wide:true},
  {key:"taxNo",label:"VÖEN"},
  {key:"phone",label:"Telefon"},
  {key:"email",label:"Email"},
  {key:"address",label:"Ünvan",type:"textarea",rows:2,wide:true},
  {key:"note",label:"Qeyd",type:"textarea",rows:2,wide:true},
];
export default function SuppliersPanel(){ return <EntityListPanel entity="suppliers" columns={columns} fields={fields}/> }
