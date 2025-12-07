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
        <img 
          alt="Hetzner" 
          className="h-6 sm:h-8 opacity-70 invert hue-rotate-180 brightness-150 contrast-200 hover:opacity-100 hover:filter-none transition-all duration-300" 
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuC910NfAfdiJyhoMgORMAIQ_Uf4cgR1Ra_gNyAJPT3fb3q97_LHq8hLi5lf7peWQxV1nldlHJUJ-SeMW0wYtVfebNU_kqtb1BAN0p4ho09A29aEn9Ea1DEFfWd7snaScRXIcYzdFIqw2PxzTwKmG5e0pzxzh1U0nBOPss6D7BRGHSyH2YX28iap53TaqVZoN9sQIdWdAv-bofQfDKLYtKvKfQrMHfw9xCpS1yhMXop0INBcxF_Yk6hu4JZO_NMVR_cMOagI6wn3Sk0"
        />
      </div>
    </div>
  );
};

export default TechStack;