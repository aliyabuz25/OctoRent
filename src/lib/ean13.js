export function ean13CheckDigit(base12) {
  const digits = String(base12).padStart(12, "0").slice(0, 12).split("").map(Number);
  const sum = digits.reduce((acc, digit, index) => acc + digit * (index % 2 === 0 ? 1 : 3), 0);
  return (10 - (sum % 10)) % 10;
}

export function isValidEAN13(code) {
  const value = String(code ?? "");
  if (!/^\d{13}$/.test(value)) return false;
  return ean13CheckDigit(value.slice(0, 12)) === Number(value[12]);
}

export function randomEAN13(prefix = "868") {
  let base = prefix;
  while (base.length < 12) base += Math.floor(Math.random() * 10);
  return base + String(ean13CheckDigit(base));
}

const L = ["0001101", "0011001", "0010011", "0111101", "0100011", "0110001", "0101111", "0111011", "0110111", "0001011"];
const G = ["0100111", "0110011", "0011011", "0100001", "0011101", "0111001", "0000101", "0010001", "0001001", "0010111"];
const R = ["1110010", "1100110", "1101100", "1000010", "1011100", "1001110", "1010000", "1000100", "1001000", "1110100"];
const PARITY = ["LLLLLL", "LLGLGG", "LLGGLG", "LLGGGL", "LGLLGG", "LGGLLG", "LGGGLL", "LGLGLG", "LGLGGL", "LGGLGL"];

export function ean13ToBits(code) {
  const value = String(code ?? "");
  if (!isValidEAN13(value)) return null;

  const digits = value.split("").map(Number);
  const parity = PARITY[digits[0]];
  let bits = "101";

  for (let i = 1; i <= 6; i += 1) {
    bits += parity[i - 1] === "L" ? L[digits[i]] : G[digits[i]];
  }
  bits += "01010";
  for (let i = 7; i <= 12; i += 1) {
    bits += R[digits[i]];
  }
  bits += "101";

  return bits;
}
