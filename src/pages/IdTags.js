import React, { useState, useEffect } from 'react';
import { CreditCard, Plus, Edit, Trash2, Check, X } from 'lucide-react';
import { idTagAPI } from '../services/api';

const IdTags = () => {
    const [idTags, setIdTags] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [newIdTag, setNewIdTag] = useState({
        idTag: '',
        status: 'Accepted',
        expiryDate: ''
    });

    useEffect(() => {
        fetchIdTags();
    }, []);

    const fetchIdTags = async () => {
        try {
            const response = await idTagAPI.getAll();
            setIdTags(response.data);
        } catch (error) {
            console.error('Error fetching ID tags:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddIdTag = async () => {
        try {
            await idTagAPI.create({
                ...newIdTag,
                expiryDate: newIdTag.expiryDate || null
            });
            setNewIdTag({ idTag: '', status: 'Accepted', expiryDate: '' });
            setShowAddModal(false);
            fetchIdTags();
        } catch (error) {
            alert('Error creating ID tag');
        }
    };

    const handleDeleteIdTag = async (idTag) => {
        if (!confirm(`Are you sure you want to delete ID tag ${idTag}?`)) return;

        try {
            await idTagAPI.delete(idTag);
            fetchIdTags();
        } catch (error) {
            alert('Error deleting ID tag');
        }
    };

    const handleToggleStatus = async (tag) => {
        const newStatus = tag.status === 'Accepted' ? 'Blocked' : 'Accepted';
        try {
            await idTagAPI.update(tag.idTag, { ...tag, status: newStatus });
            fetchIdTags();
        } catch (error) {
            alert('Error updating ID tag status');
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'Accepted': return 'text-success-600 bg-success-100';
            case 'Blocked': return 'text-danger-600 bg-danger-100';
            case 'Expired': return 'text-warning-600 bg-warning-100';
            default: return 'text-gray-600 bg-gray-100';
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    return (
        <div className="px-4 sm:px-6 lg:px-8">
            <div className="sm:flex sm:items-center mb-8">
                <div className="sm:flex-auto">
                    <h1 className="text-2xl font-bold leading-7 text-gray-900">ID Tags</h1>
                    <p className="mt-1 text-sm text-gray-500">
                        Manage RFID cards and authorization tags
                    </p>
                </div>
                <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="inline-flex items-center justify-center rounded-md border border-transparent bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        Add ID Tag
                    </button>
                </div>
            </div>

            <div className="bg-white shadow overflow-hidden sm:rounded-md">
                <ul role="list" className="divide-y divide-gray-200">
                    {idTags.length === 0 ? (
                        <li className="px-6 py-8 text-center">
                            <CreditCard className="mx-auto h-12 w-12 text-gray-400" />
                            <h3 className="mt-2 text-sm font-medium text-gray-900">No ID tags</h3>
                            <p className="mt-1 text-sm text-gray-500">
                                Add your first RFID card to get started.
                            </p>
                        </li>
                    ) : (
                        idTags.map((tag) => (
                            <li key={tag.id} className="px-6 py-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center">
                                        <div className="flex-shrink-0">
                                            <CreditCard className="h-5 w-5 text-gray-400" />
                                        </div>
                                        <div className="ml-4">
                                            <div className="flex items-center">
                                                <p className="text-sm font-medium text-gray-900">
                                                    {tag.idTag}
                                                </p>
                                                <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(tag.status)}`}>
                          {tag.status}
                        </span>
                                            </div>
                                            <p className="text-sm text-gray-500">
                                                {tag.expiryDate
                                                    ? `Expires: ${new Date(tag.expiryDate).toLocaleDateString()}`
                                                    : 'No expiry date'
                                                }
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <button
                                            onClick={() => handleToggleStatus(tag)}
                                            className={`inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded ${
                                                tag.status === 'Accepted'
                                                    ? 'text-danger-700 bg-danger-100 hover:bg-danger-200'
                                                    : 'text-success-700 bg-success-100 hover:bg-success-200'
                                            } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500`}
                                        >
                                            {tag.status === 'Accepted' ? (
                                                <>
                                                    <X className="h-3 w-3 mr-1" />
                                                    Block
                                                </>
                                            ) : (
                                                <>
                                                    <Check className="h-3 w-3 mr-1" />
                                                    Activate
                                                </>
                                            )}
                                        </button>
                                        <button
                                            onClick={() => handleDeleteIdTag(tag.idTag)}
                                            className="inline-flex items-center px-3 py-1 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                                        >
                                            <Trash2 className="h-3 w-3 mr-1" />
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            </li>
                        ))
                    )}
                </ul>
            </div>

            {/* Add ID Tag Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                        <div className="fixed inset-0 transition-opacity">
                            <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={() => setShowAddModal(false)}></div>
                        </div>
                        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                                    Add New ID Tag
                                </h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">ID Tag</label>
                                        <input
                                            type="text"
                                            value={newIdTag.idTag}
                                            onChange={(e) => setNewIdTag({ ...newIdTag, idTag: e.target.value })}
                                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                                            placeholder="e.g., 04E91C5A123456"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Status</label>
                                        <select
                                            value={newIdTag.status}
                                            onChange={(e) => setNewIdTag({ ...newIdTag, status: e.target.value })}
                                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                                        >
                                            <option value="Accepted">Accepted</option>
                                            <option value="Blocked">Blocked</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Expiry Date (optional)</label>
                                        <input
                                            type="datetime-local"
                                            value={newIdTag.expiryDate}
                                            onChange={(e) => setNewIdTag({ ...newIdTag, expiryDate: e.target.value })}
                                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                                <button
                                    onClick={handleAddIdTag}
                                    disabled={!newIdTag.idTag}
                                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary-600 text-base font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                                >
                                    Add ID Tag
                                </button>
                                <button
                                    onClick={() => setShowAddModal(false)}
                                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default IdTags;
