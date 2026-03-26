import "./globals.css";
import { ThemeProvider } from "@/lib/ThemeContext";

export const metadata = {
 title: "Samvaad",
description: "Connect, learn, and collaborate instantly with real-time video classrooms.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
