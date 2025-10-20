import WebcamViewer from '@/components/WebcamViewer';
import BackToTop from '@/components/BackToTop';
import { useI18n } from '@/hooks/useI18n';

export default function Webcam() {
  // 获取国际化文案
  const lang = useI18n();
  
  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-4">{lang.page.webcamTitle}</h1>
          <p className="text-lg text-muted-foreground max-w-3xl">
            {lang.page.webcamDesc}
          </p>
        </div>
        <WebcamViewer />
      </main>
      <BackToTop />
    </div>
  );
}