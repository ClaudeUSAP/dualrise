import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Placeholder — Dual Rise legal content to be provided later.
const MentionsLegales = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Link to="/">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour à l'accueil
          </Button>
        </Link>
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">Mentions légales</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Les mentions légales de Dual Rise seront publiées ici prochainement.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MentionsLegales;
