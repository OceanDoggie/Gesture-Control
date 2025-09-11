import BackToTop from '../BackToTop';

export default function BackToTopExample() {
  return (
    <div className="h-screen p-4">
      <div className="space-y-4">
        <p>Scroll down to see the Back to Top button appear</p>
        <div className="h-96 bg-muted rounded-lg flex items-center justify-center">
          <p className="text-muted-foreground">Content area - scroll down</p>
        </div>
        <div className="h-96 bg-accent/20 rounded-lg flex items-center justify-center">
          <p className="text-muted-foreground">More content - keep scrolling</p>
        </div>
        <div className="h-96 bg-muted rounded-lg flex items-center justify-center">
          <p className="text-muted-foreground">Even more content - Back to Top should appear</p>
        </div>
      </div>
      <BackToTop />
    </div>
  );
}