import './globals.css';
import { Nav } from '../components/Nav';

export const metadata = {
  title: 'Fantasy ClawBall Demo',
  description: 'Agentic league demo with payment guardrails',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <main>
          <h1>Fantasy ClawBall</h1>
          <p>Private prototype • payment guardrails • playful agent banter</p>
          <Nav />
          {children}
        </main>
      </body>
    </html>
  );
}
