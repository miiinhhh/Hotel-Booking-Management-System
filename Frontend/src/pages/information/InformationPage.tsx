import React, { useEffect, useMemo, useRef, useState } from 'react';

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

const SUPPORT_EMAIL = 'support@stayluxe.vn';
const HOTLINE = '1900 6868';
const SUPPORT_OPEN_HOUR = 8;
const SUPPORT_CLOSE_HOUR = 22;

const NAV: { id: InformationPageId; label: string; icon: string }[] = [
  { id: 'tro-giup', label: 'Trung tâm trợ giúp', icon: 'help' },
  { id: 'lien-he', label: 'Liên hệ', icon: 'support_agent' },
  { id: 'dieu-khoan', label: 'Điều khoản dịch vụ', icon: 'gavel' },
  { id: 'chinh-sach-bao-mat', label: 'Chính sách bảo mật', icon: 'shield_lock' },
];

/** Khối nội dung trong một mục pháp lý: đoạn văn hoặc danh sách gạch đầu dòng. */
type Block = string | { list: string[] };

interface LegalSection { id: string; title: string; blocks: Block[] }
interface LegalDoc {
  eyebrow: string;
  title: string;
  description: string;
  effective: string;
  summary: string[];
  sections: LegalSection[];
}

const legal: Record<'dieu-khoan' | 'chinh-sach-bao-mat', LegalDoc> = {
  'dieu-khoan': {
    eyebrow: 'Thông tin pháp lý',
    title: 'Điều khoản dịch vụ',
    description: 'Các nguyên tắc áp dụng khi bạn tìm kiếm, đặt phòng và sử dụng dịch vụ trên StayLuxe.',
    effective: 'Có hiệu lực từ ngày 12/11/2026',
    summary: [
      'Giữ thông tin tài khoản chính xác và tự bảo mật mật khẩu, mã OTP.',
      'Giá cuối cùng và điều kiện hủy luôn được hiển thị trước khi bạn xác nhận đặt phòng.',
      'Phí hủy phụ thuộc chính sách của từng khách sạn và thời điểm hủy.',
      'Gian lận voucher, thanh toán hoặc truy cập dữ liệu người khác có thể dẫn đến khóa tài khoản.',
    ],
    sections: [
      {
        id: 'tai-khoan',
        title: 'Tài khoản và quyền sử dụng',
        blocks: [
          'Để đặt phòng, bạn cần một tài khoản StayLuxe. Bạn chịu trách nhiệm về mọi hoạt động diễn ra dưới tài khoản của mình.',
          { list: [
            'Bạn cần cung cấp thông tin chính xác, bảo mật mật khẩu và mã OTP của tài khoản.',
            'Mỗi người chỉ sử dụng dữ liệu đặt phòng, thanh toán và đánh giá thuộc tài khoản của mình.',
            'StayLuxe có thể tạm khóa tài khoản khi phát hiện đăng nhập bất thường, gian lận hoặc vi phạm điều khoản.',
          ] },
        ],
      },
      {
        id: 'dat-phong',
        title: 'Đặt phòng và giá dịch vụ',
        blocks: [
          'Giá hiển thị trong kết quả tìm kiếm là giá tham khảo. Giá chính thức do hệ thống tính lại tại bước thanh toán.',
          { list: [
            'Giá cuối cùng được tính theo ngày lưu trú, loại phòng, phụ thu, thuế, ưu đãi và voucher hợp lệ.',
            'Đặt phòng chỉ được xác nhận khi hệ thống ghi nhận đủ thông tin và trạng thái thanh toán theo yêu cầu.',
            'Phòng giữ chỗ ở trạng thái chờ có thể tự động được giải phóng khi quá thời hạn thanh toán.',
          ] },
        ],
      },
      {
        id: 'huy-hoan',
        title: 'Hủy phòng và hoàn tiền',
        blocks: [
          'Mỗi khách sạn áp dụng chính sách hủy riêng, được hiển thị trên trang chi tiết khách sạn và trong đơn đặt phòng.',
          { list: [
            'Phí hủy và mức hoàn tiền phụ thuộc chính sách của khách sạn, thời điểm hủy và trạng thái booking.',
            'Bạn luôn được xem trước phí hủy trước khi xác nhận yêu cầu.',
            'Thời gian tiền về tài khoản có thể phụ thuộc ngân hàng hoặc cổng thanh toán.',
          ] },
        ],
      },
      {
        id: 'hanh-vi',
        title: 'Hành vi không được phép',
        blocks: [
          'Để bảo vệ khách hàng và khách sạn đối tác, bạn đồng ý không thực hiện các hành vi sau:',
          { list: [
            'Không truy cập tài khoản, booking hoặc dữ liệu của người khác.',
            'Không lợi dụng voucher, thanh toán, đánh giá hoặc hệ thống giữ phòng để gian lận.',
            'Không tải tệp độc hại, phá hoại dịch vụ hoặc gây ảnh hưởng đến người dùng khác.',
          ] },
        ],
      },
      {
        id: 'thay-doi',
        title: 'Thay đổi điều khoản',
        blocks: [
          'StayLuxe có thể cập nhật điều khoản này khi dịch vụ thay đổi. Ngày hiệu lực mới sẽ được ghi ở đầu trang; việc tiếp tục sử dụng dịch vụ sau ngày đó đồng nghĩa với việc bạn chấp nhận nội dung cập nhật.',
        ],
      },
    ],
  },
  'chinh-sach-bao-mat': {
    eyebrow: 'Quyền riêng tư',
    title: 'Chính sách bảo mật',
    description: 'Cách StayLuxe thu thập, sử dụng và bảo vệ dữ liệu khi bạn sử dụng hệ thống.',
    effective: 'Cập nhật ngày 12/11/2026',
    summary: [
      'Chúng tôi chỉ thu thập dữ liệu cần cho việc đặt phòng, thanh toán và bảo mật tài khoản.',
      'Mật khẩu được băm; thông tin liên hệ nhạy cảm được che trên giao diện.',
      'Dữ liệu chỉ được chia sẻ với khách sạn và đối tác thanh toán khi cần xử lý dịch vụ.',
      'StayLuxe không bán thông tin cá nhân của bạn.',
    ],
    sections: [
      {
        id: 'du-lieu',
        title: 'Dữ liệu được thu thập',
        blocks: [
          'Chúng tôi thu thập các nhóm dữ liệu sau khi bạn tạo tài khoản và sử dụng dịch vụ:',
          { list: [
            'Thông tin tài khoản như họ tên, email, số điện thoại, ngày sinh và ảnh đại diện.',
            'Thông tin booking, khách lưu trú, yêu cầu đặc biệt, giao dịch thanh toán và lịch sử hoàn tiền.',
            'Thông tin kỹ thuật cần thiết cho bảo mật như phiên đăng nhập, thời điểm truy cập và số lần đăng nhập sai.',
          ] },
        ],
      },
      {
        id: 'muc-dich',
        title: 'Mục đích sử dụng',
        blocks: [
          { list: [
            'Xác thực tài khoản, xử lý đặt phòng, thanh toán, hủy phòng và hỗ trợ khách hàng.',
            'Ngăn chặn truy cập trái phép, gian lận và các hành vi gây mất an toàn hệ thống.',
            'Cải thiện kết quả tìm kiếm, chất lượng dịch vụ và báo cáo vận hành ở dạng phù hợp.',
          ] },
        ],
      },
      {
        id: 'bao-ve',
        title: 'Bảo vệ và chia sẻ dữ liệu',
        blocks: [
          { list: [
            'Mật khẩu được lưu dưới dạng băm; thông tin liên hệ nhạy cảm được che trên giao diện.',
            'Dữ liệu chỉ được cung cấp cho khách sạn, nhân viên được phân quyền và đối tác thanh toán khi cần xử lý dịch vụ.',
            'StayLuxe không bán thông tin cá nhân của bạn cho bên thứ ba.',
          ] },
        ],
      },
      {
        id: 'quyen',
        title: 'Quyền của bạn',
        blocks: [
          'Bạn có quyền kiểm soát dữ liệu cá nhân của mình:',
          { list: [
            'Xem và cập nhật thông tin cá nhân sau bước xác thực lại.',
            'Đổi mật khẩu, yêu cầu đặt lại mật khẩu và đăng xuất phiên hiện tại.',
            'Liên hệ bộ phận hỗ trợ khi cần kiểm tra, điều chỉnh hoặc giải đáp về dữ liệu cá nhân.',
          ] },
        ],
      },
      {
        id: 'lien-he-bao-mat',
        title: 'Liên hệ về quyền riêng tư',
        blocks: [
          `Mọi câu hỏi về dữ liệu cá nhân, vui lòng gửi email tới ${SUPPORT_EMAIL} với tiêu đề "Quyền riêng tư". Chúng tôi phản hồi trong vòng 3 ngày làm việc.`,
        ],
      },
    ],
  },
};

