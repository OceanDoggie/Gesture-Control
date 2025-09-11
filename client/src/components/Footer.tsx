import { Github, BookOpen, FileSliders, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function Footer() {
  return (
    <footer className="bg-muted/30 border-t border-border mt-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Project Links */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Project Resources</h3>
            <div className="space-y-3">
              <Button variant="outline" className="w-full justify-start" data-testid="button-footer-github">
                <Github className="h-4 w-4 mr-2" />
                GitHub Repository
                <ExternalLink className="h-4 w-4 ml-auto" />
              </Button>
              <Button variant="outline" className="w-full justify-start" data-testid="button-footer-readme">
                <BookOpen className="h-4 w-4 mr-2" />
                README Documentation
                <ExternalLink className="h-4 w-4 ml-auto" />
              </Button>
              <Button variant="outline" className="w-full justify-start" data-testid="button-footer-slides">
                <FileSliders className="h-4 w-4 mr-2" />
                Presentation Slides
                <ExternalLink className="h-4 w-4 ml-auto" />
              </Button>
            </div>
          </Card>

          {/* About Section */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">About GestureControl</h3>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>
                An innovative workshop project exploring AI-powered hand gesture recognition 
                for sign language education and accessibility.
              </p>
              <p>
                Built with modern web technologies including MediaPipe, TensorFlow.js, 
                and React for real-time computer vision applications.
              </p>
              <div className="pt-2">
                <p className="text-xs">
                  Created by <span className="font-medium text-foreground">Emu Unicorn Sauce</span>
                </p>
                <p className="text-xs">
                  Workshop Project • Educational Use • Open Source
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Bottom Section */}
        <div className="mt-8 pt-8 border-t border-border text-center">
          <p className="text-sm text-muted-foreground">
            © 2024 GestureControl Workshop Project. All rights reserved.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Educational project • Not for commercial use
          </p>
        </div>
      </div>
    </footer>
  );
}