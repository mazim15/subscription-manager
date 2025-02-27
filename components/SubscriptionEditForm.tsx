import { useState, useEffect } from 'react';
import { updateSubscription } from '@/lib/db-operations';
import { Timestamp } from 'firebase/firestore';

interface SubscriptionEditFormProps {
    subscription: {
        id: string;
        accountId: string;
        slotId: string;
        subscriberId: string;
        startDate: Date | Timestamp;
        endDate: Date | Timestamp;
        paidPrice: number;
        status: string;
        paymentStatus: 'paid' | 'unpaid';
        notes?: string;
    };
    onUpdate: (id: string, startDate: Date, endDate: Date, paidPrice: number, paymentStatus: 'paid' | 'unpaid', notes: string) => void;
    onCancel: () => void;
}

const SubscriptionEditForm: React.FC<SubscriptionEditFormProps> = ({ subscription, onUpdate, onCancel }) => {
    const [startDate, setStartDate] = useState<Date>(subscription.startDate instanceof Timestamp ? subscription.startDate.toDate() : subscription.startDate);
    const [endDate, setEndDate] = useState<Date>(subscription.endDate instanceof Timestamp ? subscription.endDate.toDate() : subscription.endDate);
    const [paidPrice, setPaidPrice] = useState<number>(subscription.paidPrice);
    const [paymentStatus, setPaymentStatus] = useState<string>(subscription.paymentStatus);
    const [paymentDueDate, setPaymentDueDate] = useState<string>('');
    const [notes, setNotes] = useState<string>(subscription.notes || '');

    useEffect(() => {
        setStartDate(subscription.startDate instanceof Timestamp ? subscription.startDate.toDate() : subscription.startDate);
        setEndDate(subscription.endDate instanceof Timestamp ? subscription.endDate.toDate() : subscription.endDate);
        setPaidPrice(subscription.paidPrice);
        setPaymentStatus(subscription.paymentStatus);
        
        const today = new Date();
        setPaymentDueDate(today.toISOString().split('T')[0]);
    }, [subscription]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        onUpdate(subscription.id, startDate, endDate, paidPrice, paymentStatus as 'paid' | 'unpaid', notes);
    };

    const formatDateForInput = (date: Date) => {
        return date.toISOString().split('T')[0];
    };

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
            <div className="relative mx-auto p-6 border w-full max-w-md shadow-lg rounded-lg bg-white dark:bg-slate-800 transition-all duration-200">
                <h3 className="text-xl font-medium leading-6 text-gray-900 dark:text-white mb-4 bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent">
                    Edit Subscription
                </h3>
                <div className="mb-4">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Update the subscription details.
                    </p>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Start Date
                            </label>
                            <input
                                type="date"
                                id="startDate"
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white transition-colors duration-200"
                                value={formatDateForInput(startDate)}
                                onChange={(e) => setStartDate(new Date(e.target.value))}
                                required
                            />
                        </div>
                        
                        <div>
                            <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                End Date
                            </label>
                            <input
                                type="date"
                                id="endDate"
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white transition-colors duration-200"
                                value={formatDateForInput(endDate)}
                                onChange={(e) => setEndDate(new Date(e.target.value))}
                                required
                            />
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="paymentDueDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Payment Due Date
                            </label>
                            <input
                                type="date"
                                id="paymentDueDate"
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white transition-colors duration-200"
                                value={paymentDueDate}
                                onChange={(e) => setPaymentDueDate(e.target.value)}
                                required
                            />
                        </div>
                        
                        <div>
                            <label htmlFor="paidPrice" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Price (PKR)
                            </label>
                            <input
                                type="number"
                                id="paidPrice"
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white transition-colors duration-200"
                                value={paidPrice}
                                onChange={(e) => setPaidPrice(Number(e.target.value))}
                                min="0"
                                step="0.01"
                                required
                            />
                        </div>
                    </div>
                    
                    <div>
                        <label htmlFor="paymentStatus" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Payment Status
                        </label>
                        <div className="flex space-x-4 mt-1">
                            <label className="inline-flex items-center">
                                <input
                                    type="radio"
                                    className="form-radio text-indigo-600 focus:ring-indigo-500"
                                    name="paymentStatus"
                                    value="paid"
                                    checked={paymentStatus === 'paid'}
                                    onChange={() => setPaymentStatus('paid')}
                                />
                                <span className="ml-2 text-gray-700 dark:text-gray-300">Paid</span>
                            </label>
                            <label className="inline-flex items-center">
                                <input
                                    type="radio"
                                    className="form-radio text-indigo-600 focus:ring-indigo-500"
                                    name="paymentStatus"
                                    value="unpaid"
                                    checked={paymentStatus === 'unpaid'}
                                    onChange={() => setPaymentStatus('unpaid')}
                                />
                                <span className="ml-2 text-gray-700 dark:text-gray-300">Unpaid</span>
                            </label>
                        </div>
                    </div>
                    
                    <div className="mt-4">
                        <label htmlFor="notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Notes
                        </label>
                        <textarea
                            id="notes"
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white transition-colors duration-200"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Add any notes about this subscription..."
                        />
                    </div>
                    
                    <div className="flex items-center justify-end space-x-3 pt-4">
                        <button
                            type="button"
                            onClick={onCancel}
                            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn-primary inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200"
                        >
                            Update Subscription
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default SubscriptionEditForm;
