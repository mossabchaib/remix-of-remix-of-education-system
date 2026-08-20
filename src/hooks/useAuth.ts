 // src/hook/useAuth.ts
//
// React hook consumed by the login/register routes.

import { useState, useCallback } from "react";
import {
  signIn as signInLib,
  signUp as signUpLib,
  signOut as signOutLib,
  authErrorMessage,
  getSession,
  type Session,
  type SessionRole,
  type SignUpOutcome,
} from "@/lib/auth";

export function useAuth() {
  const [loading, setLoading] = useState(false);

  const login = useCallback(async (email: string, password: string): Promise<NonNullable<Session>> => {
    setLoading(true);
    try {
      return await signInLib(email, password);
    } catch (err) {
      throw new Error(authErrorMessage(err, "Invalid email or password."));
    } finally {
      setLoading(false);
    }
  }, []);

  const register = useCallback(
    async (params: { name: string; email: string; password: string; role: SessionRole }): Promise<SignUpOutcome> => {
      console.log("register params:", params);
      setLoading(true);
      try {
        return await signUpLib(params);
      } catch (err) {
        throw new Error(authErrorMessage(err, "Something went wrong while creating your account."));
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const logout = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      await signOutLib();
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, login, register, logout, currentSession: getSession() };
}