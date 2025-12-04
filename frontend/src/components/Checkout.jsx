// Checkout Component
import React, { useState, useEffect } from 'react';
import { 
  CreditCardIcon, 
  TruckIcon, 
  UserCircleIcon, 
  MapPinIcon,
  ChevronDownIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';

const Checkout = ({ 
  cartItems, 
  user, 
  onPlaceOrder, 
  onValidatePromo,
  onCalculateShipping 
}) => {
  const [step, setStep] = useState(1); // 1: Address, 2: Shipping, 3: Payment, 4: Review
  const [shippingAddress, setShippingAddress] = useState({
    first_name: '',
    last_name: '',
    address_line_1: '',
    address_line_2: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'US',
    phone: ''
  });
  
  const [billingAddress, setBillingAddress] = useState({
    same_as_shipping: true,
    first_name: '',
    last_name: '',
    address_line_1: '',
    address_line_2: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'US',
    phone: ''
  });
  
  const [shippingMethod, setShippingMethod] = useState('standard');
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [promoCode, setPromoCode] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  
  // Initialize with user data if available
  useEffect(() => {
    if (user) {
      setShippingAddress({
        first_name: user.name?.split(' ')[0] || '',
        last_name: user.name?.split(' ').slice(1).join(' ') || '',
        address_line_1: user.address_line_1 || '',
        address_line_2: user.address_line_2 || '',
        city: user.city || '',
        state: user.state || '',
        postal_code: user.postal_code || '',
        country: user.country || 'US',
        phone: user.phone || ''
      });
    }
  }, [user]);

  const validateStep = (currentStep) => {
    const newErrors = {};
    
    if (currentStep === 1) {
      // Validate shipping address
      if (!shippingAddress.first_name.trim()) newErrors.first_name = 'First name is required';
      if (!shippingAddress.last_name.trim()) newErrors.last_name = 'Last name is required';
      if (!shippingAddress.address_line_1.trim()) newErrors.address_line_1 = 'Address is required';
      if (!shippingAddress.city.trim()) newErrors.city = 'City is required';
      if (!shippingAddress.state.trim()) newErrors.state = 'State is required';
      if (!shippingAddress.postal_code.trim()) newErrors.postal_code = 'ZIP code is required';
      if (!shippingAddress.phone.trim()) newErrors.phone = 'Phone number is required';
    } else if (currentStep === 3) {
      // Validate payment method
      if (paymentMethod === 'card') {
        // Validate card details
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const calculateTotals = () => {
    const subtotal = cartItems.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0);
    const discount = promoCode && appliedPromo ? (subtotal * appliedPromo.discount_percentage) / 100 : 0;
    const shippingCost = shippingMethod === 'free' ? 0 : 5.99;
    const tax = (subtotal - discount) * 0.08; // 8% tax
    const total = subtotal - discount + shippingCost + tax;
    
    return { subtotal, discount, shippingCost, tax, total };
  };

  const { subtotal, discount, shippingCost, tax, total } = calculateTotals();

  const handleNext = () => {
    if (validateStep(step)) {
      setStep(step + 1);
    }
  };

  const handlePrev = () => {
    setStep(Math.max(1, step - 1));
  };

  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const orderData = {
        shipping_address: billingAddress.same_as_shipping ? shippingAddress : billingAddress,
        billing_address: billingAddress.same_as_shipping ? shippingAddress : billingAddress,
        shipping_method: shipping_method,
        payment_method: payment_method,
        promo_code: promo_code,
        notes: orderNotes,
        items: cartItems.map(item => ({
          product_id: item.product_id,
          variant_id: item.variant_id,
          quantity: item.quantity,
          price: item.price
        })),
        totals: {
          subtotal,
          discount,
          shipping: shippingCost,
          tax,
          total
        }
      };
      
      await onPlaceOrder(orderData);
    } catch (error) {
      console.error('Order placement error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderStepIndicator = () => {
    return (
      <div className="flex items-center justify-center mb-8">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              step >= s ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-600'
            }`}>
              {s}
            </div>
            {s < 4 && <div className={`w-16 h-0.5 ${step > s ? 'bg-indigo-600' : 'bg-gray-200'}`} />}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Checkout</h1>
      
      {renderStepIndicator()}
      
      <form onSubmit={handlePlaceOrder}>
        <div className="lg:grid lg:grid-cols-12 lg:gap-x-12">
          <div className="lg:col-span-7">
            {/* Step 1: Address Information */}
            {step === 1 && (
              <div className="bg-white shadow sm:rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h2 className="text-lg font-medium text-gray-900 mb-4">Shipping Address</h2>
                  
                  <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                    <div className="sm:col-span-3">
                      <label htmlFor="first-name" className="block text-sm font-medium text-gray-700">
                        First name
                      </label>
                      <input
                        type="text"
                        id="first-name"
                        value={shippingAddress.first_name}
                        onChange={(e) => setShippingAddress({...shippingAddress, first_name: e.target.value})}
                        className={`mt-1 block w-full border rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${
                          errors.first_name ? 'border-red-300' : 'border-gray-300'
                        }`}
                      />
                      {errors.first_name && <p className="mt-1 text-sm text-red-600">{errors.first_name}</p>}
                    </div>
                    
                    <div className="sm:col-span-3">
                      <label htmlFor="last-name" className="block text-sm font-medium text-gray-700">
                        Last name
                      </label>
                      <input
                        type="text"
                        id="last-name"
                        value={shippingAddress.last_name}
                        onChange={(e) => setShippingAddress({...shippingAddress, last_name: e.target.value})}
                        className={`mt-1 block w-full border rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${
                          errors.last_name ? 'border-red-300' : 'border-gray-300'
                        }`}
                      />
                      {errors.last_name && <p className="mt-1 text-sm text-red-600">{errors.last_name}</p>}
                    </div>
                    
                    <div className="sm:col-span-6">
                      <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                        Address line 1
                      </label>
                      <input
                        type="text"
                        id="address"
                        value={shippingAddress.address_line_1}
                        onChange={(e) => setShippingAddress({...shippingAddress, address_line_1: e.target.value})}
                        className={`mt-1 block w-full border rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${
                          errors.address_line_1 ? 'border-red-300' : 'border-gray-300'
                        }`}
                      />
                      {errors.address_line_1 && <p className="mt-1 text-sm text-red-600">{errors.address_line_1}</p>}
                    </div>
                    
                    <div className="sm:col-span-6">
                      <label htmlFor="address-line-2" className="block text-sm font-medium text-gray-700">
                        Address line 2 (optional)
                      </label>
                      <input
                        type="text"
                        id="address-line-2"
                        value={shippingAddress.address_line_2}
                        onChange={(e) => setShippingAddress({...shippingAddress, address_line_2: e.target.value})}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      />
                    </div>
                    
                    <div className="sm:col-span-2">
                      <label htmlFor="city" className="block text-sm font-medium text-gray-700">
                        City
                      </label>
                      <input
                        type="text"
                        id="city"
                        value={shippingAddress.city}
                        onChange={(e) => setShippingAddress({...shippingAddress, city: e.target.value})}
                        className={`mt-1 block w-full border rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${
                          errors.city ? 'border-red-300' : 'border-gray-300'
                        }`}
                      />
                      {errors.city && <p className="mt-1 text-sm text-red-600">{errors.city}</p>}
                    </div>
                    
                    <div className="sm:col-span-2">
                      <label htmlFor="state" className="block text-sm font-medium text-gray-700">
                        State
                      </label>
                      <input
                        type="text"
                        id="state"
                        value={shippingAddress.state}
                        onChange={(e) => setShippingAddress({...shippingAddress, state: e.target.value})}
                        className={`mt-1 block w-full border rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${
                          errors.state ? 'border-red-300' : 'border-gray-300'
                        }`}
                      />
                      {errors.state && <p className="mt-1 text-sm text-red-600">{errors.state}</p>}
                    </div>
                    
                    <div className="sm:col-span-2">
                      <label htmlFor="postal-code" className="block text-sm font-medium text-gray-700">
                        ZIP / Postal code
                      </label>
                      <input
                        type="text"
                        id="postal-code"
                        value={shippingAddress.postal_code}
                        onChange={(e) => setShippingAddress({...shippingAddress, postal_code: e.target.value})}
                        className={`mt-1 block w-full border rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${
                          errors.postal_code ? 'border-red-300' : 'border-gray-300'
                        }`}
                      />
                      {errors.postal_code && <p className="mt-1 text-sm text-red-600">{errors.postal_code}</p>}
                    </div>
                    
                    <div className="sm:col-span-3">
                      <label htmlFor="country" className="block text-sm font-medium text-gray-700">
                        Country
                      </label>
                      <select
                        id="country"
                        value={shippingAddress.country}
                        onChange={(e) => setShippingAddress({...shippingAddress, country: e.target.value})}
                        className="mt-1 block w-full bg-white border border-gray-300 rounded-md py-2 px-3 shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      >
                        <option value="US">United States</option>
                        <option value="CA">Canada</option>
                        <option value="MX">Mexico</option>
                      </select>
                    </div>
                    
                    <div className="sm:col-span-3">
                      <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                        Phone
                      </label>
                      <input
                        type="tel"
                        id="phone"
                        value={shippingAddress.phone}
                        onChange={(e) => setShippingAddress({...shippingAddress, phone: e.target.value})}
                        className={`mt-1 block w-full border rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${
                          errors.phone ? 'border-red-300' : 'border-gray-300'
                        }`}
                      />
                      {errors.phone && <p className="mt-1 text-sm text-red-600">{errors.phone}</p>}
                    </div>
                    
                    <div className="sm:col-span-6">
                      <div className="flex items-center">
                        <input
                          id="same-as-shipping"
                          name="same-as-shipping"
                          type="checkbox"
                          checked={billingAddress.same_as_shipping}
                          onChange={(e) => setBillingAddress({...billingAddress, same_as_shipping: e.target.checked})}
                          className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                        />
                        <label htmlFor="same-as-shipping" className="ml-2 block text-sm text-gray-900">
                          Use same address for billing
                        </label>
                      </div>
                    </div>
                  </div>
                  
                  {!billingAddress.same_as_shipping && (
                    <div className="mt-8">
                      <h2 className="text-lg font-medium text-gray-900 mb-4">Billing Address</h2>
                      <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                        <div className="sm:col-span-3">
                          <label htmlFor="bill-first-name" className="block text-sm font-medium text-gray-700">
                            First name
                          </label>
                          <input
                            type="text"
                            id="bill-first-name"
                            value={billingAddress.first_name}
                            onChange={(e) => setBillingAddress({...billingAddress, first_name: e.target.value})}
                            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                          />
                        </div>
                        
                        <div className="sm:col-span-3">
                          <label htmlFor="bill-last-name" className="block text-sm font-medium text-gray-700">
                            Last name
                          </label>
                          <input
                            type="text"
                            id="bill-last-name"
                            value={billingAddress.last_name}
                            onChange={(e) => setBillingAddress({...billingAddress, last_name: e.target.value})}
                            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                          />
                        </div>
                        
                        <div className="sm:col-span-6">
                          <label htmlFor="bill-address" className="block text-sm font-medium text-gray-700">
                            Address line 1
                          </label>
                          <input
                            type="text"
                            id="bill-address"
                            value={billingAddress.address_line_1}
                            onChange={(e) => setBillingAddress({...billingAddress, address_line_1: e.target.value})}
                            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="mt-6 flex justify-between">
                    <div></div> {/* Empty div for spacing */}
                    <button
                      type="button"
                      onClick={handleNext}
                      className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      Continue to Shipping
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            {/* Step 2: Shipping Method */}
            {step === 2 && (
              <div className="bg-white shadow sm:rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h2 className="text-lg font-medium text-gray-900 mb-4">Shipping Method</h2>
                  
                  <div className="space-y-4">
                    {[
                      { id: 'standard', name: 'Standard Shipping', description: '5-7 business days', price: 5.99 },
                      { id: 'express', name: 'Express Shipping', description: '2-3 business days', price: 12.99 },
                      { id: 'overnight', name: 'Overnight Shipping', description: 'Next business day', price: 25.99 },
                      { id: 'free', name: 'Free Shipping', description: '7-10 business days', price: 0.00 }
                    ].map((method) => (
                      <div
                        key={method.id}
                        onClick={() => setShippingMethod(method.id)}
                        className={`p-4 border rounded-md cursor-pointer ${
                          shippingMethod === method.id 
                            ? 'border-indigo-500 bg-indigo-50' 
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                      >
                        <div className="flex items-center">
                          <input
                            type="radio"
                            id={method.id}
                            name="shipping-method"
                            checked={shippingMethod === method.id}
                            onChange={() => setShippingMethod(method.id)}
                            className="h-4 w-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                          />
                          <label htmlFor={method.id} className="ml-3 flex-1 flex items-center justify-between">
                            <div>
                              <p className="block text-sm font-medium text-gray-900">{method.name}</p>
                              <p className="block text-sm text-gray-500">{method.description}</p>
                            </div>
                            <div className="text-right">
                              <p className="block text-sm font-medium text-gray-900">
                                {method.price === 0 ? 'FREE' : `$${method.price}`}
                              </p>
                            </div>
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-6 flex justify-between">
                    <button
                      type="button"
                      onClick={handlePrev}
                      className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={handleNext}
                      className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      Continue to Payment
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            {/* Step 3: Payment Method */}
            {step === 3 && (
              <div className="bg-white shadow sm:rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h2 className="text-lg font-medium text-gray-900 mb-4">Payment Method</h2>
                  
                  <div className="space-y-4">
                    <div
                      onClick={() => setPaymentMethod('card')}
                      className={`p-4 border rounded-md cursor-pointer ${
                        paymentMethod === 'card' 
                          ? 'border-indigo-500 bg-indigo-50' 
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <div className="flex items-center">
                        <input
                          type="radio"
                          id="card"
                          name="payment-method"
                          checked={paymentMethod === 'card'}
                          onChange={() => setPaymentMethod('card')}
                          className="h-4 w-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                        />
                        <label htmlFor="card" className="ml-3 flex-1">
                          <div className="flex items-center">
                            <CreditCardIcon className="h-5 w-5 text-gray-400 mr-2" />
                            <span className="block text-sm font-medium text-gray-900">Credit/Debit Card</span>
                          </div>
                        </label>
                      </div>
                    </div>
                    
                    <div
                      onClick={() => setPaymentMethod('paypal')}
                      className={`p-4 border rounded-md cursor-pointer ${
                        paymentMethod === 'paypal' 
                          ? 'border-indigo-500 bg-indigo-50' 
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <div className="flex items-center">
                        <input
                          type="radio"
                          id="paypal"
                          name="payment-method"
                          checked={paymentMethod === 'paypal'}
                          onChange={() => setPaymentMethod('paypal')}
                          className="h-4 w-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                        />
                        <label htmlFor="paypal" className="ml-3 flex-1">
                          <div className="flex items-center">
                            <div className="bg-blue-500 text-white px-2 py-1 rounded text-xs font-medium mr-2">
                              PayPal
                            </div>
                            <span className="block text-sm font-medium text-gray-900">Pay with PayPal</span>
                          </div>
                        </label>
                      </div>
                    </div>
                    
                    <div
                      onClick={() => setPaymentMethod('cod')}
                      className={`p-4 border rounded-md cursor-pointer ${
                        paymentMethod === 'cod' 
                          ? 'border-indigo-500 bg-indigo-50' 
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <div className="flex items-center">
                        <input
                          type="radio"
                          id="cod"
                          name="payment-method"
                          checked={paymentMethod === 'cod'}
                          onChange={() => setPaymentMethod('cod')}
                          className="h-4 w-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                        />
                        <label htmlFor="cod" className="ml-3 flex-1">
                          <div className="flex items-center">
                            <TruckIcon className="h-5 w-5 text-gray-400 mr-2" />
                            <span className="block text-sm font-medium text-gray-900">Cash on Delivery</span>
                          </div>
                        </label>
                      </div>
                    </div>
                  </div>
                  
                  {paymentMethod === 'card' && (
                    <div className="mt-6 space-y-4">
                      <div>
                        <label htmlFor="card-name" className="block text-sm font-medium text-gray-700">
                          Name on Card
                        </label>
                        <input
                          type="text"
                          id="card-name"
                          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="card-number" className="block text-sm font-medium text-gray-700">
                          Card Number
                        </label>
                        <input
                          type="text"
                          id="card-number"
                          placeholder="0000 0000 0000 0000"
                          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        />
                      </div>
                      
                      <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
                        <div>
                          <label htmlFor="expiry-date" className="block text-sm font-medium text-gray-700">
                            Expiry Date
                          </label>
                          <input
                            type="text"
                            id="expiry-date"
                            placeholder="MM/YY"
                            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                          />
                        </div>
                        
                        <div>
                          <label htmlFor="cvv" className="block text-sm font-medium text-gray-700">
                            CVV
                          </label>
                          <input
                            type="text"
                            id="cvv"
                            placeholder="123"
                            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="mt-6 flex justify-between">
                    <button
                      type="button"
                      onClick={handlePrev}
                      className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={handleNext}
                      className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      Review Order
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            {/* Step 4: Review Order */}
            {step === 4 && (
              <div className="bg-white shadow sm:rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h2 className="text-lg font-medium text-gray-900 mb-4">Review Your Order</h2>
                  
                  <div className="border rounded-lg p-4 mb-6">
                    <h3 className="font-medium text-gray-900 mb-2">Order Items</h3>
                    <div className="divide-y divide-gray-200">
                      {cartItems.map((item) => (
                        <div key={item.id} className="py-4 flex">
                          <img
                            src={item.image_url || '/placeholder-product.jpg'}
                            alt={item.name}
                            className="w-16 h-16 object-cover rounded-md"
                            onError={(e) => e.target.src = '/placeholder-product.jpg'}
                          />
                          <div className="ml-4 flex-1">
                            <h4 className="text-sm font-medium text-gray-900">{item.name}</h4>
                            <div className="flex items-center mt-1">
                              <p className="text-sm text-gray-500">Qty: {item.quantity || 1}</p>
                              <p className="ml-4 text-sm font-medium text-gray-900">
                                ${(item.price * (item.quantity || 1)).toFixed(2)}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="border rounded-lg p-4 mb-6">
                    <h3 className="font-medium text-gray-900 mb-2">Shipping Address</h3>
                    <p className="text-sm text-gray-600">
                      {shippingAddress.first_name} {shippingAddress.last_name}<br />
                      {shippingAddress.address_line_1}<br />
                      {shippingAddress.city}, {shippingAddress.state} {shippingAddress.postal_code}<br />
                      {shippingAddress.country}<br />
                      {shippingAddress.phone}
                    </p>
                  </div>
                  
                  <div className="border rounded-lg p-4 mb-6">
                    <h3 className="font-medium text-gray-900 mb-2">Shipping Method</h3>
                    <p className="text-sm text-gray-600 capitalize">
                      {shippingMethod} - {(shippingMethod === 'standard' && 5.99) || 
                                         (shippingMethod === 'express' && 12.99) || 
                                         (shippingMethod === 'overnight' && 25.99) || 
                                         (shippingMethod === 'free' && 0)} 
                      {shippingMethod === 'free' ? ' FREE' : `$${(shippingMethod === 'standard' && 5.99) || 
                                                                 (shippingMethod === 'express' && 12.99) || 
                                                                 (shippingMethod === 'overnight' && 25.99) || 0}`}
                    </p>
                  </div>
                  
                  <div className="border rounded-lg p-4 mb-6">
                    <h3 className="font-medium text-gray-900 mb-2">Payment Method</h3>
                    <p className="text-sm text-gray-600 capitalize">{paymentMethod}</p>
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
                      className="block w-full border border-gray-300 rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      placeholder="Special instructions for your order..."
                    />
                  </div>
                  
                  <div className="mt-6 flex justify-between">
                    <button
                      type="button"
                      onClick={handlePrev}
                      className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                    >
                      {isLoading ? (
                        <ArrowPathIcon className="h-4 w-4 animate-spin" />
                      ) : (
                        `Place Order - $${total.toFixed(2)}`
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <div className="mt-10 lg:mt-0 lg:col-span-5">
            <div className="bg-white shadow sm:rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h2 className="text-lg font-medium text-gray-900">Order Summary</h2>
                
                <div className="mt-6 space-y-4">
                  <div className="flex justify-between text-base text-gray-900">
                    <p>Subtotal</p>
                    <p>${subtotal.toFixed(2)}</p>
                  </div>
                  
                  {discount > 0 && (
                    <div className="flex justify-between text-base text-green-600">
                      <p>Discount</p>
                      <p>-${discount.toFixed(2)}</p>
                    </div>
                  )}
                  
                  <div className="flex justify-between text-base text-gray-900">
                    <p>Shipping</p>
                    <p>{shippingCost === 0 ? 'FREE' : `$${shippingCost.toFixed(2)}`}</p>
                  </div>
                  
                  <div className="flex justify-between text-base text-gray-900">
                    <p>Tax</p>
                    <p>${tax.toFixed(2)}</p>
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

export default Checkout;