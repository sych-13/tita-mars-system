import { useShop } from "../context/ShopContext";
import { assetUrl } from "../utils/assets";
import Icon from "./Icon";
export default function AboutPage() {
  const { settings } = useShop();
  const mapQuery = encodeURIComponent(settings.address);
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${mapQuery}`;
  return (
    <section className="container page-section about-page">
      <div className="about-grid">
        <div>
          <p className="eyebrow">Welcome to our table</p>
          <h1>
            Good Food.
            <br />
            Fresh Bakes. Always.
          </h1>
          <p className="page-lead">
            Masarap na pagkain, sariwang bakery, para sa’yo!
          </p>
          <p>
            From comforting Filipino meals to bakery favorites from Ribbonette’s
            Bakeshoppe and Gabbis Bakeshop, Tita Mars brings a little joy to
            every day.
          </p>
          <div className="about-points">
            {[
              [
                "meal",
                "Freshly cooked meals",
                "Familiar favorites at everyday prices.",
              ],
              [
                "bread",
                "Quality baked goods",
                "Carefully selected from our partner bakeshops.",
              ],
              [
                "delivery",
                "Easy pickup & delivery",
                "Serving our neighbors in Taytay and Cainta.",
              ],
            ].map(([icon, title, copy]) => (
              <article key={title}>
                <Icon name={icon} size={25} />
                <div>
                  <strong>{title}</strong>
                  <span>{copy}</span>
                </div>
              </article>
            ))}
          </div>
        </div>
        <aside className="about-contact-card">
          <img
            src={assetUrl("hero-food.png")}
            alt="Adobo, rice and fresh bread"
            style={{ borderRadius: 9, width: "100%" }}
          />
          <h2>Visit Tita Mars</h2>
          <p>
            <Icon name="location" size={17} /> {settings.address}
          </p>
          <div className="store-map">
            <iframe
              title="Tita Mars location on Google Maps"
              src={`https://www.google.com/maps?q=${mapQuery}&output=embed`}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
          <a
            className="btn-secondary map-directions-link"
            href={directionsUrl}
            target="_blank"
            rel="noreferrer"
          >
            <Icon name="location" size={17} /> Get directions
          </a>
          <p>
            <Icon name="pending" size={17} /> {settings.hours}
          </p>
          {settings.phone && (
            <a className="text-link" href={`tel:${settings.phone}`}>
              <Icon name="phone" size={17} />
              {settings.phone}
            </a>
          )}
          {settings.email && (
            <a className="text-link" href={`mailto:${settings.email}`}>
              <Icon name="email" size={17} />
              {settings.email}
            </a>
          )}
          <a className="btn-brand" href="#catalog">
            Browse Menu <Icon name="arrow" size={17} />
          </a>
        </aside>
      </div>
    </section>
  );
}
