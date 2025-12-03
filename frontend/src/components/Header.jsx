import React from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCartIcon, UserIcon, HeartIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

export const Header = () => {
  return (
    <header className="bg-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/" className="text-2xl font-bold text-indigo-600">
              QuickShop
            </Link>
          </div>

          {/* Search Bar */}
          <div className="flex-1 mx-10">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search products..."
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>
          </div>

          {/* Navigation Icons */}
          <div className="flex items-center space-x-4">
            <Link to="/wishlist" className="p-2 text-gray-700 hover:text-indigo-600">
              <HeartIcon className="h-6 w-6" />
            </Link>
            <Link to="/cart" className="p-2 text-gray-700 hover:text-indigo-600 relative">
              <ShoppingCartIcon className="h-6 w-6" />
              <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
                3
              </span>
            </Link>
            <Link to="/profile" className="p-2 text-gray-700 hover:text-indigo-600">
              <UserIcon className="h-6 w-6" />
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;