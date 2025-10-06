'use client';

import { useState, useEffect } from 'react';
import { db, Dish, Country, FoodCategory } from '@/lib/database';
import { cloudinaryService } from '@/lib/cloudinary';
import Image from 'next/image';

export default function AdminPanel() {
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [categories, setCategories] = useState<FoodCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDish, setSelectedDish] = useState<Dish | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [dishesData, countriesData, categoriesData] = await Promise.all([
        fetch('/api/dishes').then(res => res.json()),
        fetch('/api/countries').then(res => res.json()),
        fetch('/api/categories').then(res => res.json())
      ]);

      if (dishesData.success) setDishes(dishesData.data);
      if (countriesData.success) setCountries(countriesData.data);
      if (categoriesData.success) setCategories(categoriesData.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (files: FileList, dishId: string, dishName: string, countryName: string) => {
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const formData = new FormData();
      Array.from(files).forEach(file => formData.append('images', file));
      formData.append('dishName', dishName);
      formData.append('countryName', countryName);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      
      if (result.success) {
        // Add images to database
        const imageData = result.data.map((img: any, index: number) => ({
          dish_id: dishId,
          cloudinary_public_id: img.public_id,
          cloudinary_url: img.url,
          image_order: index + 1,
          alt_text: img.alt_text,
          width: img.width,
          height: img.height,
          format: img.format,
        }));

        await fetch(`/api/dishes/${dishId}/images`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ images: imageData }),
        });

        alert('Images uploaded successfully!');
        loadData(); // Refresh data
      } else {
        alert('Failed to upload images');
      }
    } catch (error) {
      console.error('Error uploading images:', error);
      alert('Error uploading images');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDish = async (dishId: string) => {
    if (!confirm('Are you sure you want to delete this dish?')) return;

    try {
      const response = await fetch(`/api/dishes/${dishId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setDishes(dishes.filter(dish => dish.id !== dishId));
        alert('Dish deleted successfully');
      } else {
        alert('Failed to delete dish');
      }
    } catch (error) {
      console.error('Error deleting dish:', error);
      alert('Error deleting dish');
    }
  };

  const toggleDishActive = async (dish: Dish) => {
    try {
      const response = await fetch(`/api/dishes/${dish.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !dish.is_active })
      });

      if (response.ok) {
        setDishes(dishes.map(d => 
          d.id === dish.id ? { ...d, is_active: !d.is_active } : d
        ));
      } else {
        alert('Failed to update dish');
      }
    } catch (error) {
      console.error('Error updating dish:', error);
      alert('Error updating dish');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-lg">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-3xl font-bold text-gray-900">🍽️ Food Database Admin (Cloudinary)</h1>
              <button
                onClick={() => setShowAddForm(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium"
              >
                Add New Dish
              </button>
            </div>

            {/* Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-blue-600">Total Dishes</h3>
                <p className="text-2xl font-bold text-blue-900">{dishes.length}</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-green-600">Active Dishes</h3>
                <p className="text-2xl font-bold text-green-900">
                  {dishes.filter(d => d.is_active).length}
                </p>
              </div>
              <div className="bg-yellow-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-yellow-600">Countries</h3>
                <p className="text-2xl font-bold text-yellow-900">{countries.length}</p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-purple-600">Categories</h3>
                <p className="text-2xl font-bold text-purple-900">{categories.length}</p>
              </div>
            </div>

            {/* Dishes Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Dish
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Country
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Difficulty
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Images
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {dishes.map((dish) => (
                    <tr key={dish.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {dish.name}
                          </div>
                          <div className="text-sm text-gray-500 truncate max-w-xs">
                            {dish.description}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {dish.country?.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          Level {dish.difficulty_level}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          dish.is_active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {dish.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex space-x-2">
                          {dish.images?.slice(0, 3).map((img, index) => (
                            <div key={index} className="relative w-12 h-12">
                              <Image
                                src={img.cloudinary_url}
                                alt={img.alt_text || `${dish.name} ${index + 1}`}
                                fill
                                className="object-cover rounded"
                              />
                            </div>
                          ))}
                          <span className="text-xs text-gray-500">
                            {dish.images?.length || 0} total
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <label className="cursor-pointer">
                            <input
                              type="file"
                              multiple
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                if (e.target.files) {
                                  handleImageUpload(e.target.files, dish.id, dish.name, dish.country?.name || '');
                                }
                              }}
                            />
                            <span className="text-blue-600 hover:text-blue-900">
                              {uploading ? 'Uploading...' : 'Upload Images'}
                            </span>
                          </label>
                          <button
                            onClick={() => setSelectedDish(dish)}
                            className="text-green-600 hover:text-green-900"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => toggleDishActive(dish)}
                            className={`${
                              dish.is_active 
                                ? 'text-yellow-600 hover:text-yellow-900' 
                                : 'text-green-600 hover:text-green-900'
                            }`}
                          >
                            {dish.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                          <button
                            onClick={() => handleDeleteDish(dish.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
