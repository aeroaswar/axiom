import { Link } from '@/i18n/navigation';

export default function NotFound() {
  return (
    <div className="site"><main className="wrap" style={{ padding: '120px 0' }}>
      <span className="kicker">404</span>
      <h1 style={{ fontSize: 40, marginTop: 14 }}>AXIOM</h1>
      <p style={{ marginTop: 18 }}><Link href="/" className="tlink">AXIOM</Link></p>
    </main></div>
  );
}
