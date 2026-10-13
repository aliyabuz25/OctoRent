import { ean13ToBits } from "../../lib/ean13.js";

export default function Barcode({ value, height = 56, module = 2 }) {
  const bits = ean13ToBits(value);
  if (!bits) {
    return <div className="barcode-invalid">Geçersiz EAN-13</div>;
  }

  const width = bits.length * module;

  return (
    <svg
      className="barcode"
      width={width}
      height={height + 14}
      viewBox={`0 0 ${width} ${height + 14}`}
      role="img"
      aria-label={`EAN-13: ${value}`}
    >
      <rect x="0" y="0" width={width} height={height + 14} fill="#fff" />
      {bits.split("").map((bit, index) =>
        bit === "1" ? (
          <rect key={index} x={index * module} y="0" width={module} height={height} fill="#000" />
        ) : null
      )}
      <text x="0" y={height + 12} fontSize="10" fontFamily="monospace">
        {String(value).slice(0, 1)}
      </text>
      <text x={module * 4} y={height + 12} fontSize="10" fontFamily="monospace">
        {String(value).slice(1, 7)}
      </text>
      <text x={width - module * 29} y={height + 12} fontSize="10" fontFamily="monospace">
        {String(value).slice(7)}
      </text>
    </svg>
  );
}
