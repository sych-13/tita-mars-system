import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import Icon from "./Icon";

export default function PickupVerificationQr({ order }) {
  const [image, setImage] = useState("");
  const [error, setError] = useState("");
  const verificationUrl = useMemo(() => {
    const base = `${window.location.origin}${import.meta.env.BASE_URL}`;
    const query = new URLSearchParams({
      order: order.id,
      source: "pickup",
    });
    return `${base}#manage-orders?${query}`;
  }, [order.id]);

  useEffect(() => {
    let active = true;
    setImage("");
    setError("");
    QRCode.toDataURL(verificationUrl, {
      width: 320,
      margin: 2,
      errorCorrectionLevel: "M",
      color: { dark: "#24160f", light: "#ffffff" },
    })
      .then((value) => active && setImage(value))
      .catch(() => active && setError("Unable to prepare the pickup QR."));
    return () => {
      active = false;
    };
  }, [verificationUrl]);

  return (
    <section className="pickup-qr-card" aria-labelledby="pickup-qr-title">
      <div>
        <span className="eyebrow">Ready for pickup</span>
        <h3 id="pickup-qr-title">Show this QR to the staff</h3>
        <p>
          The code opens order <strong>{order.number}</strong> in the protected
          staff workspace for pickup verification.
        </p>
        {image && (
          <a
            className="text-link"
            href={image}
            download={`${order.number}-pickup-qr.png`}
          >
            <Icon name="download" size={16} /> Download pickup QR
          </a>
        )}
      </div>
      <div className="pickup-qr-image">
        {image ? (
          <img src={image} alt={`Pickup verification QR for ${order.number}`} />
        ) : error ? (
          <p role="alert">{error}</p>
        ) : (
          <span>Preparing QR…</span>
        )}
      </div>
    </section>
  );
}
