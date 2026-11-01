import { useState, useRef } from 'react';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';
import { ArrowUpRight, Asterisk, Film, BookOpen, Ticket, Mail, ArrowDown } from 'lucide-react';

/* ---------------------------------- DATA ---------------------------------- */

const NAV = [
  { id: 'folio', label: 'The Winter Folio', index: '01', icon: BookOpen },
  { id: 'voices', label: 'Voices on Record', index: '02', icon: Film },
  { id: 'offer', label: 'Archive Offer', index: '03', icon: Ticket },
  { id: 'contact', label: 'Correspondence', index: '04', icon: Mail },
];

const TESTIMONIALS = [
  {
    n: '01',
    quote:
      'They approached our restoration the way a scholar approaches a primary source — with patience, with doubt, and finally with conviction. The print we screened in Telluride was not a copy of the film. It was the film, remembered correctly.',
    name: 'Margaret Okafor',
    role: 'Director of Programming',
    org: 'Telluride Film Festival',
    project: 'Restoration · "The Quiet Field" (1973)',
    img: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=480&fit=crop',
    pastel: '#F3E7C9',
    hot: '#E8A200',
    ink: '#3D3520',
  },
  {
    n: '02',
    quote:
      'Most production houses sell you confidence. Hartline sold us questions — better ones each week — until the documentary stopped being about my grandfather and started being about memory itself. That is editorial intelligence you cannot fake.',
    name: 'Daniel Reyes-Whitfield',
    role: 'Subject & Executive Producer',
    org: '"Salt in the Archive" (2024)',
    project: 'Feature documentary · 94 min',
    img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=480&fit=crop',
    pastel: '#F0DBDD',
    hot: '#D6453D',
    ink: '#46282B',
  },
  {
    n: '03',
    quote:
      'Their colourists read the script before they touched a single frame. I have worked in distribution for nineteen years and I can count on one hand the partners who treat light as an argument rather than a decoration.',
    name: 'Anneke Visser',
    role: 'Head of Acquisitions',
    org: 'Mubi — Northern Europe',
    project: 'Grade & finishing · 6 titles, 2022–24',
    img: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=480&fit=crop',
    pastel: '#DDE7D6',
    hot: '#2E7D32',
    ink: '#26331F',
  },
  {
    n: '04',
    quote:
      'We came for a trailer cut and stayed for a thesis on our own film. The Winter Folio sessions paid for themselves before the second meeting ended — they saw the third act we had been refusing to admit was there.',
    name: 'Priya Anand',
    role: 'Writer / Director',
    org: '"Lanternfish" — Sundance NEXT 2025',
    project: 'Edit consultancy · Folio Session, Dec 2024',
    img: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=400&h=480&fit=crop',
    pastel: '#D8E2EC',
    hot: '#1F5FBF',
    ink: '#1F2A3A',
  },
];

/* ----------------------------- TESTIMONIAL CARD ---------------------------- */

