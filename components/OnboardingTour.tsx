
import React, { useState, useEffect } from 'react';
import Button from './ui/Button';
import { XIcon } from './ui/Icons';

interface Step {
    targetId: string;
    title: string;
    description: string;
    position: 'left' | 'right' | 'top' | 'bottom' | 'center';
}

interface OnboardingTourProps {
    isActive: boolean;
    onComplete: () => void;
}

const TOUR_STEPS: Step[] = [
    {
        targetId: 'tour-upload-section',
        title: 'Start Here',
        description: 'Upload your CSV or Excel files here. We also support connecting directly to Google Sheets.',
        position: 'center'
    },
    {
        targetId: 'tour-sidebar',
        title: 'Navigation',
        description: 'Access your datasets, charts, models, and history from the sidebar.',
        position: 'right'
    },
    {
        targetId: 'tour-chat-trigger',
        title: 'AI Assistant',
        description: 'Click here anytime to chat with your data. Ask for insights, visualizations, or predictions.',
        position: 'left'
    }
];

const OnboardingTour: React.FC<OnboardingTourProps> = ({ isActive, onComplete }) => {
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [style, setStyle] = useState<React.CSSProperties>({});

    useEffect(() => {
        if (!isActive) return;

        const updatePosition = () => {
            const step = TOUR_STEPS[currentStepIndex];
            const target = document.getElementById(step.targetId);

            if (target) {
                const rect = target.getBoundingClientRect();
                const offset = 20;
                
                let top = 0;
                let left = 0;

                if (step.position === 'center') {
                    // Center screen fallback or specific center logic
                    top = window.innerHeight / 2 - 100;
                    left = window.innerWidth / 2 - 150;
                } else if (step.position === 'right') {
                    top = rect.top;
                    left = rect.right + offset;
                } else if (step.position === 'left') {
                    top = rect.top;
                    left = rect.left - 320 - offset; // Width of card + offset
                } else if (step.position === 'bottom') {
                    top = rect.bottom + offset;
                    left = rect.left;
                } else if (step.position === 'top') {
                    top = rect.top - 200 - offset;
                    left = rect.left;
                }

                // Boundary checks
                if (left < 10) left = 10;
                if (left + 320 > window.innerWidth) left = window.innerWidth - 330;
                if (top < 10) top = 10;

                setStyle({ top, left, position: 'fixed' });
            } else {
                // If target not found, center it as fallback
                setStyle({ 
                    top: '50%', 
                    left: '50%', 
                    transform: 'translate(-50%, -50%)', 
                    position: 'fixed' 
                });
            }
        };

        // Delay to allow UI to render
        const timer = setTimeout(updatePosition, 500);
        window.addEventListener('resize', updatePosition);

        return () => {
            clearTimeout(timer);
            window.removeEventListener('resize', updatePosition);
        };
    }, [isActive, currentStepIndex]);

    if (!isActive) return null;

    const step = TOUR_STEPS[currentStepIndex];
    const isLast = currentStepIndex === TOUR_STEPS.length - 1;

    const handleNext = () => {
        if (isLast) {
            onComplete();
        } else {
            setCurrentStepIndex(prev => prev + 1);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] pointer-events-none">
            {/* Dark Overlay with cutout effect simulated */}
            <div className="absolute inset-0 bg-black/50 pointer-events-auto transition-opacity duration-500"></div>

            {/* Spotlight Highlight (Optional, simpler to just point) */}
            
            {/* Popover Card */}
            <div 
                className="bg-white text-gray-900 w-80 rounded-xl shadow-2xl p-6 pointer-events-auto transition-all duration-300 animate-fade-in-up border-4 border-indigo-500/20"
                style={style}
            >
                <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-600">
                            {currentStepIndex + 1}
                        </span>
                        <h3 className="font-bold text-lg">{step.title}</h3>
                    </div>
                    <button onClick={onComplete} className="text-gray-400 hover:text-gray-600">
                        <XIcon className="w-4 h-4" />
                    </button>
                </div>
                
                <p className="text-gray-600 text-sm mb-6 leading-relaxed">
                    {step.description}
                </p>

                <div className="flex justify-between items-center">
                    <div className="flex gap-1">
                        {TOUR_STEPS.map((_, i) => (
                            <div 
                                key={i} 
                                className={`w-2 h-2 rounded-full transition-colors ${i === currentStepIndex ? 'bg-indigo-600' : 'bg-gray-200'}`}
                            />
                        ))}
                    </div>
                    <Button onClick={handleNext} className="py-2 px-4 text-sm">
                        {isLast ? "Get Started" : "Next"}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default OnboardingTour;
