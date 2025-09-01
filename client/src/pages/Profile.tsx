import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";

export default function Profile() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [collegeId, setCollegeId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [department, setDepartment] = useState("");
  const [hostelAddress, setHostelAddress] = useState("");

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  // Populate form with user data
  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || "");
      setLastName(user.lastName || "");
      setEmail(user.email || "");
      setPhone(user.phone || "");
      setCollegeId(user.collegeId || "");
      setStudentId(user.studentId || "");
      setDepartment(user.department || "");
      setHostelAddress(user.hostelAddress || "");
    }
  }, [user]);

  const updateProfileMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PUT", "/api/auth/user", {
        firstName,
        lastName,
        email,
        phone,
        collegeId,
        studentId,
        department,
        hostelAddress,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Update failed",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-600 border-t-transparent"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header onCartClick={() => {}} />
      
      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground mb-2" data-testid="text-profile-title">
            Profile Settings
          </h1>
          <p className="text-muted-foreground">Manage your account information and preferences</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
            <CardDescription>
              Update your personal details and campus information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Enter your first name"
                    data-testid="input-first-name"
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Enter your last name"
                    data-testid="input-last-name"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  data-testid="input-email"
                />
              </div>

              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  data-testid="input-phone"
                />
              </div>

              <Separator />

              {/* Campus Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground">Campus Information</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="collegeId">College ID</Label>
                    <Input
                      id="collegeId"
                      value={collegeId}
                      onChange={(e) => setCollegeId(e.target.value)}
                      placeholder="TECH2024"
                      data-testid="input-college-id"
                    />
                  </div>
                  <div>
                    <Label htmlFor="studentId">Student ID</Label>
                    <Input
                      id="studentId"
                      value={studentId}
                      onChange={(e) => setStudentId(e.target.value)}
                      placeholder="STU001234"
                      data-testid="input-student-id"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="department">Department</Label>
                  <Input
                    id="department"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="Computer Science"
                    data-testid="input-department"
                  />
                </div>

                <div>
                  <Label htmlFor="hostelAddress">Hostel/Address</Label>
                  <Textarea
                    id="hostelAddress"
                    value={hostelAddress}
                    onChange={(e) => setHostelAddress(e.target.value)}
                    placeholder="Hostel Block A, Room 205"
                    rows={3}
                    data-testid="input-hostel-address"
                  />
                </div>
              </div>

              <Separator />

              {/* Account Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground">Account Information</h3>
                <div className="bg-muted rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground">Account Type</p>
                      <p className="text-sm text-muted-foreground">
                        {user?.isAdmin ? "Administrator" : "Student"}
                      </p>
                    </div>
                    {user?.isAdmin && (
                      <div className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-medium">
                        Admin
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => window.history.back()}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={updateProfileMutation.isPending}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                  data-testid="button-save-profile"
                >
                  {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
