import './globals.css';

export const metadata = {
  title: 'Smart Room Scheduler | UNESA',
  description: 'Smart Room Scheduler untuk approval booking ruang, monitoring real-time, dan manajemen user UNESA',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
