import { useMemo, useState } from "react";
import { catalogCategories } from "../data/products";
import ProductCard from "./ProductCard";
import Icon from "./Icon";
import { useProducts } from "../context/ProductContext";
import { useShop } from "../context/ShopContext";
import { useHashRoute } from "../hooks/useHashRoute";
export default function ProductCatalog() {
  const { params, navigate } = useHashRoute();
  const { products } = useProducts();
  const { favorites } = useShop();
  const [sort, setSort] = useState("popular");
  const query = params.q || "";
  const category = params.category || "All products";
  const search = (value) => {
    const next = { ...params };
    if (value) next.q = value;
    else delete next.q;
    navigate("catalog", next);
  };
  const filtered = useMemo(() => {
    const list = products.filter(
      (p) =>
        !p.archived &&
        (!params.favorites || favorites.includes(p.id)) &&
        (category === "All products" ||
          p.category === category ||
          (category === "Bakery" && p.category !== "Tita Mars Eatery")) &&
        `${p.name} ${p.supplier}`
          .toLowerCase()
          .includes(query.toLowerCase()),
    );
    if (sort === "low") list.sort((a, b) => a.price - b.price);
    if (sort === "high") list.sort((a, b) => b.price - a.price);
    if (sort === "name") list.sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, [products, params.favorites, favorites, category, query, sort]);
  return (
    <section className="catalog-page container">
      <div className="breadcrumb">
        <a href="#home">Home</a>
        <Icon name="next" size={13} />
        <span>Menu</span>
      </div>
      <div className="catalog-layout">
        <aside className="catalog-sidebar">
          <h2>Categories</h2>
          {catalogCategories.map((name, i) => (
            <button
              key={name}
              aria-pressed={category === name && !params.favorites}
              className={
                category === name && !params.favorites ? "selected" : ""
              }
              onClick={() => navigate("catalog", { category: name })}
            >
              <Icon
                name={i === 0 ? "meal" : i === 1 ? "store" : "bread"}
                size={19}
              />
              <span>{name}</span>
            </button>
          ))}
          <button
            className={params.favorites ? "selected" : ""}
            aria-pressed={!!params.favorites}
            onClick={() => navigate("catalog", { favorites: "true" })}
          >
            <Icon name="heart" size={19} />
            <span>My favorites</span>
            <small>{favorites.length}</small>
          </button>
          <div className="catalog-help">
            <Icon name="store" size={26} />
            <strong>Fresh picks, every day.</strong>
            <p>Meals and baked goods from your neighborhood favorites.</p>
          </div>
        </aside>
        <div className="catalog-main">
          <header className="catalog-title">
            <div>
              <p className="eyebrow">Something delicious awaits</p>
              <h1>
                {params.favorites
                  ? "My Favorites"
                  : category === "All products"
                    ? "All Products"
                    : category}
              </h1>
              <p>{filtered.length} products to choose from</p>
            </div>
            <label className="sort-control">
              Sort by:
              <select
                aria-label="Sort products"
                value={sort}
                onChange={(e) => setSort(e.target.value)}
              >
                <option value="popular">Popular</option>
                <option value="low">Price: Low to high</option>
                <option value="high">Price: High to low</option>
                <option value="name">Name: A to Z</option>
              </select>
            </label>
          </header>
          <label className="catalog-search search-field">
            <Icon name="search" size={19} />
            <input
              aria-label="Search the menu"
              value={query}
              placeholder="Search your cravings..."
              onChange={(e) => search(e.target.value)}
            />
          </label>
          <div className="product-grid">
            {filtered.map((product) => (
              <ProductCard key={product.id} product={product} headingLevel={2} />
            ))}
          </div>
          {!filtered.length && (
            <div className="empty-catalog">
              <Icon name={params.favorites ? "heart" : "search"} size={42} />
              <h2>
                {params.favorites ? "Save your favorites" : "No products found"}
              </h2>
              <p>
                {params.favorites
                  ? "Tap the heart on any product to keep it here."
                  : "Try another product name or category."}
              </p>
              <a href="#catalog" className="btn-secondary">
                Browse all products
              </a>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
