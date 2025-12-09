import BottomNavigation from '../BottomNavigation';
import { useState } from 'react';

export default function BottomNavigationExample() {
  const [activeTab, setActiveTab] = useState('home');

  return (
    <div className="min-h-screen bg-background relative">
      <div className="p-4 pb-20">
        <h1 className="text-2xl font-bold mb-4">Navigation Test</h1>
        <p className="text-muted-foreground">
          Current tab: <span className="font-semibold text-foreground">{activeTab}</span>
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          Try clicking the navigation buttons below
        </p>
      </div>
      
      <BottomNavigation
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onCameraClick={() => console.log('Camera clicked')}
      />
    </div>
  );
}