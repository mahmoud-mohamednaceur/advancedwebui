import React, { useState } from 'react';
import { Binary, Check, AlertTriangle, Lock, ArrowRight, ShieldCheck } from 'lucide-react';
import Button from '../ui/Button';

interface NotebookEmbeddingSetupProps {
  notebookName: string;
  onComplete: (modelId: string) => void;
  onCancel: () => void;
}

const OpenAILogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.0462 6.0462 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 3.5366-2.1956a1.0276 1.0276 0 0 0 .512-.9408v-4.47l4.198 2.3766v2.8026a4.4966 4.4966 0 0 1-5.512 3.5484zm-5.916-5.061a4.4918 4.4918 0 0 1 0-5.4707v4.2154l3.638 2.0935v.0152l-2.5046 1.5227a1.0381 1.0381 0 0 0-.5235.8975v.0123a4.4842 4.4842 0 0 1-.6099-3.286zM4.567 6.7019a4.4966 4.4966 0 0 1 5.426-3.6582v2.8035L5.8012 8.22a1.0352 1.0352 0 0 0-.533.8984v4.186l-2.5532-1.5484a4.4966 4.4966 0 0 1 1.852-5.0541zm12.9367-1.5385v-2.8035a4.4966 4.4966 0 0 1 2.165 7.7821l-2.577 1.4816v-4.2068l3.7238-2.2451zM13.32 5.0804a4.4966 4.4966 0 0 1 2.787 1.105l-3.586 2.1936a1.0362 1.0362 0 0 0-.5044.9504v4.4423l-4.2503-2.3671V8.5702a4.5252 4.5252 0 0 1 5.5537-3.4898z" />
  </svg>
);

const OllamaLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
     <path d="M21.56,11.6C21.34,7.82,17.83,5.71,14.78,5.32V4.07C14.78,2.5,13.61,1.21,12.12,1.21S9.46,2.5,9.46,4.07v1.25C6.4,5.71,2.9,7.82,2.68,11.6c-0.12,2.04,0.64,4.31,2.2,5.82C4.25,18.12,4,19,4,20c0,1.66,1.34,3,3,3s3-1.34,3-3c0-0.32-0.06-0.63-0.15-0.92c0.71,0.12,1.44,0.17,2.15,0.17s1.44-0.05,2.15-0.17C14.06,19.37,14,19.68,14,20c0,1.66,1.34,3,3,3s3-1.34,3-3c0-1-0.25-1.88-0.88-2.58C20.92,15.91,21.68,13.64,21.56,11.6z M16,12.5c-0.83,0-1.5-0.67-1.5-1.5s0.67-1.5,1.5-1.5s1.5,0.67,1.5,1.5S16.83,12.5,16,12.5z M8.24,12.5c-0.83,0-1.5-0.67-1.5-1.5s0.67-1.5,1.5-1.5s1.5,0.67,1.5,1.5S9.07,12.5,8.24,12.5z M12.12,16c-0.63,0-1.21-0.19-1.68-0.52c0.47-0.26,0.96-0.41,1.68-0.41s1.21,0.16,1.68,0.41C13.33,15.81,12.75,16,12.12,16z"/>
  </svg>
);

