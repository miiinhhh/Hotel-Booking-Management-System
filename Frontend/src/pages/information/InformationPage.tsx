import React from 'react';

export type InformationPageId = 'dieu-khoan' | 'chinh-sach-bao-mat' | 'tro-giup' | 'lien-he';

interface InformationPageProps {
  page: InformationPageId;
  onNavigateHome: () => void;
}

interface InformationSection {
  title: string;
  icon: string;
  paragraphs?: string[];
  items?: string[];
}

interface InformationContent {
  eyebrow: string;
  title: string;
  description: string;
  updatedAt: string;
  sections: InformationSection[];
}

const content: Record<InformationPageId, InformationContent> = {
  'dieu-khoan': {
    eyebrow: 'Thông tin pháp lý',
    title: 'Điều khoản dịch vụ',
    description: 'Các nguyên tắc áp dụng khi bạn tìm kiếm, đặt phòng và sử dụng dịch vụ trên StayLuxe.',
    updatedAt: 'Có hiệu lực từ ngày 12/11/2026',
    sections: [
      {
        title: 'Tài khoản và quyền sử dụng',
        icon: 'person_check',
        items: [
          'Bạn cần cung cấp thông tin chính xác, bảo mật mật khẩu và mã OTP của tài khoản.',
          'Mỗi người chỉ sử dụng dữ liệu đặt phòng, thanh toán và đánh giá thuộc tài khoản của mình.',
          'StayLuxe có thể tạm khóa tài khoản khi phát hiện đăng nhập bất thường, gian lận hoặc vi phạm điều khoản.',
        ],
      },
      {
        title: 'Đặt phòng và giá dịch vụ',
        icon: 'hotel',
        items: [
          'Giá cuối cùng được tính theo ngày lưu trú, loại phòng, phụ thu, thuế, ưu đãi và voucher hợp lệ.',
          'Đặt phòng chỉ được xác nhận khi hệ thống ghi nhận đủ thông tin và trạng thái thanh toán theo yêu cầu.',
          'Phòng giữ chỗ ở trạng thái chờ có thể tự động được giải phóng khi quá thời hạn thanh toán.',
        ],
      },
      {
        title: 'Hủy phòng và hoàn tiền',
        icon: 'currency_exchange',
        items: [
          'Phí hủy và mức hoàn tiền phụ thuộc chính sách của khách sạn, thời điểm hủy và trạng thái booking.',
          'Bạn luôn được xem trước phí hủy trước khi xác nhận yêu cầu.',
          'Thời gian tiền về tài khoản có thể phụ thuộc ngân hàng hoặc cổng thanh toán.',
        ],
      },
      {
        title: 'Hành vi không được phép',
        icon: 'gpp_bad',
        items: [
          'Không truy cập tài khoản, booking hoặc dữ liệu của người khác.',
          'Không lợi dụng voucher, thanh toán, đánh giá hoặc hệ thống giữ phòng để gian lận.',
          'Không tải tệp độc hại, phá hoại dịch vụ hoặc gây ảnh hưởng đến người dùng khác.',
        ],
      },
    ],
  },
  'chinh-sach-bao-mat': {
    eyebrow: 'Quyền riêng tư',
    title: 'Chính sách bảo mật',
    description: 'Cách StayLuxe thu thập, sử dụng và bảo vệ dữ liệu khi bạn sử dụng hệ thống.',
    updatedAt: 'Cập nhật ngày 12/11/2026',
    sections: [
      {
        title: 'Dữ liệu được thu thập',
        icon: 'database',
        items: [
          'Thông tin tài khoản như họ tên, email, số điện thoại, ngày sinh và ảnh đại diện.',
          'Thông tin booking, khách lưu trú, yêu cầu đặc biệt, giao dịch thanh toán và lịch sử hoàn tiền.',
          'Thông tin kỹ thuật cần thiết cho bảo mật như phiên đăng nhập, thời điểm truy cập và số lần đăng nhập sai.',
        ],
      },
      {
        title: 'Mục đích sử dụng',
        icon: 'verified_user',
        items: [
          'Xác thực tài khoản, xử lý đặt phòng, thanh toán, hủy phòng và hỗ trợ khách hàng.',
          'Ngăn chặn truy cập trái phép, gian lận và các hành vi gây mất an toàn hệ thống.',
          'Cải thiện kết quả tìm kiếm, chất lượng dịch vụ và báo cáo vận hành ở dạng phù hợp.',
        ],
      },
      {
        title: 'Bảo vệ và chia sẻ dữ liệu',
        icon: 'shield_lock',
        items: [
          'Mật khẩu được lưu dưới dạng băm; thông tin liên hệ nhạy cảm được che trên giao diện.',
          'Dữ liệu chỉ được cung cấp cho khách sạn, nhân viên được phân quyền và đối tác thanh toán khi cần xử lý dịch vụ.',
          'StayLuxe không bán thông tin cá nhân của bạn cho bên thứ ba.',
        ],
      },
      {
        title: 'Quyền của bạn',
        icon: 'manage_accounts',
        items: [
          'Xem và cập nhật thông tin cá nhân sau bước xác thực lại.',
          'Đổi mật khẩu, yêu cầu đặt lại mật khẩu và đăng xuất phiên hiện tại.',
          'Liên hệ bộ phận hỗ trợ khi cần kiểm tra, điều chỉnh hoặc giải đáp về dữ liệu cá nhân.',
        ],
      },
    ],
  },
  'tro-giup': {
    eyebrow: 'Hỗ trợ khách hàng',
    title: 'Trung tâm trợ giúp',
    description: 'Hướng dẫn nhanh cho những thao tác thường gặp trước, trong và sau kỳ nghỉ.',
    updatedAt: 'Hỗ trợ trực tuyến mỗi ngày',
    sections: [
      {
        title: 'Tìm và đặt phòng',
        icon: 'travel_explore',
        items: [
          'Chọn khu vực, ngày nhận trả phòng, số khách và số phòng để xem các lựa chọn còn khả dụng.',
          'Kiểm tra tiện ích, sức chứa, chính sách hủy và tổng giá trước khi tạo booking.',
          'Nếu phòng vừa hết, hãy đổi ngày, hạng phòng hoặc số lượng phòng rồi tìm lại.',
        ],
      },
      {
        title: 'Thanh toán',
        icon: 'payments',
        items: [
          'Bạn có thể chọn phương thức được hiển thị tại bước thanh toán, gồm tiền mặt hoặc VNPay khi khả dụng.',
          'Không đóng trang thanh toán cho đến khi hệ thống trả về kết quả.',
          'Nếu đã trừ tiền nhưng booking chưa cập nhật, hãy giữ mã giao dịch và liên hệ hỗ trợ.',
        ],
      },
      {
        title: 'Hủy hoặc thay đổi booking',
        icon: 'event_repeat',
        items: [
          'Mở mục Đặt phòng của tôi, chọn booking và xem điều kiện hủy hoặc thay đổi.',
          'Hệ thống hiển thị phí hủy và số tiền dự kiến hoàn trước khi bạn xác nhận.',
          'Việc đổi ngày hoặc phòng chỉ thực hiện được khi booking còn đúng trạng thái và vẫn còn phòng phù hợp.',
        ],
      },
      {
        title: 'Tài khoản và đăng nhập',
        icon: 'password',
        items: [
          'Dùng chức năng Quên mật khẩu nếu không thể đăng nhập bằng mật khẩu hiện tại.',
          'Kiểm tra cả thư rác khi chưa thấy email OTP và chỉ sử dụng mã mới nhất còn hiệu lực.',
          'Tài khoản có thể bị khóa tạm thời sau nhiều lần nhập sai để bảo vệ bạn.',
        ],
      },
    ],
  },
  'lien-he': {
    eyebrow: 'Kết nối với StayLuxe',
    title: 'Liên hệ',
    description: 'Chọn kênh phù hợp để được hỗ trợ về tài khoản, booking hoặc thanh toán.',
    updatedAt: 'Thời gian hỗ trợ 08:00 - 22:00 mỗi ngày',
    sections: [
      {
        title: 'Email hỗ trợ',
        icon: 'mail',
        paragraphs: ['Gửi mã booking, email tài khoản và mô tả ngắn vấn đề để được kiểm tra nhanh hơn.'],
        items: ['support@stayluxe.vn'],
      },
      {
        title: 'Hotline',
        icon: 'call',
        paragraphs: ['Phù hợp với trường hợp cần hỗ trợ gấp trước giờ nhận phòng hoặc khi thanh toán gặp sự cố.'],
        items: ['1900 6868'],
      },
      {
        title: 'Hỗ trợ tại khách sạn',
        icon: 'concierge',
        paragraphs: ['Thông tin liên hệ và giờ nhận trả phòng của từng nơi lưu trú được hiển thị trong trang chi tiết khách sạn và booking.'],
      },
      {
        title: 'Thông tin nên chuẩn bị',
        icon: 'fact_check',
        items: [
          'Mã booking hoặc mã giao dịch liên quan.',
          'Email hoặc số điện thoại dùng để đặt phòng.',
          'Ảnh chụp thông báo lỗi nếu sự cố xuất hiện trên màn hình.',
        ],
      },
    ],
  },
};