function QuoteCard({ t, flip }) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const numY = useTransform(scrollYProgress, [0, 1], [120, -120]);
  const imgY = useTransform(scrollYProgress, [0, 1], [60, -60]);
  const quoteY = useTransform(scrollYProgress, [0, 1], [30, -30]);
  const markRot = useTransform(scrollYProgress, [0, 1], [-8, 14]);

  return (
    <article
      ref={ref}
      className="quote-card group relative overflow-hidden border border-[#1C1A16]/15 transition-colors duration-500"
      style={{ '--pastel': t.pastel, '--hot': t.hot, '--cardink': t.ink, backgroundColor: t.pastel }}
    >
      {/* ghost numeral — deepest parallax layer */}
      <motion.span
        aria-hidden
        style={{ y: numY }}
        className="ghost-num pointer-events-none absolute -right-6 top-1/2 -translate-y-1/2 select-none leading-none"
      >
        {t.n}
      </motion.span>

      {/* asterisk mark — mid layer */}
      <motion.div
        aria-hidden
        style={{ y: imgY, rotate: markRot }}
        className={`absolute ${flip ? 'right-10' : 'left-10'} top-8 hidden md:block`}
      >
        <Asterisk size={44} strokeWidth={1.25} className="text-[#1C1A16]/30 transition-colors duration-500 group-hover:text-white/70" />
      </motion.div>

      <div className={`relative grid grid-cols-1 gap-10 px-8 py-12 md:grid-cols-12 md:gap-8 md:px-14 md:py-16 ${flip ? '' : ''}`}>
        {/* meta column */}
        <motion.div
          style={{ y: imgY }}
          className={`md:col-span-4 ${flip ? 'md:order-2 md:pl-6' : 'md:pr-6'} flex flex-col justify-between gap-10`}
        >
          <div>
            <div className="flex items-baseline gap-3">
              <span className="font-mono-card text-[11px] tracking-[0.3em] text-[#1C1A16]/60 transition-colors duration-500 group-hover:text-white/80">
                NO. {t.n}
              </span>
              <span className="h-px flex-1 bg-[#1C1A16]/25 transition-colors duration-500 group-hover:bg-white/50" />
            </div>
            <p className="font-mono-card mt-4 text-[11px] uppercase tracking-[0.22em] leading-relaxed text-[#1C1A16]/70 transition-colors duration-500 group-hover:text-white/85">
              {t.project}
            </p>
          </div>

          <div className="flex items-end gap-5">
            <div className="relative h-28 w-24 shrink-0 overflow-hidden">
              <img
                src={t.img}
                alt={t.name}
                className="h-full w-full object-cover grayscale transition-all duration-700 group-hover:grayscale-0 group-hover:scale-105"
              />
              <span className="absolute inset-0 mix-blend-multiply transition-opacity duration-500" style={{ backgroundColor: t.pastel, opacity: 0.35 }} />
            </div>
            <div className="pb-1">
              <p className="font-display text-xl leading-tight transition-colors duration-500 group-hover:text-white" style={{ color: t.ink }}>
                {t.name}
              </p>
              <p className="mt-1.5 text-[12px] uppercase tracking-[0.14em] text-[#1C1A16]/65 transition-colors duration-500 group-hover:text-white/80">
                {t.role}
              </p>
              <p className="text-[12px] uppercase tracking-[0.14em] text-[#1C1A16]/45 transition-colors duration-500 group-hover:text-white/65">
                {t.org}
              </p>
            </div>
          </div>
        </motion.div>

        {/* quote column */}
        <motion.div style={{ y: quoteY }} className={`md:col-span-8 ${flip ? 'md:order-1 md:border-r md:pr-12' : 'md:border-l md:pl-12'} border-[#1C1A16]/20 transition-colors duration-500 group-hover:border-white/40`}>
          <p
            className="font-display text-[26px] leading-[1.22] md:text-[34px] md:leading-[1.18] transition-colors duration-500 group-hover:text-white"
            style={{ color: t.ink }}
          >
            <span className="mr-1 align-top text-[0.8em] opacity-50">“</span>
            {t.quote}
            <span className="ml-1 align-top text-[0.8em] opacity-50">”</span>
          </p>
        </motion.div>
      </div>

      {/* bottom rule + flag */}
      <div className="relative flex items-center justify-between border-t border-[#1C1A16]/15 px-8 py-3 transition-colors duration-500 group-hover:border-white/30 md:px-14">
        <span className="font-mono-card text-[10px] uppercase tracking-[0.3em] text-[#1C1A16]/50 transition-colors duration-500 group-hover:text-white/75">
          On the record · Hartline & Vesper
        </span>
        <span className="font-mono-card text-[10px] uppercase tracking-[0.3em] text-[#1C1A16]/50 transition-colors duration-500 group-hover:text-white/75">
          Folio W·25
        </span>
      </div>
    </article>
  );
}

/* ---------------------------------- APP ----------------------------------- */

