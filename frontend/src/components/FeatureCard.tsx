/**
 * Feature Card Component
 * iOS style feature card for home page display
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { LucideIcon, ArrowRight } from 'lucide-react';

interface FeatureCardProps {
  title: string;
  description: string;
  to: string;
  icon: LucideIcon;
  gradient: string;
}

export const FeatureCard: React.FC<FeatureCardProps> = ({
  title,
  description,
  to,
  icon: Icon,
  gradient,
}) => {
  return (
    <Link to={to} className="block group">
      <div className="ios-card p-8 h-full flex flex-col">
        {/* Icon with gradient background */}
        <div 
          className={`
            w-14 h-14 rounded-2xl flex items-center justify-center mb-5
            ${gradient}
            shadow-lg group-hover:shadow-xl transition-shadow duration-300
          `}
        >
          <Icon className="w-7 h-7 text-white" />
        </div>

        {/* Title */}
        <h3 className="text-xl font-semibold mb-3 text-slate-800 group-hover:text-ios-blue transition-colors">
          {title}
        </h3>

        {/* Description */}
        <p className="text-gray-500 text-sm leading-relaxed flex-1">
          {description}
        </p>

        {/* Call to action */}
        <div className="mt-6 flex items-center text-ios-blue font-medium text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <span>Get started</span>
          <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
    </Link>
  );
};

export default FeatureCard;
