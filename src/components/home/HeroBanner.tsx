import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ShoppingBag, ArrowRight } from 'lucide-react';
import { Button } from '../common';
import { useSettings } from "../../contexts/SettingsContext";



export function HeroBanner() {
 const { settings } = useSettings();
const [currentSlide, setCurrentSlide] = useState(0);
const slides = [
  {
    id: 1,
    title: settings.store_name || "Welcome",
    subtitle: settings.store_tagline || "Premium Shopping",
    description:
      settings.about_us ||
      "Discover amazing products at the best prices with fast delivery and secure payments.",
    image:
      settings.logo_url ||
      "https://images.pexels.com/photos/1036857/pexels-photo-1036857.jpeg?auto=compress&cs=tinysrgb&w=1600",
    cta: "Shop Now",
    link: "/shop",
    bg: "from-primary-600/90 to-orange-600/80",
  },
  {
    id: 2,
    title: "New Arrivals",
    subtitle: "Fresh Collection",
    description:
      "Check out the latest trends in fashion and electronics. Be the first to own!",
    image:
      "https://images.pexels.com/photos/2730465/pexels-photo-2730465.jpeg?auto=compress&cs=tinysrgb&w=1600",
    cta: "Explore Now",
    link: "/shop?filter=new",
    bg: "from-blue-600/90 to-teal-600/80",
  },
  {
    id: 3,
    title: "Flash Sale",
    subtitle: "24 Hours Only",
    description:
      "Exclusive deals on top brands. Grab them before they are gone!",
    image:
      "https://images.pexels.com/photos/2305445/pexels-photo-2305445.jpeg?auto=compress&cs=tinysrgb&w=1600",
    cta: "View Deals",
    link: "/shop?filter=flash",
    bg: "from-purple-600/90 to-pink-600/80",
  },
];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  return (
    <section className="relative overflow-hidden rounded-2xl lg:rounded-3xl mb-12">
      <div className="relative h-[400px] md:h-[500px] lg:h-[600px]">
        {slides.map((slide, index) => (
          <div
            key={slide.id}
            className={`absolute inset-0 transition-opacity duration-1000 ${
              index === currentSlide ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <img
              src={slide.image}
              alt={slide.title}
              className="w-full h-full object-cover"
            />
            <div className={`absolute inset-0 bg-gradient-to-r ${slide.bg}`} />
            <div className="absolute inset-0 flex items-center">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
                <div className="max-w-xl animate-slide-up">
                  <span className="inline-block px-4 py-1.5 bg-white/20 backdrop-blur-sm rounded-full text-white text-sm font-medium mb-4">
                    {slide.subtitle}
                  </span>
                  <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-white mb-4">
                    {slide.title}
                  </h1>
                  <p className="text-lg md:text-xl text-white/90 mb-8 max-w-md">
                    {slide.description}
                  </p>
                  <Link to={slide.link}>
                    <Button
                      size="lg"
                      className="bg-white text-gray-900 hover:bg-gray-100 gap-2"
                      icon={<ArrowRight className="h-5 w-5" />}
                      iconPosition="right"
                    >
                      {slide.cta}
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Navigation Arrows */}
        <button
          onClick={prevSlide}
          className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-white/20 backdrop-blur-sm rounded-full text-white hover:bg-white/30 transition-colors"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
        <button
          onClick={nextSlide}
          className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-white/20 backdrop-blur-sm rounded-full text-white hover:bg-white/30 transition-colors"
        >
          <ChevronRight className="h-6 w-6" />
        </button>

        {/* Dots */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`h-2 rounded-full transition-all ${
                index === currentSlide
                  ? 'w-8 bg-white'
                  : 'w-2 bg-white/50 hover:bg-white/70'
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
