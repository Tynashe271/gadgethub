// app/pages/Footer.tsx
'use client';

interface FooterProps {
  onNavigate: (view: string) => void;
  onRequestLogin: () => void;
}

export function Footer({ onNavigate, onRequestLogin }: FooterProps) {
  return (
    <footer>
      <div className="shell footer-grid">
        <div>
          <button className="brand-button" onClick={() => onNavigate('home')}>
            GADGET<span>HUB</span>
          </button>
          <p>Good tech. Better living.</p>
        </div>
        <div>
          <b>DISCOVER</b>
          <button onClick={() => onNavigate('shop')}>Shop</button>
          <button onClick={() => onNavigate('finder')}>Phone Finder</button>
          <button onClick={() => onNavigate('compare')}>Compare</button>
        </div>
        <div>
          <b>HELP</b>
          <button onClick={() => onNavigate('services')}>Trade-in</button>
          <button onClick={() => onNavigate('services')}>Repairs</button>
          <button onClick={() => onNavigate('account')}>My account</button>
          <button onClick={() => onNavigate('feedback')}>Rate Us</button>
        </div>
        <div className="newsletter">
          <b>THE GOOD STUFF, OCCASIONALLY.</b>
          <div>
            <input
              aria-label="Email address"
              placeholder="Your email address"
              type="email"
              onFocus={onRequestLogin}
            />
            <button aria-label="Subscribe">→</button>
          </div>
        </div>
      </div>
      <div className="shell legal">
        © 2026 GadgetHub <span>Privacy · Terms · Warranty · FAQ</span>
      </div>
    </footer>
  );
}
