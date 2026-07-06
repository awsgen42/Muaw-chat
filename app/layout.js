import "./globals.css";

export const metadata = {
  title: "MUAW — Messenger",
  description: "Private, end-to-end encrypted messaging.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0B141A",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  );
}
