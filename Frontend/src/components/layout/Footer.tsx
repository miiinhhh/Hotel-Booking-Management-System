import React from 'react';

interface FooterProps {
  onNavigate?: (path: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  const footerLinks = [
    { label: 'Điều khoản dịch vụ', path: 'dieu-khoan' },
    { label: 'Chính sách bảo mật', path: 'chinh-sach-bao-mat' },
    { label: 'Trung tâm trợ giúp', path: 'tro-giup' },
    { label: 'Liên hệ', path: 'lien-he' },
  ];

  return (
    <footer className="w-full bg-surface-container-low mt-space-xl">
      <div className="max-w-[1440px] mx-auto px-margin-mobile md:px-margin py-space-xl flex flex-col md:flex-row items-center justify-between gap-space-md">
        <div className="flex items-center gap-space-sm flex-wrap justify-center md:justify-start">
          <span className="font-headline-sm text-headline-sm text-primary tracking-tight">
            StayLuxe
          </span>
          <span className="font-body-md text-body-md text-on-surface-variant">
            © 2025 StayLuxe Hospitality Group. Tất cả quyền được bảo lưu.
          </span>
        </div>
        <div className="flex items-center flex-wrap gap-space-md justify-center">
          {footerLinks.map((link) => (
            <a
              key={link.path}
              className="font-label-md text-label-md text-on-surface-variant hover:text-on-surface transition-colors"
              data-path={link.path}
              href={`#${link.path}`}
              onClick={(event) => {
                if (!onNavigate) return;
                event.preventDefault();
                onNavigate(link.path);
              }}
            >
              {link.label}
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
};
export default Footer;
