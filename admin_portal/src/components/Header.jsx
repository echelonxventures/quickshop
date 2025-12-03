import React from 'react';

export const Header = () => {
  return (
    <header className="bg-white shadow">
      <div className="px-4 py-6 sm:px-6">
        <h1 className="text-3xl font-bold text-gray-900">QuickShop Admin</h1>
      </div>
    </header>
  );
};

export const Sidebar = () => {
  return (
    <div className="hidden md:flex md:flex-shrink-0">
      <div className="flex flex-col w-64">
        <div className="flex flex-col flex-grow pt-5 bg-gray-800 overflow-y-auto">
          <nav className="mt-5 flex-1 px-2 pb-4 space-y-1">
            <a
              href="/admin/dashboard"
              className="bg-gray-900 text-white group flex items-center px-2 py-2 text-sm font-medium rounded-md"
            >
              Dashboard
            </a>
            <a
              href="/admin/users"
              className="text-gray-300 hover:bg-gray-700 hover:text-white group flex items-center px-2 py-2 text-sm font-medium rounded-md"
            >
              Users
            </a>
            <a
              href="/admin/products"
              className="text-gray-300 hover:bg-gray-700 hover:text-white group flex items-center px-2 py-2 text-sm font-medium rounded-md"
            >
              Products
            </a>
            <a
              href="/admin/orders"
              className="text-gray-300 hover:bg-gray-700 hover:text-white group flex items-center px-2 py-2 text-sm font-medium rounded-md"
            >
              Orders
            </a>
            <a
              href="/admin/categories"
              className="text-gray-300 hover:bg-gray-700 hover:text-white group flex items-center px-2 py-2 text-sm font-medium rounded-md"
            >
              Categories
            </a>
            <a
              href="/admin/sellers"
              className="text-gray-300 hover:bg-gray-700 hover:text-white group flex items-center px-2 py-2 text-sm font-medium rounded-md"
            >
              Sellers
            </a>
            <a
              href="/admin/support-tickets"
              className="text-gray-300 hover:bg-gray-700 hover:text-white group flex items-center px-2 py-2 text-sm font-medium rounded-md"
            >
              Support Tickets
            </a>
            <a
              href="/admin/settings"
              className="text-gray-300 hover:bg-gray-700 hover:text-white group flex items-center px-2 py-2 text-sm font-medium rounded-md"
            >
              Settings
            </a>
          </nav>
        </div>
      </div>
    </div>
  );
};

export const ProtectedRoute = ({ children }) => {
  // In a real app, this would check authentication
  return children;
};

export const Analytics = () => {
  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Analytics</h2>
      <p>Analytics dashboard content would go here.</p>
    </div>
  );
};

export const Login = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to your account
          </h2>
        </div>
        <form className="mt-8 space-y-6" action="#" method="POST">
          <input type="hidden" name="remember" value="true" />
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email-address" className="sr-only">
                Email address
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Email address"
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Password"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Sign in
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};