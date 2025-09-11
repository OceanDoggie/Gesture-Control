import { useState } from 'react';
import ProjectSection from '@/components/ProjectSection';
import BackToTop from '@/components/BackToTop';
import { Button } from '@/components/ui/button';
import { Users, Code, ExternalLink, BookOpen } from 'lucide-react';

export default function Project() {
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const sections = [
    { id: 'about-us', label: 'About Us', icon: Users },
    { id: 'about-code', label: 'About Code', icon: Code },
    { id: 'about-tech', label: 'About Tech', icon: ExternalLink },
    { id: 'projectbook', label: 'Projectbook', icon: BookOpen },
  ];

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveSection(sectionId);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold text-foreground mb-4">Project Details</h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Explore the technical details, team, and resources behind the GestureControl project. 
            Learn about our innovative approach to AI-powered sign language education.
          </p>
        </div>

        {/* Section Navigation */}
        <div className="mb-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {sections.map((section) => {
              const IconComponent = section.icon;
              return (
                <Button
                  key={section.id}
                  variant={activeSection === section.id ? 'default' : 'outline'}
                  onClick={() => scrollToSection(section.id)}
                  className="h-20 flex-col gap-2"
                  data-testid={`button-nav-${section.id}`}
                >
                  <IconComponent className="h-5 w-5" />
                  <span className="text-sm">{section.label}</span>
                </Button>
              );
            })}
          </div>
        </div>

        {/* Project Sections */}
        <ProjectSection />
      </main>
      <BackToTop />
    </div>
  );
}