import React from 'react';

const Home = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Welcome to QuickShop</h1>
        <p className="text-xl text-gray-600 mb-8">Your one-stop destination for all your shopping needs</p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold mb-2">Wide Selection</h3>
            <p className="text-gray-600">Browse thousands of products from top brands</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold mb-2">Secure Shopping</h3>
            <p className="text-gray-600">Shop with confidence using our secure payment system</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold mb-2">Fast Delivery</h3>
            <p className="text-gray-600">Get your products delivered quickly to your doorstep</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;