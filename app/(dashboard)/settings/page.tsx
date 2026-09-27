import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const dynamic = "force-dynamic";

export default function SettingsPage() {
  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage your workspace, integrations, and API keys.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="you@company.com" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="name">Workspace name</Label>
            <Input id="name" placeholder="Acme Marketing" />
          </div>
          <Button variant="gradient" size="sm">Save changes</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Integrations</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          {["Supabase", "Groq", "Gemini", "Resend", "AgentCall", "Markifact", "Munin", "LangSmith"].map((name) => (
            <div key={name} className="flex items-center justify-between rounded-lg border p-3">
              <div className="text-sm font-medium">{name}</div>
              <Button variant="outline" size="sm">Connect</Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

