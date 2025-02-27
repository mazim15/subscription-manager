import { useState } from 'react';

interface GeminiModelSelectorProps {
  onModelChange: (model: string) => void;
  currentModel: string;
}

const GeminiModelSelector: React.FC<GeminiModelSelectorProps> = ({ onModelChange, currentModel }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const models = [
    { id: 'gemini-2.0-flash-001', name: 'Gemini 2.0 Flash' },
    { id: 'gemini-2.0-flash-lite-preview-02-05', name: 'Gemini 2.0 Flash Lite' },
    { id: 'gemini-2.0-pro-exp-02-05', name: 'Gemini 2.0 Pro' },
    { id: 'gemini-2.0-flash-thinking-exp-01-21', name: 'Gemini 2.0 Flash Thinking' },
    { id: 'gemini-2.0-flash-thinking-exp-1219', name: 'Gemini 2.0 Flash Thinking (1219)' },
    { id: 'gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash Experimental' },
    { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro (Legacy)' },
  ];
  
  const handleModelSelect = (modelId: string) => {
    onModelChange(modelId);
    setIsOpen(false);
  };
  
  const currentModelName = models.find(m => m.id === currentModel)?.name || currentModel;
  
  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
      >
        <span>{currentModelName}</span>
        <svg className="w-5 h-5 ml-2 -mr-1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>
      
      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white rounded-md shadow-lg">
          <ul className="py-1 overflow-auto text-base rounded-md max-h-60 focus:outline-none sm:text-sm">
            {models.map((model) => (
              <li
                key={model.id}
                onClick={() => handleModelSelect(model.id)}
                className={`cursor-pointer select-none relative py-2 pl-3 pr-9 ${
                  currentModel === model.id ? 'bg-indigo-600 text-white' : 'text-gray-900 hover:bg-indigo-100'
                }`}
              >
                {model.name}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default GeminiModelSelector; 