// Equipment recommendations based on savings and service opportunities

export const EQUIPMENT_CATALOG = [
  {
    id: 'dehumidifier',
    name: 'Commercial Dehumidifier',
    price: 350,
    category: 'extraction',
    image: '/equipment/dehumidifier.jpg',
    affiliateUrl: 'https://amazon.com/dp/B08XXX', // Replace with actual
    services: [
      {
        name: 'Hot Water Extraction',
        suggestedRate: 75,
        avgJobsPerMonth: 4,
        description: 'Deep carpet and upholstery cleaning',
      },
    ],
    roiWeeks: null, // Calculated dynamically
  },
  {
    id: 'polisher',
    name: 'DA Polisher Kit',
    price: 450,
    category: 'exterior',
    image: '/equipment/polisher.jpg',
    affiliateUrl: 'https://amazon.com/dp/B08XXX',
    services: [
      {
        name: 'Paint Correction',
        suggestedRate: 125,
        avgJobsPerMonth: 3,
        description: 'Remove swirls, scratches, oxidation',
      },
    ],
  },
  {
    id: 'steam-cleaner',
    name: 'Commercial Steam Cleaner',
    price: 500,
    category: 'interior',
    image: '/equipment/steamer.jpg',
    affiliateUrl: 'https://amazon.com/dp/B08XXX',
    services: [
      {
        name: 'Steam Sanitization',
        suggestedRate: 65,
        avgJobsPerMonth: 5,
        description: 'Chemical-free deep sanitization',
      },
    ],
  },
  {
    id: 'ceramic-kit',
    name: 'Ceramic Coating Pro Kit',
    price: 600,
    category: 'exterior',
    image: '/equipment/ceramic.jpg',
    affiliateUrl: 'https://amazon.com/dp/B08XXX',
    services: [
      {
        name: 'Ceramic Coating',
        suggestedRate: 200,
        avgJobsPerMonth: 2,
        description: 'Long-lasting paint protection',
      },
    ],
  },
  {
    id: 'ozone-generator',
    name: 'Ozone Generator',
    price: 275,
    category: 'interior',
    image: '/equipment/ozone.jpg',
    affiliateUrl: 'https://amazon.com/dp/B08XXX',
    services: [
      {
        name: 'Odor Elimination',
        suggestedRate: 85,
        avgJobsPerMonth: 3,
        description: 'Remove smoke, pet, mold odors',
      },
    ],
  },
  {
    id: 'pressure-washer',
    name: 'Electric Pressure Washer',
    price: 400,
    category: 'exterior',
    image: '/equipment/pressure-washer.jpg',
    affiliateUrl: 'https://amazon.com/dp/B08XXX',
    services: [
      {
        name: 'Engine Bay Detail',
        suggestedRate: 95,
        avgJobsPerMonth: 4,
        description: 'Complete engine cleaning',
      },
    ],
  },
];

// Calculate ROI for equipment
export function calculateEquipmentROI(equipment) {
  const monthlyRevenue = equipment.services.reduce((sum, svc) => {
    return sum + (svc.suggestedRate * svc.avgJobsPerMonth);
  }, 0);

  const weeksToPayoff = Math.ceil((equipment.price / monthlyRevenue) * 4.33);
  const yearlyRevenue = monthlyRevenue * 12;
  const yearlyProfit = yearlyRevenue - equipment.price;

  return {
    monthlyRevenue,
    weeksToPayoff,
    yearlyRevenue,
    yearlyProfit,
    roiPercent: Math.round((yearlyProfit / equipment.price) * 100),
  };
}

// Get equipment recommendations based on monthly savings
export function getEquipmentRecommendations(monthlySavings, existingServices = []) {
  const existingServiceNames = existingServices.map(s => s.service_name?.toLowerCase() || '');

  return EQUIPMENT_CATALOG
    .filter(equip => {
      // Filter out equipment for services they already have
      const hasService = equip.services.some(svc =>
        existingServiceNames.some(existing =>
          existing.includes(svc.name.toLowerCase().split(' ')[0])
        )
      );
      return !hasService;
    })
    .map(equip => {
      const roi = calculateEquipmentROI(equip);
      const monthsToAfford = Math.ceil(equip.price / monthlySavings);

      return {
        ...equip,
        roi,
        monthsToAfford,
        affordableWithSavings: monthlySavings >= equip.price / 3, // Can afford in ~3 months
        savingsMessage: monthsToAfford <= 1
          ? `Your savings cover this in 1 month!`
          : monthsToAfford <= 3
            ? `Affordable in ${monthsToAfford} months of savings`
            : `Save for ${monthsToAfford} months`,
      };
    })
    .sort((a, b) => {
      // Sort by: affordability first, then ROI
      if (a.affordableWithSavings !== b.affordableWithSavings) {
        return a.affordableWithSavings ? -1 : 1;
      }
      return a.roi.weeksToPayoff - b.roi.weeksToPayoff;
    });
}

// Get the best single recommendation for upgrade modal
export function getBestEquipmentRecommendation(monthlySavings, existingServices = []) {
  const recommendations = getEquipmentRecommendations(monthlySavings, existingServices);
  return recommendations[0] || null;
}

// Format ROI message for display
export function formatROIMessage(equipment) {
  const roi = calculateEquipmentROI(equipment);
  const service = equipment.services[0];

  return {
    headline: `Add "${service.name}" service`,
    earnings: `+$${service.suggestedRate}/job × ${service.avgJobsPerMonth} jobs = +$${roi.monthlyRevenue}/month`,
    payoff: `Equipment pays for itself in ${roi.weeksToPayoff} weeks`,
    yearly: `$${roi.yearlyProfit.toLocaleString()} profit in first year`,
  };
}
