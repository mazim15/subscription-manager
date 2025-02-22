import Link from 'next/link';

export default function Sidebar() {
  return (
    <div className="w-64 bg-gray-800 text-white p-6">
      <h1 className="text-xl font-bold mb-8">Stream Manager</h1>
      <nav className="space-y-4">
        <Link href="/" className="block py-2 px-4 rounded hover:bg-gray-700">
          Dashboard
        </Link>
        <Link href="/accounts" className="block py-2 px-4 rounded hover:bg-gray-700">
          Accounts
        </Link>
        <Link href="/subscribers" className="block py-2 px-4 rounded hover:bg-gray-700">
          Subscribers
        </Link>
        <Link href="/subscriptions" className="block py-2 px-4 rounded hover:bg-gray-700">
          Subscriptions
        </Link>
      </nav>
    </div>
  );
}
