import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ArrowRight, Sparkles, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '../common';
import { useSettings } from "../../contexts/SettingsContext";
import { useInteractiveTilt } from '../../hooks/useInteractiveTilt';

export function HeroBanner() {
  const { settings } = useSettings();
  const tilt = useInteractiveTilt({ maxRotation: 8, perspective: 1200 });
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    {
      id: 1,
      title: settings.hero_title || settings.store_name || "Azhar's Store",
      subtitle: settings.hero_subtitle || settings.store_tagline || "Next-Gen Shopping Experience",
      description:
        settings.hero_description ||
        settings.about_us ||
        "Discover extraordinary curated products with real-time tracking, lightning-fast delivery, and ultimate buyer protection.",
      image:
        settings.hero_image ||
        settings.logo_url ||
        "https://images.pexels.com/photos/1036857/pexels-photo-1036857.jpeg?auto=compress&cs=tinysrgb&w=1600",
      cta: settings.hero_button_text || "Shop Now",
      link: "/shop",
      bg: "from-blue-600/90 via-indigo-600/80 to-purple-600/90",
      accent: "from-blue-500 to-indigo-500",
    },
    {
      id: 2,
      title: "New Arrivals",
      subtitle: "Fresh Collection 2026",
      description:
        "Check out the latest futuristic trends in tech, accessories, and lifestyle fashion. Elevate your everyday style.",
      image:
        settings.hero_image_slide2 ||
        "https://images.pexels.com/photos/2730465/pexels-photo-2730465.jpeg?auto=compress&cs=tinysrgb&w=1600",
      cta: "Explore Now",
      link: "/shop?filter=new",
      bg: "from-emerald-600/90 via-teal-600/80 to-cyan-600/90",
      accent: "from-emerald-500 to-teal-500",
    },
    {
      id: 3,
      title: "Flash Sale",
      subtitle: "Limited Edition Deals",
      description:
        "Exclusive limited-time price drops on flagship items. Grab them before stock runs out!",
      image:
        settings.hero_image_slide3 ||
        "https://images.pexels.com/photos/2305445/pexels-photo-2305445.jpeg?auto=compress&cs=tinysrgb&w=1600",
      cta: "View Flash Deals",
      link: "/shop?filter=flash",
      bg: "from-purple-600/90 via-pink-600/80 to-rose-600/90",
      accent: "from-purple-500 to-rose-500",
    },
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 6500);
    return () => clearInterval(timer);
  }, [slides.length]);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const scrollToNextSection = () => {
    window.scrollTo({
      top: window.innerHeight * 0.55,
      behavior: 'smooth',
    });
  };

  return (
    <section
      ref={tilt.ref as any}
      onPointerMove={tilt.onPointerMove}
      onPointerLeave={tilt.onPointerLeave}
      onPointerCancel={tilt.onPointerCancel}
      style={tilt.style}
      className="motion-surface holo-surface group relative overflow-hidden rounded-3xl lg:rounded-[2.5rem] mb-12 shadow-2xl shadow-blue-950/25 border border-white/20 dark:border-gray-800/80"
    >
      <div className="relative h-[480px] sm:h-[540px] md:h-[600px] lg:h-[650px] overflow-hidden select-none">
        {/* Floating Background Depth Orbs */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-500/25 rounded-full blur-3xl pointer-events-none animate-pulse" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl pointer-events-none animate-pulse" />

        <AnimatePresence mode="wait">
          <motion.div
            key={slides[currentSlide].id}
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="absolute inset-0"
          >
            {/* Background Image with Layer Parallax */}
            <div className="w-full h-full layer-float">
              <img
                src={slides[currentSlide].image}
                alt={slides[currentSlide].title}
                className="h-full w-full object-cover scale-[1.05] transition-transform duration-1000 ease-out"
              />
            </div>

            {/* Futuristic Multi-layer Overlays */}
            <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/60 to-gray-950/30" />
            <div
              className={`absolute inset-0 bg-gradient-to-r ${slides[currentSlide].bg} opacity-60 mix-blend-overlay`}
            />

            {/* Tech Grid Pattern */}
            <div className="absolute inset-0 opacity-15 [background-image:linear-gradient(rgba(255,255,255,0.2)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.2)_1px,transparent_1px)] [background-size:40px_40px] pointer-events-none" />

            {/* Foreground Content with 3D Pop */}
            <div className="absolute inset-0 flex items-center">
              <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 w-full">
                <div className="max-w-2xl layer-pop">
                  {/* Floating Pill Badge */}
                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.5 }}
                    className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/15 dark:bg-white/10 backdrop-blur-md rounded-full border border-white/25 text-white text-xs sm:text-sm font-semibold tracking-wide mb-6 shadow-lg shadow-black/20"
                  >
                    <Sparkles className="h-4 w-4 text-amber-300 animate-spin" style={{ animationDuration: '6s' }} />
                    <span>{slides[currentSlide].subtitle}</span>
                  </motion.div>

                  {/* Title */}
                  <motion.h1
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.6 }}
                    className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold text-white mb-5 tracking-tight leading-[1.1] drop-shadow-md"
                  >
                    {slides[currentSlide].title}
                  </motion.h1>

                  {/* Description */}
                  <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4, duration: 0.6 }}
                    className="text-base sm:text-lg md:text-xl text-gray-200 mb-8 max-w-lg leading-relaxed font-normal drop-shadow"
                  >
                    {slides[currentSlide].description}
                  </motion.p>

                  {/* CTA Button */}
                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5, duration: 0.5 }}
                  >
                    <Link to={slides[currentSlide].link}>
                      <Button
                        size="lg"
                        className="bg-white text-gray-950 hover:bg-gray-100 font-bold px-7 py-4 text-base shadow-2xl shadow-black/40 border border-white/80"
                        icon={<ArrowRight className="h-5 w-5" />}
                        iconPosition="right"
                      >
                        {slides[currentSlide].cta}
                      </Button>
                    </Link>
                  </motion.div>
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Navigation Arrows */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={prevSlide}
          className="absolute left-4 sm:left-6 top-1/2 -translate-y-1/2 p-3.5 bg-black/30 hover:bg-black/50 backdrop-blur-md border border-white/20 rounded-full text-white transition-all shadow-xl z-20"
          aria-label="Previous slide"
        >
          <ChevronLeft className="h-6 w-6" />
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={nextSlide}
          className="absolute right-4 sm:right-6 top-1/2 -translate-y-1/2 p-3.5 bg-black/30 hover:bg-black/50 backdrop-blur-md border border-white/20 rounded-full text-white transition-all shadow-xl z-20"
          aria-label="Next slide"
        >
          <ChevronRight className="h-6 w-6" />
        </motion.button>

        {/* Floating Slide Progress Indicators */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2.5 z-20 bg-black/25 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`h-2 rounded-full transition-all duration-500 ${
                index === currentSlide
                  ? 'w-10 bg-white shadow-md shadow-white/50'
                  : 'w-2 bg-white/40 hover:bg-white/70'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>

        {/* Scroll Indicator Icon */}
        <motion.button
          animate={{ y: [0, 6, 0] }}
          transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
          onClick={scrollToNextSection}
          className="hidden sm:flex absolute bottom-6 right-8 p-3 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 rounded-full text-white z-20 cursor-pointer transition-colors"
          title="Scroll down"
        >
          <ChevronDown className="h-5 w-5" />
        </motion.button>
      </div>
    </section>
  );
}