export default function App() {
  const [active, setActive] = useState('voices');
  const heroRef = useRef(null);
  const { scrollYProgress: heroProg } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const heroTitleY = useTransform(heroProg, [0, 1], [0, -90]);
  const heroPlateY = useTransform(heroProg, [0, 1], [0, 120]);
  const heroRuleY = useTransform(heroProg, [0, 1], [0, -40]);

  const offerRef = useRef(null);
  const { scrollYProgress: offerProg } = useScroll({ target: offerRef, offset: ['start end', 'end start'] });
  const offerNumY = useTransform(offerProg, [0, 1], [140, -140]);
  const offerCardY = useTransform(offerProg, [0, 1], [50, -50]);

  const { scrollYProgress: pageProg } = useScroll();
  const progressScale = useSpring(pageProg, { stiffness: 120, damping: 30 });

  return (
    <div className="min-h-screen bg-[#F2EEE5] text-[#1C1A16] antialiased">
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link
        href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;0,9..144,500;0,9..144,600;1,9..144,300;1,9..144,400&family=Archivo:wght@400;500;600&family=Space+Mono:wght@400;700&display=swap"
        rel="stylesheet"
      />
      <style
        dangerouslySetInnerHTML={{
          __html: `
        :root { --paper: #F2EEE5; }
        body { background: var(--paper); }
        .font-display { font-family: 'Fraunces', Georgia, serif; }
        .font-sans-ed { font-family: 'Archivo', system-ui, sans-serif; }
        .font-mono-card { font-family: 'Space Mono', monospace; }

        .paper-noise::before {
          content: ''; position: fixed; inset: 0; pointer-events: none; z-index: 60; opacity: .35;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.05'/%3E%3C/svg%3E");
        }

        .ghost-num {
          font-family: 'Fraunces', serif; font-weight: 300; font-style: italic;
          font-size: clamp(220px, 30vw, 420px); color: rgba(28,26,22,0.06);
          transition: color .5s ease;
        }
        .quote-card:hover { background-color: var(--hot) !important; border-color: transparent; }
        .quote-card:hover .ghost-num { color: rgba(255,255,255,0.16); }

        .nav-pill { transition: background-color .35s ease, color .35s ease, transform .35s ease; }
        .nav-pill:hover { transform: translateX(4px); }

        ::selection { background: #E8A200; color: #1C1A16; }
        html { scroll-behavior: smooth; }
        ::-webkit-scrollbar { width: 10px; }
        ::-webkit-scrollbar-track { background: #E7E1D4; }
        ::-webkit-scrollbar-thumb { background: #1C1A16; border: 3px solid #E7E1D4; border-radius: 99px; }

        @keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .marquee-track { animation: marquee 28s linear infinite; }

        .offer-block:hover { background-color: #FF4D2E; color: #FFF6EC; }
        .offer-block { transition: background-color .5s ease, color .5s ease; }
        .offer-block:hover .offer-muted { color: rgba(255,246,236,.75); }
        .offer-block:hover .offer-rule { background: rgba(255,246,236,.4); }
      `,
        }}
      />

      <div className="paper-noise" />

      {/* reading progress */}
      <motion.div className="fixed left-0 top-0 z-50 h-[3px] w-full origin-left bg-[#1C1A16]" style={{ scaleX: progressScale }} />

      <div className="font-sans-ed flex">
        {/* ------------------------------ SIDEBAR ------------------------------ */}
        <aside className="fixed left-0 top-0 z-40 hidden h-screen w-[272px] flex-col justify-between border-r border-[#1C1A16]/15 bg-[#F2EEE5] px-7 py-9 lg:flex">
          <div>
            <div className="flex items-start justify-between">
              <div>
                <p className="font-display text-[26px] leading-[0.95]">Hartline<br />&amp; Vesper</p>
                <p className="font-mono-card mt-3 text-[10px] uppercase tracking-[0.32em] text-[#1C1A16]/55">Pictures · Est. 2009</p>
              </div>
              <Asterisk size={20} strokeWidth={1.5} className="mt-1 text-[#1C1A16]/60" />
            </div>

            <div className="mt-12 space-y-1.5">
              {NAV.map((item) => {
                const Icon = item.icon;
                const isActive = active === item.id;
                return (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    onClick={() => setActive(item.id)}
                    className="nav-pill flex items-center justify-between border px-4 py-3 text-[13px]"
                    style={{
                      borderColor: isActive ? '#1C1A16' : 'rgba(28,26,22,0.18)',
                      backgroundColor: isActive ? '#1C1A16' : 'transparent',
                      color: isActive ? '#F2EEE5' : '#1C1A16',
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = ['#E8A200', '#D6453D', '#2E7D32', '#1F5FBF'][NAV.indexOf(item) % 4];
                        e.currentTarget.style.color = '#FFFFFF';
                        e.currentTarget.style.borderColor = 'transparent';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.color = '#1C1A16';
                        e.currentTarget.style.borderColor = 'rgba(28,26,22,0.18)';
                      }
                    }}
                  >
                    <span className="flex items-center gap-3">
                      <Icon size={14} strokeWidth={1.75} />
                      {item.label}
                    </span>
                    <span className="font-mono-card text-[10px] opacity-60">{item.index}</span>
                  </a>
                );
              })}
            </div>

            <div className="mt-12 border-t border-[#1C1A16]/15 pt-6">
              <p className="font-mono-card text-[10px] uppercase tracking-[0.28em] text-[#1C1A16]/55">Currently in season</p>
              <p className="font-display mt-3 text-[17px] italic leading-snug">
                The Winter Folio — our annual archive sale &amp; consultancy window.
              </p>
              <p className="mt-2 text-[12px] leading-relaxed text-[#1C1A16]/60">Open 1 December — 12 January. Six commissions only.</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex gap-2">
              {['#F3E7C9', '#F0DBDD', '#DDE7D6', '#D8E2EC'].map((c) => (
                <span key={c} className="h-3 w-full" style={{ backgroundColor: c }} />
              ))}
            </div>
            <p className="font-mono-card text-[10px] uppercase tracking-[0.24em] text-[#1C1A16]/45">Vol. XVI · Winter 2025 · London / Lisbon</p>
          </div>
        </aside>

        {/* ---------------------------- CONTENT AREA ---------------------------- */}
        <main className="w-full lg:ml-[272px]">
          {/* mobile masthead */}
          <div className="flex items-center justify-between border-b border-[#1C1A16]/15 px-6 py-5 lg:hidden">
            <p className="font-display text-xl">Hartline &amp; Vesper</p>
            <p className="font-mono-card text-[10px] uppercase tracking-[0.3em] text-[#1C1A16]/55">Folio W·25</p>
          </div>

          {/* HERO */}
          <section id="folio" ref={heroRef} className="relative overflow-hidden border-b border-[#1C1A16]/15 px-6 pb-20 pt-14 md:px-14 md:pt-20">
            <motion.div style={{ y: heroRuleY }} className="flex items-center justify-between">
              <p className="font-mono-card text-[11px] uppercase tracking-[0.34em] text-[#1C1A16]/60">Section 02 — Voices on record</p>
              <p className="font-mono-card hidden text-[11px] uppercase tracking-[0.34em] text-[#1C1A16]/60 md:block">Testimony, gathered with care</p>
            </motion.div>

            <div className="mt-10 grid grid-cols-1 gap-10 md:grid-cols-12">
              <motion.div style={{ y: heroTitleY }} className="md:col-span-8">
                <h1 className="font-display text-[15vw] leading-[0.92] tracking-[-0.01em] md:text-[88px]">
                  What the<br />
                  <span className="italic font-light">work</span> says,<br />
                  in other<br />
                  people's <span className="italic font-light">words.</span>
                </h1>
                <p className="mt-8 max-w-md text-[15px] leading-relaxed text-[#1C1A16]/70">
                  Each winter we open the archive, lower the rate, and let our collaborators speak for us.
                  Four entries from the record — programmers, producers, and directors who trusted us with
                  the difficult part of their films.
                </p>
                <div className="mt-8 flex items-center gap-4">
                  <a
                    href="#offer"
                    className="group inline-flex items-center gap-2 border border-[#1C1A16] px-5 py-3 text-[13px] uppercase tracking-[0.18em] transition-colors duration-300 hover:bg-[#1F5FBF] hover:border-[#1F5FBF] hover:text-white"
                  >
                    See the Winter Offer <ArrowUpRight size={15} className="transition-transform duration-300 group-hover:rotate-45" />
                  </a>
                  <span className="font-mono-card text-[11px] uppercase tracking-[0.2em] text-[#1C1A16]/50">– 30% thru Jan 12</span>
                </div>
              </motion.div>

              <motion.div style={{ y: heroPlateY }} className="relative md:col-span-4">
                <div className="relative ml-auto w-full max-w-[300px]">
                  <img
                    src="https://images.unsplash.com/photo-1485846234645-a62644f84728?w=600&h=760&fit=crop"
                    alt="Projection room"
                    className="h-[380px] w-full object-cover grayscale"
                  />
                  <span className="absolute inset-0 bg-[#D8E2EC] opacity-40 mix-blend-multiply" />
                  <div className="absolute -bottom-5 -left-5 bg-[#1C1A16] px-4 py-3">
                    <p className="font-mono-card text-[10px] uppercase tracking-[0.26em] text-[#F2EEE5]">Plate I — The grading suite, Lisbon</p>
                  </div>
                </div>
              </motion.div>
            </div>

            <div className="mt-20 flex items-center gap-3 text-[#1C1A16]/50">
              <ArrowDown size={14} />
              <span className="font-mono-card text-[10px] uppercase tracking-[0.3em]">Scroll the record</span>
              <span className="h-px flex-1 bg-[#1C1A16]/20" />
            </div>
          </section>

          {/* marquee */}
          <div className="overflow-hidden border-b border-[#1C1A16]/15 bg-[#1C1A16] py-3">
            <div className="marquee-track flex w-max gap-10 whitespace-nowrap">
              {[...Array(2)].map((_, i) => (
                <span key={i} className="font-mono-card flex items-center gap-10 text-[11px] uppercase tracking-[0.3em] text-[#F2EEE5]/85">
                  <span>The Winter Folio · Dec 1 — Jan 12</span> <Asterisk size={12} />
                  <span>Restorations · Grades · Edit Consultancy at –30%</span> <Asterisk size={12} />
                  <span>Six commissions only</span> <Asterisk size={12} />
                  <span>Code: FOLIO·W25</span> <Asterisk size={12} />
                </span>
              ))}
            </div>
          </div>

          {/* TESTIMONIALS */}
          <section id="voices" className="space-y-10 px-6 py-16 md:px-14 md:py-24">
            <div className="flex items-end justify-between">
              <h2 className="font-display text-4xl md:text-5xl">Voices on record</h2>
              <p className="font-mono-card hidden text-[11px] uppercase tracking-[0.3em] text-[#1C1A16]/55 md:block">Entries 01 — 04 of 23</p>
            </div>
            {TESTIMONIALS.map((t, i) => (
              <QuoteCard key={t.n} t={t} flip={i % 2 === 1} />
            ))}
          </section>

          {/* OFFER */}
          <section id="offer" ref={offerRef} className="relative overflow-hidden border-t border-[#1C1A16]/15 px-6 py-20 md:px-14 md:py-28">
            <motion.span
              aria-hidden
              style={{ y: offerNumY }}
              className="font-display pointer-events-none absolute -left-4 top-1/2 -translate-y-1/2 select-none text-[34vw] font-light italic leading-none text-[#1C1A16]/[0.05] md:text-[300px]"
            >
              –30
            </motion.span>

            <motion.div style={{ y: offerCardY }} className="relative mx-auto max-w-3xl">
              <div className="offer-block border border-[#1C1A16]/20 bg-[#F0DBDD] px-8 py-12 md:px-14 md:py-16">
                <p className="offer-muted font-mono-card text-[11px] uppercase tracking-[0.32em] text-[#1C1A16]/60">Seasonal notice · Section 03</p>
                <h3 className="font-display mt-6 text-4xl leading-[1.05] md:text-[54px]">
                  The Winter Folio.<br />
                  <span className="italic font-light">Thirty percent</span> off the archive,<br />
                  until the 12th of January.
                </h3>
                <p className="offer-muted mt-7 max-w-xl text-[15px] leading-relaxed text-[#1C1A16]/70">
                  Restorations, grades, and edit consultancies booked during the Folio window are billed at
                  the studio's winter rate. We accept six commissions, read every script ourselves,
                  and decline politely when the fit isn't right. That is the whole offer.
                </p>
                <div className="offer-rule my-8 h-px w-full bg-[#1C1A16]/20" />
                <div className="flex flex-col items-start justify-between gap-5 md:flex-row md:items-center">
                  <div className="font-mono-card text-[12px] uppercase tracking-[0.22em]">
                    Quote code <span className="font-bold">FOLIO·W25</span> in correspondence
                  </div>
                  <a
                    href="#contact"
                    className="inline-flex items-center gap-2 bg-[#1C1A16] px-6 py-3 text-[13px] uppercase tracking-[0.18em] text-[#F2EEE5] transition-colors duration-300 hover:bg-[#FFF6EC] hover:text-[#1C1A16]"
                  >
                    Request a session <ArrowUpRight size={15} />
                  </a>
                </div>
              </div>
            </motion.div>
          </section>

          {/* FOOTER */}
          <footer id="contact" className="border-t border-[#1C1A16]/15 px-6 py-12 md:px-14">
            <div className="flex flex-col justify-between gap-8 md:flex-row md:items-end">
              <div>
                <p className="font-display text-3xl">Hartline &amp; Vesper Pictures</p>
                <p className="mt-2 text-[13px] text-[#1C1A16]/60">14 Rivington Lane, London E2 · Rua das Gaivotas 6, Lisboa</p>
              </div>
              <div className="font-mono-card text-[11px] uppercase tracking-[0.26em] text-[#1C1A16]/55">
                folio@hartlinevesper.film · © MMXXV · All testimony reproduced with consent
              </div>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}