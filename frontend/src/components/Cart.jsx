// Cart Component
import React, { useState, useEffect } from 'react';
import { 
  ShoppingCartIcon, 
  PlusIcon, 
  MinusIcon, 
  TrashIcon, 
  ArrowPathIcon,
  LockClosedIcon
} from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';

const Cart = ({ cartItems, onUpdateQuantity, onRemoveItem, onCheckout }) => {
  const [selectedItems, setSelectedItems] = useState([]);
  const [promoCode, setPromoCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const subtotal = cartItems.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0);
  const discountAmount = (subtotal * appliedDiscount) / 100;
  const shippingCost = subtotal > 50 ? 0 : 5.99; // Free shipping over $50
  const taxRate = 0.08; // 8% tax
  const taxAmount = (subtotal - discountAmount) * taxRate;
  const total = subtotal - discountAmount + shippingCost + taxAmount;

  const handleApplyPromo = async () => {
    setIsLoading(true);
    try {
      // In a real implementation, this would call the backend API to validate the promo code
      if (promoCode.toUpperCase() === 'WELCOME10') {
        setAppliedDiscount(10);
      } else if (promoCode.toUpperCase() === 'SALE20') {
        setAppliedDiscount(20);
      } else {
        setAppliedDiscount(0);
        alert('Invalid promo code');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const toggleItemSelection = (itemId) => {
    setSelectedItems(prev => 
      prev.includes(itemId) ? prev.filter(id => id !== itemId) : [...prev, itemId]
    );
  };

  const selectAllItems = () => {
    setSelectedItems(cartItems.map(item => `${item.product_id}-${item.variant_id || 'default'}`));
  };

  const deselectAllItems = () => {
    setSelectedItems([]);
  };

  const calculateItemTotal = (item) => {
    return (item.price * (item.quantity || 1)).toFixed(2);
  };

  const selectedItemsTotal = cartItems
    .filter(item => selectedItems.includes(`${item.product_id}-${item.variant_id || 'default'}`))
    .reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0);

  if (cartItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <ShoppingCartIcon className="h-16 w-16 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Your cart is empty</h3>
        <p className="text-gray-500 mb-6">Add some items to get started!</p>
        <Link to="/products">
          <button className="bg-indigo-600 text-white px-6 py-3 rounded-md hover:bg-indigo-700">
            Browse Products
          </button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Shopping Cart</h1>
      
      <div className="lg:grid lg:grid-cols-12 lg:gap-x-12">
        <div className="lg:col-span-7">
          {/* Cart Items */}
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="border-b border-gray-200">
              <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedItems.length === cartItems.length && cartItems.length > 0}
                    onChange={selectedItems.length === cartItems.length ? deselectAllItems : selectAllItems}
                    className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  />
                  <span className="ml-2 text-sm font-medium text-gray-700">Select All ({cartItems.length})</span>
                </div>
              </div>
            </div>
            <ul className="divide-y divide-gray-200">
              {cartItems.map((item) => {
                const itemId = `${item.product_id}-${item.variant_id || 'default'}`;
                const isSelected = selectedItems.includes(itemId);
                
                return (
                  <li key={itemId} className="p-6">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleItemSelection(itemId)}
                        className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                      />
                      
                      <img
                        src={item.image_url || item.product_images?.[0] || '/placeholder-product.jpg'}
                        alt={item.name}
                        className="ml-4 w-24 h-24 object-center object-cover rounded-md"
                        onError={(e) => e.target.src = '/placeholder-product.jpg'}
                      />
                      
                      <div className="ml-4 flex-1">
                        <div>
                          <div className="flex justify-between">
                            <h3 className="text-sm font-medium text-gray-900">{item.name}</h3>
                            <p className="ml-4 text-sm font-medium text-gray-900">
                              ${(item.price * (item.quantity || 1)).toFixed(2)}
                            </p>
                          </div>
                          <p className="mt-1 text-sm text-gray-500">
                            {item.variant_name || 'Default Variant'}
                          </p>
                        </div>
                        
                        <div className="mt-2 flex items-center">
                          <div className="flex items-center border border-gray-300 rounded-md">
                            <button
                              onClick={() => onUpdateQuantity(item.id, -1)}
                              className="p-1 text-gray-600 hover:bg-gray-100"
                            >
                              <MinusIcon className="h-5 w-5" />
                            </button>
                            
                            <span className="px-3 py-1 text-sm text-gray-900 min-w-[40px] text-center">
                              {item.quantity || 1}
                            </span>
                            
                            <button
                              onClick={() => onUpdateQuantity(item.id, 1)}
                              className="p-1 text-gray-600 hover:bg-gray-100"
                            >
                              <PlusIcon className="h-5 w-5" />
                            </button>
                          </div>
                          
                          <button
                            onClick={() => onRemoveItem(item.id)}
                            className="ml-4 text-sm font-medium text-red-600 hover:text-red-500 flex items-center"
                          >
                            <TrashIcon className="h-4 w-4 mr-1" />
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
          
          {/* Promo Code */}
          <div className="mt-6 bg-white p-4 shadow rounded-lg">
            <div className="flex items-center">
              <input
                type="text"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value)}
                placeholder="Promo code"
                className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
              <button
                onClick={handleApplyPromo}
                disabled={isLoading}
                className="ml-3 bg-gray-800 text-white px-4 py-2 rounded-md hover:bg-gray-700 disabled:opacity-50"
              >
                {isLoading ? (
                  <ArrowPathIcon className="h-4 w-4 animate-spin" />
                ) : (
                  'Apply'
                )}
              </button>
            </div>
          </div>
        </div>
        
        {/* Order Summary Sidebar */}
        <div className="mt-10 lg:mt-0 lg:col-span-5">
          <div className="bg-white shadow sm:rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h2 className="text-lg font-medium text-gray-900">Order Summary</h2>
              
              <div className="mt-6 space-y-4">
                <div className="flex justify-between text-base text-gray-900">
                  <p>Selected Item Subtotal</p>
                  <p>${selectedItemsTotal.toFixed(2)}</p>
                </div>
                
                {appliedDiscount > 0 && (
                  <div className="flex justify-between text-base text-green-600">
                    <p>Discount ({appliedDiscount}%)</p>
                    <p>-${(selectedItemsTotal * appliedDiscount / 100).toFixed(2)}</p>
                  </div>
                )}
                
                <div className="flex justify-between text-base text-gray-900">
                  <p>Shipping</p>
                  <p>{shippingCost === 0 ? 'FREE' : `$${shippingCost.toFixed(2)}`}</p>
                </div>
                
                <div className="flex justify-between text-base text-gray-900">
                  <p>Tax</p>
                  <p>${((selectedItemsTotal - (selectedItemsTotal * appliedDiscount / 100)) * taxRate).toFixed(2)}</p>
                </div>
                
                <div className="flex justify-between text-lg font-bold text-gray-900 border-t border-gray-200 pt-4">
                  <p>Total</p>
                  <p>${(
                    selectedItemsTotal - 
                    (selectedItemsTotal * appliedDiscount / 100) + 
                    shippingCost + 
                    ((selectedItemsTotal - (selectedItemsTotal * appliedDiscount / 100)) * taxRate)
                  ).toFixed(2)}</p>
                </div>
              </div>
              
              <div className="mt-6">
                <button
                  onClick={() => onCheckout(selectedItems)}
                  disabled={selectedItems.length === 0}
                  className={`w-full py-3 px-4 rounded-md text-white font-medium ${
                    selectedItems.length === 0 
                      ? 'bg-gray-400 cursor-not-allowed' 
                      : 'bg-indigo-600 hover:bg-indigo-700'
                  }`}
                >
                  Proceed to Checkout
                </button>
              </div>
              
              <div className="mt-4 flex items-center">
                <LockClosedIcon className="h-5 w-5 text-gray-400" />
                <p className="ml-2 text-xs text-gray-500">
                  Secure checkout with 256-bit encryption
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;