const NotebookEmbeddingSetup: React.FC<NotebookEmbeddingSetupProps> = ({ notebookName, onComplete, onCancel }) => {
  const [selectedModel, setSelectedModel] = useState<string | null>(null);

  const models = [
    { 
        id: 'nomic-embed-text:latest', 
        name: 'Nomic Embed Text', 
        provider: 'ollama',
        description: 'High-performance open source embedding model. Runs locally.',
        dimensions: 768
    },
    { 
        id: 'text-embedding-3-small', 
        name: 'Text-Embedding-3-Small', 
        provider: 'openai',
        description: 'Efficient and cost-effective model by OpenAI. Requires API key.',
        dimensions: 1536
    }
  ];

  return (
    <div className="h-screen w-full flex items-center justify-center bg-[#050508] p-4 relative overflow-hidden">
      
      {/* Background Ambient */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 blur-[100px] rounded-full"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-secondary/5 blur-[100px] rounded-full"></div>
      </div>

      <div className="relative z-10 w-full max-w-4xl bg-surface/50 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row animate-scale-in">
        
        {/* Left Panel: Info */}
        <div className="w-full md:w-1/3 bg-surface p-8 flex flex-col justify-between border-r border-white/5">
            <div>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-primary border border-primary/20 mb-6 shadow-[0_0_15px_rgba(126,249,255,0.2)]">
                    <Binary className="w-6 h-6" />
                </div>
                <h2 className="text-2xl font-black text-white mb-2 tracking-tight">Configure Intelligence</h2>
                <p className="text-text-subtle text-sm leading-relaxed">
                    You are initializing <strong>{notebookName}</strong>. Please select the embedding model that will be used to vectorize your documents.
                </p>
            </div>

            <div className="mt-8 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <div className="flex gap-2 items-start mb-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <span className="text-xs font-bold text-amber-200 uppercase tracking-wide">Permanent Choice</span>
                </div>
                <p className="text-[11px] text-amber-200/70 leading-relaxed">
                    Once selected, the embedding model <strong>cannot be changed</strong> for this notebook to ensure vector index consistency.
                </p>
            </div>
        </div>

        {/* Right Panel: Selection */}
        <div className="flex-1 p-8 bg-[#0A0A0F]">
            <div className="grid gap-4">
                {models.map((model) => (
                    <div 
                        key={model.id}
                        onClick={() => setSelectedModel(model.id)}
                        className={`relative p-6 rounded-2xl border-2 cursor-pointer transition-all duration-300 group ${selectedModel === model.id ? 'bg-surface border-primary shadow-[0_0_20px_rgba(126,249,255,0.15)]' : 'bg-surface/30 border-white/5 hover:border-white/10 hover:bg-surface/50'}`}
                    >
                        <div className="flex items-start gap-4 relative z-10">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border transition-colors ${
                                model.provider === 'openai' 
                                    ? (selectedModel === model.id ? 'bg-green-500/10 border-green-500/30 text-green-500' : 'bg-white/5 border-white/5 text-text-subtle')
                                    : (selectedModel === model.id ? 'bg-orange-500/10 border-orange-500/30 text-orange-500' : 'bg-white/5 border-white/5 text-text-subtle')
                            }`}>
                                {model.provider === 'openai' ? <OpenAILogo className="w-6 h-6" /> : <OllamaLogo className="w-6 h-6" />}
                            </div>
                            <div className="flex-1">
                                <div className="flex justify-between items-start">
                                    <h3 className={`text-base font-bold mb-1 ${selectedModel === model.id ? 'text-white' : 'text-text-subtle group-hover:text-white'}`}>{model.name}</h3>
                                    {selectedModel === model.id && (
                                        <div className="w-5 h-5 rounded-full bg-primary text-black flex items-center justify-center">
                                            <Check className="w-3 h-3" />
                                        </div>
                                    )}
                                </div>
                                <p className="text-xs text-text-subtle mb-3">{model.description}</p>
                                <div className="flex gap-2">
                                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-text-subtle border border-white/5">
                                        Dim: {model.dimensions}
                                    </span>
                                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-text-subtle border border-white/5 uppercase">
                                        {model.provider}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-8 flex justify-end gap-3">
                <Button variant="outline" onClick={onCancel} className="!h-12 border-white/10 hover:bg-white/5 text-white">
                    Cancel
                </Button>
                <Button 
                    variant="primary" 
                    onClick={() => selectedModel && onComplete(selectedModel)}
                    disabled={!selectedModel}
                    className={`!h-12 !px-8 flex items-center gap-2 transition-all ${!selectedModel ? 'opacity-50 cursor-not-allowed' : 'shadow-neon-primary hover:translate-x-1'}`}
                >
                    Initialize Notebook <ArrowRight className="w-4 h-4" />
                </Button>
            </div>
        </div>

      </div>
    </div>
  );
};

export default NotebookEmbeddingSetup;