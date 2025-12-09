import { ThemeProvider } from "next-themes";
import Header from '../Header';

export default function HeaderExample() {
  return (
    <ThemeProvider attribute="class" defaultTheme="light">
      <div className="min-h-screen bg-background">
        <Header onMenuClick={() => console.log('Menu clicked')} />
        <div className="p-4">
          <p className="text-muted-foreground">Header component with MUBU branding and theme toggle</p>
        </div>
      </div>
    </ThemeProvider>
  );
}