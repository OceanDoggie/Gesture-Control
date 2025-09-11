import WebcamViewer from '@/components/WebcamViewer';
import BackToTop from '@/components/BackToTop';

export default function Webcam() {
  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-4">Gesture Recognition Demo</h1>
          <p className="text-lg text-muted-foreground max-w-3xl">
            Experience our AI-powered hand gesture recognition technology. Grant camera permissions 
            to test real-time gesture detection and sign language recognition capabilities.
          </p>
        </div>
        <WebcamViewer />
      </main>
      <BackToTop />
    </div>
  );
}