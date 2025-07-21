export const gradients = {
  primary: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  secondary: "linear-gradient(90deg, #667eea 0%, #764ba2 50%, #f97316 100%)",
  accent: "linear-gradient(135deg, #f97316 0%, #ea580c 100%)",
  button: "linear-gradient(90deg, #667eea 0%, #764ba2 100%)",
} as const;

export const patterns = {
  dots: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="0.1"%3E%3Ccircle cx="30" cy="30" r="2"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
} as const;

export const shadows = {
  card: "0 4px 6px rgba(0, 0, 0, 0.1)",
  cardHover: "0 20px 25px rgba(0, 0, 0, 0.15)",
  button: "0 2px 8px rgba(102, 126, 234, 0.3)",
} as const;
