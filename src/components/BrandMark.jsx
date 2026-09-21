import { assetUrl } from "../utils/assets";

export default function BrandMark({
  compact = false,
  href = "#home",
  onClick,
}) {
  return (
    <a
      className={`brand-mark ${compact ? "compact" : ""}`}
      href={href}
      onClick={onClick}
      aria-label="Tita Mars home"
    >
      <img
        src={assetUrl("logo-horizontal.png")}
        alt="Tita Mars Eatery and Bakery"
      />
    </a>
  );
}
