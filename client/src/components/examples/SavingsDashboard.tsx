import SavingsDashboard from '../SavingsDashboard';

export default function SavingsDashboardExample() {
  // todo: remove mock functionality
  const mockData = {
    totalSavings: 127000,
    flightCost: 200000,
    purchaseCount: 8,
    averageSavings: 15875,
    recentPurchases: [
      {
        productName: 'Nike Air Force 1 운동화',
        savings: 19000,
        date: '2024-01-15'
      },
      {
        productName: 'Uniqlo 히트텍 티셔츠',
        savings: 8000,
        date: '2024-01-14'  
      },
      {
        productName: 'Apple AirPods',
        savings: -5000,
        date: '2024-01-13'
      },
      {
        productName: '태국 전통 가방',
        savings: 25000,
        date: '2024-01-12'
      }
    ]
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <SavingsDashboard data={mockData} />
    </div>
  );
}