import { useEffect, useRef } from "react";
import { useTheme } from "../context/ThemeContext";
import { peso } from "../utils/formatters";
export default function SalesChart({ orders, line = false }) {
  const ref = useRef(null);
  const { theme } = useTheme();
  const points = Array.from({ length: 7 }, (_, i) => {
    const day = new Date();
    day.setDate(day.getDate() - 6 + i);
    return {
      label: day.toLocaleDateString("en-PH", { weekday: "short" }),
      value: orders
        .filter(
          (o) =>
            o.status === "Completed" &&
            new Date(
              o.inventoryDeductedAt || o.updatedAt || o.createdAt,
            ).toDateString() === day.toDateString(),
        )
        .reduce((s, o) => s + Number(o.total), 0),
    };
  });
  const description = points
    .map((p) => `${p.label}: ${peso.format(p.value)}`)
    .join(", ");
  useEffect(() => {
    const canvas = ref.current;
    const draw = () => {
      const width = canvas.parentElement.clientWidth;
      const height = 230;
      const ratio = window.devicePixelRatio || 1;
      canvas.width = width * ratio;
      canvas.height = height * ratio;
      canvas.style.width = width + "px";
      canvas.style.height = height + "px";
      const ctx = canvas.getContext("2d");
      ctx.scale(ratio, ratio);
      const muted = theme === "dark" ? "#a8afb3" : "#6f6862";
      const grid = theme === "dark" ? "#2d3439" : "#eee9e3";
      const left = 52,
        top = 20,
        bottom = 194,
        right = width - 15,
        max = Math.max(100, ...points.map((p) => p.value));
      const step = (right - left) / 7;
      ctx.font = "11px Inter, sans-serif";
      ctx.fillStyle = muted;
      ctx.textAlign = "right";
      for (let i = 0; i < 5; i++) {
        const y = top + ((bottom - top) * i) / 4;
        ctx.strokeStyle = grid;
        ctx.beginPath();
        ctx.moveTo(left, y);
        ctx.lineTo(right, y);
        ctx.stroke();
        ctx.fillText(
          Math.round(max * (1 - i / 4)).toLocaleString(),
          left - 10,
          y + 4,
        );
      }
      points.forEach((p, i) => {
        const x = left + step * (i + 0.5),
          y = bottom - (p.value / max) * (bottom - top);
        ctx.fillStyle = "#ff7117";
        if (!line)
          ctx.fillRect(
            x - step * 0.23,
            y,
            step * 0.46,
            Math.max(1, bottom - y),
          );
        ctx.fillStyle = muted;
        ctx.textAlign = "center";
        ctx.fillText(p.label, x, bottom + 23);
      });
      if (line) {
        ctx.beginPath();
        points.forEach((p, i) => {
          const x = left + step * (i + 0.5),
            y = bottom - (p.value / max) * (bottom - top);
          i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        });
        ctx.strokeStyle = "#ff7117";
        ctx.lineWidth = 2;
        ctx.stroke();
        points.forEach((p, i) => {
          ctx.beginPath();
          ctx.arc(
            left + step * (i + 0.5),
            bottom - (p.value / max) * (bottom - top),
            3,
            0,
            Math.PI * 2,
          );
          ctx.fillStyle = "#ff7117";
          ctx.fill();
        });
      }
    };
    const observer = new ResizeObserver(draw);
    observer.observe(canvas.parentElement);
    draw();
    return () => observer.disconnect();
  }, [description, theme, line]);
  return (
    <div className="sales-chart">
      <canvas
        ref={ref}
        role="img"
        aria-label={`Sales over the last seven days. ${description}`}
      />
      <p className="chart-caption">Completed orders · Philippine Peso (₱)</p>
    </div>
  );
}
