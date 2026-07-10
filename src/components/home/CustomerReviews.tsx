import React from 'react';
import { Star, Quote } from 'lucide-react';

const testimonials = [
  {
    id: 1,
    name: 'Priya Sharma',
    role: 'Verified Buyer',
    avatar: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=150',
    rating: 5,
    text: "Amazing shopping experience! The product quality exceeded my expectations. Fast delivery and excellent customer service. Will definitely shop again!",
  },
  {
    id: 2,
    name: 'Rahul Patel',
    role: 'Verified Buyer',
    avatar: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=150',
    rating: 5,
    text: "Best e-commerce site I've used. The prices are competitive and the return policy is hassle-free. Highly recommended for electronics!",
  },
  {
    id: 3,
    name: 'Anita Desai',
    role: 'Verified Buyer',
    avatar: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=150',
    rating: 5,
    text: "Love the variety of products available. Found exactly what I was looking for at a great price. The flash sales are awesome!",
  },
];

export function CustomerReviews() {
  return (
    <section className="mb-12">
      <div className="text-center mb-10">
        <h2 className="text-2xl md:text-3xl font-display font-bold text-gray-900 dark:text-white mb-3">
          What Our Customers Say
        </h2>
        <p className="text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">
          Don't just take our word for it. Here's what our happy customers have to say about their shopping experience.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {testimonials.map((testimonial) => (
          <div
            key={testimonial.id}
            className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-card hover:shadow-card-hover transition-shadow border border-gray-100 dark:border-gray-700"
          >
            <Quote className="h-8 w-8 text-primary-200 dark:text-primary-800 mb-4" />
            <p className="text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
              "{testimonial.text}"
            </p>
            <div className="flex items-center gap-4">
              <img
                src={testimonial.avatar}
                alt={testimonial.name}
                className="w-12 h-12 rounded-full object-cover"
              />
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white">
                  {testimonial.name}
                </h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {testimonial.role}
                </p>
              </div>
            </div>
            <div className="flex gap-0.5 mt-4">
              {Array.from({ length: testimonial.rating }).map((_, i) => (
                <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
