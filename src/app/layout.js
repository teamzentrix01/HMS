import "./globals.css";

export const metadata = {
  title: "JIGYASA HMS - Jigyasa Super Speciality Hospital",
  description: "Enterprise Multi-Department Hospital Management System",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900 font-sans">
        {children}
      </body>
    </html>
  );
}
