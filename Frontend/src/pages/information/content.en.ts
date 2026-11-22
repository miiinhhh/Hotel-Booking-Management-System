import { FaqCategory, LegalDoc, NavItem, SUPPORT_EMAIL } from './content';

export const NAV_EN: NavItem[] = [
  { id: 'tro-giup', label: 'Help center', icon: 'help' },
  { id: 'lien-he', label: 'Contact', icon: 'support_agent' },
  { id: 'dieu-khoan', label: 'Terms of service', icon: 'gavel' },
  { id: 'chinh-sach-bao-mat', label: 'Privacy policy', icon: 'shield_lock' },
];

export const LEGAL_EN: Record<'dieu-khoan' | 'chinh-sach-bao-mat', LegalDoc> = {
  'dieu-khoan': {
    eyebrow: 'Legal information',
    title: 'Terms of service',
    description: 'The rules that apply when you search, book and use services on StayLuxe.',
    effective: 'Effective from 12 November 2026',
    summary: [
      'Keep your account details accurate and keep your password and one-time codes private.',
      'The final price and cancellation terms are always shown before you confirm a booking.',
      "Cancellation fees depend on each hotel's policy and when you cancel.",
      "Voucher or payment fraud, or accessing other people's data, may lead to account suspension.",
    ],
    sections: [
      {
        id: 'tai-khoan',
        title: 'Accounts and use of the service',
        blocks: [
          'You need a StayLuxe account to book. You are responsible for all activity under your account.',
          { list: [
            'Provide accurate information and keep your password and one-time codes secure.',
            'Only use the booking, payment and review data that belongs to your own account.',
            'StayLuxe may temporarily lock an account when it detects unusual sign-ins, fraud or breaches of these terms.',
          ] },
        ],
      },
      {
        id: 'dat-phong',
        title: 'Bookings and prices',
        blocks: [
          'Prices shown in search results are indicative. The official price is recalculated by the system at checkout.',
          { list: [
            'The final price is based on your dates, room type, surcharges, taxes, promotions and valid vouchers.',
            'A booking is only confirmed once the system has all required information and the required payment status.',
            'Rooms held in a pending booking may be released automatically when the payment deadline passes.',
          ] },
        ],
      },
      {
        id: 'huy-hoan',
        title: 'Cancellations and refunds',
        blocks: [
          'Each hotel has its own cancellation policy, shown on the hotel page and in your booking.',
          { list: [
            "Cancellation fees and refunds depend on the hotel's policy, when you cancel and the booking status.",
            'You can always preview the cancellation fee before confirming.',
            'How long a refund takes to arrive may depend on your bank or the payment gateway.',
          ] },
        ],
      },
      {
        id: 'hanh-vi',
        title: 'Prohibited conduct',
        blocks: [
          'To protect guests and partner hotels, you agree not to:',
          { list: [
            "Access other people's accounts, bookings or data.",
            'Abuse vouchers, payments, reviews or the room-hold system for fraud.',
            'Upload malicious files, disrupt the service or harm other users.',
          ] },
        ],
      },
      {
        id: 'thay-doi',
        title: 'Changes to these terms',
        blocks: [
          'StayLuxe may update these terms when the service changes. The new effective date will be shown at the top of this page; continuing to use the service after that date means you accept the update.',
        ],
      },
    ],
  },
  'chinh-sach-bao-mat': {
    eyebrow: 'Privacy',
    title: 'Privacy policy',
    description: 'How StayLuxe collects, uses and protects data when you use the system.',
    effective: 'Updated 12 November 2026',
    summary: [
      'We only collect the data needed for bookings, payments and account security.',
      'Passwords are hashed; sensitive contact details are masked in the interface.',
      'Data is only shared with hotels and payment partners when needed to provide the service.',
      'StayLuxe does not sell your personal information.',
    ],
    sections: [
      {
        id: 'du-lieu',
        title: 'Data we collect',
        blocks: [
          'We collect the following data when you create an account and use the service:',
          { list: [
            'Account details such as full name, email, phone number, date of birth and profile photo.',
            'Booking details, guests, special requests, payment transactions and refund history.',
            'Technical data needed for security, such as sessions, access times and failed sign-in attempts.',
          ] },
        ],
      },
      {
        id: 'muc-dich',
        title: 'How we use data',
        blocks: [
          { list: [
            'Authenticate your account and process bookings, payments, cancellations and support requests.',
            'Prevent unauthorised access, fraud and other threats to the system.',
            'Improve search results, service quality and operational reports in an appropriate form.',
          ] },
        ],
      },
      {
        id: 'bao-ve',
        title: 'Protecting and sharing data',
        blocks: [
          { list: [
            'Passwords are stored as hashes; sensitive contact details are masked in the interface.',
            'Data is only provided to hotels, authorised staff and payment partners when needed to provide the service.',
            'StayLuxe does not sell your personal information to third parties.',
          ] },
        ],
      },
      {
        id: 'quyen',
        title: 'Your rights',
        blocks: [
          'You are in control of your personal data:',
          { list: [
            'View and update your personal details after re-authenticating.',
            'Change your password, request a password reset and sign out of your sessions.',
            'Contact support if you need to check, correct or ask about your personal data.',
          ] },
        ],
      },
      {
        id: 'lien-he-bao-mat',
        title: 'Privacy contact',
        blocks: [
          `For any question about your personal data, email ${SUPPORT_EMAIL} with the subject "Privacy". We reply within 3 working days.`,
        ],
      },
    ],
  },
};

