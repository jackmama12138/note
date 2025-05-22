"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
// import { Toaster } from "@/components/ui/toaster";

export function AuthForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const { toast } = useToast();
  const supabase = createClient();

  // 1.0
  // const handleAuth = async (e: React.FormEvent) => {
  //   e.preventDefault();
  //   setIsLoading(true);

  //   try {
  //     const { error } = isLogin
  //       ? await supabase.auth.signInWithPassword({ email, password })
  //       : await supabase.auth.signUp({ email, password });

  //     if (error) {
  //       console.error('Authentication Error:', error);

  //       let errorMessage = "发生未知错误";

  //       if (error.message.includes("Invalid login credentials") || error.message.includes("Invalid credentials")) {
  //           errorMessage = "登录失败请检查邮箱和密码";
  //       } else if (error.message.includes("Email already registered") || error.message.includes("User already registered")) {
  //           errorMessage = "邮箱已注册";
  //       } else if (error.message.includes("A user with this email address has already been registered")) {
  //            errorMessage = "邮箱已注册";
  //       } else {
  //            errorMessage = error.message;
  //       }

  //       toast({
  //         title: "错误",
  //         description: errorMessage,
  //         variant: "destructive",
  //       });
  //     } else {
  //       toast({
  //         title: isLogin ? "登录成功" : "注册成功",
  //         description: isLogin ? "欢迎回来！" : "请查看邮箱完成注册",
  //       });
  //     }
  //   } catch (error) {
  //     console.error('Unexpected Authentication Error:', error);
  //     toast({
  //       title: "错误",
  //       description: "发生未知错误",
  //       variant: "destructive",
  //     });
  //   } finally {
  //     setIsLoading(false);
  //   }
  // };

  //3.0
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
  
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        // console.log(`log:${error?.message}`);
        if (error) {
          let errorMessage = "发生未知错误";
  
          switch (error.status) {
            case 400:
              if (
                error.message.includes("Invalid login credentials") ||
                error.message.includes("Invalid credentials")
              ) {
                errorMessage = "登录失败，请检查邮箱和密码";
              } else if (error.message.includes("invalid email")) {
                errorMessage = "邮箱格式不正确";
              } else if (error.message.includes("password")) {
                errorMessage = "密码错误或格式不正确";
              } else {
                errorMessage = error.message;
              }
              break;
            case 429:
              errorMessage = "操作过于频繁，请稍后再试";
              break;
            case 403:
              errorMessage = "禁止访问，请联系管理员";
              break;
            case 500:
              errorMessage = "服务器错误，请稍后再试";
              break;
            default:
              errorMessage = error.message || "登录失败，未知错误";
              break;
          }
  
          toast({
            title: "登录失败",
            description: errorMessage,
            variant: "destructive",
          });
        } else {
          toast({
            title: "登录成功",
            description: "欢迎回来！",
          });
        }
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password });
  
        if (error) {
          let errorMessage = "发生未知错误";
  
          switch (error.status) {
            case 400:
              if (error.message.includes("already registered")) {
                errorMessage = "邮箱已注册";
              } else if (error.message.includes("invalid email")) {
                errorMessage = "邮箱格式不正确";
              } else if (error.message.includes("Password should be at least")) {
                errorMessage = "密码长度至少6位";
              } else if (error.message.includes("password")) {
                errorMessage = "密码不符合要求";
              } else {
                errorMessage = error.message;
              }
              break;
            case 429:
              errorMessage = "操作过于频繁，请稍后再试";
              break;
            case 500:
              errorMessage = "服务器错误，请稍后再试";
              break;
            default:
              errorMessage = error.message || "注册失败，未知错误";
              break;
          }
  
          toast({
            title: "注册失败",
            description: errorMessage,
            variant: "destructive",
          });
        } else {
          toast({
            title: "注册成功",
            description: "验证邮件已发送，请查收邮箱",
          });
        }
      }
    } catch (error) {
      console.error("Unexpected Authentication Error:", error);
      toast({
        title: "错误",
        description: "发生未知错误",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  
  return (
    <Card className="w-[350px]">
      <CardHeader>
        <CardTitle>{isLogin ? "登录" : "注册"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleAuth} className="space-y-4">
          <div className="space-y-2">
            <Input
              type="email"
              placeholder="邮箱"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              type="password"
              placeholder="密码"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "处理中..." : isLogin ? "登录" : "注册"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={() => setIsLogin(!isLogin)}
          >
            {isLogin ? "没有账号？注册" : "已有账号？登录"}
          </Button>
        </form>
      </CardContent>
    </Card>
    // <Toaster><Toaster/>
    
    
  );
}