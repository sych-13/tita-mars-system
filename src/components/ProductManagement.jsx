import { useRef, useState } from "react";
import DashboardLayout from "../layouts/DashboardLayout";
import { catalogCategories, seedProducts } from "../data/products";
import { useProducts } from "../context/ProductContext";
import { useShop } from "../context/ShopContext";
import { peso, prettyDate } from "../utils/formatters";
import Icon from "./Icon";
import Modal from "./Modal";
const blank = () => ({
  id: "",
  name: "",
  category: "Tita Mars Eatery",
  supplier: "Tita Mars Eatery",
  price: "",
  stock: 20,
  available: true,
  description: "",
  image: seedProducts[0].image,
});
export default function ProductManagement() {
  const {
    products,
    updateProduct,
    addProduct,
    archiveProduct,
    restoreProduct,
  } = useProducts();
  const { notify } = useShop();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All products");
  const [view, setView] = useState("active");
  const [draft, setDraft] = useState(null);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const fileInput = useRef(null);
  const filtered = products.filter(
    (p) =>
      (view === "archived" ? p.archived : !p.archived) &&
      (category === "All products" || p.category === category) &&
      `${p.name} ${p.supplier} ${p.id}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const open = (p) => {
    setDraft(p ? { ...p } : blank());
    setEditing(!!p);
    setError("");
  };
  const change = (e) => {
    const { name, value, type, checked } = e.target;
    setDraft({ ...draft, [name]: type === "checkbox" ? checked : value });
  };
  const save = async (e) => {
    e.preventDefault();
    if (!draft.name.trim() || !draft.supplier.trim()) {
      setError("Enter a product name and supplier.");
      return;
    }
    const values = {
      ...draft,
      name: draft.name.trim(),
      supplier: draft.supplier.trim(),
      price: Number(draft.price),
      stock: Number(draft.stock),
    };
    if (!editing) {
      const r = await addProduct(values);
      if (!r.ok) {
        setError(r.error);
        return;
      }
    } else {
      const r = await updateProduct(draft.id, values);
      if (!r.ok) {
        setError(r.error);
        return;
      }
    }
    notify(editing ? "Product updated." : "Product added.");
    setDraft(null);
  };
  const upload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    if (file.size > 1500000) {
      setError("Choose an image smaller than 1.5 MB for this local preview.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () =>
      setDraft((current) => ({ ...current, image: String(reader.result) }));
    reader.readAsDataURL(file);
  };
  return (
    <DashboardLayout>
      <header className="workspace-header">
        <div>
          <p className="eyebrow">Your menu, your way</p>
          <h1>Product Management</h1>
          <p>Manage your meals, bakery products, prices, and availability.</p>
        </div>
        <button className="btn-brand" onClick={() => open()}>
          <Icon name="plus" size={17} />
          Add Product
        </button>
      </header>
      <section className="simple-card">
        <div className="table-toolbar">
          <label className="search-field">
            <Icon name="search" size={17} />
            <input
              aria-label="Search products"
              placeholder="Search products..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <div className="product-table-filters">
            <select
              aria-label="Product category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {catalogCategories.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <div className="segmented-control">
              <button
                aria-pressed={view === "active"}
                className={view === "active" ? "selected" : ""}
                onClick={() => setView("active")}
              >
                Active
              </button>
              <button
                aria-pressed={view === "archived"}
                className={view === "archived" ? "selected" : ""}
                onClick={() => setView("archived")}
              >
                Archived
              </button>
            </div>
          </div>
        </div>
        <div
          className="table-scroll"
          tabIndex="0"
          role="region"
          aria-label="Scrollable data table"
        >
          <table className="data-table product-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Category / Supplier</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div className="table-product">
                      <img src={p.image} alt="" />
                      <span>
                        <strong>{p.name}</strong>
                        <small>{p.id}</small>
                      </span>
                    </div>
                  </td>
                  <td>{p.supplier}</td>
                  <td>{peso.format(p.price)}</td>
                  <td>{p.stock}</td>
                  <td>
                    <span
                      className={`stock-status ${p.archived ? "unavailable" : p.stock === 0 ? "out" : !p.available ? "unavailable" : p.stock <= 5 ? "low" : "available"}`}
                    >
                      {p.archived
                        ? "Archived"
                        : p.stock === 0
                          ? "Out of stock"
                          : !p.available
                            ? "Unavailable"
                            : p.stock <= 5
                              ? "Low stock"
                              : "Available"}
                    </span>
                  </td>
                  <td>
                    <div className="table-actions">
                      <button
                        className="icon-button"
                        aria-label={`Edit ${p.name} from ${p.supplier}`}
                        onClick={() => open(p)}
                      >
                        <Icon name="edit" size={17} />
                      </button>
                      {p.archived ? (
                        <button
                          className="text-link"
                          onClick={async () => {
                            const result = await restoreProduct(p.id);
                            notify(result.ok ? p.name + " restored." : result.error);
                          }}
                        >
                          Restore
                        </button>
                      ) : (
                        <button
                          className="icon-button"
                          aria-label={`Archive ${p.name} from ${p.supplier}`}
                          onClick={async () => {
                            const result = await archiveProduct(p.id);
                            notify(
                              result.ok
                                ? p.name +
                                  " archived. Restore it from the Archived tab."
                                : result.error,
                            );
                          }}
                        >
                          <Icon name="inventory" size={17} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!filtered.length && (
          <div className="dashboard-empty">
            <Icon name="search" size={35} />
            <p>No products match this view.</p>
          </div>
        )}
        <p className="table-footer">
          {filtered.length} products · Each supplier’s products are tracked
          separately
        </p>
      </section>
      {draft && (
        <Modal
          title={editing ? "Edit Product" : "Add Product"}
          onClose={() => setDraft(null)}
          className="product-modal"
        >
          <form onSubmit={save}>
            <div className="product-upload">
              <img src={draft.image} alt="Product preview" />
              <div>
                <strong>Product image</strong>
                <p>Choose a photo for your menu.</p>
                <button
                  className="btn-secondary"
                  type="button"
                  onClick={() => fileInput.current?.click()}
                >
                  <Icon name="upload" size={16} />
                  Upload Image
                </button>
                <input
                  ref={fileInput}
                  type="file"
                  hidden
                  accept="image/*"
                  onChange={upload}
                />
              </div>
            </div>
            <div className="form-grid">
              <label>
                Product ID
                <input
                  required
                  name="id"
                  disabled={editing}
                  value={draft.id}
                  onChange={change}
                  placeholder="Unique product ID"
                />
              </label>
              <label>
                Product name
                <input
                  required
                  name="name"
                  value={draft.name}
                  onChange={change}
                />
              </label>
              <label>
                Category
                <select
                  name="category"
                  value={draft.category}
                  onChange={change}
                >
                  {catalogCategories.slice(1).map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
              <label>
                Supplier
                <input
                  required
                  name="supplier"
                  value={draft.supplier}
                  onChange={change}
                />
              </label>
              <label>
                Price (₱)
                <input
                  required
                  type="number"
                  min="0"
                  step="1"
                  name="price"
                  value={draft.price}
                  onChange={change}
                />
              </label>
              <label>
                Stock quantity
                <input
                  required
                  type="number"
                  min="0"
                  step="1"
                  name="stock"
                  value={draft.stock}
                  onChange={change}
                />
              </label>
            </div>
            <label>
              Description
              <textarea
                name="description"
                rows="2"
                value={draft.description}
                onChange={change}
              />
            </label>
            <label>
              Image URL
              <input name="image" value={draft.image} onChange={change} />
            </label>
            <label className="availability-toggle">
              <input
                type="checkbox"
                name="available"
                checked={draft.available}
                disabled={Number(draft.stock) === 0 || draft.archived}
                onChange={change}
              />
              <span>Available to customers</span>
            </label>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <button className="btn-brand full-button">Save Product</button>
            {editing && (
              <small className="editor-meta">
                Created {prettyDate(draft.createdAt)} · Updated{" "}
                {prettyDate(draft.updatedAt)}
              </small>
            )}
          </form>
        </Modal>
      )}
    </DashboardLayout>
  );
}
