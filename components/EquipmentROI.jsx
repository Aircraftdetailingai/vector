"use client";
import { useState, useEffect } from 'react';
import {
  getBestEquipmentRecommendation,
  getEquipmentRecommendations,
  formatROIMessage,
} from '@/lib/equipment-recommendations';

// Compact recommendation for upgrade modal
export function EquipmentTeaser({ monthlySavings, existingServices = [] }) {
  const recommendation = getBestEquipmentRecommendation(monthlySavings, existingServices);

  if (!recommendation || monthlySavings < 20) return null;

  const roi = formatROIMessage(recommendation);

  return (
    <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
      <div className="flex items-start space-x-3">
        <span className="text-2xl">💡</span>
        <div className="flex-1">
          <p className="text-sm text-blue-800 font-medium">
            Your savings can buy a {recommendation.name} in {recommendation.monthsToAfford} month{recommendation.monthsToAfford > 1 ? 's' : ''}!
          </p>
          <p className="text-xs text-blue-600 mt-1">
            {roi.headline} → {roi.earnings}
          </p>
          <p className="text-xs text-green-600 font-medium mt-1">
            ROI: {roi.payoff}
          </p>
        </div>
      </div>
    </div>
  );
}

// Full equipment recommendation card
export function EquipmentCard({ equipment, onAddService }) {
  const roi = formatROIMessage(equipment);
  const service = equipment.services[0];

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-500 to-amber-600 p-4 text-white">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-bold text-lg">{equipment.name}</h3>
            <p className="text-amber-100 text-sm">${equipment.price}</p>
          </div>
          <span className="bg-white/20 px-2 py-1 rounded text-xs font-medium">
            {equipment.roi.weeksToPayoff} week ROI
          </span>
        </div>
      </div>

      {/* ROI Flow */}
      <div className="p-4 space-y-3">
        {/* Step 1: Buy equipment */}
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 font-bold text-sm">
            1
          </div>
          <div>
            <p className="font-medium text-gray-900">Buy {equipment.name}</p>
            <p className="text-sm text-gray-500">{equipment.savingsMessage}</p>
          </div>
        </div>

        <div className="ml-4 border-l-2 border-gray-200 h-4"></div>

        {/* Step 2: Add service */}
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm">
            2
          </div>
          <div>
            <p className="font-medium text-gray-900">{roi.headline}</p>
            <p className="text-sm text-gray-500">{service.description}</p>
          </div>
        </div>

        <div className="ml-4 border-l-2 border-gray-200 h-4"></div>

        {/* Step 3: Earnings */}
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600 font-bold text-sm">
            3
          </div>
          <div>
            <p className="font-medium text-green-700">{roi.earnings}</p>
            <p className="text-sm text-gray-500">NEW REVENUE</p>
          </div>
        </div>

        {/* ROI Summary */}
        <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
          <div className="flex justify-between items-center">
            <span className="text-green-800 font-medium">ROI</span>
            <span className="text-green-700 font-bold">{roi.payoff}</span>
          </div>
          <p className="text-green-600 text-sm mt-1">{roi.yearly}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="p-4 bg-gray-50 border-t space-y-2">
        <a
          href={equipment.affiliateUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full py-2 px-4 bg-amber-500 text-white text-center rounded-lg font-medium hover:bg-amber-600"
        >
          Buy on Amazon →
        </a>
        {onAddService && (
          <button
            onClick={() => onAddService(service)}
            className="block w-full py-2 px-4 border border-gray-300 text-gray-700 text-center rounded-lg font-medium hover:bg-gray-100"
          >
            Add "{service.name}" Service
          </button>
        )}
      </div>
    </div>
  );
}

// Full equipment recommendations page/modal
export default function EquipmentROI({ monthlySavings = 0, existingServices = [], onAddService }) {
  const [recommendations, setRecommendations] = useState([]);

  useEffect(() => {
    const recs = getEquipmentRecommendations(monthlySavings, existingServices);
    setRecommendations(recs.slice(0, 3)); // Top 3
  }, [monthlySavings, existingServices]);

  if (recommendations.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No equipment recommendations available.</p>
        <p className="text-sm mt-1">You may already offer all suggested services!</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900">Grow Your Revenue</h2>
        <p className="text-gray-600 mt-1">
          Turn your ${monthlySavings.toFixed(0)}/month savings into new income streams
        </p>
      </div>

      {/* Recommendations Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {recommendations.map((equip) => (
          <EquipmentCard
            key={equip.id}
            equipment={equip}
            onAddService={onAddService}
          />
        ))}
      </div>

      {/* Savings Calculator Teaser */}
      {monthlySavings > 0 && (
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl p-6 text-white text-center">
          <p className="text-indigo-100 text-sm uppercase tracking-wide">With your savings</p>
          <p className="text-3xl font-bold mt-1">
            ${(monthlySavings * 12).toFixed(0)}/year
          </p>
          <p className="text-indigo-200 mt-2">
            That's enough to buy {Math.floor((monthlySavings * 12) / 400)} pieces of equipment!
          </p>
        </div>
      )}
    </div>
  );
}