export const FAQ_EN: FaqCategory[] = [
  {
    id: 'dat-phong', title: 'Searching and booking', icon: 'travel_explore', description: 'Find availability, choose rooms, hold a room',
    faqs: [
      { q: 'How do I find available rooms?', a: 'Choose your dates, number of guests and rooms on the Explore page. Results only include rooms available for those dates.', keywords: 'search available rooms' },
      { q: 'What should I check before booking?', a: 'Check the amenities, capacity, cancellation policy and the total price (including taxes, fees and discounts) at checkout before confirming.', keywords: 'amenities capacity price' },
      { q: 'The room I chose is no longer available. What now?', a: 'Another guest may have just booked it or it may be temporarily blocked. Try other dates, another room type or a different number of rooms.', keywords: 'sold out unavailable' },
      { q: 'How long is a room held for me?', a: 'Bookings awaiting payment are held for a short time. After that the room is automatically released for sale again.', keywords: 'hold expired' },
    ],
  },
  {
    id: 'thanh-toan', title: 'Payments and refunds', icon: 'payments', description: 'VNPay, pay at hotel, vouchers, refunds',
    faqs: [
      { q: 'Which payment methods does StayLuxe support?', a: 'You can pay a deposit via VNPay or pay at the hotel, depending on the options shown at checkout.', keywords: 'vnpay cash card' },
      { q: 'I was charged but my booking has not updated?', a: 'Do not close the payment page until you see the result. If the booking still has not updated, keep the transaction reference and contact support so we can reconcile it.', keywords: 'charged payment error' },
      { q: 'When will I receive my refund?', a: 'Once your cancellation is processed, timing depends on your bank or the payment gateway, usually 3–7 working days.', keywords: 'refund' },
      { q: 'How do I use a promo code?', a: 'Copy a code from the Offers page and enter it in the "Promo code" field at checkout. The system checks the conditions and shows your discount.', keywords: 'voucher promo discount' },
    ],
  },
  {
    id: 'thay-doi', title: 'Cancelling or changing a booking', icon: 'event_repeat', description: 'Cancellation fees, changing dates or rooms',
    faqs: [
      { q: 'How do I cancel a booking?', a: 'Open "My bookings", choose the booking and select Cancel. You will see the fee and expected refund before confirming.', keywords: 'cancel' },
      { q: 'Can I change my dates?', a: 'Yes, while the booking status allows it and the room is available for the new dates. Use "Change dates" on your booking.', keywords: 'reschedule change dates' },
      { q: 'How is the cancellation fee calculated?', a: "It follows each hotel's policy and how long is left until check-in. The earlier you cancel, the higher the refund usually is.", keywords: 'cancellation fee policy' },
    ],
  },
  {
    id: 'tai-khoan', title: 'Account and sign-in', icon: 'manage_accounts', description: 'Password, one-time codes, locked accounts',
    faqs: [
      { q: 'I forgot my password?', a: 'Use "Forgot password?" on the sign-in screen to receive a one-time code by email and set a new password.', keywords: 'forgot reset password' },
      { q: 'I did not receive the code email?', a: 'Check your Spam/Promotions folders and only use the latest valid code. If it still has not arrived, request a new one after a few minutes.', keywords: 'otp email code' },
      { q: 'Why is my account locked?', a: 'Your account may be locked temporarily after several wrong passwords to protect you. Wait for the lock to expire or reset your password.', keywords: 'locked account' },
    ],
  },
];

export const TOPICS_EN = ['Booking', 'Payment / refund', 'Cancel or change a booking', 'Account & sign-in', 'Service feedback', 'Other'];