interface Faq { q: string; a: string; keywords?: string }
interface FaqCategory { id: string; title: string; icon: string; description: string; faqs: Faq[] }

/** Nhóm theo vấn đề của khách (không theo phòng ban), như khuyến nghị cho help center. */
const faqCategories: FaqCategory[] = [
  {
    id: 'dat-phong', title: 'Tìm và đặt phòng', icon: 'travel_explore', description: 'Tìm phòng trống, chọn hạng phòng, giữ chỗ',
    faqs: [
      { q: 'Làm sao để tìm phòng còn trống?', a: 'Chọn khu vực, ngày nhận – trả phòng, số khách và số phòng ở trang Khám phá. Kết quả chỉ gồm các phòng còn khả dụng cho khoảng ngày đã chọn.', keywords: 'tìm kiếm phòng trống available' },
      { q: 'Tôi nên kiểm tra gì trước khi đặt?', a: 'Hãy xem tiện ích, sức chứa, chính sách hủy và tổng giá (đã gồm thuế, phí, ưu đãi) ở bước thanh toán trước khi xác nhận.', keywords: 'tiện ích sức chứa giá' },
      { q: 'Phòng tôi chọn vừa hết, phải làm sao?', a: 'Phòng có thể vừa được khách khác đặt hoặc tạm khóa bán. Hãy đổi ngày, hạng phòng hoặc số lượng phòng rồi tìm lại.', keywords: 'hết phòng sold out' },
      { q: 'Phòng được giữ cho tôi bao lâu?', a: 'Đơn ở trạng thái "Chờ thanh toán" được giữ trong thời gian ngắn hiển thị trên đơn. Quá thời hạn, phòng sẽ tự động được mở bán lại.', keywords: 'giữ chỗ hold hết hạn' },
    ],
  },
  {
    id: 'thanh-toan', title: 'Thanh toán và hoàn tiền', icon: 'payments', description: 'VNPay, tiền mặt, voucher, tiền hoàn',
    faqs: [
      { q: 'StayLuxe hỗ trợ những phương thức thanh toán nào?', a: 'Bạn có thể đặt cọc qua VNPay hoặc thanh toán tại khách sạn, tùy phương thức được hiển thị ở bước thanh toán.', keywords: 'vnpay tiền mặt cash thẻ' },
      { q: 'Tiền đã bị trừ nhưng đơn chưa cập nhật?', a: 'Không đóng trang thanh toán cho đến khi có kết quả. Nếu đơn vẫn chưa cập nhật, hãy giữ mã giao dịch và liên hệ hỗ trợ để được đối soát.', keywords: 'trừ tiền lỗi giao dịch' },
      { q: 'Khi nào tôi nhận được tiền hoàn?', a: 'Sau khi yêu cầu hủy được xử lý, thời gian tiền về phụ thuộc ngân hàng hoặc cổng thanh toán, thường từ 3–7 ngày làm việc.', keywords: 'hoàn tiền refund' },
      { q: 'Làm sao dùng mã giảm giá?', a: 'Sao chép mã ở trang Ưu đãi rồi nhập vào ô "Mã giảm giá" tại bước thanh toán. Hệ thống sẽ kiểm tra điều kiện và hiển thị số tiền được giảm.', keywords: 'voucher mã giảm giá khuyến mãi' },
    ],
  },
  {
    id: 'thay-doi', title: 'Hủy hoặc thay đổi đặt phòng', icon: 'event_repeat', description: 'Phí hủy, đổi ngày, đổi phòng',
    faqs: [
      { q: 'Làm sao để hủy đặt phòng?', a: 'Mở mục "Đặt phòng của tôi", chọn đơn và bấm Hủy. Hệ thống hiển thị phí hủy và số tiền dự kiến hoàn trước khi bạn xác nhận.', keywords: 'hủy cancel' },
      { q: 'Tôi có thể đổi ngày hoặc đổi phòng không?', a: 'Có, khi đơn còn ở trạng thái cho phép và vẫn còn phòng phù hợp cho ngày mới. Mở chi tiết đơn để xem tùy chọn thay đổi.', keywords: 'đổi ngày reschedule đổi phòng' },
      { q: 'Phí hủy được tính thế nào?', a: 'Phí hủy theo chính sách của từng khách sạn và khoảng thời gian còn lại đến ngày nhận phòng. Hủy càng sớm, mức hoàn thường càng cao.', keywords: 'phí hủy chính sách' },
    ],
  },
  {
    id: 'tai-khoan', title: 'Tài khoản và đăng nhập', icon: 'manage_accounts', description: 'Mật khẩu, OTP, khóa tài khoản',
    faqs: [
      { q: 'Tôi quên mật khẩu?', a: 'Dùng chức năng "Quên mật khẩu" ở màn hình đăng nhập để nhận mã OTP qua email và đặt mật khẩu mới.', keywords: 'quên mật khẩu reset password' },
      { q: 'Tôi không nhận được email OTP?', a: 'Kiểm tra cả thư mục Spam/Quảng cáo và chỉ dùng mã mới nhất còn hiệu lực. Nếu vẫn không có, hãy yêu cầu gửi lại sau ít phút.', keywords: 'otp email mã xác thực' },
      { q: 'Vì sao tài khoản của tôi bị khóa?', a: 'Tài khoản có thể bị khóa tạm thời sau nhiều lần nhập sai mật khẩu để bảo vệ bạn. Hãy chờ hết thời gian khóa hoặc đặt lại mật khẩu.', keywords: 'khóa tài khoản locked' },
    ],
  },
];

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
}> = ({ page, eyebrow, title, description, meta, onNavigateHome, onNavigatePage, children }) => (
  <header className="border-b border-outline-variant/40 bg-surface-container-low">
    <div className="mx-auto max-w-[1200px] px-margin-mobile pb-8 pt-28 md:px-margin md:pb-10">
      <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm text-on-surface-variant">
        <button type="button" onClick={onNavigateHome} className="hover:text-primary hover:underline">Trang chủ</button>
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
        <nav aria-label="Trang thông tin" className="-mb-px flex gap-1 overflow-x-auto [scrollbar-width:none]">
          {NAV.map((item) => (
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

/** Khối kêu gọi cuối trang: dẫn sang Trợ giúp / Liên hệ khi người đọc còn thắc mắc. */
const HelpCta: React.FC<{ onNavigatePage?: (p: InformationPageId) => void; exclude?: InformationPageId }> = ({ onNavigatePage, exclude }) => (
  <section className="mt-12 flex flex-col gap-5 rounded-2xl bg-primary p-6 text-on-primary md:flex-row md:items-center md:justify-between md:p-8">
    <div className="flex items-start gap-4">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-on-primary/15"><Icon name="support_agent" /></span>
      <div>
        <h2 className="font-headline-sm text-xl font-semibold">Vẫn còn thắc mắc?</h2>
        <p className="mt-1 text-on-primary/80">Đội ngũ hỗ trợ làm việc {SUPPORT_OPEN_HOUR}:00 – {SUPPORT_CLOSE_HOUR}:00 mỗi ngày, kể cả cuối tuần.</p>
      </div>
    </div>
    {onNavigatePage && (
      <div className="flex flex-wrap gap-3">
        {exclude !== 'tro-giup' && (
          <button type="button" onClick={() => onNavigatePage('tro-giup')}
            className="rounded-full border border-on-primary/40 px-5 py-2.5 font-semibold hover:bg-on-primary/10">Xem câu hỏi thường gặp</button>
        )}
        {exclude !== 'lien-he' && (
          <button type="button" onClick={() => onNavigatePage('lien-he')}
            className="rounded-full bg-on-primary px-5 py-2.5 font-semibold text-primary hover:opacity-90">Liên hệ hỗ trợ</button>
        )}
      </div>
    )}
  </section>
);

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
      <nav aria-label="Trên trang này" className="sticky top-20 z-20 border-b border-outline-variant/40 bg-background/95 backdrop-blur lg:hidden">
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
          <nav aria-label="Trên trang này" className="sticky top-28">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.15em] text-on-surface-variant">Trên trang này</p>
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
              <Icon name="print" className="text-lg" />In trang này
            </button>
          </nav>
        </aside>

        <article className="min-w-0 max-w-[760px]">
          {/* Tóm tắt dễ hiểu ở đầu trang */}
          <section className="rounded-2xl border border-primary/20 bg-primary-fixed/30 p-6">
            <h2 className="flex items-center gap-2 font-semibold text-on-surface"><Icon name="summarize" className="text-primary" />Tóm tắt nhanh</h2>
            <ul className="mt-3 space-y-2">
              {doc.summary.map((item) => (
                <li key={item} className="flex gap-3 leading-7 text-on-surface-variant">
                  <Icon name="check_circle" className="mt-1 text-lg text-primary" /><span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-sm text-on-surface-variant">Bản tóm tắt chỉ để tham khảo; nội dung đầy đủ bên dưới là căn cứ áp dụng.</p>
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
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Tìm không dấu, khớp cả câu hỏi, câu trả lời và từ khóa đồng nghĩa (vd. "refund" -> hoàn tiền).
  const results = useMemo(() => {
    const q = normalize(query.trim());
    return faqCategories
      .filter((c) => !category || c.id === category)
      .map((c) => ({ ...c, faqs: c.faqs.filter((f) => !q || normalize(`${f.q} ${f.a} ${f.keywords ?? ''}`).includes(q)) }))
      .filter((c) => c.faqs.length > 0);
  }, [query, category]);
  const total = results.reduce((n, c) => n + c.faqs.length, 0);

  const pickCategory = (id: string) => {
    setCategory((cur) => (cur === id ? null : id));
    setTimeout(() => listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  };

  return (
    <main className="bg-background">
      <PageHeader page={page} eyebrow="Hỗ trợ khách hàng" title="Chúng tôi có thể giúp gì cho bạn?"
        description="Tìm câu trả lời nhanh cho các vấn đề thường gặp trước, trong và sau kỳ nghỉ."
        onNavigateHome={onNavigateHome} onNavigatePage={onNavigatePage}>
        <label className="relative mt-6 block max-w-2xl">
          <span className="sr-only">Tìm câu hỏi</span>
          <Icon name="search" className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-on-surface-variant" />
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="Ví dụ: hủy phòng, hoàn tiền, quên mật khẩu…"
            className="h-14 w-full rounded-full border border-outline-variant bg-surface-container-lowest pl-14 pr-5 text-base shadow-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/15" />
        </label>
      </PageHeader>

      <div className="mx-auto max-w-[1200px] px-margin-mobile py-10 md:px-margin">
        {/* Nhóm vấn đề */}
        <section aria-label="Chủ đề" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {faqCategories.map((c) => (
            <button key={c.id} type="button" onClick={() => pickCategory(c.id)} aria-pressed={category === c.id}
              className={`group rounded-2xl border p-5 text-left transition-all hover:-translate-y-0.5 hover:shadow-md ${
                category === c.id ? 'border-primary bg-primary-fixed/30' : 'border-outline-variant/50 bg-surface-container-lowest'}`}>
              <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${category === c.id ? 'bg-primary text-on-primary' : 'bg-primary-fixed/50 text-primary'}`}>
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
              {query || category ? `${total} kết quả` : 'Câu hỏi thường gặp'}
            </h2>
            {(query || category) && (
              <button type="button" onClick={() => { setQuery(''); setCategory(null); }}
                className="text-sm font-semibold text-primary hover:underline">Xóa bộ lọc</button>
            )}
          </div>

          {results.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-outline-variant p-10 text-center">
              <Icon name="search_off" className="text-4xl text-outline" />
              <p className="mt-3 font-semibold text-on-surface">Không tìm thấy câu hỏi phù hợp với "{query}"</p>
              <p className="mt-1 text-on-surface-variant">Thử từ khóa khác hoặc liên hệ trực tiếp với chúng tôi.</p>
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

const TOPICS = ['Đặt phòng', 'Thanh toán / hoàn tiền', 'Hủy hoặc thay đổi đơn', 'Tài khoản & đăng nhập', 'Góp ý dịch vụ', 'Khác'];

const ContactPage: React.FC<InformationPageProps> = ({ page, onNavigateHome, onNavigatePage }) => {
  const hour = new Date().getHours();
  const isOpen = hour >= SUPPORT_OPEN_HOUR && hour < SUPPORT_CLOSE_HOUR;
  const [copied, setCopied] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', email: '', bookingCode: '', topic: TOPICS[0], message: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const copy = async (value: string) => {
    try { await navigator.clipboard.writeText(value); setCopied(value); setTimeout(() => setCopied(null), 2000); } catch { /* bỏ qua */ }
  };

  /** Chưa có API gửi yêu cầu hỗ trợ: soạn sẵn email đầy đủ thông tin để khách gửi bằng ứng dụng email. */
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!form.name.trim()) next.name = 'Vui lòng nhập họ tên';
    if (!/^\S+@\S+\.\S+$/.test(form.email)) next.email = 'Email không hợp lệ';
    if (form.message.trim().length < 10) next.message = 'Mô tả tối thiểu 10 ký tự';
    setErrors(next);
    if (Object.keys(next).length) return;
    const subject = `[${form.topic}]${form.bookingCode ? ` ${form.bookingCode} -` : ''} Yêu cầu hỗ trợ`;
    const body = `Họ tên: ${form.name}\nEmail: ${form.email}\nMã đặt phòng: ${form.bookingCode || '(không có)'}\nChủ đề: ${form.topic}\n\n${form.message}`;
    window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const field = 'mt-1.5 w-full rounded-xl border bg-surface-container-lowest px-4 py-3 outline-none focus:border-primary focus:ring-4 focus:ring-primary/15';
  const channels = [
    { icon: 'call', title: 'Hotline', value: HOTLINE, note: 'Phù hợp khi cần hỗ trợ gấp trước giờ nhận phòng hoặc khi thanh toán gặp sự cố.',
      action: { label: 'Gọi ngay', href: `tel:${HOTLINE.replace(/\s/g, '')}` } },
    { icon: 'mail', title: 'Email hỗ trợ', value: SUPPORT_EMAIL, note: 'Gửi kèm mã booking và mô tả ngắn để được kiểm tra nhanh hơn. Phản hồi trong 24 giờ.',
      action: { label: 'Gửi email', href: `mailto:${SUPPORT_EMAIL}` } },
    { icon: 'concierge', title: 'Hỗ trợ tại khách sạn', value: 'Trong chi tiết đơn đặt phòng', note: 'Thông tin liên hệ và giờ nhận – trả phòng của từng nơi lưu trú có trong trang khách sạn và booking.' },
  ];

  return (
    <main className="bg-background">
      <PageHeader page={page} eyebrow="Kết nối với StayLuxe" title="Liên hệ với chúng tôi"
        description="Chọn kênh phù hợp để được hỗ trợ về tài khoản, đặt phòng hoặc thanh toán."
        onNavigateHome={onNavigateHome} onNavigatePage={onNavigatePage}>
        <p className={`mt-5 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${isOpen ? 'bg-[#d8f3dc] text-[#2d6a4f]' : 'bg-surface-container-high text-on-surface-variant'}`}>
          <span className={`h-2 w-2 rounded-full ${isOpen ? 'bg-[#2d6a4f]' : 'bg-outline'}`} />
          {isOpen ? 'Đang trong giờ hỗ trợ' : 'Ngoài giờ hỗ trợ — hãy gửi email, chúng tôi phản hồi sớm nhất'} · {SUPPORT_OPEN_HOUR}:00 – {SUPPORT_CLOSE_HOUR}:00 hằng ngày
        </p>
      </PageHeader>

      <div className="mx-auto max-w-[1200px] px-margin-mobile py-10 md:px-margin">
        {/* Kênh liên hệ */}
        <section className="grid gap-4 md:grid-cols-3">
          {channels.map((c) => (
            <article key={c.title} className="flex flex-col rounded-2xl border border-outline-variant/50 bg-surface-container-lowest p-6">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-fixed/50 text-primary"><Icon name={c.icon} /></span>
              <h2 className="mt-4 text-sm font-semibold uppercase tracking-wider text-on-surface-variant">{c.title}</h2>
              <p className="mt-1 font-headline-sm text-xl font-semibold text-on-surface">{c.value}</p>
              <p className="mt-2 flex-1 text-sm leading-6 text-on-surface-variant">{c.note}</p>
              {c.action && (
                <div className="mt-5 flex gap-2">
                  <a href={c.action.href} className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary hover:opacity-90">
                    <Icon name={c.icon} className="text-lg" />{c.action.label}
                  </a>
                  <button type="button" onClick={() => void copy(c.value)} title="Sao chép"
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
            <h2 className="font-headline-sm text-2xl font-semibold text-on-surface">Gửi yêu cầu hỗ trợ</h2>
            <p className="mt-1 text-on-surface-variant">Điền thông tin, chúng tôi sẽ soạn sẵn email gửi tới {SUPPORT_EMAIL}.</p>
            <form onSubmit={submit} noValidate className="mt-6 grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-semibold text-on-surface">Họ và tên
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className={`${field} ${errors.name ? 'border-error' : 'border-outline-variant'}`} />
                {errors.name && <span className="mt-1 block text-xs font-normal text-error">{errors.name}</span>}
              </label>
              <label className="text-sm font-semibold text-on-surface">Email
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className={`${field} ${errors.email ? 'border-error' : 'border-outline-variant'}`} />
                {errors.email && <span className="mt-1 block text-xs font-normal text-error">{errors.email}</span>}
              </label>
              <label className="text-sm font-semibold text-on-surface">Mã đặt phòng <span className="font-normal text-on-surface-variant">(nếu có)</span>
                <input value={form.bookingCode} onChange={(e) => setForm({ ...form, bookingCode: e.target.value.toUpperCase() })}
                  placeholder="VD: BK20261120001" className={`${field} border-outline-variant`} />
              </label>
              <label className="text-sm font-semibold text-on-surface">Chủ đề
                <select value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} className={`${field} border-outline-variant`}>
                  {TOPICS.map((t) => <option key={t}>{t}</option>)}
                </select>
              </label>
              <label className="text-sm font-semibold text-on-surface sm:col-span-2">Nội dung
                <textarea rows={5} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })}
                  placeholder="Mô tả vấn đề bạn gặp phải, thời điểm xảy ra và các bước đã thử…"
                  className={`${field} resize-y ${errors.message ? 'border-error' : 'border-outline-variant'}`} />
                {errors.message && <span className="mt-1 block text-xs font-normal text-error">{errors.message}</span>}
              </label>
              <div className="flex flex-wrap items-center gap-4 sm:col-span-2">
                <button type="submit" className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 font-semibold text-on-primary hover:opacity-90">
                  <Icon name="send" className="text-lg" />Soạn email hỗ trợ
                </button>
                <span className="text-sm text-on-surface-variant">Mở bằng ứng dụng email trên thiết bị của bạn.</span>
              </div>
            </form>
          </section>

          {/* Cột phụ */}
          <aside className="space-y-6">
            <section className="rounded-2xl bg-surface-container-low p-6">
              <h2 className="flex items-center gap-2 font-semibold text-on-surface"><Icon name="fact_check" className="text-primary" />Chuẩn bị trước khi liên hệ</h2>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-on-surface-variant">
                {['Mã booking hoặc mã giao dịch liên quan.', 'Email hoặc số điện thoại dùng để đặt phòng.', 'Ảnh chụp thông báo lỗi nếu sự cố xuất hiện trên màn hình.'].map((t) => (
                  <li key={t} className="flex gap-2"><Icon name="check" className="text-lg text-primary" /><span>{t}</span></li>
                ))}
              </ul>
            </section>
            <section className="rounded-2xl bg-surface-container-low p-6">
              <h2 className="flex items-center gap-2 font-semibold text-on-surface"><Icon name="bolt" className="text-primary" />Tự giải quyết nhanh</h2>
              <ul className="mt-3 space-y-1">
                {['Làm sao để hủy đặt phòng?', 'Khi nào tôi nhận được tiền hoàn?', 'Tôi không nhận được email OTP?'].map((q) => (
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
  useEffect(() => { window.scrollTo({ top: 0 }); }, [props.page]);
  if (props.page === 'tro-giup') return <HelpPage {...props} />;
  if (props.page === 'lien-he') return <ContactPage {...props} />;
  return <LegalPage {...props} doc={legal[props.page]} />;
};

export default InformationPage;
