// Advanced React Components for QuickShop

import React, { useState, useEffect } from 'react';
import { 
  ShoppingCartIcon, 
  HeartIcon, 
  UserIcon, 
  CogIcon, 
  ShieldCheckIcon,
  ArrowPathIcon,
  PlusIcon, 
  MinusIcon,
  CurrencyDollarIcon,
  TruckIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  LockClosedIcon,
  StarIcon,
  EyeIcon
} from '@heroicons/react/24/outline';

// Product Card Component
export const ProductCard = ({ product, onAddToCart, onAddToWishlist }) => {
  const [isWishlisted, setIsWishlisted] = useState(product.is_wishlisted || false);
  const [isLoading, setIsLoading] = useState(false);
  const [quantity, setQuantity] = useState(1);

  const handleAddToCart = async () => {
    setIsLoading(true);
    try {
      await onAddToCart(product, quantity);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddToWishlist = async () => {
    setIsLoading(true);
    try {
      await onAddToWishlist(product);
      setIsWishlisted(!isWishlisted);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300">
      <div className="relative">
        <img 
          src={product.images?.[0] || '/placeholder-product.jpg'} 
          alt={product.name}
          className="w-full h-48 object-cover"
          onError={(e) => e.target.src = '/placeholder-product.jpg'}
        />
        <button
          onClick={handleAddToWishlist}
          className={`absolute top-2 right-2 p-2 rounded-full transition-colors duration-200 ${
            isWishlisted ? 'bg-red-500 text-white' : 'bg-white text-gray-400 hover:text-red-500'
          }`}
        >
          <HeartIcon className="h-5 w-5" />
        </button>
        
        {product.badges?.includes('featured') && (
          <span className="absolute top-2 left-2 bg-yellow-400 text-yellow-900 text-xs px-2 py-1 rounded">
            Featured
          </span>
        )}
        
        {product.badges?.includes('new') && (
          <span className="absolute top-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded">
            New
          </span>
        )}
        
        {product.sale_price && (
          <span className="absolute top-12 left-2 bg-red-500 text-white text-xs px-2 py-1 rounded">
            Sale
          </span>
        )}
      </div>
      
      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-lg font-medium text-gray-900 line-clamp-2">{product.name}</h3>
          <div className="flex items-center">
            <StarIcon className="h-4 w-4 text-yellow-400" />
            <span className="text-xs text-gray-600 ml-1">{product.rating || 0}</span>
          </div>
        </div>
        
        <div className="flex items-center mb-2">
          {product.sale_price ? (
            <>
              <span className="text-lg font-bold text-gray-900">${product.sale_price}</span>
              <span className="text-sm text-gray-500 line-through ml-2">${product.price}</span>
            </>
          ) : (
            <span className="text-lg font-bold text-gray-900">${product.price}</span>
          )}
        </div>
        
        <div className="flex items-center text-sm text-gray-500 mb-3">
          <span>{product.sold_quantity || 0} sold</span>
          <span className="mx-2">•</span>
          <span>{product.stock_quantity || 0} in stock</span>
        </div>
        
        <div className="flex items-center">
          <div className="flex items-center mr-3">
            <button
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="p-1 border border-gray-300 rounded-l-md"
            >
              <MinusIcon className="h-4 w-4" />
            </button>
            <span className="px-3 py-1 border-y border-gray-300">{quantity}</span>
            <button
              onClick={() => setQuantity(quantity + 1)}
              className="p-1 border border-gray-300 rounded-r-md"
            >
              <PlusIcon className="h-4 w-4" />
            </button>
          </div>
          
          <button
            onClick={handleAddToCart}
            disabled={isLoading || (product.stock_quantity || 0) <= 0}
            className={`flex-1 py-2 px-4 rounded-md text-white font-medium transition-colors duration-200 ${
              (product.stock_quantity || 0) <= 0 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-indigo-600 hover:bg-indigo-700'
            }`}
          >
            {isLoading ? (
              <ArrowPathIcon className="h-5 w-5 animate-spin mx-auto" />
            ) : (product.stock_quantity || 0) <= 0 ? (
              'Out of Stock'
            ) : (
              'Add to Cart'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// Shopping Cart Component
export const Cart = ({ cartItems, onUpdateQuantity, onRemoveItem, onCheckout }) => {
  const [selectedItems, setSelectedItems] = useState([]);
  const [promoCode, setPromoCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState(0);

  const subtotal = cartItems.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0);
  const discountAmount = (subtotal * appliedDiscount) / 100;
  const shippingCost = subtotal > 50 ? 0 : 5.99; // Free shipping over $50
  const taxRate = 0.08; // 8% tax
  const taxAmount = (subtotal - discountAmount) * taxRate;
  const total = subtotal - discountAmount + shippingCost + taxAmount;

  const handleApplyPromo = () => {
    // In a real app, this would validate the promo code with the backend
    if (promoCode.toUpperCase() === 'WELCOME10') {
      setAppliedDiscount(10);
    } else if (promoCode.toUpperCase() === 'SALE20') {
      setAppliedDiscount(20);
    } else {
      setAppliedDiscount(0);
    }
  };

  const toggleItemSelection = (itemId) => {
    setSelectedItems(prev => 
      prev.includes(itemId) ? prev.filter(id => id !== itemId) : [...prev, itemId]
    );
  };

  const selectAllItems = () => {
    setSelectedItems(cartItems.map(item => item.id));
  };

  const deselectAllItems = () => {
    setSelectedItems([]);
  };

  const selectedItemsTotal = cartItems
    .filter(item => selectedItems.includes(item.id))
    .reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Shopping Cart</h1>
      
      {cartItems.length === 0 ? (
        <div className="text-center py-12">
          <ShoppingCartIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Your cart is empty</h3>
          <p className="mt-1 text-sm text-gray-500">Add some items to get started!</p>
        </div>
      ) : (
        <div className="lg:grid lg:grid-cols-12 lg:gap-x-12">
          <div className="lg:col-span-7">
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
              <ul className="divide-y divide-gray-200">
                {cartItems.map((item) => (
                  <li key={`${item.product_id}-${item.variant_id || 'default'}`} className="p-6">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={selectedItems.includes(item.id)}
                        onChange={() => toggleItemSelection(item.id)}
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
                          <button
                            onClick={() => onUpdateQuantity(item.id, -1)}
                            className="bg-gray-100 rounded-md p-1 text-gray-600 hover:bg-gray-200"
                          >
                            <MinusIcon className="h-5 w-5" />
                          </button>
                          
                          <span className="mx-2 text-gray-700">{item.quantity}</span>
                          
                          <button
                            onClick={() => onUpdateQuantity(item.id, 1)}
                            className="bg-gray-100 rounded-md p-1 text-gray-600 hover:bg-gray-200"
                          >
                            <PlusIcon className="h-5 w-5" />
                          </button>
                          
                          <button
                            onClick={() => onRemoveItem(item.id)}
                            className="ml-4 text-sm font-medium text-red-600 hover:text-red-500"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="mt-6 flex items-center">
              <input
                type="text"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value)}
                placeholder="Promo code"
                className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
              <button
                onClick={handleApplyPromo}
                className="ml-3 bg-gray-800 text-white px-4 py-2 rounded-md text-sm hover:bg-gray-700"
              >
                Apply
              </button>
            </div>
          </div>
          
          {/* Order Summary */}
          <div className="mt-10 lg:mt-0 lg:col-span-5">
            <div className="bg-white shadow sm:rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h2 className="text-lg font-medium text-gray-900">Order Summary</h2>
                
                <div className="mt-6 space-y-4">
                  <div className="flex justify-between text-base text-gray-900">
                    <p>Subtotal</p>
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
                    <p>${total.toFixed(2)}</p>
                  </div>
                </div>
                
                <div className="mt-6">
                  <button
                    onClick={() => onCheckout(selectedItems)}
                    disabled={selectedItems.length === 0}
                    className={`w-full bg-indigo-600 text-white py-3 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
                      selectedItems.length === 0 ? 'bg-gray-400 cursor-not-allowed' : ''
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
      )}
    </div>
  );
};

// Checkout Component
export const Checkout = ({ cartItems, onOrderSubmit, shippingAddress, billingAddress }) => {
  const [step, setStep] = useState(1); // 1: Address, 2: Payment, 3: Review
  const [shippingAddr, setShippingAddress] = useState({
    first_name: '',
    last_name: '',
    address_line_1: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'US',
    phone: ''
  });
  const [billingAddr, setBillingAddress] = useState({
    same_as_shipping: true,
    first_name: '',
    last_name: '',
    address_line_1: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'US',
    phone: ''
  });
  const [paymentMethod, setPaymentMethod] = useState('credit_card');
  const [creditCard, setCreditCard] = useState({
    number: '',
    expiry: '',
    cvv: '',
    holder_name: ''
  });
  const [orderNotes, setOrderNotes] = useState('');

  const subtotal = cartItems.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0);
  const taxRate = 0.08; // 8% tax
  const taxAmount = subtotal * taxRate;
  const shippingCost = subtotal > 50 ? 0 : 5.99; // Free shipping over $50
  const total = subtotal + taxAmount + shippingCost;

  const handleNextStep = () => setStep(step + 1);
  const handlePrevStep = () => setStep(step - 1);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const orderData = {
      shipping_address: billingAddr.same_as_shipping ? shippingAddr : billingAddr,
      billing_address: billingAddr.same_as_shipping ? shippingAddr : billingAddr,
      payment_method: paymentMethod,
      payment_data: paymentMethod === 'credit_card' ? creditCard : {},
      cart_items: cartItems,
      notes: orderNotes,
      subtotal,
      tax_amount: taxAmount,
      shipping_cost: shippingCost,
      total_amount: total
    };
    
    try {
      await onOrderSubmit(orderData);
    } catch (error) {
      console.error('Checkout error:', error);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Checkout</h1>
      
      <form onSubmit={handleSubmit}>
        <div className="lg:grid lg:grid-cols-12 lg:gap-x-12">
          <div className="lg:col-span-8">
            {/* Progress Steps */}
            <div className="mb-8">
              <div className="flex items-center">
                {[1, 2, 3].map((s) => (
                  <div key={s} className="flex items-center">
                    <button
                      type="button"
                      onClick={() => setStep(s)}
                      className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        step >= s ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-600'
                      }`}
                    >
                      {s}
                    </button>
                    {s < 3 && (
                      <div className={`flex-1 h-1 ${step > s ? 'bg-indigo-600' : 'bg-gray-200'}`} />
                    )}
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-2 text-sm text-gray-500">
                <span>Shipping</span>
                <span>Payment</span>
                <span>Review</span>
              </div>
            </div>
            
            {/* Step 1: Shipping Address */}
            {step === 1 && (
              <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Shipping Address</h2>
                
                <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                  <div className="sm:col-span-3">
                    <label htmlFor="first-name" className="block text-sm font-medium text-gray-700">
                      First name
                    </label>
                    <input
                      type="text"
                      id="first-name"
                      value={shippingAddr.first_name}
                      onChange={(e) => setShippingAddress({...shippingAddr, first_name: e.target.value})}
                      className="mt-1 block w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                  </div>
                  
                  <div className="sm:col-span-3">
                    <label htmlFor="last-name" className="block text-sm font-medium text-gray-700">
                      Last name
                    </label>
                    <input
                      type="text"
                      id="last-name"
                      value={shippingAddr.last_name}
                      onChange={(e) => setShippingAddress({...shippingAddr, last_name: e.target.value})}
                      className="mt-1 block w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                  </div>
                  
                  <div className="sm:col-span-6">
                    <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                      Address
                    </label>
                    <input
                      type="text"
                      id="address"
                      value={shippingAddr.address_line_1}
                      onChange={(e) => setShippingAddress({...shippingAddr, address_line_1: e.target.value})}
                      className="mt-1 block w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                  </div>
                  
                  <div className="sm:col-span-2">
                    <label htmlFor="city" className="block text-sm font-medium text-gray-700">
                      City
                    </label>
                    <input
                      type="text"
                      id="city"
                      value={shippingAddr.city}
                      onChange={(e) => setShippingAddress({...shippingAddr, city: e.target.value})}
                      className="mt-1 block w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                  </div>
                  
                  <div className="sm:col-span-2">
                    <label htmlFor="state" className="block text-sm font-medium text-gray-700">
                      State
                    </label>
                    <select
                      id="state"
                      value={shippingAddr.state}
                      onChange={(e) => setShippingAddress({...shippingAddr, state: e.target.value})}
                      className="mt-1 block w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    >
                      <option value="">Select State</option>
                      <option value="CA">California</option>
                      <option value="NY">New York</option>
                      <option value="TX">Texas</option>
                    </select>
                  </div>
                  
                  <div className="sm:col-span-2">
                    <label htmlFor="zip-code" className="block text-sm font-medium text-gray-700">
                      ZIP / Postal code
                    </label>
                    <input
                      type="text"
                      id="zip-code"
                      value={shippingAddr.postal_code}
                      onChange={(e) => setShippingAddress({...shippingAddr, postal_code: e.target.value})}
                      className="mt-1 block w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                  </div>
                  
                  <div className="sm:col-span-3">
                    <label htmlFor="country" className="block text-sm font-medium text-gray-700">
                      Country
                    </label>
                    <select
                      id="country"
                      value={shippingAddr.country}
                      onChange={(e) => setShippingAddress({...shippingAddr, country: e.target.value})}
                      className="mt-1 block w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    >
                      <option value="US">United States</option>
                      <option value="CA">Canada</option>
                      <option value="UK">United Kingdom</option>
                      <option value="AU">Australia</option>
                      <option value="IN">India</option>
                    </select>
                  </div>
                  
                  <div className="sm:col-span-3">
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                      Phone
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      value={shippingAddr.phone}
                      onChange={(e) => setShippingAddress({...shippingAddr, phone: e.target.value})}
                      className="mt-1 block w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                  </div>
                  
                  <div className="sm:col-span-6">
                    <div className="flex items-center">
                      <input
                        id="same-as-shipping"
                        name="same-as-shipping"
                        type="checkbox"
                        checked={billingAddr.same_as_shipping}
                        onChange={(e) => setBillingAddress({...billingAddr, same_as_shipping: e.target.checked})}
                        className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                      />
                      <label htmlFor="same-as-shipping" className="ml-2 block text-sm text-gray-900">
                        Billing address same as shipping
                      </label>
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 flex justify-end">
                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Continue to Payment
                  </button>
                </div>
              </div>
            )}
            
            {/* Step 2: Payment */}
            {step === 2 && (
              <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Payment Method</h2>
                
                <div className="space-y-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      id="credit_card"
                      name="payment_method"
                      value="credit_card"
                      checked={payment_method === 'credit_card'}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="h-4 w-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                    />
                    <span className="ml-3 block text-sm text-gray-700">
                      Credit Card
                    </span>
                  </label>
                  
                  <label className="flex items-center">
                    <input
                      type="radio"
                      id="paypal"
                      name="payment_method"
                      value="paypal"
                      checked={payment_method === 'paypal'}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="h-4 w-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                    />
                    <span className="ml-3 block text-sm text-gray-700">
                      PayPal
                    </span>
                  </label>
                  
                  <label className="flex items-center">
                    <input
                      type="radio"
                      id="cod"
                      name="payment_method"
                      value="cod"
                      checked={payment_method === 'cod'}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="h-4 w-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                    />
                    <span className="ml-3 block text-sm text-gray-700">
                      Cash on Delivery
                    </span>
                  </label>
                </div>
                
                {paymentMethod === 'credit_card' && (
                  <div className="mt-6 space-y-4">
                    <div>
                      <label htmlFor="card-name" className="block text-sm font-medium text-gray-700">
                        Name on Card
                      </label>
                      <input
                        type="text"
                        id="card-name"
                        value={creditCard.holder_name}
                        onChange={(e) => setCreditCard({...creditCard, holder_name: e.target.value})}
                        className="mt-1 block w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="card-number" className="block text-sm font-medium text-gray-700">
                        Card Number
                      </label>
                      <input
                        type="text"
                        id="card-number"
                        value={creditCard.number}
                        onChange={(e) => setCreditCard({...creditCard, number: e.target.value})}
                        className="mt-1 block w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        placeholder="0000 0000 0000 0000"
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
                      <div>
                        <label htmlFor="card-expiry" className="block text-sm font-medium text-gray-700">
                          Expiration Date (MM/YY)
                        </label>
                        <input
                          type="text"
                          id="card-expiry"
                          value={creditCard.expiry}
                          onChange={(e) => setCreditCard({...creditCard, expiry: e.target.value})}
                          className="mt-1 block w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                          placeholder="MM/YY"
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="card-cvv" className="block text-sm font-medium text-gray-700">
                          CVV
                        </label>
                        <input
                          type="text"
                          id="card-cvv"
                          value={creditCard.cvv}
                          onChange={(e) => setCreditCard({...creditCard, cvv: e.target.value})}
                          className="mt-1 block w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                          placeholder="123"
                        />
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="mt-6 flex justify-between">
                  <button
                    type="button"
                    onClick={handlePrevStep}
                    className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Review Order
                  </button>
                </div>
              </div>
            )}
            
            {/* Step 3: Review */}
            {step === 3 && (
              <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Review Your Order</h2>
                
                <div className="border rounded-lg p-4 mb-6">
                  <h3 className="font-medium text-gray-900 mb-2">Order Items</h3>
                  <ul className="divide-y divide-gray-200">
                    {cartItems.map((item) => (
                      <li key={`${item.product_id}-${item.variant_id || 'default'}`} className="py-3">
                        <div className="flex items-center">
                          <img
                            src={item.image_url || item.product_images?.[0] || '/placeholder-product.jpg'}
                            alt={item.name}
                            className="w-16 h-16 object-center object-cover rounded-md"
                            onError={(e) => e.target.src = '/placeholder-product.jpg'}
                          />
                          <div className="ml-4">
                            <h4 className="text-sm font-medium text-gray-900">{item.name}</h4>
                            <p className="text-sm text-gray-500">{item.quantity} × ${item.price}</p>
                            <p className="text-sm text-gray-500">${(item.price * item.quantity).toFixed(2)}</p>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                  
                  <div className="mt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Subtotal</span>
                      <span>${subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Tax</span>
                      <span>${taxAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Shipping</span>
                      <span>{shippingCost === 0 ? 'FREE' : `$${shippingCost.toFixed(2)}`}</span>
                    </div>
                    <div className="flex justify-between font-medium text-base">
                      <span>Total</span>
                      <span>${total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
                
                <div className="border rounded-lg p-4 mb-6">
                  <h3 className="font-medium text-gray-900 mb-2">Shipping Address</h3>
                  <p className="text-sm text-gray-600">
                    {shippingAddr.first_name} {shippingAddr.last_name}<br />
                    {shippingAddr.address_line_1}<br />
                    {shippingAddr.city}, {shippingAddr.state} {shippingAddr.postal_code}<br />
                    {shippingAddr.country}<br />
                    {shippingAddr.phone}
                  </p>
                </div>
                
                <div className="border rounded-lg p-4 mb-6">
                  <h3 className="font-medium text-gray-900 mb-2">Billing Address</h3>
                  <p className="text-sm text-gray-600">
                    {billingAddr.same_as_shipping
                      ? `${shippingAddr.first_name} ${shippingAddr.last_name}\n${shippingAddr.address_line_1}\n${shippingAddr.city}, ${shippingAddr.state} ${shippingAddr.postal_code}\n${shippingAddr.country}\n${shippingAddr.phone}`
                      : `${billingAddr.first_name} ${billingAddr.last_name}\n${billingAddr.address_line_1}\n${billingAddr.city}, ${billingAddr.state} ${billingAddr.postal_code}\n${billingAddr.country}\n${billingAddr.phone}`
                    }
                  </p>
                </div>
                
                <div className="border rounded-lg p-4 mb-6">
                  <h3 className="font-medium text-gray-900 mb-2">Payment Method</h3>
                  <p className="text-sm text-gray-600 capitalize">{paymentMethod.replace('_', ' ')}</p>
                </div>
                
                <div>
                  <label htmlFor="order-notes" className="block text-sm font-medium text-gray-700 mb-2">
                    Order Notes (optional)
                  </label>
                  <textarea
                    id="order-notes"
                    rows={3}
                    value={orderNotes}
                    onChange={(e) => setOrderNotes(e.target.value)}
                    className="block w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="Special instructions for your order..."
                  />
                </div>
                
                <div className="mt-6 flex justify-between">
                  <button
                    type="button"
                    onClick={handlePrevStep}
                    className="bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700"
                  >
                    Place Order
                  </button>
                </div>
              </div>
            )}
          </div>
          
          {/* Order Summary Sidebar */}
          <div className="mt-10 lg:mt-0 lg:col-span-4">
            <div className="bg-white shadow sm:rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h2 className="text-lg font-medium text-gray-900">Order Summary</h2>
                
                <div className="mt-6 space-y-4">
                  <div className="flex justify-between text-base text-gray-900">
                    <p>Subtotal</p>
                    <p>${subtotal.toFixed(2)}</p>
                  </div>
                  
                  <div className="flex justify-between text-base text-gray-900">
                    <p>Shipping</p>
                    <p>{shippingCost === 0 ? 'FREE' : `$${shippingCost.toFixed(2)}`}</p>
                  </div>
                  
                  <div className="flex justify-between text-base text-gray-900">
                    <p>Tax</p>
                    <p>${taxAmount.toFixed(2)}</p>
                  </div>
                  
                  <div className="flex justify-between text-lg font-bold text-gray-900 border-t border-gray-200 pt-4">
                    <p>Total</p>
                    <p>${total.toFixed(2)}</p>
                  </div>
                </div>
                
                <div className="mt-6 flex items-center">
                  <LockClosedIcon className="h-5 w-5 text-gray-400" />
                  <p className="ml-2 text-xs text-gray-500">
                    Your information is secure and encrypted.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

// User Profile Component
export const UserProfile = ({ user, onUpdateProfile }) => {
  const [formData, setFormData] = useState({
    name: user.name || '',
    email: user.email || '',
    phone: user.phone || '',
    bio: user.bio || '',
    address_line_1: user.address_line_1 || '',
    city: user.city || '',
    state: user.state || '',
    postal_code: user.postal_code || '',
    country: user.country || 'US'
  });
  
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await onUpdateProfile(formData);
      setIsEditing(false);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="flex justify-center items-center h-64">
        <ArrowPathIcon className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">My Profile</h1>
      
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">Profile Information</h3>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
            >
              {isEditing ? 'Cancel' : 'Edit Profile'}
            </button>
          </div>
        </div>
        
        <div className="px-4 py-5 sm:p-6">
          {isEditing ? (
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                <div className="sm:col-span-3">
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    Full name
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>
                
                <div className="sm:col-span-3">
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    Email address
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>
                
                <div className="sm:col-span-3">
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                    Phone number
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>
                
                <div className="sm:col-span-6">
                  <label htmlFor="bio" className="block text-sm font-medium text-gray-700">
                    Bio
                  </label>
                  <textarea
                    id="bio"
                    name="bio"
                    rows={4}
                    value={formData.bio}
                    onChange={handleChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>
                
                <div className="sm:col-span-6">
                  <label htmlFor="address_line_1" className="block text-sm font-medium text-gray-700">
                    Address
                  </label>
                  <input
                    type="text"
                    id="address_line_1"
                    name="address_line_1"
                    value={formData.address_line_1}
                    onChange={handleChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>
                
                <div className="sm:col-span-2">
                  <label htmlFor="city" className="block text-sm font-medium text-gray-700">
                    City
                  </label>
                  <input
                    type="text"
                    id="city"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>
                
                <div className="sm:col-span-2">
                  <label htmlFor="state" className="block text-sm font-medium text-gray-700">
                    State / Province
                  </label>
                  <input
                    type="text"
                    id="state"
                    name="state"
                    value={formData.state}
                    onChange={handleChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>
                
                <div className="sm:col-span-2">
                  <label htmlFor="postal_code" className="block text-sm font-medium text-gray-700">
                    ZIP / Postal code
                  </label>
                  <input
                    type="text"
                    id="postal_code"
                    name="postal_code"
                    value={formData.postal_code}
                    onChange={handleChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>
                
                <div className="sm:col-span-3">
                  <label htmlFor="country" className="block text-sm font-medium text-gray-700">
                    Country
                  </label>
                  <select
                    id="country"
                    name="country"
                    value={formData.country}
                    onChange={handleChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  >
                    <option value="US">United States</option>
                    <option value="CA">Canada</option>
                    <option value="UK">United Kingdom</option>
                    <option value="AU">Australia</option>
                    <option value="IN">India</option>
                  </select>
                </div>
              </div>
              
              <div className="mt-6">
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="flex space-x-4">
                <div className="flex-shrink-0">
                  <div className="h-24 w-24 rounded-full bg-indigo-100 flex items-center justify-center">
                    <UserIcon className="h-12 w-12 text-indigo-600" />
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-medium text-gray-900">{user.name}</h3>
                  <p className="text-sm text-gray-500">{user.email}</p>
                  <p className="text-sm text-gray-500">{user.phone || 'Phone not provided'}</p>
                </div>
              </div>
              
              {user.bio && (
                <div>
                  <h4 className="text-sm font-medium text-gray-900">Bio</h4>
                  <p className="mt-1 text-sm text-gray-500">{user.bio}</p>
                </div>
              )}
              
              <div>
                <h4 className="text-sm font-medium text-gray-900">Address</h4>
                <p className="mt-1 text-sm text-gray-500">
                  {user.address_line_1}<br />
                  {user.city}, {user.state} {user.postal_code}<br />
                  {user.country}
                </p>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-900">Joined</h4>
                <p className="mt-1 text-sm text-gray-500">
                  {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'Date unknown'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Order History Component
export const OrderHistory = ({ orders, onViewOrderDetails }) => {
  if (!orders || orders.length === 0) {
    return (
      <div className="text-center py-12">
        <ShoppingBagIcon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No orders</h3>
        <p className="mt-1 text-sm text-gray-500">You haven't placed any orders yet.</p>
        <div className="mt-6">
          <Link to="/products">
            <button className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700">
              Browse Products
            </button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Order History</h1>
      
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <ul className="divide-y divide-gray-200">
          {orders.map((order) => (
            <li key={order.id}>
              <div className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium text-indigo-600 truncate">
                    Order #{order.order_number}
                  </div>
                  <div className="ml-2 flex-shrink-0 flex">
                    <span className={`inline-flex px-2 text-xs leading-5 font-semibold rounded-full ${
                      order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                      order.status === 'shipped' ? 'bg-blue-100 text-blue-800' :
                      order.status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                      order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {order.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
                
                <div className="mt-2 sm:flex sm:justify-between">
                  <div className="sm:flex">
                    <div className="mr-6 flex items-center text-sm text-gray-500">
                      <CurrencyDollarIcon className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" />
                      {order.total_amount ? `$${order.total_amount.toFixed(2)}` : '$0.00'}
                    </div>
                    <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                      <TruckIcon className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" />
                      {order.items_count || 0} items
                    </div>
                  </div>
                  <div className="mt-4 flex items-center text-sm text-gray-500 sm:mt-0">
                    <span>{new Date(order.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50 px-4 py-4 sm:px-6">
                <div className="flex justify-end">
                  <button
                    onClick={() => onViewOrderDetails(order.id)}
                    className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
                  >
                    View Order Details
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default {
  ProductCard,
  Cart,
  Checkout,
  UserProfile,
  OrderHistory
};