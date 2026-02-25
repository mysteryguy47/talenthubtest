import { Link, useLocation } from "wouter";
import { GraduationCap, MapPin, Heart, Calculator, BookOpen, PenTool, Rocket, FileText, Brain, Trophy, BarChart3, Phone, Mail, Instagram } from "lucide-react";

export default function Footer() {
  const [location, setLocation] = useLocation();

  // Handle logo click - scroll to hero section
  const handleLogoClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (location === "/") {
      // Already on home page, scroll to top
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      // Navigate to home, then scroll to top
      setLocation("/");
      // Small delay to ensure page loads before scrolling
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }, 100);
    }
  };

  return (
    <footer className="relative bg-gradient-to-br from-slate-900 via-purple-900/30 to-slate-950 dark:from-slate-950 dark:via-purple-950/50 dark:to-slate-950 text-foreground overflow-hidden border-t border-border/20">
      {/* Subtle background gradient overlay */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
        <div className="absolute top-0 left-1/4 w-64 h-64 premium-gradient rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-64 h-64 premium-gradient rounded-full blur-3xl"></div>
      </div>

      <div className="relative container mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 md:gap-12 mb-6">
          {/* Column 1: Brand */}
          <div className="lg:col-span-2">
            <a 
              href="/" 
              onClick={handleLogoClick}
              className="flex items-center gap-3 mb-4 group cursor-pointer"
            >
              <img 
                src="/imagesproject/logo.ico.jpg" 
                alt="Talent Hub Logo" 
                className="w-11 h-11 rounded-xl object-cover shadow-lg group-hover:shadow-xl transition-all duration-300"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  const fallback = target.nextElementSibling as HTMLElement;
                  if (fallback) fallback.style.display = 'flex';
                }}
              />
              <div className="w-11 h-11 rounded-xl premium-gradient items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300 hidden">
                <GraduationCap className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <div className="text-xl font-extrabold text-primary-foreground tracking-tight">
                  Talent Hub
                </div>
                <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-[0.2em]">Excellence Lab</div>
              </div>
            </a>
            <p className="text-muted-foreground text-sm leading-relaxed max-w-sm mb-4">
              Transforming mathematics learning through innovative tools and personalized practice.
            </p>
            <p className="text-muted-foreground/70 text-xs font-medium mb-4">
              18+ Years of Teaching Excellence
            </p>
            
            {/* Social Icons */}
            <div className="flex items-center gap-3">
              <a 
                href="tel:+919266117055" 
                className="w-10 h-10 rounded-lg bg-secondary/50 backdrop-blur-sm hover:bg-primary/20 flex items-center justify-center transition-all duration-200 group border border-border/50"
                title="Call us: 9266117055"
              >
                <Phone className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:scale-110 transition-all" />
              </a>
              <a 
                href="mailto:ayushkhurana47@gmail.com" 
                className="w-10 h-10 rounded-lg bg-secondary/50 backdrop-blur-sm hover:bg-primary/20 flex items-center justify-center transition-all duration-200 group border border-border/50"
                title="Email us: ayushkhurana47@gmail.com"
              >
                <Mail className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:scale-110 transition-all" />
              </a>
              <a 
                href="https://www.instagram.com/talenthub16?igsh=NzRkcHpyY2N2bTVh" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-lg bg-secondary/50 backdrop-blur-sm hover:bg-primary/20 flex items-center justify-center transition-all duration-200 group border border-border/50"
                title="Follow us on Instagram"
              >
                <Instagram className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:scale-110 transition-all" />
              </a>
              <a 
                href="https://share.google/FtlKId4blBwgX9Q0w" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-lg bg-secondary/50 backdrop-blur-sm hover:bg-primary/20 flex items-center justify-center transition-all duration-200 group border border-border/50"
                title="Find us on Google Maps"
              >
                <MapPin className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:scale-110 transition-all" />
              </a>
            </div>
          </div>

          {/* Column 2: Programs */}
          <div>
            <h3 className="text-xs font-black mb-4 text-primary-foreground uppercase tracking-widest">Programs</h3>
            <ul className="space-y-2.5">
              <li>
                <Link href="/courses/abacus">
                  <span className="text-sm text-muted-foreground hover:text-primary transition-colors cursor-pointer flex items-center gap-2">
                    <Calculator className="w-3.5 h-3.5" />
                    Abacus
                  </span>
                </Link>
              </li>
              <li>
                <Link href="/courses/vedic-maths">
                  <span className="text-sm text-muted-foreground hover:text-primary transition-colors cursor-pointer flex items-center gap-2">
                    <BookOpen className="w-3.5 h-3.5" />
                    Vedic Maths
                  </span>
                </Link>
              </li>
              <li>
                <Link href="/courses/handwriting">
                  <span className="text-sm text-muted-foreground hover:text-primary transition-colors cursor-pointer flex items-center gap-2">
                    <PenTool className="w-3.5 h-3.5" />
                    Handwriting
                  </span>
                </Link>
              </li>
              <li>
                <Link href="/courses/stem">
                  <span className="text-sm text-muted-foreground hover:text-primary transition-colors cursor-pointer flex items-center gap-2">
                    <Rocket className="w-3.5 h-3.5" />
                    STEM
                  </span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Tools */}
          <div>
            <h3 className="text-xs font-black mb-4 text-primary-foreground uppercase tracking-widest">Tools</h3>
            <ul className="space-y-2.5">
              <li>
                <Link href="/create">
                  <span className="text-sm text-muted-foreground hover:text-primary transition-colors cursor-pointer flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5" />
                    Create Papers
                  </span>
                </Link>
              </li>
              <li>
                <Link href="/mental">
                  <span className="text-sm text-muted-foreground hover:text-primary transition-colors cursor-pointer flex items-center gap-2">
                    <Brain className="w-3.5 h-3.5" />
                    Mental Math
                  </span>
                </Link>
              </li>
              <li>
                <Link href="/dashboard">
                  <span className="text-sm text-muted-foreground hover:text-primary transition-colors cursor-pointer flex items-center gap-2">
                    <Trophy className="w-3.5 h-3.5" />
                    Dashboard
                  </span>
                </Link>
              </li>
              <li>
                <span className="text-sm text-muted-foreground/50 cursor-default flex items-center gap-2">
                  <BarChart3 className="w-3.5 h-3.5" />
                  Coming Soon
                </span>
              </li>
            </ul>
          </div>

          {/* Column 4: Contact & Branches */}
          <div>
            <h3 className="text-xs font-black mb-4 text-primary-foreground uppercase tracking-widest">Branches</h3>
            <ul className="space-y-3 mb-4">
              <li className="flex items-start gap-2">
                <MapPin className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-primary-foreground font-medium">Rohini Sector - 16</p>
                  <p className="text-xs text-muted-foreground">New Delhi</p>
                </div>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-primary-foreground font-medium">Rohini Sector - 11</p>
                  <p className="text-xs text-muted-foreground">New Delhi</p>
                </div>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-primary-foreground font-medium">Gurgaon</p>
                  <p className="text-xs text-muted-foreground">Haryana</p>
                </div>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-border/20 pt-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground/70">
            © 2026 Talent Hub.
          </p>
          <div className="flex-1"></div>
          <p className="text-xs text-muted-foreground/70">
            Made with <Heart className="w-3 h-3 text-red-500 fill-red-500 inline" /> and consistency for learning.
          </p>
        </div>
      </div>
    </footer>
  );
}


