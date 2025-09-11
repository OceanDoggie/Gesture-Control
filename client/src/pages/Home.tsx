import VideoHero from '@/components/VideoHero';
import Footer from '@/components/Footer';
import BackToTop from '@/components/BackToTop';

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <main>
        <VideoHero />
      </main>
      <Footer />
      <BackToTop />
    </div>
  );
}