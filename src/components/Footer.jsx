import BrandMark from "./BrandMark";
import Icon from "./Icon";
export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-content">
        <BrandMark />
        <div className="footer-service">
          <Icon name="meal" size={27} />
          <span>
            Freshly cooked meals<small>Made for every day</small>
          </span>
        </div>
        <div className="footer-service">
          <Icon name="bread" size={27} />
          <span>
            Quality baked goods<small>From trusted bakeshops</small>
          </span>
        </div>
        <div className="footer-service">
          <Icon name="delivery" size={27} />
          <span>
            Pickup & delivery<small>Taytay & Cainta</small>
          </span>
        </div>
        <p className="footer-tagline">
          Good food. Fresh bakes.
          <br />
          Always.
        </p>
      </div>
      <div className="container footer-bottom">
        <small>© {new Date().getFullYear()} Tita Mars Eatery & Bakery</small>
        <nav>
          <a href="#about">About us</a>
          <a href="#access">Staff & owner access</a>
        </nav>
      </div>
    </footer>
  );
}
