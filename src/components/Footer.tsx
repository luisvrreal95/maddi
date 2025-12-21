import React from 'react';
import { Facebook, Instagram, Twitter } from 'lucide-react';

const Footer: React.FC = () => {
  const socialLinks = [
    { icon: Facebook, href: '#', label: 'Facebook' },
    { icon: Instagram, href: '#', label: 'Instagram' },
    { icon: Twitter, href: '#', label: 'Twitter' }
  ];

  const navLinks = [
    { label: 'Nuestros Servicios', href: '#' },
    { label: 'Inicia sesión', href: '#' },
    { label: 'Regístrate', href: '#' },
    { label: 'Explora', href: '#' },
    { label: 'Términos & Condiciones', href: '#' }
  ];

  return (
    <footer className="bg-[#181818] py-16 px-16 max-md:py-12 max-md:px-8 max-sm:py-10 max-sm:px-5">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start gap-12 mb-12">
          {/* Logo and Tagline */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="40" height="40" rx="8" fill="#9BFF43"/>
                <text x="50%" y="55%" dominantBaseline="middle" textAnchor="middle" fill="#202020" fontSize="14" fontWeight="bold" fontFamily="system-ui">
                  M
                </text>
              </svg>
              <span className="text-white text-2xl font-bold">Maddi</span>
            </div>
            <p className="text-white/50 text-sm italic">Hace todo más fácil</p>
          </div>

          {/* Social Links */}
          <div className="flex items-center gap-4">
            {socialLinks.map((social) => (
              <a
                key={social.label}
                href={social.href}
                aria-label={social.label}
                className="w-10 h-10 rounded-full bg-[#2A2A2A] flex items-center justify-center text-white/70 hover:bg-[#9BFF43] hover:text-[#202020] transition-all duration-300"
              >
                <social.icon className="w-5 h-5" />
              </a>
            ))}
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-wrap gap-x-8 gap-y-3 max-md:gap-x-6">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-white/70 text-sm hover:text-[#9BFF43] transition-colors duration-300"
              >
                {link.label}
              </a>
            ))}
          </nav>
        </div>

        {/* Divider */}
        <div className="w-full h-px bg-white/10 mb-8" />

        {/* Copyright */}
        <div className="text-center">
          <p className="text-white/40 text-sm">
            © 2025 Maddi. Cada marca y espectacular es propiedad del dueño.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
