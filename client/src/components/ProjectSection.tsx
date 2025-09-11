import { Github, Code, Users, BookOpen, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface ProjectSectionProps {
  id?: string;
}

export default function ProjectSection({ id }: ProjectSectionProps) {
  const sections = [
    {
      id: 'about-us',
      title: 'About Us',
      icon: Users,
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            We are a passionate team of students working on innovative gesture recognition technology 
            as part of our workshop project. Our goal is to make sign language learning more accessible 
            through AI-powered hand tracking.
          </p>
          <div className="space-y-6">
            <div>
              <h4 className="font-medium text-foreground mb-3">Team Members</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { name: 'Joey Chen', role: 'Batman', avatar: '🦇' },
                  { name: 'Ivana Hernandez', role: 'Wonder Woman', avatar: '👸' },
                  { name: 'Keren Zhang', role: 'Superman', avatar: '🦸' },
                ].map((member, index) => (
                  <div key={index} className="flex items-center gap-3 p-4 bg-accent/20 rounded-md hover-elevate">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-xl">
                      {member.avatar}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{member.name}</p>
                      <p className="text-sm text-muted-foreground">{member.role}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <h4 className="font-medium text-foreground mb-3">🎓 Advisors</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { name: 'Dr. Wei Jin', role: 'Academic Advisor' },
                  { name: 'Dr. Xin Xu', role: 'Academic Advisor' },
                ].map((advisor, index) => (
                  <div key={index} className="flex items-center gap-3 p-4 bg-secondary/20 rounded-md">
                    <div className="w-10 h-10 bg-secondary/20 rounded-full flex items-center justify-center">
                      <Users className="h-5 w-5 text-secondary-foreground" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{advisor.name}</p>
                      <p className="text-sm text-muted-foreground">{advisor.role}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'about-code',
      title: 'About Code',
      icon: Code,
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Our project is built with modern web technologies and computer vision libraries. 
            The source code will be available on GitHub for educational purposes.
          </p>
          <div className="space-y-3">
            <Button variant="outline" className="w-full justify-start" data-testid="button-github-repo">
              <Github className="h-4 w-4 mr-2" />
              View GitHub Repository
              <ExternalLink className="h-4 w-4 ml-auto" />
            </Button>
            <Button variant="outline" className="w-full justify-start" data-testid="button-documentation">
              <BookOpen className="h-4 w-4 mr-2" />
              Technical Documentation
              <ExternalLink className="h-4 w-4 ml-auto" />
            </Button>
          </div>
          <div className="text-sm text-muted-foreground">
            <p>• Open source project</p>
            <p>• MIT License</p>
            <p>• Educational use encouraged</p>
          </div>
        </div>
      )
    },
    {
      id: 'about-tech',
      title: 'About Tech',
      icon: ExternalLink,
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            GestureControl leverages cutting-edge technologies for real-time hand tracking and 
            gesture recognition. Our tech stack combines computer vision with modern web frameworks.
          </p>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-foreground mb-2">Core Technologies</h4>
              <div className="flex flex-wrap gap-2">
                {['MediaPipe', 'OpenCV', 'TensorFlow.js', 'WebRTC', 'React', 'TypeScript'].map((tech) => (
                  <Badge key={tech} variant="secondary">{tech}</Badge>
                ))}
              </div>
            </div>
            <div>
              <h4 className="font-medium text-foreground mb-2">Computer Vision</h4>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>• Real-time hand landmark detection</p>
                <p>• Gesture classification algorithms</p>
                <p>• Sign language pattern recognition</p>
                <p>• Machine learning model optimization</p>
              </div>
            </div>
            <div>
              <h4 className="font-medium text-foreground mb-2">Web Integration</h4>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>• Browser-based camera access</p>
                <p>• Real-time video processing</p>
                <p>• Responsive user interface</p>
                <p>• Cross-platform compatibility</p>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'projectbook',
      title: 'Projectbook / Resources',
      icon: BookOpen,
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Access comprehensive documentation, presentations, and resources for the GestureControl project.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button variant="outline" className="h-24 flex-col gap-2" data-testid="button-readme">
              <BookOpen className="h-6 w-6" />
              <span>README</span>
            </Button>
            <Button variant="outline" className="h-24 flex-col gap-2" data-testid="button-slides">
              <ExternalLink className="h-6 w-6" />
              <span>Slides</span>
            </Button>
            <Button variant="outline" className="h-24 flex-col gap-2" data-testid="button-demo">
              <Code className="h-6 w-6" />
              <span>Demo</span>
            </Button>
          </div>
          <div className="bg-accent/20 p-4 rounded-md">
            <h4 className="font-medium text-foreground mb-2">Project Documentation</h4>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>• Workshop presentation materials</p>
              <p>• Technical implementation details</p>
              <p>• User guide and tutorials</p>
              <p>• Research findings and methodology</p>
            </div>
          </div>
        </div>
      )
    }
  ];

  // If an ID is provided, show only that section
  const sectionsToShow = id ? sections.filter(section => section.id === id) : sections;

  return (
    <div className="space-y-8">
      {sectionsToShow.map((section) => {
        const IconComponent = section.icon;
        return (
          <Card key={section.id} id={section.id} className="scroll-mt-20">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-2xl">
                <IconComponent className="h-6 w-6 text-primary" />
                {section.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {section.content}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}