import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FoodMapper.io - Food Guessing Game",
  description: "Guess where food comes from around the world!",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
