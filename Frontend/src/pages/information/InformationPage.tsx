import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { FAQ_VI, LEGAL_VI, LegalDoc, NAV_VI, SUPPORT_EMAIL, TOPICS_VI } from './content';
import { FAQ_EN, LEGAL_EN, NAV_EN, TOPICS_EN } from './content.en';

export type InformationPageId = 'dieu-khoan' | 'chinh-sach-bao-mat' | 'tro-giup' | 'lien-he';

interface InformationPageProps {
  page: InformationPageId;
  onNavigateHome: () => void;
  /** Chuyển giữa các trang thông tin (Điều khoản / Bảo mật / Trợ giúp / Liên hệ). */
  onNavigatePage?: (page: InformationPageId) => void;
}

/* ============================================================================
 * Nội dung
 * ========================================================================== */

const HOTLINE = '1900 6868';
const SUPPORT_OPEN_HOUR = 8;
const SUPPORT_CLOSE_HOUR = 22;

/** Nội dung theo ngôn ngữ đang chọn. */
const useContent = () => {
  const { language } = useLanguage();
  return language === 'en'
    ? { nav: NAV_EN, legal: LEGAL_EN, faq: FAQ_EN, topics: TOPICS_EN }
    : { nav: NAV_VI, legal: LEGAL_VI, faq: FAQ_VI, topics: TOPICS_VI };
};

/* ============================================================================
 * Thành phần dùng chung
 * ========================================================================== */

const Icon: React.FC<{ name: string; className?: string }> = ({ name, className = '' }) => (
  <span className={`material-symbols-outlined ${className}`} aria-hidden="true">{name}</span>
);

/** Đầu trang chung: breadcrumb + tiêu đề + mô tả, cùng thanh chuyển giữa 4 trang thông tin. */
const PageHeader: React.FC<{
  page: InformationPageId; eyebrow: string; title: string; description: string; meta?: string;
  onNavigateHome: () => void; onNavigatePage?: (p: InformationPageId) => void; children?: React.ReactNode;
}> = ({ page, eyebrow, title, description, meta, onNavigateHome, onNavigatePage, children }) => {
  const { t } = useLanguage();
  const { nav } = useContent();
  return (
  <header className="border-b border-outline-variant/40 bg-surface-container-low">
    <div className="mx-auto max-w-[1200px] px-margin-mobile pb-8 pt-28 md:px-margin md:pb-10">
      <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm text-on-surface-variant">
        <button type="button" onClick={onNavigateHome} className="hover:text-primary hover:underline">{t('info.home')}</button>
        <Icon name="chevron_right" className="text-base" />
        <span aria-current="page" className="text-on-surface">{title}</span>
      </nav>
      <p className="mt-6 text-xs font-bold uppercase tracking-[0.18em] text-primary">{eyebrow}</p>
      <h1 className="mt-2 font-headline-lg text-3xl font-semibold text-on-surface md:text-[44px] md:leading-tight">{title}</h1>
      <p className="mt-3 max-w-2xl text-base leading-7 text-on-surface-variant md:text-lg">{description}</p>
      {meta && (
        <p className="mt-4 inline-flex items-center gap-1.5 text-sm text-on-surface-variant">
          <Icon name="event" className="text-lg" />{meta}
        </p>
      )}
      {children}
    </div>
    {onNavigatePage && (
      <div className="mx-auto max-w-[1200px] px-margin-mobile md:px-margin">
        <nav aria-label={t('info.navLabel')} className="-mb-px flex gap-1 overflow-x-auto [scrollbar-width:none]">
          {nav.map((item) => (
            <button key={item.id} type="button" onClick={() => onNavigatePage(item.id)}
              aria-current={item.id === page ? 'page' : undefined}
              className={`flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
                item.id === page ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-on-surface'}`}>
              <Icon name={item.icon} className="text-lg" />{item.label}
            </button>
          ))}
        </nav>
      </div>
    )}
  </header>
  );
};

