import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { 
  StarIcon, 
  HeartIcon, 
  ShoppingCartIcon, 
  ArrowPathIcon, 
  PlusIcon, 
  MinusIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  TruckIcon,
  CurrencyDollarIcon,
  CreditCardIcon,
  UserCircleIcon
} from '@heroicons/react/24/outline';
import { useDispatch, useSelector } from 'react-redux';

// Advanced Product Card Component
export const ProductCard = ({ product, onAddToCart, onAddToWishlist }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);

  const handleAddToCart = async () => {
    setIsLoading(true);
    try {
      await onAddToCart(product);
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
    <div 
      className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative">
        <img 
          src={product.images?.[0] || '/placeholder-product.jpg'} 
          alt={product.name}
          className="w-full h-48 object-cover"
        />
        <button
          onClick={handleAddToWishlist}
          className={`absolute top-2 right-2 p-2 rounded-full transition-colors duration-200 ${
            isWishlisted ? 'bg-red-500 text-white' : 'bg-white text-gray-400 hover:text-red-500'
          }`}
        >
          <HeartIcon className="h-5 w-5" />
        </button>
        {product.is_featured && (
          <span className="absolute top-2 left-2 bg-yellow-400 text-yellow-900 text-xs px-2 py-1 rounded">
            Featured
          </span>
        )}
        {product.is_new && (
          <span className="absolute top-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded">
            New
          </span>
        )}
      </div>
      
      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-lg font-medium text-gray-900 line-clamp-2">{product.name}</h3>
          <div className="flex items-center">
            <StarIcon className="h-4 w-4 text-yellow-400" />
            <span className="text-sm text-gray-600 ml-1">{product.rating || 0}</span>
          </div>
        </div>
        
        <div className="flex items-center mb-2">
          <span className="text-xl font-bold text-gray-900">
            ${product.sale_price ? product.sale_price : product.price}
          </span>
          {product.sale_price && (
            <span className="text-sm text-gray-500 line-through ml-2">
              ${product.price}
            </span>
          )}
        </div>
        
        <div className="flex items-center text-sm text-gray-500 mb-3">
          <span>{product.sold_quantity || 0} sold</span>
          <span className="mx-2">•</span>
          <span>{product.available_stock || 0} in stock</span>
        </div>
        
        <div className="flex space-x-2">
          <button
            onClick={handleAddToCart}
            disabled={isLoading || product.available_stock <= 0}
            className={`flex-1 py-2 px-4 rounded-md text-white font-medium transition-colors duration-200 ${
              product.available_stock <= 0 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-indigo-600 hover:bg-indigo-700'
            }`}
          >
            {isLoading ? (
              <ArrowPathIcon className="h-5 w-5 animate-spin mx-auto" />
            ) : product.available_stock <= 0 ? (
              'Out of Stock'
            ) : (
              'Add to Cart'
            )}
          </button>
          {isHovered && (
            <button className="p-2 border border-gray-300 rounded-md hover:bg-gray-50">
              <EyeIcon className="h-5 w-5 text-gray-600" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// Advanced Product Detail Page
export const ProductDetail = () => {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState(null);
  const [selectedColor, setSelectedColor] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate API call to fetch product details
    setTimeout(() => {
      const mockProduct = {
        id: 1,
        name: 'Wireless Bluetooth Headphones',
        description: 'High-quality wireless headphones with noise cancellation and 30-hour battery life.',
        price: 99.99,
        sale_price: 89.99,
        rating: 4.5,
        review_count: 128,
        stock_quantity: 45,
        images: [
          'https://via.placeholder.com/400x400',
          'https://via.placeholder.com/400x400',
          'https://via.placeholder.com/400x400'
        ],
        specifications: {
          Weight: '256g',
          Battery_Life: '30 hours',
          Range: '10m',
          Charging_Time: '2 hours'
        },
        category: 'Electronics',
        brand: 'TechBrand',
        seller: 'Tech Store',
        features: [
          'Active Noise Cancellation',
          'Bluetooth 5.0',
          'Comfortable Over-ear Design',
          'Built-in Microphone',
          'Voice Assistant Support'
        ],
        variants: [
          { id: 1, name: 'Black', price: 89.99, stock: 15 },
          { id: 2, name: 'White', price: 89.99, stock: 20 },
          { id: 3, name: 'Silver', price: 94.99, stock: 10 }
        ]
      };
      setProduct(mockProduct);
      setIsLoading(false);
    }, 1000);
  }, [id]);

  const handleAddToCart = () => {
    console.log('Adding to cart:', { product, quantity, selectedVariant, selectedSize, selectedColor });
    // Implementation for adding to cart
  };

  const handleQuantityChange = (change) => {
    setQuantity(Math.max(1, quantity + change));
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <ArrowPathIcon className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!product) {
    return <div>Product not found</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="lg:grid lg:grid-cols-2 lg:gap-x-8 lg:items-start">
        {/* Image gallery */}
        <div className="flex flex-col-reverse">
          <div className="mx-auto mt-6 max-w-2xl sm:block lg:max-w-none">
            <div className="grid grid-cols-4 gap-6">
              {product.images.map((image, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImage(index)}
                  className={`relative h-24 bg-white rounded-md flex items-center justify-center text-sm font-medium uppercase text-gray-900 hover:bg-gray-50 focus:outline-none focus:ring focus:ring-offset-4 focus:ring-indigo-500 ${
                    selectedImage === index ? 'ring-2 ring-indigo-500' : ''
                  }`}
                >
                  <img
                    src={image}
                    alt={`Product ${index + 1}`}
                    className="w-full h-full object-cover rounded-md"
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="w-full aspect-w-1 aspect-h-1">
            <img
              src={product.images[selectedImage]}
              alt="Product"
              className="w-full h-96 object-cover object-center sm:rounded-lg"
            />
          </div>
        </div>

        {/* Product info */}
        <div className="mt-10 px-4 sm:px-0 sm:mt-16 lg:mt-0">
          <div className="flex justify-between items-start">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">{product.name}</h1>
            <button className="p-2 text-gray-400 hover:text-red-500">
              <HeartIcon className="h-6 w-6" />
            </button>
          </div>

          <div className="mt-3">
            <h2 className="sr-only">Product information</h2>
            <div className="flex items-center">
              <p className="text-3xl text-gray-900">${product.sale_price || product.price}</p>
              {product.sale_price && (
                <p className="text-xl text-gray-500 line-through ml-2">${product.price}</p>
              )}
            </div>

            <div className="mt-3 flex items-center">
              <div className="flex items-center">
                {[0, 1, 2, 3, 4].map((rating) => (
                  <StarIcon
                    key={rating}
                    className={`h-5 w-5 ${
                      rating < Math.floor(product.rating) ? 'text-yellow-400' : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
              <p className="sr-only">{product.rating} out of 5 stars</p>
              <a href="#" className="ml-3 text-sm font-medium text-indigo-600 hover:text-indigo-500">
                {product.review_count} reviews
              </a>
            </div>

            <p className="mt-6 text-gray-500">{product.description}</p>
          </div>

          <div className="mt-6">
            <h3 className="text-sm font-medium text-gray-900">Size</h3>
            <div className="mt-4 flex flex-wrap gap-2">
              {['S', 'M', 'L', 'XL'].map((size) => (
                <button
                  key={size}
                  onClick={() => setSelectedSize(size)}
                  className={`px-4 py-2 border rounded-md text-sm font-medium ${
                    selectedSize === size
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6">
            <h3 className="text-sm font-medium text-gray-900">Color</h3>
            <div className="mt-4 flex space-x-3">
              {['Black', 'White', 'Silver'].map((color) => (
                <button
                  key={color}
                  onClick={() => setSelectedColor(color)}
                  className={`px-4 py-2 border rounded-md text-sm font-medium ${
                    selectedColor === color
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {color}
                </button>
              ))}
            </div>
          </div>

          {product.variants && product.variants.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-medium text-gray-900">Variants</h3>
              <div className="mt-4 space-y-3">
                {product.variants.map((variant) => (
                  <div
                    key={variant.id}
                    onClick={() => setSelectedVariant(variant)}
                    className={`p-3 border rounded-md cursor-pointer ${
                      selectedVariant?.id === variant.id
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{variant.name}</span>
                      <span className="text-sm text-gray-500">${variant.price}</span>
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      {variant.stock} in stock
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 flex items-center space-x-4">
            <div className="flex items-center border border-gray-300 rounded-md">
              <button
                onClick={() => handleQuantityChange(-1)}
                className="p-2 text-gray-600 hover:text-gray-900"
              >
                <MinusIcon className="h-5 w-5" />
              </button>
              <span className="px-4 py-2 text-gray-900">{quantity}</span>
              <button
                onClick={() => handleQuantityChange(1)}
                className="p-2 text-gray-600 hover:text-gray-900"
              >
                <PlusIcon className="h-5 w-5" />
              </button>
            </div>
            <button
              onClick={handleAddToCart}
              className="flex-1 bg-indigo-600 text-white px-6 py-3 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Add to Cart
            </button>
          </div>

          <div className="mt-6 flex space-x-4">
            <button className="flex-1 bg-gray-800 text-white px-6 py-3 rounded-md hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500">
              Buy Now
            </button>
            <button className="p-3 border border-gray-300 rounded-md hover:bg-gray-50">
              <HeartIcon className="h-6 w-6 text-gray-600" />
            </button>
          </div>

          <div className="mt-10 border-t border-gray-200 pt-10">
            <h3 className="text-sm font-medium text-gray-900">Features</h3>
            <div className="mt-4 space-y-2">
              {product.features.map((feature, index) => (
                <div key={index} className="flex items-start">
                  <CheckCircleIcon className="h-5 w-5 text-green-500 mt-0.5" />
                  <p className="ml-3 text-sm text-gray-600">{feature}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-10 border-t border-gray-200 pt-10">
            <h3 className="text-sm font-medium text-gray-900">Specifications</h3>
            <div className="mt-4 grid grid-cols-2 gap-4">
              {Object.entries(product.specifications).map(([key, value]) => (
                <div key={key} className="flex justify-between">
                  <span className="text-sm text-gray-600">{key.replace('_', ' ')}</span>
                  <span className="text-sm text-gray-900">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Advanced Cart Component
export const Cart = () => {
  const [cartItems, setCartItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate API call to fetch cart items
    setTimeout(() => {
      const mockCartItems = [
        { 
          id: 1, 
          product_id: 1, 
          name: 'Wireless Bluetooth Headphones', 
          price: 89.99, 
          quantity: 1, 
          image: 'https://via.placeholder.com/100x100',
          stock: 45
        },
        { 
          id: 2, 
          product_id: 2, 
          name: 'Running Shoes', 
          price: 79.99, 
          quantity: 2, 
          image: 'https://via.placeholder.com/100x100',
          stock: 23
        },
        { 
          id: 3, 
          product_id: 3, 
          name: 'Coffee Maker', 
          price: 129.99, 
          quantity: 1, 
          image: 'https://via.placeholder.com/100x100',
          stock: 0
        }
      ];
      setCartItems(mockCartItems);
      setIsLoading(false);
    }, 500);
  }, []);

  const updateQuantity = (itemId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(itemId);
      return;
    }

    setCartItems(cartItems.map(item => 
      item.id === itemId ? { ...item, quantity: newQuantity } : item
    ));
  };

  const removeFromCart = (itemId) => {
    setCartItems(cartItems.filter(item => item.id !== itemId));
  };

  const calculateSubtotal = () => {
    return cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const calculateTax = () => {
    return calculateSubtotal() * 0.08; // 8% tax
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax() + 5.99; // + shipping
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <ArrowPathIcon className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="lg:grid lg:grid-cols-12 lg:gap-x-12 lg:items-start">
        <div className="lg:col-span-7">
          <h1 className="text-2xl font-bold text-gray-900">Shopping Cart</h1>

          <div className="mt-6">
            <ul className="border-t border-gray-200 divide-y divide-gray-200">
              {cartItems.map((item) => (
                <li key={item.id} className="py-6 sm:flex">
                  <div className="sm:flex-shrink-0">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-24 h-24 object-center object-cover rounded-md sm:w-32 sm:h-32"
                    />
                  </div>

                  <div className="mt-4 sm:mt-0 sm:ml-6 flex-1">
                    <div>
                      <div className="flex justify-between">
                        <h3 className="text-base font-medium text-gray-900">
                          {item.name}
                        </h3>
                        <p className="ml-4 text-base font-medium text-gray-900">
                          ${(item.price * item.quantity).toFixed(2)}
                        </p>
                      </div>
                      <p className="mt-1 text-sm text-gray-500">Wireless</p>
                    </div>

                    <div className="mt-4 flex items-center">
                      <div className="flex items-center border border-gray-300 rounded-md">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="p-2 text-gray-600 hover:text-gray-900"
                        >
                          <MinusIcon className="h-5 w-5" />
                        </button>
                        <span className="px-4 py-2 text-gray-900">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="p-2 text-gray-600 hover:text-gray-900"
                        >
                          <PlusIcon className="h-5 w-5" />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeFromCart(item.id)}
                        className="ml-4 text-sm font-medium text-red-600 hover:text-red-500"
                      >
                        Remove
                      </button>
                    </div>

                    {!item.stock && (
                      <div className="mt-2 flex items-center">
                        <ExclamationCircleIcon className="h-5 w-5 text-red-500" />
                        <span className="ml-1 text-sm text-red-600">Out of stock</span>
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="lg:col-span-5 lg:mt-0">
          <div className="border rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900">Order summary</h2>

            <div className="mt-6 space-y-4">
              <div className="flex justify-between text-base text-gray-900">
                <p>Subtotal</p>
                <p>${calculateSubtotal().toFixed(2)}</p>
              </div>
              <div className="flex justify-between text-base text-gray-900">
                <p>Shipping</p>
                <p>$5.99</p>
              </div>
              <div className="flex justify-between text-base text-gray-900">
                <p>Tax</p>
                <p>${calculateTax().toFixed(2)}</p>
              </div>
              <div className="flex justify-between text-lg font-bold text-gray-900 border-t border-gray-200 pt-4">
                <p>Total</p>
                <p>${calculateTotal().toFixed(2)}</p>
              </div>
            </div>

            <div className="mt-6">
              <button className="w-full bg-indigo-600 text-white py-3 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
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
  );
};

// Advanced Checkout Component
export const Checkout = () => {
  const [step, setStep] = useState(1); // 1: Address, 2: Payment, 3: Review
  const [shippingAddress, setShippingAddress] = useState({
    firstName: '',
    lastName: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'US'
  });
  const [billingAddress, setBillingAddress] = useState({
    firstName: '',
    lastName: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'US'
  });
  const [paymentMethod, setPaymentMethod] = useState('credit_card');
  const [creditCard, setCreditCard] = useState({
    number: '',
    expiry: '',
    cvv: '',
    name: ''
  });

  const handleAddressChange = (field, value, isBilling = false) => {
    const setAddress = isBilling ? setBillingAddress : setShippingAddress;
    const address = isBilling ? billingAddress : shippingAddress;
    
    setAddress({
      ...address,
      [field]: value
    });
  };

  const handlePaymentChange = (field, value) => {
    setCreditCard({
      ...creditCard,
      [field]: value
    });
  };

  const nextStep = () => setStep(step + 1);
  const prevStep = () => setStep(step - 1);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Checkout</h1>
        <div className="mt-4">
          <div className="flex justify-center space-x-4">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    step >= s ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {s}
                </div>
                {s < 3 && (
                  <div
                    className={`w-16 h-1 ${
                      step > s ? 'bg-indigo-600' : 'bg-gray-200'
                    }`}
                  />
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
      </div>

      <div className="lg:grid lg:grid-cols-12 lg:gap-x-12">
        <div className="lg:col-span-7">
          {step === 1 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900">Shipping Address</h2>
              <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                <div className="sm:col-span-3">
                  <label htmlFor="shipping-first-name" className="block text-sm font-medium text-gray-700">
                    First name
                  </label>
                  <input
                    type="text"
                    id="shipping-first-name"
                    value={shippingAddress.firstName}
                    onChange={(e) => handleAddressChange('firstName', e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label htmlFor="shipping-last-name" className="block text-sm font-medium text-gray-700">
                    Last name
                  </label>
                  <input
                    type="text"
                    id="shipping-last-name"
                    value={shippingAddress.lastName}
                    onChange={(e) => handleAddressChange('lastName', e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>

                <div className="sm:col-span-6">
                  <label htmlFor="shipping-address" className="block text-sm font-medium text-gray-700">
                    Address
                  </label>
                  <input
                    type="text"
                    id="shipping-address"
                    value={shippingAddress.address}
                    onChange={(e) => handleAddressChange('address', e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="shipping-city" className="block text-sm font-medium text-gray-700">
                    City
                  </label>
                  <input
                    type="text"
                    id="shipping-city"
                    value={shippingAddress.city}
                    onChange={(e) => handleAddressChange('city', e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="shipping-state" className="block text-sm font-medium text-gray-700">
                    State
                  </label>
                  <select
                    id="shipping-state"
                    value={shippingAddress.state}
                    onChange={(e) => handleAddressChange('state', e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  >
                    <option value="">Select State</option>
                    <option value="CA">California</option>
                    <option value="NY">New York</option>
                    <option value="TX">Texas</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="shipping-zip" className="block text-sm font-medium text-gray-700">
                    ZIP / Postal code
                  </label>
                  <input
                    type="text"
                    id="shipping-zip"
                    value={shippingAddress.zipCode}
                    onChange={(e) => handleAddressChange('zipCode', e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>
              </div>

              <div className="flex items-center">
                <input
                  id="use-billing-same"
                  name="use-billing-same"
                  type="checkbox"
                  className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
                <label htmlFor="use-billing-same" className="ml-2 block text-sm text-gray-900">
                  Billing address same as shipping
                </label>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={nextStep}
                  className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Continue to Payment
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900">Payment Information</h2>
              
              <div className="grid grid-cols-1 gap-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Payment Method</label>
                  <div className="mt-1 space-y-2">
                    <div className="flex items-center">
                      <input
                        type="radio"
                        id="credit_card"
                        name="payment_method"
                        value="credit_card"
                        checked={paymentMethod === 'credit_card'}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="h-4 w-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                      />
                      <label htmlFor="credit_card" className="ml-3 block text-sm text-gray-700">
                        Credit Card
                      </label>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="radio"
                        id="paypal"
                        name="payment_method"
                        value="paypal"
                        checked={paymentMethod === 'paypal'}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="h-4 w-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                      />
                      <label htmlFor="paypal" className="ml-3 block text-sm text-gray-700">
                        PayPal
                      </label>
                    </div>
                  </div>
                </div>

                {paymentMethod === 'credit_card' && (
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="card-name" className="block text-sm font-medium text-gray-700">
                        Name on Card
                      </label>
                      <input
                        type="text"
                        id="card-name"
                        value={creditCard.name}
                        onChange={(e) => handlePaymentChange('name', e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
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
                        onChange={(e) => handlePaymentChange('number', e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="card-expiry" className="block text-sm font-medium text-gray-700">
                          Expiration Date (MM/YY)
                        </label>
                        <input
                          type="text"
                          id="card-expiry"
                          value={creditCard.expiry}
                          onChange={(e) => handlePaymentChange('expiry', e.target.value)}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
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
                          onChange={(e) => handlePaymentChange('cvv', e.target.value)}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-between">
                <button
                  onClick={prevStep}
                  className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Back
                </button>
                <button
                  onClick={nextStep}
                  className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Review Order
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900">Review Your Order</h2>
              
              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900">Shipping Address</h3>
                <p className="mt-1 text-gray-600">
                  {shippingAddress.firstName} {shippingAddress.lastName}
                </p>
                <p className="text-gray-600">{shippingAddress.address}</p>
                <p className="text-gray-600">
                  {shippingAddress.city}, {shippingAddress.state} {shippingAddress.zipCode}
                </p>
                
                <h3 className="mt-4 text-lg font-medium text-gray-900">Payment Method</h3>
                <p className="mt-1 text-gray-600">
                  {paymentMethod === 'credit_card' ? 'Credit Card' : 'PayPal'}
                </p>
                
                <h3 className="mt-4 text-lg font-medium text-gray-900">Order Summary</h3>
                <div className="mt-2 space-y-1">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>$199.98</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Shipping</span>
                    <span>$5.99</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tax</span>
                    <span>$16.00</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total</span>
                    <span>$221.97</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-between">
                <button
                  onClick={prevStep}
                  className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Back
                </button>
                <button
                  className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  Place Order
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-5 mt-10 lg:mt-0">
          <div className="bg-gray-50 p-6 rounded-lg">
            <h2 className="text-lg font-medium text-gray-900">Order Summary</h2>
            
            <ul className="mt-6 space-y-4">
              {[1, 2].map((item) => (
                <li key={item} className="flex items-center space-x-4">
                  <img
                    src="https://via.placeholder.com/60x60"
                    alt="Product"
                    className="w-16 h-16 object-center object-cover rounded-md"
                  />
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-gray-900">
                      Wireless Bluetooth Headphones
                    </h3>
                    <p className="text-sm text-gray-500">Wireless</p>
                  </div>
                  <div className="text-sm text-gray-900">$89.99</div>
                </li>
              ))}
            </ul>

            <div className="mt-6 space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <p>Subtotal</p>
                <p>$199.98</p>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <p>Shipping</p>
                <p>$5.99</p>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <p>Tax</p>
                <p>$16.00</p>
              </div>
              <div className="flex justify-between text-lg font-bold text-gray-900 border-t border-gray-200 pt-2">
                <p>Total</p>
                <p>$221.97</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Advanced Product List Component
export const ProductList = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    category: '',
    priceRange: [0, 1000],
    rating: 0,
    sortBy: 'relevance',
    searchTerm: ''
  });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  useEffect(() => {
    // Simulate API call to fetch products
    setTimeout(() => {
      const mockProducts = Array.from({ length: 24 }, (_, i) => ({
        id: i + 1,
        name: `Product ${i + 1}`,
        description: `High-quality product ${i + 1} with excellent features`,
        price: Math.floor(Math.random() * 200) + 20,
        sale_price: Math.random() > 0.5 ? Math.floor(Math.random() * 150) + 15 : null,
        rating: Math.random() * 2 + 3, // 3-5 stars
        review_count: Math.floor(Math.random() * 100),
        stock_quantity: Math.floor(Math.random() * 50),
        images: [`https://via.placeholder.com/300x300?text=Product+${i + 1}`],
        category: ['Electronics', 'Fashion', 'Home', 'Sports'][i % 4],
        is_featured: i % 5 === 0,
        is_new: i % 3 === 0,
        available_stock: Math.floor(Math.random() * 50)
      }));
      setProducts(mockProducts);
      setLoading(false);
    }, 1000);
  }, []);

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
                         product.description.toLowerCase().includes(filters.searchTerm.toLowerCase());
    const matchesCategory = !filters.category || product.category === filters.category;
    const matchesPrice = product.price >= filters.priceRange[0] && product.price <= filters.priceRange[1];
    const matchesRating = product.rating >= filters.rating;

    return matchesSearch && matchesCategory && matchesPrice && matchesRating;
  });

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    switch (filters.sortBy) {
      case 'price-low':
        return a.price - b.price;
      case 'price-high':
        return b.price - a.price;
      case 'rating':
        return b.rating - a.rating;
      case 'newest':
        return b.id - a.id; // Assuming newer products have higher IDs
      default:
        return 0; // Relevance would be more complex in real implementation
    }
  });

  const totalPages = Math.ceil(sortedProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedProducts = sortedProducts.slice(startIndex, startIndex + itemsPerPage);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <ArrowPathIcon className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Filters Sidebar */}
        <div className="lg:w-64 flex-shrink-0">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Filters</h3>
            
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Categories</h4>
              <div className="space-y-2">
                {['All', 'Electronics', 'Fashion', 'Home & Kitchen', 'Sports'].map((category) => (
                  <div key={category} className="flex items-center">
                    <input
                      type="radio"
                      id={`category-${category}`}
                      name="category"
                      value={category === 'All' ? '' : category.toLowerCase()}
                      checked={filters.category === (category === 'All' ? '' : category.toLowerCase())}
                      onChange={(e) => setFilters({...filters, category: e.target.value})}
                      className="h-4 w-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                    />
                    <label htmlFor={`category-${category}`} className="ml-2 text-sm text-gray-700">
                      {category}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Price Range</h4>
              <div className="space-y-2">
                <input
                  type="range"
                  min="0"
                  max="1000"
                  value={filters.priceRange[1]}
                  onChange={(e) => setFilters({...filters, priceRange: [0, parseInt(e.target.value)]})}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>$0</span>
                  <span>${filters.priceRange[1]}</span>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Rating</h4>
              <div className="space-y-2">
                {[5, 4, 3, 2, 1].map((rating) => (
                  <div key={rating} className="flex items-center">
                    <input
                      type="radio"
                      id={`rating-${rating}`}
                      name="rating"
                      value={rating}
                      checked={filters.rating === rating}
                      onChange={(e) => setFilters({...filters, rating: parseInt(e.target.value)})}
                      className="h-4 w-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                    />
                    <label htmlFor={`rating-${rating}`} className="ml-2 text-sm text-gray-700 flex items-center">
                      {Array.from({ length: rating }, (_, i) => (
                        <StarIcon key={i} className="h-4 w-4 text-yellow-400" />
                      ))}
                      <span className="ml-1">& up</span>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Products</h1>
            
            <div className="mt-4 sm:mt-0 flex items-center space-x-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search products..."
                  value={filters.searchTerm}
                  onChange={(e) => setFilters({...filters, searchTerm: e.target.value})}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              
              <select
                value={filters.sortBy}
                onChange={(e) => setFilters({...filters, sortBy: e.target.value})}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="relevance">Relevance</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="rating">Top Rated</option>
                <option value="newest">Newest</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {paginatedProducts.map((product) => (
              <ProductCard 
                key={product.id} 
                product={product} 
                onAddToCart={(p) => console.log('Add to cart:', p)}
                onAddToWishlist={(p) => console.log('Add to wishlist:', p)}
              />
            ))}
          </div>

          {/* Pagination */}
          <div className="mt-8 flex justify-center">
            <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium ${
                  currentPage === 1 ? 'text-gray-300' : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                <span className="sr-only">Previous</span>
                <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </button>
              
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNum = Math.max(1, currentPage - 2) + i;
                if (pageNum > totalPages) return null;
                
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                      currentPage === pageNum
                        ? 'z-10 bg-indigo-50 border-indigo-500 text-indigo-600'
                        : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium ${
                  currentPage === totalPages ? 'text-gray-300' : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                <span className="sr-only">Next</span>
                <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              </button>
            </nav>
          </div>
        </div>
      </div>
    </div>
  );
};

// Profile Component
export const Profile = () => {
  const [user, setUser] = useState({
    name: 'John Doe',
    email: 'john@example.com',
    phone: '+1 (555) 123-4567',
    address: '123 Main St, New York, NY 10001',
    joinDate: '2023-01-15',
    orders: 24,
    totalSpent: 1245.67
  });

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg leading-6 font-medium text-gray-900">User Profile</h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">Personal information and account settings</p>
        </div>
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center mb-8">
            <div className="flex-shrink-0">
              <div className="h-16 w-16 rounded-full bg-indigo-100 flex items-center justify-center">
                <UserCircleIcon className="h-8 w-8 text-indigo-600" />
              </div>
            </div>
            <div className="ml-4">
              <h2 className="text-xl font-bold text-gray-900">{user.name}</h2>
              <p className="text-gray-500">Member since {new Date(user.joinDate).toLocaleDateString()}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Personal Information</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Full Name</label>
                  <input
                    type="text"
                    value={user.name}
                    readOnly
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm bg-gray-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email Address</label>
                  <input
                    type="email"
                    value={user.email}
                    readOnly
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm bg-gray-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Phone Number</label>
                  <input
                    type="tel"
                    value={user.phone}
                    readOnly
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm bg-gray-50"
                  />
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Account Statistics</h3>
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Orders</span>
                  <span className="font-medium">{user.orders}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Spent</span>
                  <span className="font-medium">${user.totalSpent.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Account Created</span>
                  <span className="font-medium">{new Date(user.joinDate).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="mt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Address</h3>
                <p className="text-gray-600">{user.address}</p>
              </div>
            </div>
          </div>

          <div className="mt-8 flex justify-end">
            <button className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700">
              Edit Profile
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};