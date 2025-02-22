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
  
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-gray-500 text-sm">Total Accounts</h3>
          <p className="text-2xl font-bold">{accounts.length}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-gray-500 text-sm">Slots Usage</h3>
          <p className="text-2xl font-bold">{occupiedSlots} / {totalSlots}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-gray-500 text-sm">Expiring Soon</h3>
          <p className="text-2xl font-bold">{expiringCount}</p>
        </div>
      </div>
    );
  }
