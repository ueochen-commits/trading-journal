import React, { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react';
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
    registerStepAction: (titleKey: string, fn: () => void) => void;
    unregisterStepAction: (titleKey: string) => void;
}

const TourContext = createContext<TourContextType | undefined>(undefined);

export const TourProvider = ({ children, setActiveTab }: { children?: ReactNode, setActiveTab: (tab: string) => void }) => {
    const [isTourOpen, setIsTourOpen] = useState(false);
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const stepActionsRef = useRef<Map<string, () => void>>(new Map());

    const steps: TourStep[] = [
        { targetId: 'sidebar-nav', titleKey: 'sidebar', contentKey: 'sidebarDesc', position: 'right', tabId: 'dashboard' },
        { targetId: 'dashboard-timezone', titleKey: 'dashboardTimezone', contentKey: 'dashboardTimezoneDesc', position: 'bottom', tabId: 'dashboard' },
        { targetId: 'dashboard-rank', titleKey: 'dashboardRank', contentKey: 'dashboardRankDesc', position: 'bottom', tabId: 'dashboard' },
        { targetId: 'dashboard-risk', titleKey: 'dashboardRiskStatus', contentKey: 'dashboardRiskStatusDesc', position: 'left', tabId: 'dashboard' },
        { targetId: 'dashboard-stats', titleKey: 'dashboardStats', contentKey: 'dashboardStatsDesc', position: 'bottom', tabId: 'dashboard' },
        { targetId: 'dashboard-equity', titleKey: 'dashboardEquity', contentKey: 'dashboardEquityDesc', position: 'bottom', tabId: 'dashboard' },
        { targetId: 'dashboard-strategy', titleKey: 'dashboardStrategy', contentKey: 'dashboardStrategyDesc', position: 'bottom', tabId: 'dashboard' },
        { targetId: 'dashboard-calendar', titleKey: 'dashboardCalendar', contentKey: 'dashboardCalendarDesc', position: 'top', tabId: 'dashboard' },
        { targetId: 'dashboard-level', titleKey: 'dashboardLevel', contentKey: 'dashboardLevelDesc', position: 'left', tabId: 'dashboard' },
        { targetId: 'dashboard-goal', titleKey: 'weeklyGoal', contentKey: 'weeklyGoalDesc', position: 'left', tabId: 'dashboard' },
        { targetId: 'chart-toolbar', titleKey: 'chartSymbol', contentKey: 'chartSymbolDesc', position: 'bottom', tabId: 'charts' },
        { targetId: 'chart-layout-toggle', titleKey: 'chartLayout', contentKey: 'chartLayoutDesc', position: 'bottom', tabId: 'charts' },
        { targetId: 'chart-notes', titleKey: 'chartNotes', contentKey: 'chartNotesDesc', position: 'left', tabId: 'charts' },
        { targetId: 'journal-add-btn', titleKey: 'journalAddBtn', contentKey: 'journalAddBtnDesc', position: 'bottom', tabId: 'journal' },
        { targetId: 'tour-checklist-modal', titleKey: 'journalChecklist', contentKey: 'journalChecklistDesc', position: 'right', tabId: 'journal' },
        { targetId: 'tour-form-modal', titleKey: 'journalForm', contentKey: 'journalFormDesc', position: 'bottom', tabId: 'journal' },
        { targetId: 'tour-form-modal', titleKey: 'journalRequired', contentKey: 'journalRequiredDesc', position: 'left', tabId: 'journal' },
        { targetId: 'tour-strategy-select', titleKey: 'journalStrategy', contentKey: 'journalStrategyDesc', position: 'left', tabId: 'journal' },
        { targetId: 'tour-review-panel', titleKey: 'journalReview', contentKey: 'journalReviewDesc', position: 'left', tabId: 'journal' },
        { targetId: 'tour-mistakes-section', titleKey: 'journalMistakes', contentKey: 'journalMistakesDesc', position: 'left', tabId: 'journal' },
        { targetId: 'journal-view-toggle', titleKey: 'journalViewModes', contentKey: 'journalViewModesDesc', position: 'bottom', tabId: 'journal' },
        { targetId: 'journal-toolbar', titleKey: 'journalToolbar', contentKey: 'journalToolbarDesc', position: 'bottom', tabId: 'journal' },
        { targetId: 'journal-list', titleKey: 'journalActions', contentKey: 'journalActionsDesc', position: 'top', tabId: 'journal' },
        { targetId: 'reports-container', titleKey: 'reports', contentKey: 'reportsDesc', position: 'center', tabId: 'reports' },
        { targetId: 'playbook-create-btn', titleKey: 'playbookCreate', contentKey: 'playbookCreateDesc', position: 'bottom', tabId: 'playbook' },
        { targetId: 'playbook-create-modal', titleKey: 'playbookModal', contentKey: 'playbookModalDesc', position: 'right', tabId: 'playbook' },
        { targetId: 'playbook-grid', titleKey: 'playbookCards', contentKey: 'playbookCardsDesc', position: 'right', tabId: 'playbook' },
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
                // Allow time for DOM to render, then trigger step action and scroll
                setTimeout(() => {
                    const action = stepActionsRef.current.get(step.titleKey);
                    if (action) action();
                    setTimeout(() => {
                        const el = document.getElementById(step.targetId);
                        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }, 300);
                }, 300);
            }
        }
    }, [currentStepIndex, isTourOpen]);

    const startTour = () => {
        setCurrentStepIndex(0);
        setIsTourOpen(true);
    };

    const closeTour = () => {
        const closeAction = stepActionsRef.current.get('__close__');
        if (closeAction) closeAction();
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

    const registerStepAction = useCallback((titleKey: string, fn: () => void) => {
        stepActionsRef.current.set(titleKey, fn);
    }, []);

    const unregisterStepAction = useCallback((titleKey: string) => {
        stepActionsRef.current.delete(titleKey);
    }, []);

    return (
        <TourContext.Provider value={{
            isTourOpen,
            currentStepIndex,
            startTour,
            closeTour,
            nextStep,
            prevStep,
            currentStep: steps[currentStepIndex] || null,
            totalSteps: steps.length,
            registerStepAction,
            unregisterStepAction,
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