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
    };
    onUpdate: (id: string, startDate: Date, endDate: Date, paidPrice: number) => void;
    onCancel: () => void;
}

const SubscriptionEditForm: React.FC<SubscriptionEditFormProps> = ({ subscription, onUpdate, onCancel }) => {
    const [startDate, setStartDate] = useState<Date>(subscription.startDate instanceof Timestamp ? subscription.startDate.toDate() : subscription.startDate);
    const [endDate, setEndDate] = useState<Date>(subscription.endDate instanceof Timestamp ? subscription.endDate.toDate() : subscription.endDate);
    const [paidPrice, setPaidPrice] = useState<number>(subscription.paidPrice);

    useEffect(() => {
        setStartDate(subscription.startDate instanceof Timestamp ? subscription.startDate.toDate() : subscription.startDate);
        setEndDate(subscription.endDate instanceof Timestamp ? subscription.endDate.toDate() : subscription.endDate);
        setPaidPrice(subscription.paidPrice);
    }, [subscription]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        onUpdate(subscription.id, startDate, endDate, paidPrice);
    };

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                <h3 className="text-lg font-medium leading-6 text-gray-900">Edit Subscription</h3>
                <form onSubmit={handleSubmit} className="mt-4">
                    <div className="mb-4">
                        <label htmlFor="startDate" className="block text-gray-700 text-sm font-bold mb-2">Start Date:</label>
                        <input
                            type="date"
                            id="startDate"
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                            value={startDate.toISOString().split('T')[0]}
                            onChange={(e) => setStartDate(new Date(e.target.value))}
                        />
                    </div>
                    <div className="mb-4">
                        <label htmlFor="endDate" className="block text-gray-700 text-sm font-bold mb-2">End Date:</label>
                        <input
                            type="date"
                            id="endDate"
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                            value={endDate.toISOString().split('T')[0]}
                            onChange={(e) => setEndDate(new Date(e.target.value))}
                        />
                    </div>
                    <div className="mb-4">
                        <label htmlFor="paidPrice" className="block text-gray-700 text-sm font-bold mb-2">Paid Price:</label>
                        <input
                            type="number"
                            id="paidPrice"
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                            value={paidPrice}
                            onChange={(e) => setPaidPrice(Number(e.target.value))}
                        />
                    </div>
                    <div className="flex justify-between">
                        <button
                            type="submit"
                            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                        >
                            Update
                        </button>
                        <button
                            type="button"
                            className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                            onClick={onCancel}
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default SubscriptionEditForm;
