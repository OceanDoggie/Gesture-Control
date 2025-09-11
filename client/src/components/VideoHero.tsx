import { Link } from 'wouter';
import { Play, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function VideoHero() {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto text-center">
        {/* Video Container */}
        <div className="relative mb-8">
          <Card className="p-6 bg-gradient-to-br from-primary/5 to-accent/5">
            <div className="relative aspect-video bg-muted rounded-lg flex items-center justify-center group hover-elevate">
              {/* Placeholder for video - replace with actual video element */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <Video className="h-16 w-16 text-primary mx-auto mb-4" />
                  <p className="text-lg font-medium text-foreground mb-2">Commercial Video</p>
                  <p className="text-sm text-muted-foreground">Video placeholder - replace with actual video file</p>
                  {/* TODO: Replace with actual video element */}
                  {/* <video 
                    controls 
                    className="w-full h-full rounded-lg"
                    poster="/path/to/poster.jpg"
                  >
                    <source src="/path/to/video.mp4" type="video/mp4" />
                    Your browser does not support the video tag.
                  </video> */}
                </div>
              </div>
              
              {/* Play button overlay */}
              <Button 
                size="icon" 
                className="absolute inset-0 m-auto h-16 w-16 rounded-full bg-primary/90 hover:bg-primary opacity-80 hover:opacity-100 transition-all"
                data-testid="button-play-video"
              >
                <Play className="h-8 w-8 fill-current" />
              </Button>
            </div>
          </Card>
        </div>

        {/* Tagline and Description */}
        <div className="space-y-6 mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground leading-tight">
            Teaching Sign Language Using 
            <span className="text-primary"> AI Hand Tracking</span> Technology
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            A project by <span className="font-semibold text-foreground">Emu Unicorn Sauce</span>
          </p>

          <div className="bg-card border border-card-border rounded-lg p-6 max-w-4xl mx-auto text-left">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">📢</span>
              <h2 className="text-xl font-semibold text-foreground">About</h2>
            </div>
            <p className="text-muted-foreground mb-4">
              The objective of the workshop is to showcase the use of AI hand tracking through learning sign language.
            </p>
            <p className="text-muted-foreground">
              In this workshop, participants will learn sign language through the use of AI that will help guide them using hand tracking through a computer camera. They will learn how to spell one word before moving on to a fun memory game.
            </p>
          </div>
        </div>

        {/* Call to Action */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/webcam">
            <Button size="lg" className="text-lg px-8" data-testid="button-try-webcam">
              Try Webcam →
            </Button>
          </Link>
          
          <Link href="/project">
            <Button variant="outline" size="lg" className="text-lg px-8" data-testid="button-learn-more">
              Learn More
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}