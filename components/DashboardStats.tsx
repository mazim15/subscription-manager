interface Slot {
  isOccupied: boolean;
}

interface Account {
  slots: Slot[];
}

interface DashboardStatsProps {
  accounts: Account[];
  expiringCount: number;
}

export default function DashboardStats({ accounts, expiringCount }: DashboardStatsProps) {
    const totalSlots = accounts.reduce((acc, account) => acc + account.slots.length, 0);
    const occupiedSlots = accounts.reduce(
      (acc, account) => acc + account.slots.filter(slot => slot.isOccupied).length,
      0
    );
    const availableSlots = totalSlots - occupiedSlots;
  
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="card p-6 hover:scale-105 transition-transform duration-300 bg-white dark:bg-slate-800 rounded-xl shadow-sm hover:shadow-md">
          <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-2">Total Accounts</h3>
          <p className="text-3xl font-bold heading">{accounts.length}</p>
        </div>
        
        <div className="card p-6 hover:scale-105 transition-transform duration-300 bg-white dark:bg-slate-800 rounded-xl shadow-sm hover:shadow-md">
          <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-2">Total Slots</h3>
          <p className="text-3xl font-bold heading">{totalSlots}</p>
          <div className="mt-2 flex justify-between text-sm">
            <span className="text-green-500 dark:text-green-400">{availableSlots} Available</span>
            <span className="text-red-500 dark:text-red-400">{occupiedSlots} Occupied</span>
          </div>
        </div>
        
        <div className="card p-6 hover:scale-105 transition-transform duration-300 bg-white dark:bg-slate-800 rounded-xl shadow-sm hover:shadow-md">
          <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-2">Expiring Soon</h3>
          <p className="text-3xl font-bold heading">{expiringCount}</p>
        </div>
      </div>
    );
  }
