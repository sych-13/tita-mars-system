function Block({ className = "" }) {
  return <span aria-hidden="true" className={`skeleton-block ${className}`} />;
}

export function ProductGridSkeleton({ count = 6 }) {
  return (
    <div className="product-grid skeleton-product-grid" aria-label="Loading menu" aria-busy="true">
      {Array.from({ length: count }, (_, index) => (
        <article className="skeleton-product-card" key={index}>
          <Block className="skeleton-product-image" />
          <div className="skeleton-product-copy">
            <Block className="skeleton-line skeleton-line-short" />
            <Block className="skeleton-line skeleton-line-title" />
            <Block className="skeleton-line skeleton-line-price" />
            <Block className="skeleton-button" />
          </div>
        </article>
      ))}
    </div>
  );
}

export function OrderListSkeleton({ count = 3 }) {
  return (
    <div className="skeleton-order-list" aria-label="Loading orders" aria-busy="true">
      {Array.from({ length: count }, (_, index) => (
        <article className="simple-card skeleton-order-card" key={index}>
          <div className="skeleton-row">
            <div>
              <Block className="skeleton-line skeleton-line-title" />
              <Block className="skeleton-line skeleton-line-medium" />
            </div>
            <Block className="skeleton-pill" />
          </div>
          <div className="skeleton-order-images">
            <Block />
            <Block />
            <Block />
          </div>
          <div className="skeleton-row skeleton-order-actions">
            <Block className="skeleton-line skeleton-line-price" />
            <Block className="skeleton-button skeleton-button-small" />
          </div>
        </article>
      ))}
    </div>
  );
}

export default function PageSkeleton({ variant = "page" }) {
  const isCatalog = variant === "catalog";
  return (
    <section className={`page-skeleton page-section ${isCatalog ? "page-skeleton-catalog" : ""}`} aria-label="Loading page" aria-busy="true">
      <div className="container">
        <div className="skeleton-page-heading">
          <Block className="skeleton-line skeleton-eyebrow" />
          <Block className="skeleton-line skeleton-page-title" />
          <Block className="skeleton-line skeleton-page-description" />
        </div>
        {isCatalog ? <ProductGridSkeleton /> : <OrderListSkeleton />}
      </div>
    </section>
  );
}
