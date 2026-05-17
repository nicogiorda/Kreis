export function scrollTop(): void {
  if (typeof window === "undefined") return;
  
  // Scroll instantáneo en mobile, suave en desktop
  const isMobile = window.innerWidth < 768;
  window.scrollTo({ 
    top: 0, 
    behavior: isMobile ? "auto" : "smooth" 
  });
}
