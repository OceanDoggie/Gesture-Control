import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'wouter';
import { Menu, X, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import logoUrl from '@assets/generated_images/GestureControl_project_logo_49e785a6.png';

export default function Navigation() {
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsDropdownOpen(false);
  }, [location]);

  // Handle keyboard navigation for dropdown
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      setIsDropdownOpen(false);
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setIsDropdownOpen(!isDropdownOpen);
    }
  };

  const menuItems = [
    { label: 'Project', href: '/project' },
    { label: 'Webcam', href: '/webcam' },
    { label: 'Future', href: '/future' },
  ];

  return (
    <nav className="sticky top-0 z-50 bg-primary border-b border-primary-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Brand */}
          <Link href="/" className="flex items-center gap-3 hover-elevate rounded-md px-2 py-1" data-testid="link-home">
            <img src={logoUrl} alt="GestureControl Logo" className="h-8 w-8" />
            <span className="text-xl font-semibold text-primary-foreground">GestureControl</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center">
            <div className="relative" ref={dropdownRef}>
              <Button
                variant="ghost"
                className="flex items-center gap-2 text-primary-foreground hover:text-primary-foreground"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                onKeyDown={handleKeyDown}
                aria-expanded={isDropdownOpen}
                aria-haspopup="true"
                data-testid="button-dropdown-menu"
              >
                Menu
                <ChevronDown className={`h-4 w-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </Button>

              {/* Dropdown Menu */}
              {isDropdownOpen && (
                <div 
                  className="absolute right-0 mt-2 w-48 bg-popover border border-popover-border rounded-md shadow-lg"
                  role="menu"
                  aria-label="Navigation menu"
                >
                  {menuItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`block px-4 py-3 text-sm text-popover-foreground hover-elevate first:rounded-t-md last:rounded-b-md ${
                        location === item.href ? 'bg-accent text-accent-foreground' : ''
                      }`}
                      role="menuitem"
                      data-testid={`link-${item.label.toLowerCase()}`}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-primary-foreground"
              aria-expanded={isMobileMenuOpen}
              aria-label="Toggle mobile menu"
              data-testid="button-mobile-menu"
            >
              {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-primary-border">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {menuItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block px-3 py-2 text-base text-primary-foreground hover-elevate rounded-md ${
                    location === item.href ? 'bg-primary-border' : ''
                  }`}
                  data-testid={`mobile-link-${item.label.toLowerCase()}`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}