/** Khối kêu gọi cuối trang: dẫn sang Trợ giúp / Liên hệ khi người đọc còn thắc mắc. */
const HelpCta: React.FC<{ onNavigatePage?: (p: InformationPageId) => void; exclude?: InformationPageId }> = ({ onNavigatePage, exclude }) => {
  const { t } = useLanguage();
  return (
  <section className="mt-12 flex flex-col gap-5 rounded-2xl border border-outline-variant/40 bg-surface-container-lowest p-6 md:flex-row md:items-center md:justify-between md:p-8">
    <div className="flex items-start gap-4">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary-fixed/60 text-primary"><Icon name="support_agent" /></span>
      <div>
        <h2 className="font-headline-sm text-xl font-semibold text-on-surface">{t('info.ctaTitle')}</h2>
        <p className="mt-1 text-on-surface-variant">{t('info.ctaText', { open: SUPPORT_OPEN_HOUR, close: SUPPORT_CLOSE_HOUR })}</p>
      </div>
    </div>
    {onNavigatePage && (
      <div className="flex flex-wrap gap-3">
        {exclude !== 'tro-giup' && (
          <button type="button" onClick={() => onNavigatePage('tro-giup')}
            className="rounded-full border border-outline-variant px-5 py-2.5 font-semibold text-on-surface hover:bg-surface-container">{t('info.ctaFaq')}</button>
        )}
        {exclude !== 'lien-he' && (
          <button type="button" onClick={() => onNavigatePage('lien-he')}
            className="rounded-full bg-primary px-5 py-2.5 font-semibold text-on-primary hover:opacity-90">{t('info.ctaContact')}</button>
        )}
      </div>
    )}
  </section>
  );
};

/* ============================================================================
 * Trang pháp lý: mục lục cố định + tô sáng mục đang đọc
 * ========================================================================== */

/** Theo dõi mục đang hiển thị để tô sáng trong mục lục (NN/g: người dùng hay bỏ qua mục lục cố định). */
function useActiveSection(ids: string[]) {
  const [active, setActive] = useState(ids[0]);
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (visible[0]) setActive(visible[0].target.id);
    }, { rootMargin: '-120px 0px -60% 0px' });
    ids.forEach((id) => { const el = document.getElementById(id); if (el) observer.observe(el); });
    return () => observer.disconnect();
  }, [ids]);
  return [active, setActive] as const;
}

