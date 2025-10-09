import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useTenant } from "@/contexts/TenantContext.tsx";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast.ts";
import brainIcon from "/lovable-uploads/261b61c4-b254-42e7-a321-572c8280691e.png";
import zovaxLogo from "/lovable-uploads/4ffcbdba-2284-45ff-8057-daf4637a1caf.png";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs.tsx";
import { Checkbox } from "@/components/ui/checkbox.tsx";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form.tsx";

// Form schemas
const signInSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});
const signUpSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Please enter a valid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
    companyName: z
      .string()
      .min(2, "Company name must be at least 2 characters"),
    whatsappPhone: z
      .string()
      .min(10, "Please enter a valid WhatsApp phone number"),
    acceptTerms: z.boolean().refine((v) => v === true, {
      message: "You must accept the terms and conditions",
    }),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });
type SignInForm = z.infer<typeof signInSchema>;
type SignUpForm = z.infer<typeof signUpSchema>;
const Index = () => {
  const [activeTab, setActiveTab] = useState("signin");
  const { signIn, signUp, loading } = useTenant();
  const navigate = useNavigate();
  const { toast } = useToast();
  const signInForm = useForm<SignInForm>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });
  const signUpForm = useForm<SignUpForm>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      companyName: "",
      whatsappPhone: "",
      acceptTerms: false,
    },
  });
  const onSignIn = async (data: SignInForm) => {
    const result = await signIn(data.email, data.password);
    if (result.success) {
      toast({
        title: "Welcome back!",
        description: "You have been successfully signed in.",
      });
      navigate("/dashboard", { replace: true });
    } else {
      toast({
        title: "Sign in failed",
        description:
          result.error || "Please check your credentials and try again.",
        variant: "destructive",
      });
    }
  };

  const onSignUp = async (data: SignUpForm) => {
    const result = await signUp({
      full_name: data.name,
      email: data.email,
      password: data.password,
      confirm_password: data.confirmPassword,
      company_name: data.companyName,
      whatsapp_business_phone: data.whatsappPhone,
      accept_terms: data.acceptTerms,
    });

    if (result.success) {
      toast({
        title: "Account created!",
        description:
          "Welcome to ZOVAX. Your account has been created successfully.",
      });
      navigate("/dashboard", { replace: true });
    } else {
      toast({
        title: "Sign up failed",
        description: result.error || "Please try again.",
        variant: "destructive",
      });
    }
  };
  return (
    <div className="min-h-screen bg-background flex flex-col lg:flex-row">
      {/* Left Side - Authentication */}
      <div className="w-full lg:w-2/5 flex items-center justify-center p-6 sm:p-8 order-2 lg:order-1">
        <div className="w-full max-w-md space-y-8">
          {/* ZOVAX Logo */}
          <div className="text-center">
            <div className="mb-4 text-center">
              <img
                src={brainIcon}
                alt="ZOVAX AI Brain Icon"
                className="w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-2"
              />
            </div>
            <p className="text-muted-foreground mt-2 text-sm sm:text-base">
              {activeTab === "signin"
                ? "Welcome back to ZOVAX"
                : "Welcome to ZOVAX"}
            </p>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Automate your customer conversations
            </p>
          </div>

          {/* Authentication Tabs */}
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2 text-xs sm:text-sm">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            {/* Sign In Form */}
            <TabsContent value="signin" className="mt-4 sm:mt-6">
              <Form {...signInForm}>
                <form
                  onSubmit={signInForm.handleSubmit(onSignIn)}
                  className="space-y-4"
                >
                  <FormField
                    control={signInForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter your email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={signInForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="Enter your password"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex items-center justify-end">
                    <button
                      type="button"
                      className="text-sm text-primary hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Signing in..." : "Sign In"}
                  </Button>
                </form>
              </Form>
            </TabsContent>

            {/* Sign Up Form */}
            <TabsContent value="signup" className="mt-4 sm:mt-6">
              <Form {...signUpForm}>
                <form
                  onSubmit={signUpForm.handleSubmit(onSignUp)}
                  className="space-y-4"
                >
                  <FormField
                    control={signUpForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter your full name"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={signUpForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter your email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={signUpForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="Create a password"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={signUpForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm Password</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="Confirm your password"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={signUpForm.control}
                    name="companyName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company Name</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter your company name"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={signUpForm.control}
                    name="whatsappPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>WhatsApp Business Phone</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g., +1-555-123-4567"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={signUpForm.control}
                    name="acceptTerms"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="text-sm">
                            I accept the{" "}
                            <button
                              type="button"
                              className="text-primary hover:underline"
                            >
                              terms and conditions
                            </button>
                          </FormLabel>
                          <FormMessage />
                        </div>
                      </FormItem>
                    )}
                  />

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Creating account..." : "Create Account"}
                  </Button>
                </form>
              </Form>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Right Side - WhatsApp Business Bot (hidden on small) */}
      <div className="w-full lg:w-3/5 bg-gradient-hero items-center justify-center p-6 sm:p-8 flex order-1 lg:order-2 min-h-[40vh] lg:min-h-0">
        <div className="max-w-2xl text-center space-y-6 sm:space-y-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3 sm:mb-4">
              Automate Your Business with WhatsApp
            </h2>
            <p className="text-muted-foreground text-sm sm:text-lg">
              Streamline customer service with intelligent WhatsApp automation
            </p>
          </div>

          {/* ZOVAX Logo Hero */}
          <div className="w-full max-w-xs sm:max-w-lg mx-auto">
            <img
              src={zovaxLogo}
              alt="ZOVAX - Intelligent automation platform"
              className="w-full h-auto drop-shadow-lg"
            />
          </div>

          <div className="mt-4 sm:mt-8 space-y-2 sm:space-y-4">
            <h3 className="text-lg sm:text-xl font-semibold text-foreground mb-1 sm:mb-2">
              Transform Your Customer Experience
            </h3>
          </div>
        </div>
      </div>
    </div>
  );
};
export default Index;
