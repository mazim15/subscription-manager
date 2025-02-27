'use client';

import { Subscription } from '@/types';
import { getSubscriptions, getAccounts, getSubscribers, createSubscription } from '@/lib/db-operations';
import { useState, useEffect } from 'react';
import { Timestamp } from 'firebase/firestore';
import { generateText } from '@/lib/gemini';
import MarkdownRenderer from '@/components/MarkdownRenderer';

export interface ExtendedSubscription {
  id: string;
  accountId: string;
  slotId: string;
  subscriberId: string;
  startDate: Date | Timestamp;
  endDate: Date | Timestamp;
  paidPrice: number;
  status: 'active' | 'expired' | 'pending-renewal' | 'suspended';
  paymentStatus?: string;
  accountEmail?: string;
  subscriberName?: string;
  slotNumber?: string;
}

import RenewSubscriptionForm from './RenewSubscriptionForm';

export default function ExpiringSubscriptions({ subscriptions }: { subscriptions: Subscription[] }) {
    const [enhancedSubscriptions, setEnhancedSubscriptions] = useState<ExtendedSubscription[]>([]);
    const [loading, setLoading] = useState(true);
    const [showRenewForm, setShowRenewForm] = useState(false);
    const [selectedSubscription, setSelectedSubscription] = useState<ExtendedSubscription | null>(null);
    const [renewalStrategy, setRenewalStrategy] = useState('');
    const [strategyLoading, setStrategyLoading] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [subsData, accountsData, subscribersData] = await Promise.all([
                    getSubscriptions(),
                    getAccounts(),
                    getSubscribers()
                ]);

                // Enhance subscription data with related information
                const enhancedSubs = subsData.map(sub => {
                    const account = accountsData.find(acc => acc.id === sub.accountId);
                    const subscriber = subscribersData.find(s => s.id === sub.subscriberId);
                    const slot = account?.slots.find(s => s.id === sub.slotId);
                    const slotIndex = account?.slots.findIndex(s => s.id === sub.slotId);

                    return {
                        ...sub,
                        accountEmail: account?.email || 'Unknown Account',
                        subscriberName: subscriber?.name || 'Unknown Subscriber',
                        slotNumber: slotIndex !== undefined ? `Slot ${slotIndex + 1}` : 'Unknown Slot',
                        startDate: sub.startDate,
                        endDate: sub.endDate,
                    };
                });

                // Filter for expiring subscriptions
                const expiringSubs = enhancedSubs.filter(sub => {
                    const endDate = sub.endDate instanceof Timestamp ? sub.endDate.toDate() : sub.endDate;
                    const now = new Date();
                    const diffTime = Math.abs(endDate.getTime() - now.getTime());
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    return diffDays <= 30; // expiring in the next 30 days
                });

                setEnhancedSubscriptions(expiringSubs);
            } catch (error) {
                console.error('Error fetching subscriptions:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const formatDate = (date: Date | Timestamp) => {
        if (date instanceof Timestamp) {
            return date.toDate().toLocaleDateString();
        }
        return date.toLocaleDateString();
    };

    const handleRenewClick = (subscription: ExtendedSubscription) => {
        setSelectedSubscription(subscription);
        setShowRenewForm(true);
    };

    const handleRenew = async (startDate: Date, endDate: Date, accountId: string, subscriberId: string, slotId: string) => {
        if (!selectedSubscription) return;

        try {
            // Await createSubscription function
            await createSubscription({
                accountId: accountId,
                slotId: slotId,
                subscriberId: subscriberId,
                paidPrice: 0,
                startDate: startDate,
                endDate: endDate,
                status: 'active',
                paymentStatus: 'unpaid',
                paymentDueDate: Timestamp.fromDate(startDate),
            });
            setShowRenewForm(false);
            // Refresh subscriptions
            const subsData = await getSubscriptions();
            const accountsData = await getAccounts();
            const subscribersData = await getSubscribers();

            // Enhance subscription data with related information
            const enhancedSubs = subsData.map(sub => {
                const account = accountsData.find(acc => acc.id === sub.accountId);
                const subscriber = subscribersData.find(s => s.id === sub.subscriberId);
                const slot = account?.slots.find(s => s.id === sub.slotId);
                const slotIndex = account?.slots.findIndex(s => s.id === sub.slotId);

                return {
                    ...sub,
                    accountEmail: account?.email || 'Unknown Account',
                    subscriberName: subscriber?.name || 'Unknown Subscriber',
                    slotNumber: slotIndex !== undefined ? `Slot ${slotIndex + 1}` : 'Unknown Slot',
                    startDate: sub.startDate,
                    endDate: sub.endDate,
                };
            });

            setEnhancedSubscriptions(enhancedSubs);
        } catch (error) {
            console.error('Error creating subscription:', error);
        }
    };

    const handleCancelRenew = () => {
        setShowRenewForm(false);
        setSelectedSubscription(null);
    };

    const generateRenewalStrategy = async () => {
        if (enhancedSubscriptions.length === 0) return;
        
        try {
            setStrategyLoading(true);
            
            const expiringData = enhancedSubscriptions.map(sub => ({
                subscriberName: sub.subscriberName || 'Unknown',
                accountEmail: sub.accountEmail || 'Unknown',
                endDate: sub.endDate instanceof Timestamp 
                    ? sub.endDate.toDate().toLocaleDateString() 
                    : new Date(sub.endDate).toLocaleDateString(),
                paidPrice: sub.paidPrice || 0
            }));
            
            const prompt = `
                As a subscription retention specialist, analyze these expiring subscriptions:
                ${JSON.stringify(expiringData, null, 2)}
                
                Provide a strategic approach to maximize renewals, including:
                1. Prioritization strategy (which subscribers to focus on first)
                2. Recommended renewal incentives
                3. Timing for renewal outreach
                4. Communication approach
                
                Format your response using proper markdown:
                - Use ### for section headings (e.g., ### Prioritization Strategy)
                - Use bullet points with * for lists
                - Use **bold** for emphasis
                - Use > for important notes or quotes
                
                Keep it practical and actionable (under 200 words).
            `;
            
            const result = await generateText(prompt);
            setRenewalStrategy(result);
        } catch (error) {
            console.error('Error generating renewal strategy:', error);
            setRenewalStrategy('Unable to generate renewal strategy at this time.');
        } finally {
            setStrategyLoading(false);
        }
    };

    useEffect(() => {
        if (enhancedSubscriptions.length > 0 && !loading) {
            generateRenewalStrategy();
        }
    }, [enhancedSubscriptions, loading]);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="text-gray-500">Loading expiring subscriptions...</div>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4 heading">Expiring Subscriptions</h2>
            {enhancedSubscriptions.length > 0 && (
                <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/30 rounded-lg border border-amber-100 dark:border-amber-800">
                    <div className="flex justify-between items-center mb-2">
                        <h4 className="text-sm font-medium text-amber-800 dark:text-amber-300">AI Renewal Strategy</h4>
                        <button 
                            onClick={generateRenewalStrategy}
                            disabled={strategyLoading}
                            className="text-xs text-amber-600 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-300"
                        >
                            {strategyLoading ? 'Generating...' : 'Refresh Strategy'}
                        </button>
                    </div>
                    <div className="text-sm text-gray-800 dark:text-gray-200">
                        {strategyLoading ? (
                            <p className="text-gray-500 dark:text-gray-400">Generating renewal strategy...</p>
                        ) : (
                            <MarkdownRenderer content={renewalStrategy} />
                        )}
                    </div>
                </div>
            )}
            <div className="space-y-4">
                {enhancedSubscriptions.map((sub) => (
                    <div key={sub.id} className="border-b pb-4">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="font-medium">{sub.subscriberName}</p>
                                <p className="text-sm text-gray-600">
                                    Expires: {sub.endDate ? formatDate(sub.endDate) : 'N/A'}
                                </p>
                            </div>
                            <button
                                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                                onClick={() => handleRenewClick(sub)}
                            >
                                Renew
                            </button>
                        </div>
                    </div>
                ))}
            </div>
            {showRenewForm && selectedSubscription && (
                <RenewSubscriptionForm
                    subscription={selectedSubscription as any}
                    onRenew={handleRenew}
                    onCancel={handleCancelRenew}
                />
            )}
        </div>
    );
}
