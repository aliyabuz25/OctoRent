export const UNITS = ["Adet", "Kutu", "Paket", "Kg", "Litre", "Metre"];

export const emptyProduct = {
  sku: "",
  ean13: "",
  name: "",
  category: "",
  brand: "",
  unit: "Adet",
  quantity: 0,
  minStock: 5,
  price: 0,
  cost: 0,
  location: "",
  supplier: "",
  description: "",
};

export const normalizeProduct = (product) => ({ ...emptyProduct, ...product });

export const compactProduct = (form) => {
  const clean = Object.fromEntries(Object.keys(emptyProduct).map((key) => [key, form[key]]));
  if (form.id) clean.id = form.id;
  return {
    ...clean,
    quantity: Number(form.quantity) || 0,
    minStock: Number(form.minStock) || 0,
    price: Number(form.price) || 0,
    cost: Number(form.cost) || 0,
  };
};