const LegalPage: React.FC<InformationPageProps & { doc: LegalDoc }> = ({ page, doc, onNavigateHome, onNavigatePage }) => {
  const { t } = useLanguage();
  const ids = useMemo(() => doc.sections.map((s) => s.id), [doc]);
  const [active, setActive] = useActiveSection(ids);

  const jump = (id: string) => {
    setActive(id);
    const el = document.getElementById(id);
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 140, behavior: 'smooth' });
  };

  return (
    <main className="bg-background">
      <PageHeader page={page} eyebrow={doc.eyebrow} title={doc.title} description={doc.description} meta={doc.effective}
        onNavigateHome={onNavigateHome} onNavigatePage={onNavigatePage} />

      {/* Mobile: mục lục thành thanh chip cố định phía trên */}
      <nav aria-label={t('info.onThisPage')} className="sticky top-20 z-20 border-b border-outline-variant/40 bg-background/95 backdrop-blur lg:hidden">
        <div className="flex gap-2 overflow-x-auto px-margin-mobile py-3 [scrollbar-width:none]">
          {doc.sections.map((s, i) => (
            <button key={s.id} type="button" onClick={() => jump(s.id)}
              className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium ${active === s.id ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant'}`}>
              {i + 1}. {s.title}
            </button>
          ))}
        </div>
      </nav>

      <div className="mx-auto grid max-w-[1200px] gap-10 px-margin-mobile py-10 md:px-margin lg:grid-cols-[260px_minmax(0,1fr)] lg:py-14">
        {/* Desktop: mục lục cố định bên trái */}
        <aside className="hidden lg:block">
          <nav aria-label={t('info.onThisPage')} className="sticky top-28">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.15em] text-on-surface-variant">{t('info.onThisPage')}</p>
            <ol className="space-y-1 border-l border-outline-variant/60">
              {doc.sections.map((s, i) => (
                <li key={s.id}>
                  <button type="button" onClick={() => jump(s.id)} aria-current={active === s.id ? 'true' : undefined}
                    className={`-ml-px block w-full border-l-2 py-1.5 pl-4 text-left text-sm transition-colors ${
                      active === s.id ? 'border-primary font-semibold text-primary' : 'border-transparent text-on-surface-variant hover:text-on-surface'}`}>
                    {i + 1}. {s.title}
                  </button>
                </li>
              ))}
            </ol>
            <button type="button" onClick={() => window.print()}
              className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-on-surface-variant hover:text-primary">
              <Icon name="print" className="text-lg" />{t('info.print')}
            </button>
          </nav>
        </aside>

        <article className="min-w-0 max-w-[760px]">
          {/* Tóm tắt dễ hiểu ở đầu trang */}
          <section className="rounded-2xl border border-primary/20 bg-primary-fixed/30 p-6">
            <h2 className="flex items-center gap-2 font-semibold text-on-surface"><Icon name="summarize" className="text-primary" />{t('info.summary')}</h2>
            <ul className="mt-3 space-y-2">
              {doc.summary.map((item) => (
                <li key={item} className="flex gap-3 leading-7 text-on-surface-variant">
                  <Icon name="check_circle" className="mt-1 text-lg text-primary" /><span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-sm text-on-surface-variant">{t('info.summaryNote')}</p>
          </section>

          {doc.sections.map((s, i) => (
            <section key={s.id} id={s.id} className="scroll-mt-36 border-b border-outline-variant/40 py-8 last:border-b-0">
              <h2 className="font-headline-sm text-2xl font-semibold text-on-surface">
                <span className="mr-2 text-primary">{i + 1}.</span>{s.title}
              </h2>
              <div className="mt-4 space-y-4 text-[17px] leading-8 text-on-surface-variant">
                {s.blocks.map((b, j) => typeof b === 'string' ? <p key={j}>{b}</p> : (
                  <ul key={j} className="space-y-2">
                    {b.list.map((item) => (
                      <li key={item} className="flex gap-3">
                        <span className="mt-[13px] h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" /><span>{item}</span>
                      </li>
                    ))}
                  </ul>
                ))}
              </div>
            </section>
          ))}

          <HelpCta onNavigatePage={onNavigatePage} />
        </article>
      </div>
    </main>
  );
};

/* ============================================================================
 * Trung tâm trợ giúp: tìm kiếm + nhóm vấn đề + câu hỏi gập/mở
 * ========================================================================== */

const normalize = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd');

const HelpPage: React.FC<InformationPageProps> = ({ page, onNavigateHome, onNavigatePage }) => {
  const { t } = useLanguage();
  const { faq } = useContent();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Tìm không dấu, khớp cả câu hỏi, câu trả lời và từ khóa đồng nghĩa (vd. "refund" -> hoàn tiền).
  const results = useMemo(() => {
    const q = normalize(query.trim());
    return faq
      .filter((c) => !category || c.id === category)
      .map((c) => ({ ...c, faqs: c.faqs.filter((f) => !q || normalize(`${f.q} ${f.a} ${f.keywords ?? ''}`).includes(q)) }))
      .filter((c) => c.faqs.length > 0);
  }, [query, category, faq]);
  const total = results.reduce((n, c) => n + c.faqs.length, 0);

  const pickCategory = (id: string) => {
    setCategory((cur) => (cur === id ? null : id));
    setTimeout(() => listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  };

  return (
    <main className="bg-background">
      <PageHeader page={page} eyebrow={t('info.helpEyebrow')} title={t('info.helpTitle')}
        description={t('info.helpDesc')}
        onNavigateHome={onNavigateHome} onNavigatePage={onNavigatePage}>
        <label className="relative mt-6 block max-w-2xl">
          <span className="sr-only">{t('info.searchLabel')}</span>
          <Icon name="search" className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-on-surface-variant" />
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder={t('info.searchPh')}
            className="h-14 w-full rounded-full border border-outline-variant bg-surface-container-lowest pl-14 pr-5 text-base shadow-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/15" />
        </label>
      </PageHeader>

      <div className="mx-auto max-w-[1200px] px-margin-mobile py-10 md:px-margin">
        {/* Nhóm vấn đề */}
        <section aria-label={t('info.topics')} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {faq.map((c) => (
            <button key={c.id} type="button" onClick={() => pickCategory(c.id)} aria-pressed={category === c.id}
              className={`group rounded-2xl border p-5 text-left transition-all hover:-translate-y-0.5 hover:shadow-md ${
                category === c.id ? 'border-primary bg-primary-fixed/30' : 'border-outline-variant/50 bg-surface-container-lowest'}`}>
              <span className={`flex h-11 w-11 items-center justify-center rounded ${category === c.id ? 'bg-primary text-on-primary' : 'bg-primary-fixed/50 text-primary'}`}>
                <Icon name={c.icon} />
              </span>
              <h2 className="mt-4 font-semibold text-on-surface">{c.title}</h2>
              <p className="mt-1 text-sm text-on-surface-variant">{c.description}</p>
              <p className="mt-3 text-xs font-semibold text-primary">{c.faqs.length} câu hỏi</p>
            </button>
          ))}
        </section>

        {/* Câu hỏi */}
        <div ref={listRef} className="mt-12 scroll-mt-28">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-headline-sm text-2xl font-semibold text-on-surface">
              {query || category ? t('info.resultCount', { count: total }) : t('info.faqTitle')}
            </h2>
            {(query || category) && (
              <button type="button" onClick={() => { setQuery(''); setCategory(null); }}
                className="text-sm font-semibold text-primary hover:underline">{t('info.clearFilter')}</button>
            )}
          </div>

          {results.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-outline-variant p-10 text-center">
              <Icon name="search_off" className="text-4xl text-outline" />
              <p className="mt-3 font-semibold text-on-surface">{t('info.noMatch', { query })}</p>
              <p className="mt-1 text-on-surface-variant">{t('info.noMatchHint')}</p>
            </div>
          ) : (
            <div className="space-y-8">
              {results.map((c) => (
                <section key={c.id}>
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-on-surface-variant">
                    <Icon name={c.icon} className="text-lg text-primary" />{c.title}
                  </h3>
                  <div className="divide-y divide-outline-variant/40 overflow-hidden rounded-2xl border border-outline-variant/50 bg-surface-container-lowest">
                    {c.faqs.map((f) => {
                      const key = `${c.id}:${f.q}`;
                      const isOpen = open === key || (query.trim().length > 1 && total <= 3);
                      return (
                        <div key={key}>
                          <button type="button" onClick={() => setOpen(isOpen ? null : key)} aria-expanded={isOpen}
                            className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left font-semibold text-on-surface hover:bg-surface-container-low">
                            <span>{f.q}</span>
                            <Icon name="expand_more" className={`shrink-0 text-on-surface-variant transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                          </button>
                          {isOpen && <p className="px-5 pb-5 leading-7 text-on-surface-variant">{f.a}</p>}
                        </div>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>

        <HelpCta onNavigatePage={onNavigatePage} exclude="tro-giup" />
      </div>
    </main>
  );
};

/* ============================================================================
 * Liên hệ: kênh liên hệ có hành động + trạng thái giờ hỗ trợ + form gửi yêu cầu
 * ========================================================================== */



const ContactPage: React.FC<InformationPageProps> = ({ page, onNavigateHome, onNavigatePage }) => {
  const { t } = useLanguage();
  const { topics } = useContent();
  const hour = new Date().getHours();
  const isOpen = hour >= SUPPORT_OPEN_HOUR && hour < SUPPORT_CLOSE_HOUR;
  const [copied, setCopied] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', email: '', bookingCode: '', topic: topics[0], message: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const copy = async (value: string) => {
    try { await navigator.clipboard.writeText(value); setCopied(value); setTimeout(() => setCopied(null), 2000); } catch { /* bỏ qua */ }
  };

  /** Chưa có API gửi yêu cầu hỗ trợ: soạn sẵn email đầy đủ thông tin để khách gửi bằng ứng dụng email. */
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!form.name.trim()) next.name = t('info.errName');
    if (!/^\S+@\S+\.\S+$/.test(form.email)) next.email = t('info.errEmail');
    if (form.message.trim().length < 10) next.message = t('info.errMessage');
    setErrors(next);
    if (Object.keys(next).length) return;
    const subject = `[${form.topic}]${form.bookingCode ? ` ${form.bookingCode} -` : ''} Yêu cầu hỗ trợ`;
    const body = `Họ tên: ${form.name}\nEmail: ${form.email}\nMã đặt phòng: ${form.bookingCode || '(không có)'}\nChủ đề: ${form.topic}\n\n${form.message}`;
    window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const field = 'mt-1.5 w-full rounded border bg-surface-container-lowest px-4 py-3 outline-none focus:border-primary focus:ring-4 focus:ring-primary/15';
  const channels = [
    { icon: 'call', title: 'Hotline', value: HOTLINE, note: t('info.hotlineNote'),
      action: { label: t('info.callNow'), href: `tel:${HOTLINE.replace(/\s/g, '')}` } },
    { icon: 'mail', title: t('info.emailTitle'), value: SUPPORT_EMAIL, note: t('info.emailNote'),
      action: { label: t('info.sendEmail'), href: `mailto:${SUPPORT_EMAIL}` } },
    { icon: 'concierge', title: t('info.hotelTitle'), value: t('info.hotelValue'), note: t('info.hotelNote') },
  ];

  return (
    <main className="bg-background">
      <PageHeader page={page} eyebrow={t('info.contactEyebrow')} title={t('info.contactTitle')}
        description={t('info.contactDesc')}
        onNavigateHome={onNavigateHome} onNavigatePage={onNavigatePage}>
        <p className={`mt-5 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${isOpen ? 'bg-[#d8f3dc] text-[#2d6a4f]' : 'bg-surface-container-high text-on-surface-variant'}`}>
          <span className={`h-2 w-2 rounded-full ${isOpen ? 'bg-[#2d6a4f]' : 'bg-outline'}`} />
          {isOpen ? t('info.open') : t('info.closed')} · {t('info.hoursDaily', { open: SUPPORT_OPEN_HOUR, close: SUPPORT_CLOSE_HOUR })}
        </p>
      </PageHeader>

      <div className="mx-auto max-w-[1200px] px-margin-mobile py-10 md:px-margin">
        {/* Kênh liên hệ */}
        <section className="grid gap-4 md:grid-cols-3">
          {channels.map((c) => (
            <article key={c.title} className="flex flex-col rounded-2xl border border-outline-variant/50 bg-surface-container-lowest p-6">
              <span className="flex h-12 w-12 items-center justify-center rounded bg-primary-fixed/50 text-primary"><Icon name={c.icon} /></span>
              <h2 className="mt-4 text-sm font-semibold uppercase tracking-wider text-on-surface-variant">{c.title}</h2>
              <p className="mt-1 font-headline-sm text-xl font-semibold text-on-surface">{c.value}</p>
              <p className="mt-2 flex-1 text-sm leading-6 text-on-surface-variant">{c.note}</p>
              {c.action && (
                <div className="mt-5 flex gap-2">
                  <a href={c.action.href} className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary hover:opacity-90">
                    <Icon name={c.icon} className="text-lg" />{c.action.label}
                  </a>
                  <button type="button" onClick={() => void copy(c.value)} title={t('info.copy')}
                    className="inline-flex items-center justify-center rounded-full border border-outline-variant px-3 text-on-surface-variant hover:bg-surface-container">
                    <Icon name={copied === c.value ? 'check' : 'content_copy'} className="text-lg" />
                  </button>
                </div>
              )}
            </article>
          ))}
        </section>

        <div className="mt-12 grid gap-10 lg:grid-cols-[minmax(0,1fr)_360px]">
          {/* Form gửi yêu cầu */}
          <section className="rounded-2xl border border-outline-variant/50 bg-surface-container-lowest p-6 md:p-8">
            <h2 className="font-headline-sm text-2xl font-semibold text-on-surface">{t('info.formTitle')}</h2>
            <p className="mt-1 text-on-surface-variant">{t('info.formHint', { email: SUPPORT_EMAIL })}</p>
            <form onSubmit={submit} noValidate className="mt-6 grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-semibold text-on-surface">{t('info.name')}
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className={`${field} ${errors.name ? 'border-error' : 'border-outline-variant'}`} />
                {errors.name && <span className="mt-1 block text-xs font-normal text-error">{errors.name}</span>}
              </label>
              <label className="text-sm font-semibold text-on-surface">Email
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className={`${field} ${errors.email ? 'border-error' : 'border-outline-variant'}`} />
                {errors.email && <span className="mt-1 block text-xs font-normal text-error">{errors.email}</span>}
              </label>
              <label className="text-sm font-semibold text-on-surface">{t('info.bookingCode')} <span className="font-normal text-on-surface-variant">{t('info.optional')}</span>
                <input value={form.bookingCode} onChange={(e) => setForm({ ...form, bookingCode: e.target.value.toUpperCase() })}
                  placeholder="VD: BK20261120001" className={`${field} border-outline-variant`} />
              </label>
              <label className="text-sm font-semibold text-on-surface">{t('info.topic')}
                <select value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} className={`${field} border-outline-variant`}>
                  {topics.map((topic) => <option key={topic}>{topic}</option>)}
                </select>
              </label>
              <label className="text-sm font-semibold text-on-surface sm:col-span-2">{t('info.message')}
                <textarea rows={5} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })}
                  placeholder={t('info.messagePh')}
                  className={`${field} resize-y ${errors.message ? 'border-error' : 'border-outline-variant'}`} />
                {errors.message && <span className="mt-1 block text-xs font-normal text-error">{errors.message}</span>}
              </label>
              <div className="flex flex-wrap items-center gap-4 sm:col-span-2">
                <button type="submit" className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 font-semibold text-on-primary hover:opacity-90">
                  <Icon name="send" className="text-lg" />{t('info.compose')}
                </button>
                <span className="text-sm text-on-surface-variant">{t('info.composeHint')}</span>
              </div>
            </form>
          </section>

          {/* Cột phụ */}
          <aside className="space-y-6">
            <section className="rounded-2xl bg-surface-container-low p-6">
              <h2 className="flex items-center gap-2 font-semibold text-on-surface"><Icon name="fact_check" className="text-primary" />{t('info.prepare')}</h2>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-on-surface-variant">
                {[t('info.prep1'), t('info.prep2'), t('info.prep3')].map((item) => (
                  <li key={item} className="flex gap-2"><Icon name="check" className="text-lg text-primary" /><span>{item}</span></li>
                ))}
              </ul>
            </section>
            <section className="rounded-2xl bg-surface-container-low p-6">
              <h2 className="flex items-center gap-2 font-semibold text-on-surface"><Icon name="bolt" className="text-primary" />{t('info.selfServe')}</h2>
              <ul className="mt-3 space-y-1">
                {[t('info.q1'), t('info.q2'), t('info.q3')].map((q) => (
                  <li key={q}>
                    <button type="button" onClick={() => onNavigatePage?.('tro-giup')}
                      className="flex w-full items-center justify-between gap-2 rounded-lg py-2 text-left text-sm font-medium text-on-surface hover:text-primary">
                      {q}<Icon name="arrow_forward" className="text-base" />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
};

/* ============================================================================
 * Điểm vào
 * ========================================================================== */

export const InformationPage: React.FC<InformationPageProps> = (props) => {
  const { legal } = useContent();
  useEffect(() => { window.scrollTo({ top: 0 }); }, [props.page]);
  if (props.page === 'tro-giup') return <HelpPage {...props} />;
  if (props.page === 'lien-he') return <ContactPage {...props} />;
  return <LegalPage {...props} doc={legal[props.page]} />;
};

export default InformationPage;
