// src/constants.js — single source of truth for LoanCert Buyer Companion styling

const withAlpha = (rgb) => (a) => `rgba(${rgb}, ${a})`;

// Brand palette (solid colors)
export const palette = {
  navy:      "#0D1B2E", // page / app background
  brand:     "#009444", // LoanCert green
  brandDark: "#007a38", // gradient end
  accent:    "#4EB3E8", // typing dots, section label
  white:     "#fff",
};

// Alpha helpers — call with an opacity, e.g. white(0.04).
// These reproduce the exact rgba values already used across the UI (no visual drift).
export const white = withAlpha("255, 255, 255");
export const green = withAlpha("0, 148, 68");
export const black = withAlpha("0, 0, 0");

export const font = {
  family: "system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
};

export const radius = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, pill: 999 };

export const gradients = {
  brand: `linear-gradient(135deg, ${palette.brand}, ${palette.brandDark})`,
};

// Reusable style fragments — spread into an inline style object, e.g. style={{ ...botBubble }}
export const botBubble = {
  background: white(0.04),
  border: `1px solid ${white(0.08)}`,
};

export const eyebrow = {
  fontSize: 10,
  textTransform: "uppercase",
};
