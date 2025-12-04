import React, { useState, useEffect } from 'react';
import { 
  ShoppingCartIcon, 
  ArrowPathIcon, 
  ClockIcon, 
  CheckCircleIcon, 
  TruckIcon, 
  ExclamationCircleIcon,
  XCircleIcon,
  EyeIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';

const OrderHistory = ({ user, onViewOrderDetails, onDownloadInvoice }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    // Simulate API call to fetch orders
    setTimeout(() => {
      const mockOrders = [
        {
          id: 1,
          order_number: 'QS1234567890',
          status: 'delivered',
          total_amount: 129.99,
          items_count: 3,
          created_at: '2023-06-15T10:30:00Z',
          shipping_address: '123 Main St, New York, NY 10001',
          tracking_number: '1Z999AA1234567890',
          tracking_carrier: 'UPS',
          payment_method: 'credit_card',
          payment_status: 'paid'
        },
        {
          id: 2,
          order_number: 'QS1234567891',
          status: 'shipped',
          total_amount: 89.99,
          items_count: 2,
          created_at: '2023-06-14T14:22:00Z',
          shipping_address: '456 Oak Ave, Los Angeles, CA 90210',
          tracking_number: 'TBA3215478254',
          tracking_carrier: 'FedEx',
          payment_method: 'paypal',
          payment_status: 'paid'
        },
        {
          id: 3,
          order_number: 'QS1234567892',
          status: 'processing',
          total_amount: 249.99,
          items_count: 1,
          created_at: '2023-06-13T09:15:00Z',
          shipping_address: '789 Pine Rd, Chicago, IL 60601',
          payment_method: 'credit_card',
          payment_status: 'paid'
        },
        {
          id: 4,
          order_number: 'QS1234567893',
          status: 'pending',
          total_amount: 59.99,
          items_count: 1,
          created_at: '2023-06-12T16:45:00Z',
          shipping_address: '321 Elm St, Miami, FL 33101',
          payment_method: 'cod',
          payment_status: 'pending'
        },
        {
          id: 5,
          order_number: 'QS1234567894',
          status: 'cancelled',
          total_amount: 199.99,
          items_count: 2,
          created_at: '2023-06-11T11:20:00Z',
          shipping_address: '654 Cedar Ln, Seattle, WA 98101',
          payment_method: 'credit_card',
          payment_status: 'refunded'
        }
      ];
      setOrders(mockOrders);
      setLoading(false);
    }, 1000);
  }, [user]);

  const getStatusClass = (status) => {
    switch (status) {
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'shipped': return 'bg-blue-100 text-blue-800';
      case 'processing': return 'bg-yellow-100 text-yellow-800';
      case 'pending': return 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'refunded': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'delivered':
        return <CheckCircleIcon className="h-5 w-5 text-green-600" />;
      case 'shipped':
        return <TruckIcon className="h-5 w-5 text-blue-600" />;
      case 'processing':
        return <ClockIcon className="h-5 w-5 text-yellow-600" />;
      case 'pending':
        return <ClockIcon className="h-5 w-5 text-gray-600" />;
      case 'cancelled':
        return <XCircleIcon className="h-5 w-5 text-red-600" />;
      case 'refunded':
        return <ExclamationCircleIcon className="h-5 w-5 text-purple-600" />;
      default:
        return <ClockIcon className="h-5 w-5 text-gray-600" />;
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesFilter = filter === 'all' || order.status === filter;
    const matchesSearch = order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          order.tracking_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          order.shipping_address.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <ArrowPathIcon className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="text-center py-12">
        <ShoppingCartIcon className="mx-auto h-12 w-12 text-gray-400" />
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
      <div className="sm:flex sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Order History</h1>
          <p className="mt-1 text-sm text-gray-500">Track and manage your orders</p>
        </div>
        
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
              </svg>
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search orders..."
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
          
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
          >
            <option value="all">All Orders</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="shipped">Shipped</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
            <option value="refunded">Refunded</option>
          </select>
        </div>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            {filteredOrders.length} {filteredOrders.length === 1 ? 'Order' : 'Orders'}
          </h3>
        </div>
        
        <ul className="divide-y divide-gray-200">
          {filteredOrders.map((order) => (
            <li key={order.id}>
              <div className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      {getStatusIcon(order.status)}
                    </div>
                    <div className="ml-4">
                      <div className="flex items-center">
                        <p className="text-sm font-medium text-indigo-600 truncate">
                          Order #{order.order_number}
                        </p>
                        <span className={`ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusClass(order.status)}`}>
                          {order.status.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center text-sm text-gray-500">
                        <p>
                          Placed on{' '}
                          <time dateTime={order.created_at}>
                            {new Date(order.created_at).toLocaleDateString()}
                          </time>
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-900">
                      ${order.total_amount.toFixed(2)}
                    </span>
                    <p className="text-sm text-gray-500">{order.items_count} items</p>
                  </div>
                </div>
                
                <div className="mt-4 flex items-center justify-between">
                  <div className="text-sm text-gray-500">
                    <p>Payment: <span className="capitalize">{order.payment_method.replace('_', ' ')}</span></p>
                    <p>Shipping to: {order.shipping_address}</p>
                  </div>
                  
                  {order.tracking_number && (
                    <div className="text-sm text-gray-500">
                      <p>Tracking: {order.tracking_number} ({order.tracking_carrier})</p>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="bg-gray-50 px-4 py-4 sm:px-6">
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => onDownloadInvoice && onDownloadInvoice(order.id)}
                    className="text-indigo-600 hover:text-indigo-900 text-sm font-medium flex items-center"
                  >
                    <ArrowDownTrayIcon className="h-5 w-5 mr-1" />
                    Invoice
                  </button>
                  <button
                    onClick={() => onViewOrderDetails && onViewOrderDetails(order.id)}
                    className="text-indigo-600 hover:text-indigo-900 text-sm font-medium flex items-center"
                  >
                    <EyeIcon className="h-5 w-5 mr-1" />
                    View Details
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
      
      {/* Pagination would go here in a real implementation */}
    </div>
  );
};

export default OrderHistory;