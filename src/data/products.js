import { imageForProduct } from "./productImages";
const eateryImage =
  "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=900&q=80";
const pastryImage =
  "https://images.unsplash.com/photo-1517433670267-08bbd4be890f?auto=format&fit=crop&w=900&q=80";
const loafImage =
  "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=900&q=80";
const pieImage =
  "https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?auto=format&fit=crop&w=900&q=80";

const today = "2026-09-12";
const makeProduct = (id, name, category, supplier, price, image) => ({
  id,
  name,
  category,
  supplier,
  price,
  stock: 20,
  available: true,
  archived: false,
  image: imageForProduct(id) || image,
  description: `A favorite from ${supplier}, ready for your next order.`,
  createdAt: today,
  updatedAt: today,
});

export const seedProducts = [
  makeProduct(
    "TME-001",
    "Adobo",
    "Tita Mars Eatery",
    "Tita Mars Eatery",
    70,
    eateryImage,
  ),
  makeProduct(
    "TME-002",
    "Chicken",
    "Tita Mars Eatery",
    "Tita Mars Eatery",
    70,
    eateryImage,
  ),
  makeProduct(
    "TME-003",
    "Sinigang",
    "Tita Mars Eatery",
    "Tita Mars Eatery",
    70,
    eateryImage,
  ),
  makeProduct(
    "TME-004",
    "Hotdog",
    "Tita Mars Eatery",
    "Tita Mars Eatery",
    12,
    eateryImage,
  ),
  makeProduct(
    "TME-005",
    "Lumpia",
    "Tita Mars Eatery",
    "Tita Mars Eatery",
    12,
    eateryImage,
  ),
  makeProduct(
    "TME-006",
    "Longanisa",
    "Tita Mars Eatery",
    "Tita Mars Eatery",
    12,
    eateryImage,
  ),
  makeProduct(
    "TME-007",
    "Rice",
    "Tita Mars Eatery",
    "Tita Mars Eatery",
    12,
    eateryImage,
  ),
  makeProduct(
    "TME-008",
    "Egg",
    "Tita Mars Eatery",
    "Tita Mars Eatery",
    12,
    eateryImage,
  ),
  makeProduct(
    "TME-009",
    "Fried Rice",
    "Tita Mars Eatery",
    "Tita Mars Eatery",
    15,
    eateryImage,
  ),
  makeProduct(
    "TME-010",
    "Pansit",
    "Tita Mars Eatery",
    "Tita Mars Eatery",
    15,
    eateryImage,
  ),
  makeProduct(
    "RBB-001",
    "Hopia Monggo",
    "Ribbonette's Bakeshoppe",
    "Ribbonette's Bakeshoppe",
    70,
    pastryImage,
  ),
  makeProduct(
    "RBB-002",
    "Hopia Ube Regular",
    "Ribbonette's Bakeshoppe",
    "Ribbonette's Bakeshoppe",
    70,
    pastryImage,
  ),
  makeProduct(
    "RBB-003",
    "Hopia de Leche",
    "Ribbonette's Bakeshoppe",
    "Ribbonette's Bakeshoppe",
    90,
    pastryImage,
  ),
  makeProduct(
    "RBB-004",
    "Banana Loaf",
    "Ribbonette's Bakeshoppe",
    "Ribbonette's Bakeshoppe",
    170,
    loafImage,
  ),
  makeProduct(
    "RBB-005",
    "Egg Pie",
    "Ribbonette's Bakeshoppe",
    "Ribbonette's Bakeshoppe",
    210,
    pieImage,
  ),
  makeProduct(
    "RBB-006",
    "Hokkaido Cheese Rolls",
    "Ribbonette's Bakeshoppe",
    "Ribbonette's Bakeshoppe",
    200,
    pastryImage,
  ),
  makeProduct(
    "GAB-001",
    "Cheese Roll",
    "Gabbis Bakeshop",
    "Gabbis Bakeshop",
    110,
    pastryImage,
  ),
  makeProduct(
    "GAB-002",
    "Ube Ensaymada",
    "Gabbis Bakeshop",
    "Gabbis Bakeshop",
    90,
    pastryImage,
  ),
  makeProduct(
    "GAB-003",
    "Ensaymada",
    "Gabbis Bakeshop",
    "Gabbis Bakeshop",
    90,
    pastryImage,
  ),
  makeProduct(
    "GAB-004",
    "Regular Combi Pie",
    "Gabbis Bakeshop",
    "Gabbis Bakeshop",
    80,
    pieImage,
  ),
  makeProduct(
    "GAB-005",
    "Ube Cake",
    "Gabbis Bakeshop",
    "Gabbis Bakeshop",
    160,
    pieImage,
  ),
  makeProduct(
    "GAB-006",
    "Banana Loaf",
    "Gabbis Bakeshop",
    "Gabbis Bakeshop",
    160,
    loafImage,
  ),
];

// Compatibility export while views migrate to ProductContext.
export const products = seedProducts;

export const catalogCategories = [
  "All products",
  "Tita Mars Eatery",
  "Ribbonette's Bakeshoppe",
  "Gabbis Bakeshop",
];
