import { Sparkles, ArrowLeft } from 'lucide-react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import BackToTop from '@/components/BackToTop';

export default function Future() {
  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center space-y-8">
          {/* Icon */}
          <div className="mx-auto w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center">
            <Sparkles className="h-12 w-12 text-primary" />
          </div>

          {/* Content */}
          <div className="space-y-4">
            <h1 className="text-4xl font-bold text-foreground">Future Development</h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              This page is reserved for future enhancements and upcoming features of the GestureControl project.
            </p>
          </div>

          {/* Placeholder Card */}
          <Card className="p-8 max-w-2xl mx-auto">
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold text-foreground">Coming Soon</h2>
              <div className="space-y-4 text-left">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-primary rounded-full" />
                  <span className="text-muted-foreground">Advanced gesture recognition algorithms</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-primary rounded-full" />
                  <span className="text-muted-foreground">Multi-hand tracking support</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-primary rounded-full" />
                  <span className="text-muted-foreground">Enhanced sign language dictionary</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-primary rounded-full" />
                  <span className="text-muted-foreground">Real-time learning feedback system</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-primary rounded-full" />
                  <span className="text-muted-foreground">Mobile application development</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Back Button */}
          <div className="pt-8">
            <Link href="/">
              <Button variant="outline" className="flex items-center gap-2" data-testid="button-back-home">
                <ArrowLeft className="h-4 w-4" />
                Back to Home
              </Button>
            </Link>
          </div>
        </div>
      </main>
      <BackToTop />
    </div>
  );
}