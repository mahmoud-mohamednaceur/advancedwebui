import React from 'react';
import { Network, Shield, Search, Lightbulb, Timer, BarChart3 } from 'lucide-react';

interface FeatureCardProps {
  icon: any;
  title: string;
  description: string;
  colorClass: string;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ icon: Icon, title, description, colorClass }) => (
  <div className="group flex flex-col p-6 bg-surface border border-white/10 rounded-xl hover:border-white/30 transition-all duration-300 hover:-translate-y-1">
    <div className={`w-12 h-12 mb-4 flex items-center justify-center rounded-lg bg-white/5 group-hover:bg-white/10 transition-colors ${colorClass}`}>
      <Icon className="w-8 h-8" />
    </div>
    <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
    <p className="text-sm text-text-subtle leading-relaxed">{description}</p>
  </div>
);

const Features: React.FC = () => {
  const features = [
    { icon: Network, title: "Automated Workflows", description: "Seamlessly connect data sources and automate complex RAG pipelines with n8n.", color: "text-primary" },
    { icon: Shield, title: "Secure & Scalable", description: "Enterprise-grade infrastructure ensures high availability, top-tier security, and scalability.", color: "text-secondary" },
    { icon: Search, title: "Precision Retrieval", description: "Advanced algorithms for relevant and accurate responses from your data.", color: "text-tertiary" },
    { icon: Lightbulb, title: "Contextual Answers", description: "Ground AI responses in your private data, eliminating hallucinations.", color: "text-primary" },
    { icon: Timer, title: "Boost Productivity", description: "Drastically reduce time spent searching for information and get insights faster.", color: "text-secondary" },
    { icon: BarChart3, title: "Drive Growth", description: "Leverage accurate AI to make better decisions and foster innovation.", color: "text-tertiary" },
  ];

  return (
    <section id="solutions" className="py-16 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
      <div className="mb-12 max-w-3xl">
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 tracking-tight">
          Deliver Intelligent, Efficient, Reliable AI.
        </h2>
        <p className="text-lg text-text-subtle">
          Our platform combines best-in-class technologies to deliver a superior Retrieval-Augmented Generation experience.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {features.map((feature, index) => (
          <FeatureCard
            key={index}
            icon={feature.icon}
            title={feature.title}
            description={feature.description}
            colorClass={feature.color}
          />
        ))}
      </div>
    </section>
  );
};

export default Features;