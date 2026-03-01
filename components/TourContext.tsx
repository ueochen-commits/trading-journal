import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useLanguage } from '../LanguageContext';

export interface TourStep {
    targetId: string; // The HTML ID of the element to highlight
    titleKey: string; // Key for translation
    contentKey: string; // Key for translation
    position: 'top' | 'bottom' | 'left' | 'right' | 'center';
    tabId: string; // Which tab needs to be active
}

interface TourContextType {
    isTourOpen: boolean;
    currentStepIndex: number;
    startTour: () => void;
    closeTour: () => void;
    nextStep: () => void;
    prevStep: () => void;
    currentStep: TourStep | null;
    totalSteps: number;
}

const TourContext = createContext<TourContextType | undefined>(undefined);

export const TourProvider = ({ children, setActiveTab }: { children?: ReactNode, setActiveTab: (tab: string) => void }) => {
    const [isTourOpen, setIsTourOpen] = useState(false);
    const [currentStepIndex, setCurrentStepIndex] = useState(0);

    const steps: TourStep[] = [
        { targetId: 'sidebar-nav', titleKey: 'sidebar', contentKey: 'sidebarDesc', position: 'right', tabId: 'dashboard' },
        { targetId: 'dashboard-stats', titleKey: 'dashboardStats', contentKey: 'dashboardStatsDesc', position: 'bottom', tabId: 'dashboard' },
        { targetId: 'dashboard-goal', titleKey: 'weeklyGoal', contentKey: 'weeklyGoalDesc', position: 'left', tabId: 'dashboard' },
        { targetId: 'chart-nav-item', titleKey: 'charts', contentKey: 'chartsDesc', position: 'right', tabId: 'charts' },
        { targetId: 'journal-add-btn', titleKey: 'journal', contentKey: 'journalDesc', position: 'bottom', tabId: 'journal' },
        { targetId: 'reports-container', titleKey: 'reports', contentKey: 'reportsDesc', position: 'center', tabId: 'reports' },
        { targetId: 'plans-container', titleKey: 'notebook', contentKey: 'notebookDesc', position: 'center', tabId: 'plans' },
        { targetId: 'risk-container', titleKey: 'risk', contentKey: 'riskDesc', position: 'center', tabId: 'risk' },
        { targetId: 'calendar-container', titleKey: 'calendar', contentKey: 'calendarDesc', position: 'center', tabId: 'calendar' },
        { targetId: 'plaza-container', titleKey: 'plaza', contentKey: 'plazaDesc', position: 'center', tabId: 'plaza' },
        { targetId: 'academy-container', titleKey: 'academy', contentKey: 'academyDesc', position: 'center', tabId: 'academy' },
    ];

    useEffect(() => {
        if (isTourOpen) {
            const step = steps[currentStepIndex];
            if (step) {
                // Auto switch tab if needed
                setActiveTab(step.tabId);
                // Allow time for DOM to render before scrolling
                setTimeout(() => {
                    const el = document.getElementById(step.targetId);
                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 300);
            }
        }
    }, [currentStepIndex, isTourOpen]);

    const startTour = () => {
        setCurrentStepIndex(0);
        setIsTourOpen(true);
    };

    const closeTour = () => {
        setIsTourOpen(false);
        setCurrentStepIndex(0);
    };

    const nextStep = () => {
        if (currentStepIndex < steps.length - 1) {
            setCurrentStepIndex(prev => prev + 1);
        } else {
            closeTour();
        }
    };

    const prevStep = () => {
        if (currentStepIndex > 0) {
            setCurrentStepIndex(prev => prev - 1);
        }
    };

    return (
        <TourContext.Provider value={{
            isTourOpen,
            currentStepIndex,
            startTour,
            closeTour,
            nextStep,
            prevStep,
            currentStep: steps[currentStepIndex] || null,
            totalSteps: steps.length
        }}>
            {children}
        </TourContext.Provider>
    );
};

export const useTour = () => {
    const context = useContext(TourContext);
    if (!context) {
        throw new Error('useTour must be used within a TourProvider');
    }
    return context;
};