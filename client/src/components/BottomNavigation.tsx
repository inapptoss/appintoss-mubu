import { Camera, Home, BarChart3, User } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BottomNavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onCameraClick: () => void;
}

export default function BottomNavigation({ activeTab, onTabChange, onCameraClick }: BottomNavigationProps) {
  const tabs = [
    { id: 'home', label: '홈', icon: Home },
    { id: 'camera', label: '촬영', icon: Camera, isCamera: true },
    { id: 'dashboard', label: '절약', icon: BarChart3 },
    { id: 'profile', label: '프로필', icon: User },
  ];

  return (
    <nav className="fixed bottom-6 left-6 right-6 bg-background/90 backdrop-blur-xl border rounded-3xl px-6 py-4 shadow-lg z-40">
      <div className="grid grid-cols-4 gap-4">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          if (tab.isCamera) {
            return (
              <button
                key={tab.id}
                onClick={onCameraClick}
                className="flex flex-col items-center gap-2 py-2 px-4"
                data-testid={`nav-${tab.id}`}
              >
                <div className="w-16 h-16 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow-lg">
                  <Icon className="h-6 w-6" />
                </div>
              </button>
            );
          }
          
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center gap-2 py-3 px-4 rounded-2xl transition-all duration-300 ${
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
              data-testid={`nav-${tab.id}`}
            >
              <div className="w-6 h-6 flex items-center justify-center">
                <Icon className="h-5 w-5" />
              </div>
              <span className="text-xs font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}