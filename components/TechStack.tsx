import React from 'react';

const TechStack: React.FC = () => {
  return (
    <div className="py-12 px-4 text-center">
      <h3 className="text-sm font-medium tracking-widest text-text-subtle uppercase mb-8">Powered by Leading Technologies</h3>
      <div className="flex justify-center items-center gap-12 sm:gap-16 flex-wrap">
        <img
          alt="n8n"
          className="h-8 sm:h-10 opacity-70 invert sepia hue-rotate-180 brightness-150 contrast-200 hover:opacity-100 hover:filter-none transition-all duration-300"
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuBqoxQuO33C1hvqMDskpx_8G74hf_8qjDdQcgirxkzwVm7sq4ynLlU27xa2A6lRzVDTCaxBac-bPMg9kUMhU_BXcktcPJHnHvBl9dFpg8YzDvaXbZXpEUqZqzWDRaKNRW9hrpfSohxKLZnxEQ0yugzcAmQL_ism9T0h2v0OZlPtOvRBUlYT5RFdF06iIMUWzRpSKUt9-gq6ptR-u5ZWp9ghhSNMPgAyecnm0RuCQXZ0kkp4LX6-XdkelkeKkXQFQMrNC4meW52SzyU"
        />
      </div>
    </div>
  );
};

export default TechStack;