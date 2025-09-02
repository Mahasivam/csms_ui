import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    Zap,
    CreditCard,
    Receipt,
    Menu,
    X,
    Leaf,
    MessageCircle
} from 'lucide-react';

const Layout = ({ children }) => {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const location = useLocation();

    const navigation = [
        { name: 'Dashboard', href: '/', icon: LayoutDashboard },
        { name: 'Charging Stations', href: '/charging-stations', icon: Zap },
        { name: 'Transactions', href: '/transactions', icon: Receipt },
        { name: 'ID Tags', href: '/id-tags', icon: CreditCard },
        { name: 'OCPP Test', href: '/ocpp-test', icon: MessageCircle },
    ];

    const isActive = (path) => location.pathname === path;

    return (
        <div className="h-screen bg-gray-100">
            {/* Mobile sidebar */}
            <div className={`fixed inset-0 z-50 flex lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
                <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)}></div>
                <div className="relative flex w-full max-w-xs flex-1 flex-col bg-primary-900">
                    <div className="absolute top-0 right-0 -mr-12 pt-2">
                        <button
                            type="button"
                            className="ml-1 flex h-10 w-10 items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                            onClick={() => setSidebarOpen(false)}
                        >
                            <X className="h-6 w-6 text-white" />
                        </button>
                    </div>
                    <div className="flex flex-shrink-0 items-center gap-x-2 px-4 py-6">
                        <Leaf className="h-8 w-8 text-primary-400" />
                        <h1 className="text-xl font-bold text-white">SmartCharge</h1>
                    </div>
                    <nav className="mt-5 flex-1 space-y-1 px-2">
                        {navigation.map((item) => (
                            <Link
                                key={item.name}
                                to={item.href}
                                className={`${isActive(item.href)
                                        ? 'bg-primary-800 text-white'
                                        : 'text-primary-100 hover:bg-primary-800 hover:text-white'
                                    } group flex items-center rounded-md px-2 py-2 text-base font-medium transition-colors duration-150`}
                                onClick={() => setSidebarOpen(false)}
                            >
                                <item.icon className={`mr-4 h-6 w-6 flex-shrink-0 ${isActive(item.href) ? 'text-primary-300' : 'text-primary-400 group-hover:text-primary-300'}`} />
                                {item.name}
                            </Link>
                        ))}
                    </nav>
                </div>
            </div>

            {/* Desktop sidebar */}
            <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
                <div className="flex min-h-0 flex-1 flex-col bg-primary-900">
                    <div className="flex flex-1 flex-col overflow-y-auto pt-5 pb-4">
                        <div className="flex flex-shrink-0 items-center gap-x-3 px-4">
                            <Leaf className="h-8 w-8 text-primary-400" />
                            <h1 className="text-xl font-bold text-white">SmartCharge</h1>
                        </div>
                        <nav className="mt-8 flex-1 space-y-2 px-2">
                            {navigation.map((item) => (
                                <Link
                                    key={item.name}
                                    to={item.href}
                                    className={`${isActive(item.href)
                                            ? 'bg-primary-800 text-white'
                                            : 'text-primary-100 hover:bg-primary-800 hover:text-white'
                                        } group flex items-center rounded-md px-2 py-2 text-sm font-medium transition-colors duration-150`}
                                >
                                    <item.icon className={`mr-3 h-6 w-6 flex-shrink-0 ${isActive(item.href) ? 'text-primary-300' : 'text-primary-400 group-hover:text-primary-300'}`} />
                                    {item.name}
                                </Link>
                            ))}
                        </nav>
                    </div>
                </div>
            </div>

            <div className="flex flex-1 flex-col lg:pl-64">
                <div className="sticky top-0 z-10 flex h-16 flex-shrink-0 border-b border-gray-200 bg-white lg:hidden">
                    <button
                        type="button"
                        className="border-r border-gray-200 px-4 text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500 lg:hidden"
                        onClick={() => setSidebarOpen(true)}
                    >
                        <Menu className="h-6 w-6" />
                    </button>
                </div>
                <main className="flex-1">
                    <div className="p-4 sm:p-6 lg:p-8">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default Layout;