export const InformationPage: React.FC<InformationPageProps> = ({ page, onNavigateHome }) => {
  const current = content[page];

  return (
    <main className="bg-background px-margin-mobile pb-space-xl pt-28 md:px-margin">
      <div className="mx-auto max-w-[1120px]">
        <nav aria-label="Điều hướng" className="mb-space-lg flex items-center gap-space-xs text-sm text-on-surface-variant">
          <button type="button" onClick={onNavigateHome} className="font-semibold hover:text-primary">
            Khám phá
          </button>
          <span className="material-symbols-outlined text-base" aria-hidden="true">chevron_right</span>
          <span aria-current="page">{current.title}</span>
        </nav>

        <section className="overflow-hidden rounded-3xl bg-surface-container-lowest shadow-[0_20px_60px_rgba(67,35,20,0.08)]">
          <header className="bg-primary px-6 py-10 text-on-primary md:px-12 md:py-14">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-on-primary/75">{current.eyebrow}</p>
            <h1 className="mt-space-sm font-headline-lg text-3xl font-semibold md:text-5xl">{current.title}</h1>
            <p className="mt-space-md max-w-3xl text-base leading-7 text-on-primary/85 md:text-lg">{current.description}</p>
            <p className="mt-space-md inline-flex items-center gap-space-xs rounded-full bg-on-primary/10 px-4 py-2 text-sm">
              <span className="material-symbols-outlined text-lg" aria-hidden="true">schedule</span>
              {current.updatedAt}
            </p>
          </header>

          <div className="grid gap-space-md p-5 md:grid-cols-2 md:p-10">
            {current.sections.map((section) => (
              <article key={section.title} className="rounded-2xl border border-outline-variant/30 bg-surface-container-low p-6">
                <div className="flex items-start gap-space-md">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-container text-on-primary-container">
                    <span className="material-symbols-outlined" aria-hidden="true">{section.icon}</span>
                  </span>
                  <div className="min-w-0">
                    <h2 className="font-headline-sm text-xl font-semibold text-on-surface">{section.title}</h2>
                    {section.paragraphs?.map((paragraph) => (
                      <p key={paragraph} className="mt-space-sm leading-7 text-on-surface-variant">{paragraph}</p>
                    ))}
                    {section.items && (
                      <ul className="mt-space-sm space-y-space-sm text-on-surface-variant">
                        {section.items.map((item) => (
                          <li key={item} className="flex gap-space-sm leading-7">
                            <span className="mt-[10px] h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <div className="mt-space-lg flex justify-center">
          <button type="button" onClick={onNavigateHome} className="inline-flex items-center gap-space-xs rounded-full bg-primary px-6 py-3 font-semibold text-on-primary transition-transform hover:-translate-y-0.5">
            <span className="material-symbols-outlined" aria-hidden="true">arrow_back</span>
            Trở về trang Khám phá
          </button>
        </div>
      </div>
    </main>
  );
};

export default InformationPage;
