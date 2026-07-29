'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { Button } from '@/components/ui/button';
import { Moon, Sun, ChevronDown, Settings } from 'lucide-react';

export default function Navbar() {
  const { user, profile, loading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [adminOpen, setAdminOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isAdmin = profile?.role === 'Admin' || profile?.role === 'SuperAdmin';

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setAdminOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <nav className="border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <Link href="/" className="flex-shrink-0 flex items-center font-bold text-xl text-primary">
              🔥 Fireside Archive
            </Link>

            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              <Link href="/"
                className="inline-flex items-center px-1 pt-1 border-b-2 border-transparent text-sm font-medium text-muted-foreground hover:text-foreground hover:border-primary transition-colors">
                Dashboard
              </Link>
              <Link href="/firesides"
                className="inline-flex items-center px-1 pt-1 border-b-2 border-transparent text-sm font-medium text-muted-foreground hover:text-foreground hover:border-primary transition-colors">
                Firesides
              </Link>

              {/* Admin Dropdown */}
              {isAdmin && (
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setAdminOpen(!adminOpen)}
                    className={`inline-flex items-center gap-1 px-1 pt-1 border-b-2 text-sm font-medium transition-colors ${
                      adminOpen
                        ? 'border-primary text-primary'
                        : 'border-transparent text-muted-foreground hover:text-foreground hover:border-primary'
                    }`}
                  >
                    <Settings className="h-4 w-4" />
                    Admin
                    <ChevronDown className={`h-3 w-3 transition-transform ${adminOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {adminOpen && (
                    <div className="absolute left-0 top-full mt-1 w-56 bg-card border border-border rounded-lg shadow-xl z-50 py-1">
                      {/* Content section */}
                      <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Content
                      </div>
                      <Link href="/admin/families" onClick={() => setAdminOpen(false)}
                        className="block px-4 py-2 text-sm text-foreground hover:bg-accent hover:text-accent-foreground">
                        Fireside Families
                      </Link>
                      <Link href="/admin/fireside-integration" onClick={() => setAdminOpen(false)}
                        className="block px-4 py-2 text-sm text-foreground hover:bg-accent hover:text-accent-foreground">
                        Integrate (Import PDFs)
                      </Link>
                      <Link href="/admin/snippets" onClick={() => setAdminOpen(false)}
                        className="block px-4 py-2 text-sm text-foreground hover:bg-accent hover:text-accent-foreground">
                        Snippets
                      </Link>
                      <Link href="/admin/deepenings" onClick={() => setAdminOpen(false)}
                        className="block px-4 py-2 text-sm text-foreground hover:bg-accent hover:text-accent-foreground">
                        Deepenings
                      </Link>

                      <div className="border-t border-border my-1" />

                      {/* Reference section */}
                      <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Reference
                      </div>
                      <Link href="/admin/references" onClick={() => setAdminOpen(false)}
                        className="block px-4 py-2 text-sm text-foreground hover:bg-accent hover:text-accent-foreground">
                        References
                      </Link>
                      <Link href="/admin/tags" onClick={() => setAdminOpen(false)}
                        className="block px-4 py-2 text-sm text-foreground hover:bg-accent hover:text-accent-foreground">
                        Tags
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={toggleTheme} className="w-9 px-0" aria-label="Toggle theme">
              {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </Button>
            {loading ? (
              <span className="text-sm text-muted-foreground">Loading...</span>
            ) : user ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground hidden sm:block">
                  {user.displayName || user.email}
                </span>
                <Link href="/profile"><Button variant="ghost" size="sm">Profile</Button></Link>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/login"><Button variant="ghost" size="sm">Sign In</Button></Link>
                <Link href="/signup"><Button size="sm">Sign Up</Button></Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}