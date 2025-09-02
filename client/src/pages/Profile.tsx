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
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50">
      <Header onCartClick={() => {}} />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-12 text-center">
          <div className="w-24 h-24 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-gray-800 mb-4" data-testid="text-profile-title">
            Profile Settings
          </h1>
          <p className="text-gray-600 text-lg">Manage your account information and preferences</p>
        </div>

        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-8 text-white">
            <h2 className="text-2xl font-bold mb-2">Personal Information</h2>
            <p className="text-purple-100">Update your personal details and campus information</p>
          </div>
          
          <div className="p-8">
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Basic Information */}
              <div>
                <h3 className="text-xl font-bold text-gray-800 mb-6">Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label htmlFor="firstName" className="text-gray-700 font-semibold">First Name</Label>
                    <Input
                      id="firstName"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="Enter your first name"
                      className="border-2 border-gray-200 focus:border-purple-500 rounded-xl py-3"
                      data-testid="input-first-name"
                    />
                  </div>
                  <div className="space-y-3">
                    <Label htmlFor="lastName" className="text-gray-700 font-semibold">Last Name</Label>
                    <Input
                      id="lastName"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Enter your last name"
                      className="border-2 border-gray-200 focus:border-purple-500 rounded-xl py-3"
                      data-testid="input-last-name"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                  <div className="space-y-3">
                    <Label htmlFor="email" className="text-gray-700 font-semibold">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email"
                      className="border-2 border-gray-200 focus:border-purple-500 rounded-xl py-3"
                      data-testid="input-email"
                    />
                  </div>
                  <div className="space-y-3">
                    <Label htmlFor="phone" className="text-gray-700 font-semibold">Phone Number</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="border-2 border-gray-200 focus:border-purple-500 rounded-xl py-3"
                      data-testid="input-phone"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-8">
                <h3 className="text-xl font-bold text-gray-800 mb-6">Campus Information</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label htmlFor="collegeId" className="text-gray-700 font-semibold">College ID</Label>
                    <Input
                      id="collegeId"
                      value={collegeId}
                      onChange={(e) => setCollegeId(e.target.value)}
                      placeholder="TECH2024"
                      className="border-2 border-gray-200 focus:border-purple-500 rounded-xl py-3"
                      data-testid="input-college-id"
                    />
                  </div>
                  <div className="space-y-3">
                    <Label htmlFor="studentId" className="text-gray-700 font-semibold">Student ID</Label>
                    <Input
                      id="studentId"
                      value={studentId}
                      onChange={(e) => setStudentId(e.target.value)}
                      placeholder="STU001234"
                      className="border-2 border-gray-200 focus:border-purple-500 rounded-xl py-3"
                      data-testid="input-student-id"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                  <div className="space-y-3">
                    <Label htmlFor="department" className="text-gray-700 font-semibold">Department</Label>
                    <Input
                      id="department"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      placeholder="Computer Science"
                      className="border-2 border-gray-200 focus:border-purple-500 rounded-xl py-3"
                      data-testid="input-department"
                    />
                  </div>
                  <div className="space-y-3">
                    <Label htmlFor="hostelAddress" className="text-gray-700 font-semibold">Hostel/Address</Label>
                    <Textarea
                      id="hostelAddress"
                      value={hostelAddress}
                      onChange={(e) => setHostelAddress(e.target.value)}
                      placeholder="Hostel Block A, Room 205"
                      rows={3}
                      className="border-2 border-gray-200 focus:border-purple-500 rounded-xl py-3"
                      data-testid="input-hostel-address"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-8">
                <h3 className="text-xl font-bold text-gray-800 mb-6">Account Information</h3>
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-6 border border-purple-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-gray-800">Account Type</p>
                      <p className="text-gray-600">
                        {user?.isAdmin ? "Administrator" : "Student"}
                      </p>
                    </div>
                    {user?.isAdmin && (
                      <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2 rounded-full text-sm font-bold">
                        Admin
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-4 pt-8">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => window.history.back()}
                  className="border-2 border-gray-300 text-gray-700 hover:bg-gray-50 rounded-xl px-6 py-3"
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={updateProfileMutation.isPending}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold rounded-xl px-8 py-3 shadow-lg transform hover:scale-105 transition-all duration-300"
                  data-testid="button-save-profile"
                >
                  {updateProfileMutation.isPending ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Saving...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                      </svg>
                      <span>Save Changes</span>
                    </div>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
