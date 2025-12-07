import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline';
  className?: string;
}

const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  className = '',
  ...props 
}) => {
  const baseStyles = "inline-flex items-center justify-center h-10 md:h-12 px-6 rounded-lg font-bold text-sm md:text-base transition-all duration-200 tracking-wide";
  
  const variants = {
    primary: "bg-primary text-background hover:bg-primary/80 shadow-[0_0_15px_rgba(126,249,255,0.4)] hover:shadow-[0_0_25px_rgba(126,249,255,0.6)]",
    secondary: "bg-secondary text-white hover:bg-secondary/80 shadow-[0_0_15px_rgba(224,59,138,0.4)] hover:shadow-[0_0_25px_rgba(224,59,138,0.6)]",
    outline: "bg-transparent border border-primary text-primary hover:bg-primary/10",
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;