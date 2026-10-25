const plans = [
  { name: "Free", price: "₦0", description: "Explore the content studio", features: ["Limited content ideas", "Manual content planner"] },
  { name: "Starter", price: "₦5,000", description: "For growing creators", features: ["AI content drafts", "Content planning", "Basic reporting"] },
  { name: "Professional", price: "₦15,000", description: "For active creators and small teams", features: ["More AI drafts", "Campaign planning", "Growth workflow"] },
];

export default function Home() {
  return (
    <main className="shell">
      <nav className="nav"><div className="brand"><span className="brandIcon">1M</span><span>1MBoost <b>AI</b></span></div><span className="pill">PROFESSIONAL STARTER</span></nav>
      <section className="hero">
        <p className="eyebrow">YOUR GROWTH. YOUR MILLION. YOUR FUTURE.</p>
        <h1>Grow with a plan.<br/><span>Create with AI.</span></h1>
        <p className="intro">Plan stronger content, organize campaigns, and track your social media growth from one workspace.</p>
        <div className="actions"><a className="button primary" href="#plans">Explore plans</a><a className="button secondary" href="/login?mode=up">Register free</a></div>
        <p className="fineprint">No guaranteed follower counts. Growth depends on your content, audience, platform rules, and advertising budget.</p>
      </section>
      <section className="featureGrid">
        <article className="feature"><div className="emoji">✍️</div><h3>AI Content Studio</h3><p>Draft captions, hooks, titles, and content ideas for your chosen platform.</p></article>
        <article className="feature"><div className="emoji">🗓️</div><h3>Content Planner</h3><p>Organize your publishing ideas and keep a consistent content workflow.</p></article>
        <article className="feature"><div className="emoji">📊</div><h3>Growth Workspace</h3><p>Prepare for analytics and approved social platform integrations.</p></article>
      </section>
      <section id="plans" className="plans"><div className="sectionTitle"><p className="eyebrow">SIMPLE PRICING CONCEPT</p><h2>Choose your starting point</h2></div><div className="planGrid">{plans.map((p) => <article className="plan" key={p.name}><h3>{p.name}</h3><div className="price">{p.price}<small>/ month</small></div><p>{p.description}</p><ul>{p.features.map(f => <li key={f}>✓ {f}</li>)}</ul><a className="button secondary" href="/login?mode=up">{p.name === "Free" ? "Register free" : "Register, then boost"}</a></article>)}</div><p className="fineprint">Register free to see everything. You only pay when you want a Boost. Payments work once Paystack is configured and tested.</p></section>
      <footer>© {new Date().getFullYear()} 1MBoost AI · Built for sustainable, authentic growth.</footer>
    </main>
  );
}
