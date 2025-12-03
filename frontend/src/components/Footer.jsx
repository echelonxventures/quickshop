import React from 'react';
import { Link } from 'react-router-dom';
import { 
  FacebookIcon, 
  TwitterIcon, 
  InstagramIcon, 
  YoutubeIcon 
} from 'react-social-icons';

export const Footer = () => {
  return (
    <footer className="bg-gray-800 text-white">
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Company Info */}
          <div>
            <h3 className="text-lg font-semibold mb-4">QuickShop</h3>
            <p className="text-gray-300 text-sm">
              Your one-stop destination for all your shopping needs. Quality products at competitive prices.
            </p>
            <div className="flex space-x-4 mt-4">
              <a href="#" className="text-gray-300 hover:text-white">
                <FacebookIcon url="https://facebook.com" />
              </a>
              <a href="#" className="text-gray-300 hover:text-white">
                <TwitterIcon url="https://twitter.com" />
              </a>
              <a href="#" className="text-gray-300 hover:text-white">
                <InstagramIcon url="https://instagram.com" />
              </a>
              <a href="#" className="text-gray-300 hover:text-white">
                <YoutubeIcon url="https://youtube.com" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li><Link to="/" className="text-gray-300 hover:text-white">Home</Link></li>
              <li><Link to="/products" className="text-gray-300 hover:text-white">Products</Link></li>
              <li><Link to="/categories" className="text-gray-300 hover:text-white">Categories</Link></li>
              <li><Link to="/about" className="text-gray-300 hover:text-white">About Us</Link></li>
              <li><Link to="/contact" className="text-gray-300 hover:text-white">Contact</Link></li>
            </ul>
          </div>

          {/* Customer Service */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Customer Service</h3>
            <ul className="space-y-2">
              <li><Link to="/help" className="text-gray-300 hover:text-white">Help Center</Link></li>
              <li><Link to="/shipping" className="text-gray-300 hover:text-white">Shipping Info</Link></li>
              <li><Link to="/returns" className="text-gray-300 hover:text-white">Returns</Link></li>
              <li><Link to="/faq" className="text-gray-300 hover:text-white">FAQ</Link></li>
              <li><Link to="/support" className="text-gray-300 hover:text-white">Live Support</Link></li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Contact Us</h3>
            <ul className="space-y-2 text-gray-300 text-sm">
              <li className="flex items-start">
                <span className="mr-2">📍</span>
                <span>123 Commerce Street, Business District, CA 90210</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">📞</span>
                <span>+1 (555) 123-4567</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">✉️</span>
                <span>support@quickshop.echelonxventures.org</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">🕒</span>
                <span>Mon-Fri: 9AM - 6PM</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-700 mt-8 pt-8 text-center text-sm text-gray-300">
          <p>&copy; {new Date().getFullYear()} QuickShop. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;