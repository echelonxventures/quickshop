// UserProfile Component
import React, { useState, useEffect } from 'react';
import { 
  UserCircleIcon, 
  IdentificationIcon, 
  BuildingOfficeIcon,
  CreditCardIcon,
  ShoppingCartIcon,
  DocumentTextIcon,
  CogIcon,
  ShieldCheckIcon,
  ArrowPathIcon,
  PencilIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';

const UserProfile = ({ user, onUpdateProfile, onLogout }) => {
  const [activeTab, setActiveTab] = useState('profile');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    bio: '',
    address_line_1: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'US'
  });
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [addresses, setAddresses] = useState([]);

  useEffect(() => {
    if (user) {
      setFormData({
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
      setLoading(false);
    }
    
    // Fetch user's orders
    fetchUserOrders();
    // Fetch user's addresses
    fetchUserAddresses();
  }, [user]);

  const fetchUserOrders = async () => {
    try {
      // Simulate API call
      const mockOrders = [
        { id: 1, order_number: 'QS1234567890', total: 129.99, status: 'delivered', date: '2023-06-15' },
        { id: 2, order_number: 'QS1234567891', total: 89.99, status: 'shipped', date: '2023-06-14' },
        { id: 3, order_number: 'QS1234567892', total: 249.99, status: 'processing', date: '2023-06-13' },
        { id: 4, order_number: 'QS1234567893', total: 59.99, status: 'pending', date: '2023-06-12' },
      ];
      setOrders(mockOrders);
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  };

  const fetchUserAddresses = async () => {
    try {
      // Simulate API call
      const mockAddresses = [
        { 
          id: 1, 
          type: 'shipping', 
          address: '123 Main St, City, State 12345', 
          is_default: true 
        },
        { 
          id: 2, 
          type: 'billing', 
          address: '456 Oak Ave, Another City, State 67890', 
          is_default: false 
        },
      ];
      setAddresses(mockAddresses);
    } catch (error) {
      console.error('Error fetching addresses:', error);
    }
  };

  const handleUpdateProfile = (data) => {
    // In a real implementation, this would call an API to update the profile
    console.log('Updating profile:', data);
    onUpdateProfile(data);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <ArrowPathIcon className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="lg:grid lg:grid-cols-12 lg:gap-x-12">
        {/* Sidebar */}
        <div className="lg:col-span-3">
          <nav className="space-y-1">
            {[
              { name: 'Profile', icon: UserCircleIcon, id: 'profile' },
              { name: 'Account', icon: IdentificationIcon, id: 'account' },
              { name: 'Addresses', icon: BuildingOfficeIcon, id: 'addresses' },
              { name: 'Orders', icon: ShoppingCartIcon, id: 'orders' },
              { name: 'Payment Methods', icon: CreditCardIcon, id: 'payments' },
              { name: 'Wishlist', icon: HeartIcon, id: 'wishlist' },
              { name: 'Settings', icon: CogIcon, id: 'settings' },
              { name: 'Security', icon: ShieldCheckIcon, id: 'security' }
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`${
                  activeTab === item.id
                    ? 'bg-indigo-50 text-indigo-700 hover:bg-indigo-50'
                    : 'text-gray-900 hover:bg-gray-50'
                } group flex items-center px-3 py-2 text-sm font-medium rounded-md w-full text-left`}
              >
                <item.icon
                  className={`${
                    activeTab === item.id ? 'text-indigo-500' : 'text-gray-400 group-hover:text-gray-500'
                  } mr-3 h-6 w-6 flex-shrink-0`}
                />
                <span className="truncate">{item.name}</span>
              </button>
            ))}
            
            <div className="mt-8 pt-8 border-t border-gray-200">
              <button
                onClick={onLogout}
                className="flex items-center px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 w-full text-left rounded-md"
              >
                <ArrowRightOnRectangleIcon className="mr-3 h-6 w-6 text-red-400" />
                Logout
              </button>
            </div>
          </nav>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-9">
          <div className="bg-white shadow sm:rounded-lg">
            {activeTab === 'profile' && (
              <div className="px-4 py-6 sm:p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Profile Information</h2>
                
                <div className="flex items-center mb-6">
                  <div className="h-20 w-20 rounded-full bg-indigo-100 flex items-center justify-center">
                    <UserCircleIcon className="h-10 w-10 text-indigo-600" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-medium text-gray-900">{user.name}</h3>
                    <p className="text-sm text-gray-500">{user.email}</p>
                    <p className="text-sm text-gray-500">
                      Member since {new Date(user.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                
                <form onSubmit={(e) => { e.preventDefault(); handleUpdateProfile(formData); }}>
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
                        onChange={handleInputChange}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
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
                        onChange={handleInputChange}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
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
                        onChange={handleInputChange}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
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
                        onChange={handleInputChange}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      />
                    </div>
                    
                    <div className="sm:col-span-6">
                      <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                        Address
                      </label>
                      <input
                        type="text"
                        id="address"
                        name="address_line_1"
                        value={formData.address_line_1}
                        onChange={handleInputChange}
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
                        name="city"
                        value={formData.city}
                        onChange={handleInputChange}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
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
                        onChange={handleInputChange}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      />
                    </div>
                    
                    <div className="sm:col-span-2">
                      <label htmlFor="postal-code" className="block text-sm font-medium text-gray-700">
                        ZIP / Postal code
                      </label>
                      <input
                        type="text"
                        id="postal-code"
                        name="postal_code"
                        value={formData.postal_code}
                        onChange={handleInputChange}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      />
                    </div>
                  </div>
                  
                  <div className="mt-6">
                    <button
                      type="submit"
                      className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      Save Changes
                    </button>
                  </div>
                </form>
              </div>
            )}
            
            {activeTab === 'orders' && (
              <div className="px-4 py-6 sm:p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Order History</h2>
                
                <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                  <table className="min-w-full divide-y divide-gray-300">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                          Order
                        </th>
                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                          Date
                        </th>
                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                          Status
                        </th>
                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                          Total
                        </th>
                        <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                          <span className="sr-only">Actions</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {orders.map((order) => (
                        <tr key={order.id}>
                          <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                            #{order.order_number}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {new Date(order.date).toLocaleDateString()}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            <span className={`inline-flex px-2 text-xs leading-5 font-semibold rounded-full ${
                              order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                              order.status === 'shipped' ? 'bg-blue-100 text-blue-800' :
                              order.status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            ${order.total}
                          </td>
                          <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                            <Link to={`/order/${order.id}`} className="text-indigo-600 hover:text-indigo-900">
                              View
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            
            {activeTab === 'addresses' && (
              <div className="px-4 py-6 sm:p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Manage Addresses</h2>
                
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {addresses.map((address) => (
                    <div key={address.id} className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{address.type}</p>
                          <p className="mt-1 text-sm text-gray-500">{address.address}</p>
                          {address.is_default && (
                            <span className="inline-block mt-2 px-2 py-1 text-xs font-medium bg-indigo-100 text-indigo-800 rounded-full">
                              Default
                            </span>
                          )}
                        </div>
                        <div className="flex space-x-2">
                          <button className="text-indigo-600 hover:text-indigo-900">
                            <PencilIcon className="h-5 w-5" />
                          </button>
                          <button className="text-red-600 hover:text-red-900">
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                <button className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                  <PlusIcon className="h-5 w-5 mr-2" />
                  Add New Address
                </button>
              </div>
            )}
            
            {activeTab === 'settings' && (
              <div className="px-4 py-6 sm:p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Account Settings</h2>
                
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">Email notifications</h3>
                      <p className="text-sm text-gray-500">Receive order updates and promotional emails</p>
                    </div>
                    <Switch
                      checked={user.email_notifications}
                      onChange={toggleEmailNotifications}
                      className={`${
                        user.email_notifications ? 'bg-indigo-600' : 'bg-gray-200'
                      } relative inline-flex h-6 w-11 items-center rounded-full`}
                    >
                      <span
                        className={`${
                          user.email_notifications ? 'translate-x-6' : 'translate-x-1'
                        } inline-block h-4 w-4 transform rounded-full bg-white transition`}
                      />
                    </Switch>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">SMS notifications</h3>
                      <p className="text-sm text-gray-500">Receive order updates via SMS</p>
                    </div>
                    <Switch
                      checked={user.sms_notifications}
                      onChange={toggleSmsNotifications}
                      className={`${
                        user.sms_notifications ? 'bg-indigo-600' : 'bg-gray-200'
                      } relative inline-flex h-6 w-11 items-center rounded-full`}
                    >
                      <span
                        className={`${
                          user.sms_notifications ? 'translate-x-6' : 'translate-x-1'
                        } inline-block h-4 w-4 transform rounded-full bg-white transition`}
                      />
                    </Switch>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">Newsletter</h3>
                      <p className="text-sm text-gray-500">Receive marketing newsletters</p>
                    </div>
                    <Switch
                      checked={user.newsletter_subscribed}
                      onChange={toggleNewsletter}
                      className={`${
                        user.newsletter_subscribed ? 'bg-indigo-600' : 'bg-gray-200'
                      } relative inline-flex h-6 w-11 items-center rounded-full`}
                    >
                      <span
                        className={`${
                          user.newsletter_subscribed ? 'translate-x-6' : 'translate-x-1'
                        } inline-block h-4 w-4 transform rounded-full bg-white transition`}
                      />
                    </Switch>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;