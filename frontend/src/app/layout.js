import "./globals.css";
import { ThemeProvider } from "@/lib/ThemeContext";

export const metadata = {
  title: "ClassRoom — P2P Online Classroom",
  description: "Real-time peer-to-peer video classroom",
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
