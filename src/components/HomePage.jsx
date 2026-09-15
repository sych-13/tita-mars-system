import ProductCard from "./ProductCard";
import Icon from "./Icon";
import { useProducts } from "../context/ProductContext";
import { useShop } from "../context/ShopContext";
const popularIds = [
  "TME-001",
  "TME-002",
  "RBB-001",
  "RBB-004",
  "GAB-003",
  "TME-010",
];
export default function HomePage() {
  const { products } = useProducts();
  const { settings } = useShop();
  const popular = popularIds
    .map((id) => products.find((p) => p.id === id && !p.archived))
    .filter(Boolean);
  return (
    <div className="home-page container">
      <div className="welcome-strip">
        <span>
          <Icon name="location" size={16} />
          Made with love, close to home.
        </span>
        <span>
          <Icon name="clock" size={16} />
          {settings.hours}
        </span>
      </div>
      <div className="home-showcase">
        <section className="home-feature">
          <div className="home-hero">
            <img
              src="/assets/hero-food.png"
              className="hero-photo"
              alt="Filipino adobo with rice and freshly baked bread"
            />
            <div className="hero-copy">
              <p className="eyebrow">Kain na, sa Tita Mars!</p>
              <h1>
                Good Food
                <br />
                Brings People
                <br />
                <em>Together</em>
              </h1>
              <p>
                Freshly cooked meals and freshly baked goodies, all in one
                place.
              </p>
              <a className="btn-brand" href="#catalog">
                Order Now <Icon name="arrow" size={18} />
              </a>
            </div>
          </div>
          <div className="home-categories">
            <a href="#catalog?category=Tita+Mars+Eatery">
              <span className="category-icon">
                <Icon name="meal" weight="fill" size={24} />
              </span>
              <div>
                <strong>Eatery</strong>
                <small>Filipino meals</small>
              </div>
              <Icon name="next" size={16} />
            </a>
            <a href="#catalog?category=Bakery">
              <span className="category-icon">
                <Icon name="bread" weight="fill" size={24} />
              </span>
              <div>
                <strong>Bakery</strong>
                <small>Freshly baked goodies</small>
              </div>
              <Icon name="next" size={16} />
            </a>
            <a href="#catalog?favorites=true">
              <span className="category-icon">
                <Icon name="heart" weight="fill" size={24} />
              </span>
              <div>
                <strong>Favorites</strong>
                <small>Your saved cravings</small>
              </div>
              <Icon name="next" size={16} />
            </a>
          </div>
          <div className="home-note">
            <Icon name="delivery" size={22} />
            <span>
              Pick up your favorites or have them delivered.
              <small>Serving Taytay & Cainta · Cash or GCash</small>
            </span>
          </div>
        </section>
        <section className="popular-section">
          <header className="section-heading">
            <h2>Popular Products</h2>
            <a href="#catalog" className="text-link">
              View All <Icon name="arrow" size={16} />
            </a>
          </header>
          <div className="popular-grid">
            {popular.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      </div>
      <section className="how-home">
        <div>
          <p className="eyebrow">Simple steps. Great food.</p>
          <h2>A little easier. A lot tastier.</h2>
        </div>
        {[
          ["meal", "Pick your favorites", "Browse meals and baked goodies."],
          ["cart", "Make it your order", "Choose pickup or local delivery."],
          ["pickup", "Enjoy every bite", "Track your order until it’s ready."],
        ].map(([icon, title, copy], i) => (
          <article key={title}>
            <span className="step-label">0{i + 1}</span>
            <Icon name={icon} size={28} />
            <h3>{title}</h3>
            <p>{copy}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
