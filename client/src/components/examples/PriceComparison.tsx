import PriceComparison from '../PriceComparison';

export default function PriceComparisonExample() {
  // todo: remove mock functionality
  const mockData = {
    localPrice: 1200,
    localCurrency: '฿',
    koreanPrice: 65000,
    savingsAmount: 19000,
    productName: 'Nike Air Force 1 운동화',
    imageUrl: "data:image/svg+xml,%3csvg width='64' height='64' xmlns='http://www.w3.org/2000/svg'%3e%3crect width='100%25' height='100%25' fill='%23ff6b35'/%3e%3ctext x='50%25' y='50%25' font-size='24' text-anchor='middle' dy='.3em'%3e👟%3c/text%3e%3c/svg%3e",
    comparisonSource: '네이버 쇼핑'
  };

  return (
    <div className="min-h-screen bg-background p-4 flex items-center justify-center">
      <PriceComparison
        data={mockData}
        onPurchase={() => console.log('Purchase confirmed')}
        onViewSource={() => console.log('View source clicked')}
      />
    </div>
  );
}