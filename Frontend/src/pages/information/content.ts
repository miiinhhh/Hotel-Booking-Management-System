import type { InformationPageId } from './InformationPage';

export const SUPPORT_EMAIL = 'support@stayluxe.vn';

/** Khối nội dung trong một mục pháp lý: đoạn văn hoặc danh sách gạch đầu dòng. */
export type Block = string | { list: string[] };
export interface LegalSection { id: string; title: string; blocks: Block[] }
export interface LegalDoc { eyebrow: string; title: string; description: string; effective: string; summary: string[]; sections: LegalSection[] }
export interface Faq { q: string; a: string; keywords?: string }
export interface FaqCategory { id: string; title: string; icon: string; description: string; faqs: Faq[] }
export interface NavItem { id: InformationPageId; label: string; icon: string }

/* ======================= Tiếng Việt ======================= */
export const NAV_VI: NavItem[] = [
  { id: 'tro-giup', label: 'Trung tâm trợ giúp', icon: 'help' },
  { id: 'lien-he', label: 'Liên hệ', icon: 'support_agent' },
  { id: 'dieu-khoan', label: 'Điều khoản dịch vụ', icon: 'gavel' },
  { id: 'chinh-sach-bao-mat', label: 'Chính sách bảo mật', icon: 'shield_lock' },
];



export const LEGAL_VI: Record<'dieu-khoan' | 'chinh-sach-bao-mat', LegalDoc> = {
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


/** Nhóm theo vấn đề của khách (không theo phòng ban), như khuyến nghị cho help center. */
export const FAQ_VI: FaqCategory[] = [
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

export const TOPICS_VI = ['Đặt phòng', 'Thanh toán / hoàn tiền', 'Hủy hoặc thay đổi đơn', 'Tài khoản & đăng nhập', 'Góp ý dịch vụ', 'Khác'];
