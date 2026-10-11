import React, { useState } from 'react';

interface HeaderProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab = 'kham-pha',
  onTabChange,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [favoritesCount] = useState(3);

  const navItems = [
    { id: 'kham-pha', label: 'Khám phá' },
    { id: 'tim-kiem', label: 'Tìm kiếm' },
    { id: 'uu-dai', label: 'Ưu đãi' },
    { id: 'yeu-thich', label: 'Yêu thích', badge: favoritesCount },
  ];

  const handleNavClick = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    if (onTabChange) {
      onTabChange(id);
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-surface-container-lowest/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(120,53,15,0.04)]">
      <div className="h-20 max-w-[1440px] mx-auto px-margin-mobile md:px-margin flex items-center justify-between gap-space-md">
        {/* Logo */}
        <div className="flex items-center gap-space-sm shrink-0">
          <img
            alt="StayLuxe Brand Logo"
            className="h-8 w-auto object-contain"
            src="https://lh3.googleusercontent.com/aida/AEtjO1UuLKbQYAJ52dPZk6-vWkMW3Pun-2jyQpANXEzqJDtdL4GAdygv_RV5NksezVpnOq7cqfZ3U8a-L1GYf3qD-4d_-o6-jJknZHyBxv5qB9elZ7y5-Kg5oWmr4HSFHkqhYjkBD3JOzAUPK03x-47Xgm8ov8on002cCsMFRr6jPhVOQ18BYA9KQ96uFGoXWDXz29SovuZRDM3UADQicBGNH4-Mty0DXEILl4ffljeKAFuG9g"
          />
          <a
            href="#"
            onClick={(e) => handleNavClick('kham-pha', e)}
            className="font-headline-sm text-headline-sm text-on-surface tracking-tight hover:opacity-90 transition-opacity"
            data-path="kham-pha"
          >
            StayLuxe
          </a>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-space-lg">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <a
                key={item.id}
                href={`#${item.id}`}
                onClick={(e) => handleNavClick(item.id, e)}
                className={`py-space-xs transition-colors relative inline-flex items-center ${
                  isActive
                    ? 'text-primary font-label-lg font-bold'
                    : 'font-label-lg text-label-lg text-on-surface-variant hover:text-on-surface'
                }`}
                data-path={item.id}
              >
                <span>{item.label}</span>
                {item.badge !== undefined && (
                  <span className="ml-space-xs px-2 py-0.5 rounded-full bg-primary text-on-primary font-label-sm text-label-sm leading-none flex items-center justify-center">
                    {item.badge}
                  </span>
                )}
              </a>
            );
          })}
        </nav>

        {/* User Account / Profile */}
        <div className="flex items-center gap-space-md shrink-0">
          <a
            className="hidden sm:flex items-center font-label-md text-label-md text-on-surface-variant hover:text-on-surface transition-colors"
            data-path="tai-khoan"
            href="#tai-khoan"
          >
            Tài khoản
          </a>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex items-center gap-space-xs p-1 pl-3 rounded-full bg-surface-container-low hover:bg-surface-container transition-colors cursor-pointer border-0"
            aria-label="Menu tài khoản"
          >
            <span className="material-symbols-outlined text-outline text-[18px]">
              menu
            </span>
            <img
              alt="Profile"
              className="w-8 h-8 rounded-full object-cover"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuC_O1CP62hapmTqL5uB2S-b3PrZypkqqy015u_tkdPphRD1yOTMFeX6xk_O_M6Bw12PoUyN5XC8TBPAW80wd3KheaeplGvR7H1TnqGRuS7KTkU6XuAdTBdL7sUFepWC5Ng9QJe7xQFdLxCQ8eQo4SJmQXfWtmRp2rkQDqdcLWfDyuca_6Ha_v63hfQzFnSvwvmMCgnZUqofATaLF8vb2xralSQzS8NUQJm3EaHFSYn0"
            />
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-surface-container-highest bg-surface-container-lowest px-6 py-4 shadow-lg animate-fadeIn">
          <div className="flex flex-col gap-3">
            {navItems.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                onClick={(e) => {
                  handleNavClick(item.id, e);
                  setMobileMenuOpen(false);
                }}
                className={`py-2 flex items-center justify-between text-body-md ${
                  activeTab === item.id
                    ? 'text-primary font-bold'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <span>{item.label}</span>
                {item.badge !== undefined && (
                  <span className="px-2 py-0.5 rounded-full bg-primary text-on-primary text-xs">
                    {item.badge}
                  </span>
                )}
              </a>
            ))}
            <div className="border-t border-surface-container pt-3">
              <a
                href="#tai-khoan"
                className="py-2 block text-body-md text-on-surface font-medium"
                onClick={() => setMobileMenuOpen(false)}
              >
                Tài khoản & Cài đặt
              </a>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
export default Header;
