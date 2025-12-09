import CameraCapture from '../CameraCapture';
import { useState } from 'react';
import { Button } from "@/components/ui/button";

export default function CameraCaptureExample() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background p-4">
      <Button onClick={() => setIsOpen(true)}>
        카메라 열기
      </Button>
      <CameraCapture
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onCapture={(file) => {
          console.log('Captured file:', file.name);
          setIsOpen(false);
        }}
      />
    </div>
  );
}