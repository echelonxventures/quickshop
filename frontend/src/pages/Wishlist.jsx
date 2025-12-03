import React from 'react';

const Wishlist = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Wishlist</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <img 
            src="https://via.placeholder.com/300x300" 
            alt="Product" 
            className="w-full h-48 object-cover"
          />
          <div className="p-4">
            <h3 className="text-lg font-medium text-gray-900">Sample Product</h3>
            <p className="mt-1 text-sm text-gray-500">Electronics</p>
            <div className="mt-2 flex items-center">
              <p className="text-lg font-medium text-gray-900">$99.99</p>
              <button className="ml-auto bg-red-100 text-red-700 px-3 py-1 rounded-md text-sm font-medium hover:bg-red-200">
                Remove
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Wishlist;