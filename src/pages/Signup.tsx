import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";

const Signup = () => {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"pm" | "vendor">("vendor");
  const [phone, setPhone] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: fullName, role },
      },
    });

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    // Update profile with phone/specialty if provided
    const { data: { user } } = await supabase.auth.getUser();
    if (user && (phone || specialty)) {
      await supabase.from("profiles").update({ phone, specialty }).eq("id", user.id);
    }

    toast.success("Account created! Check your email to confirm.");
    navigate(role === "pm" ? "/pm" : "/vendor", { replace: true });
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Proofline</h1>
          <p className="text-sm text-muted-foreground">Create your account</p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSignup} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
              </div>

              <div className="space-y-2">
                <Label>Role</Label>
                <RadioGroup value={role} onValueChange={(v) => setRole(v as "pm" | "vendor")} className="flex gap-4">
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="pm" id="role-pm" />
                    <Label htmlFor="role-pm" className="font-normal">Property Manager</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="vendor" id="role-vendor" />
                    <Label htmlFor="role-vendor" className="font-normal">Vendor</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone (optional)</Label>
                <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>

              {role === "vendor" && (
                <div className="space-y-2">
                  <Label htmlFor="specialty">Specialty (optional)</Label>
                  <Input id="specialty" value={specialty} onChange={(e) => setSpecialty(e.target.value)} placeholder="e.g. Cleaning, Plumbing" />
                </div>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Creating account…" : "Sign up"}
              </Button>
            </form>

            <p className="mt-4 text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link to="/login" className="text-primary hover:underline">Sign in</Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Signup;
