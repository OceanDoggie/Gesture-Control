import { useState, useRef, useEffect } from 'react';
import { Camera, CameraOff, AlertCircle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function WebcamViewer() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const startCamera = async () => {
    try {
      setError(null);
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 },
        audio: false
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        setStream(mediaStream);
        setIsStreaming(true);
        console.log('Camera started successfully');
      }
    } catch (err) {
      console.error('Camera access failed:', err);
      setError('Unable to access camera. Please check permissions and try again.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsStreaming(false);
    console.log('Camera stopped');
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  return (
    <div className="space-y-6">
      {/* Camera Container */}
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-foreground">Gesture Recognition Camera</h2>
            <div className="flex gap-2">
              <Button
                onClick={startCamera}
                disabled={isStreaming}
                variant={isStreaming ? "secondary" : "default"}
                className="flex items-center gap-2"
                data-testid="button-start-camera"
              >
                <Camera className="h-4 w-4" />
                Start Camera
              </Button>
              <Button
                onClick={stopCamera}
                disabled={!isStreaming}
                variant="outline"
                className="flex items-center gap-2"
                data-testid="button-stop-camera"
              >
                <CameraOff className="h-4 w-4" />
                Stop
              </Button>
            </div>
          </div>

          {/* Video Feed */}
          <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
              data-testid="video-webcam-feed"
            />
            
            {!isStreaming && (
              <div className="absolute inset-0 flex items-center justify-center bg-muted">
                <div className="text-center">
                  <Camera className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <p className="text-lg font-medium text-foreground">Camera Preview</p>
                  <p className="text-sm text-muted-foreground">Click "Start Camera" to begin</p>
                </div>
              </div>
            )}

            {/* Status Indicator */}
            {isStreaming && (
              <div className="absolute top-4 left-4 flex items-center gap-2 bg-destructive/90 text-destructive-foreground px-3 py-1 rounded-full text-sm">
                <div className="w-2 h-2 bg-destructive-foreground rounded-full animate-pulse" />
                LIVE
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Info Panel */}
      <Card className="p-6 bg-accent/20">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-primary mt-0.5" />
          <div className="space-y-2">
            <h3 className="font-medium text-foreground">Recognition Status</h3>
            <p className="text-sm text-muted-foreground">
              {isStreaming 
                ? "Camera is active. Gesture recognition will be integrated here in the future." 
                : "Start the camera to enable gesture recognition features."}
            </p>
            {/* TODO: Add actual gesture recognition feedback here */}
            <div className="text-xs text-muted-foreground mt-2">
              <p>• Hand tracking: Ready</p>
              <p>• Sign language recognition: Coming soon</p>
              <p>• Real-time feedback: In development</p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}