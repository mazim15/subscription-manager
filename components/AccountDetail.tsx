<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
  {account.slots.map((slot, index) => (
    <div 
      key={slot.id}
      className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-4 border border-gray-200 dark:border-gray-700"
    >
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">
          {slot.isOccupied 
            ? (slot.subscriberName 
                ? `${slot.subscriberName}` 
                : `Slot ${index + 1}`)
            : `Slot ${index + 1}`}
        </h3>
        <span 
          className={`px-2 py-1 text-xs rounded-full ${
            slot.isOccupied 
              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
              : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
          }`}
        >
          {slot.isOccupied ? 'Occupied' : 'Available'}
        </span>
      </div>
      {/* Other slot details */}
    </div>
  ))}
</div> 