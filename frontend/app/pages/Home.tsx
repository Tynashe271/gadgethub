// app/pages/Home.tsx
'use client';

interface HomeProps {
  onShopClick: () => void;
  onFinderClick: () => void;
  onCompareClick: () => void;
  onServicesClick: () => void;
}

export function Home({ onShopClick, onFinderClick, onCompareClick, onServicesClick }: HomeProps) {
  return (
    <>
      <section className="hero shell">
        <div className="hero-copy">
          <div className="eyebrow">
            <i /> Zimbabwe&apos;s trusted tech destination
          </div>
          <h1>
            TECH THAT
            <br />
            MOVES <em>WITH YOU.</em>
          </h1>
          <p>
            iPhones, gadgets and electronics—curated with honest advice,
            flexible ways to pay and support that stays with you.
          </p>
          <div className="hero-actions">
            <button className="primary" onClick={onShopClick}>
              Shop now <span>↗</span>
            </button>
            <button className="text-link" onClick={onFinderClick}>
              Find my phone →
            </button>
          </div>
          <div className="proof">
            <div>
              <strong>24h</strong>
              <small>Dispatch</small>
            </div>
            <div>
              <strong>12 mo</strong>
              <small>Warranty</small>
            </div>
            <div>
              <strong>4.9/5</strong>
              <small>Customer rating</small>
            </div>
          </div>
        </div>
        <div className="hero-visual">
          <div className="orbit one" />
          <div className="orbit two" />
          <div className="phone">
            <div className="speaker" />
            <div className="screen">
              <span>09:41</span>
              <b>G/H</b>
              <small>
                THE NEXT
                <br />
                GENERATION
              </small>
            </div>
          </div>
          <span className="tag tag-one">VERIFIED DEVICES</span>
          <span className="tag tag-two">TRADE IN READY</span>
        </div>
      </section>
      <section className="marquee">
        <div>
          NEW RELEASES ✦ ECOCASH & ONEMONEY ✦ TRADE IN & UPGRADE ✦ EXPERT
          SUPPORT ✦ WARRANTY INCLUDED ✦
        </div>
      </section>
      <section className="home-options shell">
        <button onClick={onFinderClick}>
          <b>01</b>
          <span>Not sure what to buy?</span>
          <strong>Use Phone Finder →</strong>
        </button>
        <button onClick={onCompareClick}>
          <b>02</b>
          <span>Choosing between devices?</span>
          <strong>Compare specifications →</strong>
        </button>
        <button onClick={onServicesClick}>
          <b>03</b>
          <span>Already own your tech?</span>
          <strong>Trade in or get support →</strong>
        </button>
      </section>
    </>
  );
}
